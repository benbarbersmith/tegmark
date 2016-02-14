
import time
import geography
from everett.world import World

from logger import logger


def add_world_geography(world_id, global_state_dict, global_lock):
    w = World(num_voronoi_cells=1500, seed=int(world_id, 16))
    g = geography.geography_from_everett_world(w)
    # for a in range(30):
    #     logger.debug(u"Waiting for {} seconds...".format(a))
    #     time.sleep(1)
    global_lock.acquire()
    global_state_dict[world_id]['geography'] = g
    global_state_dict[world_id]['everett'] = w
    global_state_dict[world_id]['status'] = 'complete'
    global_lock.release()