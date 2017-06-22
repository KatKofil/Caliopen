# -*- coding: utf-8 -*-
"""Caliopen message index classes."""
from __future__ import absolute_import, print_function, unicode_literals

from elasticsearch_dsl import Mapping, Nested, Text, Keyword, Date, Boolean, \
    Integer, Completion
from caliopen_storage.store.model import BaseIndexDocument
from caliopen_main.user.store.tag_index import IndexedResourceTag

from .attachment_index import IndexedMessageAttachment
from .external_references_index import IndexedExternalReferences
from caliopen_main.objects.pi import PIIndexModel
from caliopen_main.user.store.local_identity_index import IndexedIdentity
from .participant_index import IndexedParticipant


class IndexedMessage(BaseIndexDocument):
    """Contact indexed message model."""

    doc_type = 'indexed_message'

    attachments = Nested(doc_class=IndexedMessageAttachment)
    body = Text()
    date = Date()
    date_delete = Date()
    date_insert = Date()
    discussion_id = Keyword()
    external_references = Nested(doc_class=IndexedExternalReferences)
    identities = Nested(doc_class=IndexedIdentity)
    importance_level = Integer()
    is_answered = Boolean()
    is_draft = Boolean()
    is_unread = Boolean()
    message_id = Keyword()
    parent_id = Keyword()
    participants = Nested(doc_class=IndexedParticipant)
    privacy_features = Nested()
    pi = Nested(doc_class=PIIndexModel)
    raw_msg_id = Keyword()
    subject = Text()
    tags = Nested(doc_class=IndexedResourceTag)
    type = Keyword()

    @property
    def message_id(self):
        """The compound primary key for a message is message_id."""
        return self.meta.id

    @classmethod
    def create_mapping(cls, user_id):
        """Create elasticsearch mapping object for an user."""

        m = Mapping(cls.doc_type)
        m.meta('_all', enabled=False)
        m.field('attachments', Nested(doc_class=IndexedMessageAttachment,
                                      include_in_all=True))
        m.field('body', 'text')
        m.field('date', 'date')
        m.field('date_delete', 'date')
        m.field('date_insert', 'date')
        m.field('discussion_id', Keyword())
        m.field('external_references',
                Nested(doc_class=IndexedExternalReferences,
                       include_in_all=True))
        m.field('identities',
                Nested(doc_class=IndexedIdentity, include_in_all=True))
        m.field('importance_level', 'short')
        m.field('is_answered', 'boolean')
        m.field('is_draft', 'boolean')
        m.field('is_unread', 'boolean')
        m.field('message_id', Keyword())
        m.field('parent_id', Keyword())
        participants = Nested(doc_class=IndexedParticipant, include_in_all=True,
                              properties={
                                  "address": Keyword(),
                                  "contact_id": Keyword(),
                                  "label": Text(),
                                  "protocol": Keyword(),
                                  "type": Keyword()
                              })
        m.field('participants', participants)
        m.field('privacy_features', Nested(include_in_all=True))
        m.field('raw_msg_id', Keyword())
        m.field('subject', 'text')
        m.field('tags',
                Nested(doc_class=IndexedResourceTag, include_in_all=True))
        m.field('type', Keyword())
        m.save(using=cls.client(), index=user_id)
        return m
