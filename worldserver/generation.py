
import time
import geography
from everett.world import World

from logger import logger


def add_world_topography(world_id, global_state_dict, global_lock):
    numeric_seed = int(world_id, 16)
    w = World(seed=numeric_seed, num_altitude_spikes=(numeric_seed & 0xF/5)+2,
              total_cells_desired=3000)
    t = geography.topography_from_geography(geography.geography_from_everett_world(w))
    # for a in range(30):
    #     logger.debug(u"Waiting for {} seconds...".format(a))
    #     time.sleep(1)
    global_lock.acquire()
    global_state_dict[world_id].topography = t
    global_state_dict[world_id].everett = w
    global_lock.release()
