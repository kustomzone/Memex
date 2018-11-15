import Storex from 'storex'
import { DexieStorageBackend } from 'storex-backend-dexie'
import stemmer from 'memex-stemmer'

import UrlField from './storage/url-field'
import schemaPatcher from './storage/dexie-schema'
import { suggestObjects } from './search/suggest'
import { StorageManager } from './types'

export const backend = new DexieStorageBackend({
    stemmer,
    schemaPatcher,
    dbName: 'memex',
    idbImplementation: {
        factory: window.indexedDB,
        range: window['IDBKeyRange'],
    },
}) as any

// Extend storex instance with Memex-specific methods
const instance = new Storex({ backend }) as StorageManager

// Override default storex `url` field with Memex-specific one
instance.registry.fieldTypes.registerType('url', UrlField as any)

const oldMethod = instance.collection.bind(instance)
instance.collection = (name: string) => ({
    ...oldMethod(name),
    suggestObjects: (query, opts) => suggestObjects(name, query, opts),
    findByPk: function(pk) {
        return this.backend[name].get(pk)
    }.bind(instance),
    streamPks: async function*() {
        const table = this.backend[name]
        const pks = await table.toCollection().primaryKeys()
        for (const pk of pks) {
            yield pk
        }
    }.bind(instance),
    streamCollection: async function*() {
        const table = this.backend[name]
        for await (const pk of this.streamPks(name)) {
            yield await { pk, object: await table.get(pk) }
        }
    }.bind(instance),
})

instance.deleteDB = window.indexedDB.deleteDatabase

export default instance
