from everett.worldgenerators import world_three
from everett.export import wheeler


def add_world(world_id, global_state_dict, global_lock):
    numeric_seed = int(world_id, 16)
    w = world_three.generate_world(seed=numeric_seed, total_cells_desired=10000)
    # for a in range(30):
    #     logger.debug(u"Waiting for {} seconds...".format(a))
    #     time.sleep(1)
    global_lock.acquire()
    (features, feature_properties) = wheeler.pack(w)
    global_state_dict[world_id].everett = w
    global_state_dict[world_id].features = features
    global_state_dict[world_id].feature_properties = feature_properties
    global_lock.release()
