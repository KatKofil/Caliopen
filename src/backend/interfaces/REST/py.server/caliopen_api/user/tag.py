# -*- coding: utf-8 -*-
from __future__ import absolute_import, print_function, unicode_literals

import logging

from cornice.resource import resource, view

from ..base.context import DefaultContext

from caliopen_storage.config import Configuration
from caliopen_main.user.core import Tag as CoreTag, User as CoreUser
from ..base import Api

from caliopen_main.user.parameters import NewTag
from caliopen_storage.exception import NotFound

log = logging.getLogger(__name__)


@resource(collection_path='/tags',
          path='/tags/{name}',
          name='Tag',
          factory=DefaultContext
          )
class TagAPI(Api):

    """Tag management API."""

    def __init__(self, request, context):
        self.request = request
        self.user = request.authenticated_userid

    @view(renderer='json', permission='authenticated')
    def collection_post(self):
        """Create a new tag for an user."""
        params = self.request.swagger_data
        tag = CoreTag.create(self.user, params)
        tag_url = self.request.route_path('tag', name=tag.name)
        self.request.response.location = tag_url.encode('utf-8')
        # XXX return a Location to get contact not send it direct
        return {'location': tag_url}

    @view(renderer='json', permission='authenticated')
    def collection_get(self):
        """Return list of system and user tags."""
        sys_tags = Configuration('global').get('system.default_tags')
        user = CoreUser.get(self.user.user_id)
        user_tags = user.tags
        tags = []
        for tag in sys_tags:
            tags.append({'name': tag['label'], 'type': 'system'})
        for tag in user_tags:
            tags.append({'name': tag.name, 'type': 'user'})
        return {'tags': tags, 'count': len(tags)}
