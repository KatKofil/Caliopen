import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import { reply } from '../../../../modules/draftMessage';
import { updateTagCollection } from '../../../../modules/tags';
import { messageEncryptionStatusSelector } from '../../../../modules/encryption';
import { isMessageEncrypted } from '../../../../services/encryption';

import Presenter from './presenter';

const onReply = ({ message }) => (dispatch) => {
  dispatch(reply({ internalId: message.discussion_id, message }));
};

const messageSelector = (state, { message }) => message;

const mapStateToProps = createSelector(
  [messageEncryptionStatusSelector, messageSelector],
  (messageEncryptionStatus, message) => {
    const encryptionStatus = messageEncryptionStatus[message.message_id];

    return {
      isLocked: isMessageEncrypted(message) &&
        (!encryptionStatus || (encryptionStatus && encryptionStatus.status !== 'decrypted')),
      encryptionStatus,
      message: (encryptionStatus && encryptionStatus.decryptedMessage) || message,
    };
  }
);

const mapDispatchToProps = dispatch => bindActionCreators({
  onReply,
  updateTagCollection,
}, dispatch);

export default connect(mapStateToProps, mapDispatchToProps)(Presenter);
