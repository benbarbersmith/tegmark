
import time
import geography
from everett.world import World

from logger import logger


def add_world_geography(world_id, global_state_dict, global_lock):
    numeric_seed = int(world_id, 16)
    w = World(num_voronoi_cells=2500, seed=numeric_seed, num_altitude_spikes=(numeric_seed& 0xF/2)+2)
    g = geography.geography_from_everett_world(w)
    # for a in range(30):
    #     logger.debug(u"Waiting for {} seconds...".format(a))
    #     time.sleep(1)
    global_lock.acquire()
    global_state_dict[world_id].geography = g
    global_state_dict[world_id].everett = w
    global_lock.release()
