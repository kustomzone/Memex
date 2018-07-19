import React from 'react'
import PropTypes from 'prop-types'
import cx from 'classnames'
import moment from 'moment'
import { remoteFunction } from '../../util/webextensionRPC'

import Annotation from './Annotation'
import TagHolder from './TagHolder.js'
import styles from './Annotation.css'
import { IndexDropdown } from '../../common-ui/containers'

class AnnotationContainer extends React.Component {
    static propTypes = {
        annotation: PropTypes.object.isRequired,
        deleteAnnotation: PropTypes.func.isRequired,
        editAnnotation: PropTypes.func.isRequired,
        goToAnnotation: PropTypes.func.isRequired,
        env: PropTypes.string.isRequired,
        isActive: PropTypes.bool.isRequired,
        isHovered: PropTypes.bool.isRequired,
        onMouseEnter: PropTypes.func.isRequired,
        onMouseLeave: PropTypes.func.isRequired,
    }

    state = {
        truncated: {},

        annotationText: '',
        annotationEditMode: false,

        containsTags: false,
        tags: [],
        tagInput: false,

        footerState: 'default',
    }

    async componentDidMount() {
        const { annotation } = this.props
        const truncated = {}
        let annotationText = ''
        let containsTags = false

        this.tagInputContainer = null

        if (annotation.body)
            truncated.highlight = this.getTruncatedObject(annotation.body)

        if (annotation.comment) {
            truncated.annotation = this.getTruncatedObject(annotation.comment)
            annotationText = annotation.comment
        }

        const tags = await remoteFunction('getAnnotationTags')(annotation.url)
        if (tags.length) containsTags = true

        this.attachEventListener()

        this.setState({
            truncated,
            annotationText,
            containsTags,
            tags,
        })
    }

    attachEventListener = () => {
        // Attaches on click listener to close the tags input
        // when clicked outside
        // TODO: Use refs instead of manually calling it
        const sidebar = document.querySelector('#memex_sidebar_panel')
        sidebar.addEventListener(
            'click',
            e => {
                if (this.state.tagsInput) return
                else if (
                    this.tagInputContainer &&
                    this.tagInputContainer.contains(e.target)
                )
                    return

                this.setState({
                    tagInput: false,
                })
            },
            false,
        )
    }

    reloadTags = async () => {
        const tags = await remoteFunction('getAnnotationTags')(
            this.props.annotation.url,
        )
        this.setState({
            tags,
        })
    }

    getTruncatedObject = text => {
        // For the edge case where user enters a lot of newlines
        // This piece of code, counts the new lines and finds
        // the position until which to truncate

        let newlineCount = 0
        let i = 0
        let shouldTruncateForNewLines = false

        while (i < text.length) {
            if (text[i++] === '\n') newlineCount++
            if (newlineCount > 4) {
                shouldTruncateForNewLines = true
                // Now i stores the position for max possible characters
                break
            }
        }

        if (text.length > 280) {
            const truncatedText = text.slice(0, 280) + ' [..]'
            return {
                isTruncated: true,
                text: truncatedText,
            }
        } else if (shouldTruncateForNewLines) {
            const truncatedText = text.slice(0, i) + '[..]'
            return {
                isTruncated: true,
                text: truncatedText,
            }
        }
        return null
    }

    handleChange = e => {
        this.setState({
            annotationText: e.target.value,
        })
    }

    handleDeleteAnnotation = e => {
        e.preventDefault()
        e.stopPropagation()
        const { url } = this.props.annotation
        this.setFooterState('default')
        this.props.deleteAnnotation({ url })
    }

    handleEditAnnotation = e => {
        e.preventDefault()
        e.stopPropagation()
        const { url, comment } = this.props.annotation
        const { annotationText } = this.state

        if (annotationText !== comment) {
            this.props.editAnnotation({ url, comment: annotationText })
        }

        this.reloadTags()
        this.setState({
            annotationEditMode: false,
            tagInput: false,
            footerState: 'default',
        })
    }

    getTags = () => this.state.tags.map(tag => tag.name)

    _setTagInput = value => () => this.setState({ tagInput: value })

    renderTimestamp = () => {
        if (this.state.annotationEditMode) return null

        const { createdWhen, lastEdited } = this.props.annotation
        let dateObject
        if (!lastEdited) dateObject = new Date(createdWhen)
        else dateObject = new Date(lastEdited)
        const timestamp = moment(dateObject)
            .format('MMMM D YYYY')
            .toUpperCase()

        return (
            <div className={styles.timestamp}>
                {lastEdited ? (
                    <span className={styles.lastEdit}>Last Edit: </span>
                ) : null}
                {timestamp}
            </div>
        )
    }

    renderFooterIcons = () => {
        const { annotation, env } = this.props
        return (
            <div className={styles.footerAside}>
                <span
                    className={styles.editIcon}
                    onClick={this.toggleEditAnnotation}
                />
                <span
                    className={styles.trashIcon}
                    onClick={this.setFooterState('delete')}
                />
                {env === 'overview' && annotation.body ? (
                    <span
                        className={styles.goToPageIcon}
                        onClick={this.props.goToAnnotation(annotation)}
                    />
                ) : null}
            </div>
        )
    }

    renderEditButtons = () => {
        return (
            <div className={styles.footerAside}>
                <span
                    className={styles.footerBoldText}
                    onClick={this.handleEditAnnotation}
                >
                    Save
                </span>
                <span
                    className={styles.footerText}
                    onClick={this.toggleEditAnnotation}
                >
                    Cancel
                </span>
            </div>
        )
    }

