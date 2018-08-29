import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Spinner } from '../../../../components';
import Message from '../../components/Message';
import ProtocolSwitch from '../../components/ProtocolSwitch';
import { calcPiValue } from '../../../../services/pi';

import './style.scss';

class MessageList extends Component {
  static propTypes = {
    messages: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
    loadMore: PropTypes.node,
    scrollToTarget: PropTypes.func,
    isFetching: PropTypes.bool.isRequired,
    onMessageRead: PropTypes.func.isRequire,
    onMessageUnread: PropTypes.func.isRequired,
    onMessageDelete: PropTypes.func.isRequired,
    user: PropTypes.shape({}).isRequired,
    hash: PropTypes.string,
  };

  static defaultProps = {
    scrollToTarget: undefined,
    hash: undefined,
    loadMore: null,
  };

  /**
   * Find message immediately preceding a specific message in discussion.
   * @param {object} - message
   */
  findMessageBefore(message) {
    const { messages } = this.props;
    const index = messages.indexOf(message) - 1;

    return messages[index];
  }

  render() {
    const {
      messages, isFetching, hash, scrollToTarget,
      onMessageRead, onMessageUnread, onMessageDelete,
      loadMore, user,
    } = this.props;
    const messageList = [];

    return (
      <div className="m-message-list">
        <Spinner className="m-message-list__spinner" isLoading={isFetching} />
        <div className="m-message-list__load-more">
          {loadMore}
        </div>
        {(messages.length > 0) && messages.reduce((acc, message) => {
          if (message.type !== 'email' && messageList.length > 0
            && this.findMessageBefore(message).type !== message.type) {
            messageList.push(<ProtocolSwitch
              newProtocol={message.type}
              pi={calcPiValue(message)}
              date={message.date}
              key={`switch-${message.message_id}`}
            />);
          }

          messageList.push(<Message
            onMessageRead={onMessageRead}
            onMessageUnread={onMessageUnread}
            onMessageDelete={onMessageDelete}
            message={message}
            key={message.message_id}
            scrollToMe={message.message_id === hash ? scrollToTarget : undefined}
            user={user}
          />);

          return messageList;
        }, messageList)}
      </div>
    );
  }
}

export default MessageList;
