"""
commands.py interprets commands passed from the world server server thread and translates them into operations on
everett worlds kept in memory
"""

import random

import geography

def resolve_command(command, global_state_dict, global_lock):
    """
    :param command: a dict constructed from the JSON of the command passed from the world client
    :param global_state_dict: a dict of { id : { properties : [], world : Everett() } }
    :param global_lock: a lock that must be acquired inside any forked threads when making changes to the global dict
    :return: a dict that can be passed to JSON.dumps()
    """

    if 'command' in command:
        if command['command'] == 'create_new_world':
            new_world_id = "{:08x}".format(random.getrandbits(32))
            g = geography.make_fake_geography()
            # t = geography.geography_to_topography(g)
            global_lock.acquire()
            global_state_dict[new_world_id] = {'properties': { 'foo' : 'bar' }, 'world' : ':)', 'geography' : g,
                                               'topography': None}
            global_lock.release()
            return {'result' : 'success', 'world_id' : new_world_id, 'world' : global_state_dict[new_world_id]}
        elif command['command'] == 'list_worlds':
            return {'result' : 'success', 'worlds' : global_state_dict}
        elif command['command'] == 'get_world':
            world_id = command.get('world_id', None)
            if world_id is None:
                return {'result' : 'error', 'error' : 'must specify world_id'}
            elif world_id not in global_state_dict:
                return {'result' : 'error', 'error' : "world {} doesn't exist".format(world_id)}
            else:
                return {'result' : 'success', 'world_id' : world_id, 'world' : global_state_dict[world_id]}
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