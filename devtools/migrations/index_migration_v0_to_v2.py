# -*- coding: utf-8 -*-
from __future__ import absolute_import, print_function, unicode_literals
import logging
from caliopen_main.contact.objects.contact import Contact
from caliopen_main.message.objects.message import Message

log = logging.getLogger(__name__)


class IndexMigrator(object):
    def __init__(self, es_client):
        self.es_client = es_client
        self.types = (Contact(), Message())

    def run(self):
        indexes = self.es_client.indices.get("_all")
        log.warn("found {} indexes".format(len(indexes)))
        m_version = "v2"
        total = len(indexes)
        ok = 0
        errors = 0
        count = 1
        for index in indexes:
            new_index = index + "_" + m_version
            log.warn("Operation {}/{}".format(count, total))
            count += 1
            try:
                self.create_new_index(new_index)
                self.copy_old_to_new(index, new_index)
            except Exception as exc:
                log.warn("Aborting migration operations for {}".format(index))
                errors += 1
                continue
                # do not try operations below if above reindexation has failed
            try:
                self.delete_old_index(index)
                self.create_alias(index, new_index)
            except Exception:
                errors += 1
                continue

            ok += 1

        log.warn("{} operations completed\n    OK : {}\n    Errors: {}".format(
            count, ok, errors))

    def create_new_index(self, index):
        """Creates user index and setups mappings."""
        log.warn('Creating new index {}'.format(index))

        try:
            self.es_client.indices.create(
                index=index,
                body={
                    "settings": {
                        "analysis": {
                            "analyzer": {
                                "text_analyzer": {
                                    "type": "custom",
                                    "tokenizer": "lowercase",
                                    "filter": [
                                        "ascii_folding"
                                    ]
                                },
                                "email_analyzer": {
                                    "type": "custom",
                                    "tokenizer": "email_tokenizer",
                                    "filter": [
                                        "ascii_folding"
                                    ]
                                }
                            },
                            "filter": {
                                "ascii_folding": {
                                    "type": "asciifolding",
                                    "preserve_original": True
                                }
                            },
                            "tokenizer": {
                                "email_tokenizer": {
                                    "type": "ngram",
                                    "min_gram": 3,
                                    "max_gram": 25
                                }
                            }
                        }
                    }
                })
        except Exception as exc:
            log.error("failed to create index {} : {}".format(index, exc))
            raise exc

        # PUT mappings for each type
        for kls in self.types:
            kls._index_class().create_mapping(index)

    def copy_old_to_new(self, old, new):
        log.warn("Copying data from {} to {}".format(old, new))

        try:
            self.es_client.reindex(body={
                "source": {
                    "index": old
                },
                "dest": {
                    "index": new
                }
            })
        except Exception as exc:
            log.error(
                "failed to copy index {} to {} : {}".format(old, new, exc))
            raise exc

    def delete_old_index(self, index):
        log.warn("Deleting old index {}".format(index))

        try:
            self.es_client.indices.delete(index)
        except Exception as exc:
            log.error("failed to delete old index {} : {}".format(index, exc))
            raise exc

    def create_alias(self, alias, index):
        log.warn("Creating an alias {} pointing to {}".format(alias, index))

        try:
            self.es_client.indices.put_alias(index=index, name=alias)
        except Exception as exc:
            log.error("failed to create alias {} : {}".format(alias, exc))
            raise exc
