import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Moment from 'react-moment';
import { Trans, withI18n } from '@lingui/react';
import classnames from 'classnames';
import anchorme from 'anchorme';
import { withScrollTarget } from '../../../../modules/scroll';
import { withPush } from '../../../../modules/routing';
import { Button, Confirm, Icon, TextBlock } from '../../../../components';
import MessageAttachments from '../MessageAttachments';
import MessageRecipients from '../MessageRecipients';
import MessagePi from '../MessagePi';
import TagList from '../TagList';
import { replyHandler } from '../../services/replyHandler';
import { messageDeleteHandler } from '../../services/messageDeleteHandler';
import { toggleMarkAsReadHandler } from '../../services/toggleMarkAsReadHandler';
import { LockedMessage } from '../../../../modules/encryption';
import { getAuthor } from '../../../../services/message';
import { getAveragePIMessage, getPiClass } from '../../../../modules/pi/services/pi';

import './style.scss';
import './mail-message-details.scss';

@withI18n()
@withScrollTarget()
@withPush()
class MailMessage extends Component {
  static propTypes = {
    message: PropTypes.shape({
      message_id: PropTypes.string,
    }).isRequired,
    onMessageRead: PropTypes.func,
    onMessageUnread: PropTypes.func,
    onMessageDelete: PropTypes.func,
    onOpenTags: PropTypes.func.isRequired,
    onReply: PropTypes.func.isRequired,
    push: PropTypes.func.isRequired,
    user: PropTypes.shape({}).isRequired,
    settings: PropTypes.shape({ default_locale: PropTypes.string.isRequired }).isRequired,
    i18n: PropTypes.shape({}).isRequired,
    scrollTarget: PropTypes.shape({ forwardRef: PropTypes.func }).isRequired,
    noInteractions: PropTypes.bool,
    isLocked: PropTypes.bool.isRequired,
    encryptionStatus: PropTypes.shape({}),
  };

  static defaultProps = {
    onMessageRead: () => {},
    onMessageUnread: () => {},
    onMessageDelete: () => {},
    noInteractions: false,
    encryptionStatus: undefined,
  }

  handleMessageDelete = messageDeleteHandler(this)
  handleToggleMarkAsRead = toggleMarkAsReadHandler(this)
  handleReply = replyHandler(this)

  renderBody = () => {
    const { message, isLocked, encryptionStatus } = this.props;
    const body = message.body_is_plain ? `<pre>${anchorme(message.body, { emails: false, attributes: [{ name: 'target', value: '_blank' }] })}</pre>` : message.body;

    if (!isLocked) {
      return (
        <TextBlock nowrap={false} className="s-mail-message__content" dangerouslySetInnerHTML={{ __html: body }} />
      );
    }

    return (
      <LockedMessage encryptionStatus={encryptionStatus} />
    );
  };

  render() {
    const {
      message, scrollTarget: { forwardRef }, onOpenTags, user, settings: { default_locale: locale },
      noInteractions, encryptionStatus,
    } = this.props;
    const pi = getAveragePIMessage({ message });
    const piType = getPiClass(pi);
    const author = getAuthor(message);

    const infoPiClassName = {
      's-mail-message__info--super': piType === 'super',
      's-mail-message__info--good': piType === 'good',
      's-mail-message__info--bad': piType === 'bad',
      's-mail-message__info--ugly': piType === 'ugly',
    };

    return (
      <article id={`message-${message.message_id}`} ref={forwardRef} className="s-mail-message">
        <div className="s-mail-message__details m-mail-message-details">
          <TextBlock
            className={classnames(
              'm-mail-message-details__author',
            { 'm-mail-message-details__author--encrypted': encryptionStatus }
            )}
          >
            {encryptionStatus && <Icon type="lock" className="m-mail-message-details--encrypted__icon" />}
            {encryptionStatus && ' '}
            <Icon type="envelope" className={classnames({ 'm-mail-message-details--encrypted__icon': encryptionStatus })} />
            {' '}
            <span className="m-mail-message-details__author-name">{author.label}</span>
            {' '}
            <Moment fromNow locale={locale}>{message.date}</Moment>
          </TextBlock>
          <TextBlock className="m-mail-message-details__recipients">
            <Trans id="message.to">To:</Trans>
            {' '}
            <MessageRecipients message={message} user={user} shorten />
          </TextBlock>
        </div>
        <aside className={classnames('s-mail-message__info', infoPiClassName)}>
          <MessagePi message={message} illustrate describe />
          <div className="s-mail-message__participants">
            <div className="s-mail-message__participants-from">
              <span className="direction"><Trans id="message.from">From:</Trans></span> {author.label}
            </div>
            <div className="s-mail-message__participants-to">
              <span className="direction"><Trans id="message.to">To:</Trans></span> <MessageRecipients message={message} user={user} />
            </div>
          </div>
          <TagList className="s-mail-message__tags" message={message} />
        </aside>
        <div className="s-mail-message__container">
          <h2 className="s-mail-message__subject">
            <TextBlock nowrap={false}>{message.subject}</TextBlock>
          </h2>
          { this.renderBody() }
          {// Do not display attachments if message is encrypted.
            !encryptionStatus &&
              <div className="m-message__attachments">
                <MessageAttachments message={message} />
              </div>
          }
        </div>
        {!noInteractions && (
          <footer className="s-mail-message__actions">
            <Button className="m-message-action-container__action" onClick={this.handleReply} icon="reply" responsive="icon-only">
              <Trans id="message-list.message.action.reply">Reply</Trans>
            </Button>
            <Button onClick={onOpenTags} className="m-message-actions-container__action" icon="tags" responsive="icon-only">
              <Trans id="message-list.message.action.tags">Tags</Trans>
            </Button>
            <Confirm
              onConfirm={this.handleMessageDelete}
              title={(<Trans id="message-list.message.confirm-delete.title">Delete a message</Trans>)}
              content={(<Trans id="message-list.message.confirm-delete.content">The deletion is permanent, are you sure you want to delete this message ?</Trans>)}
              render={confirm => (
                <Button
                  className="m-message-action-container__action"
                  onClick={confirm}
                  icon="trash"
                  responsive="icon-only"
                >
                  <Trans id="message-list.message.action.delete">Delete</Trans>
                </Button>
              )}
            />
            <Button
              className="m-message-action-container__action"
              onClick={this.handleToggleMarkAsRead}
              responsive="icon-only"
              icon={message.is_unread ? 'envelope-open' : 'envelope'}
            >
              {message.is_unread ? (
                <Trans id="message-list.message.action.mark_as_read">Mark as read</Trans>
              ) : (
                <Trans id="message-list.message.action.mark_as_unread">Mark as unread</Trans>
              )}
            </Button>
          </footer>
        )}
      </article>
    );
  }
}

export default MailMessage;
