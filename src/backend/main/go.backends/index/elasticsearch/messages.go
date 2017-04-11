// Copyleft (ɔ) 2017 The Caliopen contributors.
// Use of this source code is governed by a GNU AFFERO GENERAL PUBLIC
// license (AGPL) that can be found in the LICENSE file.

package index

import (
	"context"
	"github.com/CaliOpen/CaliOpen/src/backend/defs/go-objects"
	log "github.com/Sirupsen/logrus"
)

func (es *ElasticSearchBackend) UpdateMessage(msg *objects.Message, fields map[string]interface{}) error {

	update, err := es.Client.Update().Index(msg.User_id.String()).Type("indexed_message").Id(msg.Message_id.String()).
		Doc(fields).
		Do(context.TODO())
	if err != nil {
		log.WithError(err).Warn("backend Index: updateMessage operation failed")
		return err
	}
	log.Infof("New version of indexed msg %s is now %d", update.Id, update.Version)
	return nil
}

func (es *ElasticSearchBackend) IndexMessage(msg *objects.Message) error {

	es_msg, err := msg.MarshalES()
	if err != nil {
		return err
	}

	resp, err := es.Client.Index().Index(msg.User_id.String()).Type("indexed_message").Id(msg.Message_id.String()).
		BodyString(string(es_msg)).
		Refresh("true").
		Do(context.TODO())
	if err != nil {
		log.WithError(err).Warn("backend Index: IndexMessage operation failed")
		return err
	}
	log.Infof("New msg indexed with id %s", resp.Id)
	return nil

}