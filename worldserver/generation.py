from everett.worldgenerators import world_three
from everett.export import wheeler


def add_world(world_id, global_state_dict, global_lock):
    w = world_three.generate_world(seed=int(world_id), total_cells_desired=10000)
    # for a in range(30):
    #     logger.debug(u"Waiting for {} seconds...".format(a))
    #     time.sleep(1)
    global_lock.acquire()
    (structures, features) = wheeler.pack(w)
    global_state_dict[world_id].everett = w
    global_state_dict[world_id].structures = structures
    global_state_dict[world_id].features = features
    global_lock.release()
