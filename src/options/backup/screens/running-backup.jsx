import React from 'react'
import PropTypes from 'prop-types'
import { remoteFunction } from 'src/util/webextensionRPC'
import localStyles from './running-backup.css'
import { BackupProgressBar } from '../components/progress-bar'
import MovingDotsLabel from '../components/moving-dots-label'
import { PrimaryButton } from '../components/primary-button'
import Styles from '../styles.css'

export default class RunningBackupContainer extends React.Component {
    static propTypes = {
        onFinish: PropTypes.func.isRequired,
    }

    state = { status: null, info: null }

    async componentDidMount() {
        browser.runtime.onMessage.addListener(this.messageListener)

        const info = await remoteFunction('getBackupInfo')()
        if (info) {
            this.setState({
                status: 'running',
                info,
            })
        } else {
            this.setState({
                status: 'running',
                info: { state: 'preparing' },
            })
            await remoteFunction('startBackup')()
        }

        // this.setState({
        //     status: 'running',
        //     info: { state: 'preparing' },
        // })
        // this.setState({
        //     status: 'running',
        //     info: { state: 'pausing', totalChanges: 1000, processedChanges: 500 },
        // })
        // this.setState({
        //     status: 'success',
        //     info: { state: 'synching', totalChanges: 1000, processedChanges: 1000 },
        // })
        // this.setState({
        //     status: 'fail',
        //     info: { state: 'synching', totalChanges: 1000, processedChanges: 10 },
        // })
    }

    componentWillUnmount() {
        browser.runtime.onMessage.removeListener(this.messageListener)
    }

    messageListener = message => {
        if (message.type === 'backup-event') {
            this.handleBackupEvent(message.event)
        }
    }

    handleBackupEvent(event) {
        if (event.type === 'info') {
            this.setState({
                status: 'running',
                info: event.info || this.state.info,
            })
        } else if (event.type === 'success') {
            this.setState({ status: 'success' })
        } else if (event.type === 'fail') {
            this.setState({ status: 'fail' })
        }
    }

    handlePause() {
        const info = this.state.info
        info.state = 'pausing'
        this.setState({ info })
        remoteFunction('pauseBackup')()
    }

    handleResume() {
        remoteFunction('resumeBackup')()
    }

    handleCancel() {
        remoteFunction('cancelBackup')()
        this.props.onFinish()
    }

    render() {
        const { info, status } = this.state
        if (!info) {
            return null
        }

        const progressPercentage =
            info.processedChanges && info.totalChanges
                ? info.processedChanges / info.totalChanges
                : 0

        return (
            <div>
                {status === 'running' && (
                    <div>
                        <p className={Styles.header2}>
                            <strong>STEP 4/5: </strong>
                            BACKUP PROGRESS
                        </p>
                        <div className={Styles.subtitle2}>
                            You can leave this page and come back at any time.
                        </div>
                        <div className={localStyles.steps}>
                            <div className={localStyles.step}>
                                <div className={localStyles.stepLabel}>
                                    <span className={localStyles.stepNumber}>
                                        Step 1:
                                    </span>
                                    Preparing uploads
                                </div>
                                <div className={localStyles.stepStatus}>
                                    {info.state === 'preparing' &&
                                        'In progress'}
                                    {info.state !== 'synching' && '✔️'}
                                </div>
                            </div>
                            <div className={localStyles.step}>
                                <div className={localStyles.stepLabel}>
                                    <span className={localStyles.stepNumber}>
                                        Step 2:
                                    </span>
                                    Uploading your Memex backup
                                </div>
                                <div className={localStyles.stepStatus}>
                                    {info.state === 'preparing' && 'Waiting'}
                                    {status === 'running' &&
                                        info.state !== 'preparing' &&
                                        'In progress'}
                                    {status === 'success' && '✔️'}
                                </div>
                            </div>
                        </div>
                        <BackupProgressBar value={progressPercentage} />
                        <div className={localStyles.actions}>
                            {info.state !== 'paused' &&
                                info.state !== 'pausing' && (
                                    <PrimaryButton
                                        onClick={() => {
                                            this.handlePause()
                                        }}
                                    >
                                        Pause
                                    </PrimaryButton>
                                )}
                            {info.state !== 'paused' &&
                                info.state === 'pausing' && (
                                    <PrimaryButton onClick={() => {}}>
                                        <div style={{ width: '150px' }}>
                                            <MovingDotsLabel
                                                text="Preparing pause"
                                                intervalMs={500}
                                            />
                                        </div>
                                    </PrimaryButton>
                                )}
                            {info.state === 'paused' && (
                                <PrimaryButton
                                    onClick={() => {
                                        this.handleResume()
                                    }}
                                >
                                    Resume
                                </PrimaryButton>
                            )}
                            <div
                                className={localStyles.actionCancel}
                                onClick={() => {
                                    this.handleCancel()
                                }}
                            >
                                Cancel
                            </div>
                        </div>
                    </div>
                )}
                {status === 'success' && (
                    <div className={localStyles.finish}>
                        <p className={Styles.header2}>
                            <strong>FINISHED: </strong>
                            YOUR BACKUP WAS SUCCESSFUL
                        </p>
                        <PrimaryButton
                            onClick={() => {
                                this.props.onFinish()
                            }}
                        >
                            Return to Settings
                        </PrimaryButton>
                    </div>
                )}
                {status === 'fail' && (
                    <div className={localStyles.finish}>
                        <p className={Styles.header2}>
                            <strong>FAIL: </strong>
                            We couldn't back up your data. Please check whether
                            you have enough space in your Drive and the
                            stability of your internet connection. You can try
                            again any time you want. Otherwise, please&nbsp;
                            <a href="mailto:support@worldbrain.io">
                                contact support
                            </a>
                            .
                        </p>
                        <PrimaryButton
                            onClick={() => {
                                this.props.onFinish()
                            }}
                        >
                            Return to Settings
                        </PrimaryButton>
                    </div>
                )}
            </div>
        )
    }
}