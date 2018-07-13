import * as queryString from 'query-string'
import * as RemoteStorage from 'external/remotestorage'
import { EventEmitter } from "events"
import { BackupBackend } from "./types"

export class RemoteStorageBackend extends BackupBackend {
    private remoteStorage

    constructor({ apiKeys }) {
        super()

        this.remoteStorage = new (<any>RemoteStorage).default({ cache: false })
        this.remoteStorage.setApiKeys(apiKeys)
        this.remoteStorage.access.claim('worldbrain-memex', 'rw')
    }

    async getLoginUrl({ provider, returnURL }: { provider: string, returnURL: string }) {
        const { getLocation: origGetLocation, setLocation: origSetLocation } = RemoteStorage.Authorize

        const location = await new Promise((resolve) => {
            RemoteStorage.Authorize.getLocation = <any>(() => {
                return returnURL
            })
            RemoteStorage.Authorize.setLocation = <any>(location => {
                resolve(location)
            })

            this.remoteStorage.googledrive.connect()
        })

        RemoteStorage.Authorize.getLocation = origGetLocation
        RemoteStorage.Authorize.setLocation = origSetLocation

        return location['href'] || location
    }

    // TODO: Find better name. The back-end redirects back to this URL with some stuff appended.
    async handleLoginRedirectedBack(locationHref: string) {
        const params = queryString.parse(locationHref.split('#')[1])
        const accessToken = params['access_token']
        this.remoteStorage.remote.configure({
            token: accessToken,
        })
    }

    async storeObject({ collection, pk, object, events }: { collection: string, pk: string, object: object, events: EventEmitter }): Promise<any> {
        throw new Error('Not yet implemented  :(')
    }

    async deleteObject({ collection, pk, events }: { collection: string, pk: string, events: EventEmitter }): Promise<any> {
        throw new Error('Not yet implemented  :(')
    }
}