    renderDeleteButtons = () => {
        return (
            <div className={styles.footerAside}>
                <span className={styles.deleteReally}>Really?</span>
                <span
                    className={styles.footerBoldText}
                    onClick={this.handleDeleteAnnotation}
                >
                    Delete
                </span>
                <span
                    className={styles.footerText}
                    onClick={this.setFooterState('default')}
                >
                    Cancel
                </span>
            </div>
        )
    }

    renderTagPills = () => {
        const { tags, annotationEditMode } = this.state
        if (!tags || annotationEditMode) return
        return tags.map((tag, i) => (
            <span key={i} className={styles.tagPill}>
                {tag.name}
            </span>
        ))
    }

    findFooterRenderer(state) {
        if (state === 'default') return this.renderFooterIcons()
        else if (state === 'edit') return this.renderEditButtons()
        else if (state === 'delete') return this.renderDeleteButtons()
    }

    renderFooter = () => {
        const { footerState } = this.state
        return (
            <div className={styles.footer}>
                {this.renderTimestamp()}
                {this.findFooterRenderer(footerState)}
            </div>
        )
    }

    toggleState = stateName => () => {
        const toggled = !this.state[stateName]
        this.setState({
            [stateName]: toggled,
        })
    }

    toggleTruncation = name => e => {
        e.preventDefault()
        e.stopPropagation()
        const truncated = { ...this.state.truncated }
        truncated[name].isTruncated = !truncated[name].isTruncated

        this.setState({
            truncated,
        })
    }

    setFooterState = footerState => () =>
        this.setState({
            footerState,
        })

    toggleEditAnnotation = () => {
        this.toggleState('annotationEditMode')()
        if (this.state.footerState === 'edit') this.setFooterState('default')()
        else this.setFooterState('edit')()
    }

    setTagRef = node => {
        this.tagInputContainer = node
    }

    renderShowButton = name => {
        const { truncated } = this.state
        if (truncated[name]) {
            return (
                <span
                    className={cx(styles.showMore, {
                        [styles.rotated]: !truncated[name].isTruncated,
                    })}
                    onClick={this.toggleTruncation(name)}
                />
            )
        }
        return null
    }

    renderHighlight = () => {
        const { truncated } = this.state
        if (truncated.highlight && truncated.highlight.isTruncated)
            return truncated.highlight.text
        else return this.props.annotation.body
    }

    renderAnnotation = () => {
        const { truncated, annotationEditMode } = this.state
        if (annotationEditMode) return ''
        if (truncated.annotation && truncated.annotation.isTruncated)
            return truncated.annotation.text
        else return this.props.annotation.comment
    }

    renderTagInput() {
        const tagStringArray = this.state.tags.map(tag => tag.name)
        if (this.state.tagInput)
            return (
                <IndexDropdown
                    isForAnnotation
                    url={this.props.annotation.url}
                    initFilters={tagStringArray}
                    source="tag"
                />
            )
        else {
            return (
                <TagHolder
                    tags={this.state.tags}
                    clickHandler={this._setTagInput(true)}
                    deleteTag={tag => {
                        remoteFunction('delAnnotationTag')(tag)
                        this.reloadTags()
                    }}
                />
            )
        }
    }

    renderAnnotationInput = () => {
        if (this.state.annotationEditMode)
            return (
                <div className={styles.annotationInput}>
                    <textarea
                        rows="5"
                        cols="20"
                        className={styles.annotationTextarea}
                        value={this.state.annotationText}
                        onChange={this.handleChange}
                        onClick={() => {
                            this.setState({
                                tagInput: false,
                            })
                        }}
                        placeholder="Add comment..."
                    />
                    <div ref={this.setTagRef}>{this.renderTagInput()}</div>
                </div>
            )
        return null
    }

    deriveTagsClass = () =>
        cx({
            [styles.tagsContainer]: this.state.tags.length,
            [styles.noComment]:
                this.state.tags.length && !this.props.annotation.comment,
        })

    deriveIsJustComment = () => !this.props.annotation.body

    deriveIsIFrame = () => this.props.env === 'iframe'

    /**
     * Comment box (#fafafa bg) should only be visible if there is a comment
     * or the annotaion isn't edit mode.
     */
    shouldCommentBoxBeVisible = () => {
        return (
            this.props.annotation.comment.length > 0 &&
            !this.state.annotationEditMode
        )
    }

    render() {
        const { goToAnnotation, annotation } = this.props
        return (
            <Annotation
                renderHighlight={this.renderHighlight}
                renderShowButton={this.renderShowButton}
                renderAnnotation={this.renderAnnotation}
                annotationEditMode={this.state.annotationEditMode}
                deriveTagsClass={this.deriveTagsClass}
                renderTagPills={this.renderTagPills}
                renderAnnotationInput={this.renderAnnotationInput}
                renderFooter={this.renderFooter}
                goToAnnotation={goToAnnotation(annotation)}
                isIFrame={this.deriveIsIFrame()}
                shouldCommentBoxBeVisible={this.shouldCommentBoxBeVisible()}
                isJustComment={this.deriveIsJustComment()}
                onMouseEnter={this.props.onMouseEnter(this.props.annotation)}
                onMouseLeave={this.props.onMouseLeave}
                isHovered={this.props.isHovered}
                isActive={this.props.isActive}
                id={this.props.annotation.url}
            />
        )
    }
}

export default AnnotationContainer
