
import time
import geography

from logger import logger


def add_world_geography(world_id, global_state_dict, global_lock):

    g = geography.make_fake_geography()
    # for a in range(30):
    #     logger.debug(u"Waiting for {} seconds...".format(a))
    #     time.sleep(1)
    global_lock.acquire()
    global_state_dict[world_id]['geography'] = g
    global_state_dict[world_id]['status'] = 'complete'
    global_lock.release()