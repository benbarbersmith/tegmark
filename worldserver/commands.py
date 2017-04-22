"""
commands.py interprets commands passed from the world server server thread and translates them into operations on
everett worlds kept in memory
"""

import random
import re
from threading import Thread

import generation


world_id_regex = re.compile("[0-9]+")


class WorldHolder(object):
    def __init__(self, id, name):
        self._id = id
        self._name = name
        self._structures = None
        self._features = None
        self._everett = None

    @property
    def status(self):
        if self._structures is None:
            return "generating"
        else:
            return "complete"

    @property
    def id(self):
        return self._id

    @property
    def name(self):
        return self._name

    @name.setter
    def name(self, name):
        self._name = name

    @property
    def structures(self):
        return self._structures

    @structures.setter
    def structures(self, structures):
        self._structures = structures

    @property
    def features(self):
        return self._features.copy()

    @features.setter
    def features(self, features):
        self._features = features

    @property
    def everett(self):
        return self._everett

    @everett.setter
    def everett(self, everett):
        self._everett = everett

    def __dict__(self):
        return {
            'id': self._id,
            'name': self._name,
            'status': self.status
        }

    def iteritems(self):
        return self.__dict__().iteritems()


def resolve_command(command, global_state_dict, global_lock):
    """
    :param command: a dict constructed from the JSON of the command passed from the world client
    :param global_state_dict: a dict of { id : { properties : [], world : Everett() } }
    :param global_lock: a lock that must be acquired inside any forked threads when making changes to the global dict
    :return: a dict that can be passed to JSON.dumps()
    """

    def safe_world(w):
        return {key: value for key, value in w.iteritems() if key in ['id', 'name', 'status']}

    def world_response(world_id):
        return {'result': 'success', 'world': safe_world(global_state_dict[world_id])}

    def error_response(error_text):
        return {'result': 'error', 'error': error_text}

    if 'command' not in command:
        return error_response('???')

    if command['command'] == 'list_worlds':
        return {'result': 'success', 'worlds': [safe_world(world) for world_id, world in global_state_dict.iteritems()]}

    if command['command'] == 'create_new_world':
        if "world_id" in command and world_id_regex.match(command["world_id"]) is not None:
            new_world_id = command["world_id"]
        else:
            new_world_id = "{}".format(random.getrandbits(32))
        n = "World {}".format(new_world_id)
        global_lock.acquire()
        global_state_dict[new_world_id] = WorldHolder(new_world_id, n)
        global_lock.release()
        g_thread = Thread(target=generation.add_world, args=(
            new_world_id, global_state_dict, global_lock))
        g_thread.start()
        return world_response(new_world_id)

    if command['command'] == 'get_world':
        world_id = command.get('world_id', None)
        if world_id is None:
            return error_response('must specify world_id')
        elif world_id not in global_state_dict:
            return resolve_command(dict(command, world_id=world_id, command="create_new_world"), global_state_dict, global_lock)
        else:
            return world_response(world_id)

    if command['command'] == 'get_world_structures':
        world_id = command.get('world_id', None)
        if world_id is None:
            return error_response('must specify world_id')
        elif world_id not in global_state_dict:
            return resolve_command(dict(command, world_id=world_id, command="create_new_world"), global_state_dict, global_lock)
        elif global_state_dict[world_id].status != "complete":
            return error_response('world is still generating')
        else:
            return global_state_dict[world_id].structures

    if command['command'] == 'get_world_features':
        world_id = command.get('world_id', None)
        if world_id is None:
            return error_response('must specify world_id')
        elif world_id not in global_state_dict:
            return resolve_command(dict(command, world_id=world_id, command="create_new_world"), global_state_dict, global_lock)
        elif global_state_dict[world_id].status != "complete":
            return error_response('world is still generating')
        else:
            return {'result': 'success', 'features': global_state_dict[world_id].features}

    if command['command'] == 'update_world':
        world_id = command.get('world_id', None)
        if world_id is None:
            return error_response('must specify world_id')
        elif world_id not in global_state_dict:
            return error_response("world {} doesn't exist".format(world_id))
        if 'update' not in command:
            return error_response("nothing to update!")

        try:
            global_lock.acquire()
            if 'properties' in command['update']:
                global_state_dict[world_id].properties = command['update']['properties']
            if 'name' in command['update']:
                global_state_dict[world_id].name = command['update']['name']
            # if 'topography' in command['update']:
            #    global_state_dict[world_id].everett.create_altitude_chains(command['update']['topography'])
            result = {'result': 'success'}
        finally:
            global_lock.release()
        return result

    if command['command'] == 'delete_world':
        world_id = command.get('world_id', None)
        if world_id is None:
            return error_response('must specify world_id')
        elif world_id not in global_state_dict:
            return error_response("world {} doesn't exist".format(world_id))
        else:
            global_lock.acquire()
            del global_state_dict[world_id]
            global_lock.release()
            return {'result': 'success', 'world_id': world_id, 'world': None}

    return {'result': 'error', 'error': '???'}
