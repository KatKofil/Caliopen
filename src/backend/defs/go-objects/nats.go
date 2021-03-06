/*
 * // Copyleft (ɔ) 2018 The Caliopen contributors.
 * // Use of this source code is governed by a GNU AFFERO GENERAL PUBLIC
 * // license (AGPL) that can be found in the LICENSE file.
 */

package objects

// DeliveryAck holds reply from nats when using request/reply system for messages
type DeliveryAck struct {
	Err      bool   `json:"error"`
	Response string `json:"message,omitempty"`
}

// a lighter struct to reply to a request
type Ack struct {
	Error    error  `json:"error"`
	Ok       bool   `json:"ok"`
	Response string `json:"message,omitempty"`
}

// model for job request sent by workers to idpoller
type WorkerRequest struct {
	Worker string      `json:"worker"`
	Order  BrokerOrder `json:"order"`
}

// model to send messages to idpoller
type RemoteIDNatsMessage struct {
	IdentityId string `json:"identity_id"`
	Order      string `json:"order"`
	OrderParam string `json:"order_param"`
	Protocol   string `json:"protocol"`
	UserId     string `json:"user_id"`
}

// model for orders sent to workers
type BrokerOrder struct {
	MessageId  string `json:"message_id"`
	Order      string `json:"order"`
	IdentityId string `json:"identity_id"`
	UserId     string `json:"user_id"`
}

// IMAPorder is a BrokerOrder variant for imap
type IMAPorder struct {
	Order      string `json:"order"`
	IdentityId string `json:"identity_id"`
	UserId     string `json:"user_id"`
	// optional fields sent by imapctl
	Login    string `json:"login"`
	Mailbox  string `json:"mailbox"`
	Password string `json:"password"`
	Server   string `json:"server"`
}
