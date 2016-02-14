
import time
import geography
from everett.world import World

from logger import logger


def add_world_geography(world_id, global_state_dict, global_lock):
    numeric_seed = int(world_id, 16)
    w = World(seed=numeric_seed, num_altitude_spikes=(numeric_seed & 0xF/5)+2,
              seeds_along_longitude=20, seeds_along_latitude=20,
              min_point_dist=0.035, min_angle=4, max_angle=12,
              num_child_points=20, failure_limit=5, num_adjacent=1)
    g = geography.geography_from_everett_world(w)
    # for a in range(30):
    #     logger.debug(u"Waiting for {} seconds...".format(a))
    #     time.sleep(1)
    global_lock.acquire()
    global_state_dict[world_id].geography = g
    global_state_dict[world_id].everett = w
    global_lock.release()
