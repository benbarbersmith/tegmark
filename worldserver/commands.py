"""
commands.py interprets commands passed from the world server server thread and translates them into operations on
everett worlds kept in memory
"""

import random
import re
from threading import Thread

import generation
import geography


world_id_regex = re.compile("[a-f0-9]{8}")


class WorldHolder(object):
    def __init__(self, id, name, properties={}):
        self._id = id
        self._properties = properties
        self._name = name
        self._geography = None
        self._topography = None
        self._everett = None

    @property
    def status(self):
        if self._geography is None:
            return "generating"
        else:
            return "complete"

    @property
    def name(self):
        return self._name

    @name.setter
    def name(self, name):
        self._name = name

    @property
    def properties(self):
        return self._properties.copy()

    @properties.setter
    def properties(self, properties):
        self._properties = {key: value for key, value in properties.iteritems()}  # and fail if it's not dict like

    @property
    def everett(self):
        return self._everett

    @everett.setter
    def everett(self, everett):
        self._everett = everett

    @property
    def geography(self):
        return self._geography

    @geography.setter
    def geography(self, geography):
        self._geography = geography

    def __dict__(self):
        return {
            'name' : self._name,
            'properties' : self._properties,
            'geography' : self._geography,
            'topography' : self._topography,
            'status' : self.status
        }

    def iteritems(self):
        return self.__dict__().iteritems()


def json_safe_world(w):
    return {key: value for key, value in w.iteritems() if key in ['properties', 'name', 'geography', 'topography', 'status']}


def list_safe_world(w):
    return {key: value for key, value in w.iteritems() if key in ['properties', 'name', 'status']}


def json_safe_cell(world_id, c):
    return {'world_id' : world_id, 'cell_id' : [c.centre.lon, c.centre.lat], 'boundary_points' : [{'boundary_id' : [b.lon, b.lat], 'altitude' : b.alt} for b in c.nodes]}

sample_world = {'properties': { 'foo' : 'bar' }, 'name' : "sample", 'geography' : geography.make_fake_geography(), 'topography': None, 'status' : 'complete'}


def resolve_command(command, global_state_dict, global_lock):
    """
    :param command: a dict constructed from the JSON of the command passed from the world client
    :param global_state_dict: a dict of { id : { properties : [], world : Everett() } }
    :param global_lock: a lock that must be acquired inside any forked threads when making changes to the global dict
    :return: a dict that can be passed to JSON.dumps()
    """

    if 'command' in command:
        if command['command'] == 'create_new_world':
            if "world_id" in command and world_id_regex.match(command["world_id"]) is not None:
                new_world_id = command["world_id"]
            else:
                new_world_id = "{:08x}".format(random.getrandbits(32))
            # t = geography.geography_to_topography(g)
            n = "World {}".format(int(new_world_id, 16))
            global_lock.acquire()
            global_state_dict[new_world_id] = WorldHolder(new_world_id, n)
            global_lock.release()
            g_thread = Thread(target=generation.add_world_geography, args=(new_world_id, global_state_dict, global_lock))
            g_thread.start()
            return {'result' : 'success', 'world_id' : new_world_id, 'world' : json_safe_world(global_state_dict[new_world_id])}
        elif command['command'] == 'list_worlds':
            return {'result' : 'success', 'worlds': {world_id: list_safe_world(world) for world_id, world in global_state_dict.iteritems()}}
        elif command['command'] == 'get_world':
            world_id = command.get('world_id', None)
            if world_id is None:
                return {'result' : 'error', 'error' : 'must specify world_id'}
            elif world_id == "sample":
                return {'result' : 'success', 'world_id' : world_id, 'world' : json_safe_world(sample_world)}
            elif world_id not in global_state_dict:
                if world_id_regex.match(world_id) is not None:
                    return resolve_command(dict(command, world_id=world_id, command="create_new_world"), global_state_dict, global_lock)
                return {'result' : 'error', 'error' : "world {} doesn't exist".format(world_id)}
            else:
                return {'result' : 'success', 'world_id' : world_id, 'world' : json_safe_world(global_state_dict[world_id])}
        elif command['command'] == 'update_world':
            world_id = command.get('world_id', None)
            if world_id is None:
                return {'result' : 'error', 'error' : 'must specify world_id'}
            elif world_id not in global_state_dict:
                return {'result' : 'error', 'error' : "world {} doesn't exist".format(world_id)}
            if 'update' not in command:
                return {'result' : 'error', 'error' : "nothing to update!"}
            result = {'result' : 'error', 'error' : "unable to update!"}
            try:
                global_lock.acquire()
                if 'properties' in command['update']:
                    global_state_dict[world_id].properties = command['update']['properties']
                if 'name' in command['update']:
                    global_state_dict[world_id].name = command['update']['name']
                if 'geography' in command['update']:
                    global_state_dict[world_id].everett.create_altitude_chains(command['update']['geography'])
                result = {'result' : 'success'}
            finally:
                global_lock.release()
            return result
        elif command['command'] == 'get_world_cell':
            world_id = command.get('world_id', None)
            lat = command.get('lat', None)
            lon = command.get('lon', None)
            if world_id is None or lat is None or lon is None:
                return {'result' : 'error', 'error' : 'must specify world_id, lat and lon'}
            elif world_id not in global_state_dict:
                return {'result' : 'error', 'error' : "world {} doesn't exist".format(world_id)}
            else:
                try:
                    cell = global_state_dict[world_id].everett.cells_by_centre_loc.get(tuple((lon, lat)))
                except KeyError as e:
                    return {'result' : 'error', 'error' : "world {} has not finished generating!".format(world_id)}
                if cell is None:
                    return {'result' : 'error', 'error' : "cell at ({},{}) in world {} doesn't exist".format(lon, lat, world_id)}
                return {'result' : 'success', 'world_id' : world_id, 'world' : json_safe_cell(world_id, cell)}
        elif command['command'] == 'delete_world':
            world_id = command.get('world_id', None)
            if world_id is None:
                return {'result' : 'error', 'error' : 'must specify world_id'}
            elif world_id not in global_state_dict:
                return {'result' : 'error', 'error' : "world {} doesn't exist".format(world_id)}
            else:
                global_lock.acquire()
                del global_state_dict[world_id]
                global_lock.release()
                return {'result' : 'success', 'world_id' : world_id, 'world' : None}
        else:
            return {'result' : 'error', 'error' : '???'}
