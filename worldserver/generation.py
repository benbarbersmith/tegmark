from everett.worldgenerators import world_three
from everett.export import wheeler
from timeit import default_timer as timer

def add_world(world_id, global_state_dict, global_lock):
    start = timer()
    w = world_three.generate_world(seed=int(world_id), total_cells_desired=10000)
    end = timer()
    print("Everett total worldgen took {0}".format(end-start))
    global_lock.acquire()
    (structures, features, points_of_interest) = wheeler.pack(w)
    global_state_dict[world_id].everett = w
    global_state_dict[world_id].structures = structures
    global_state_dict[world_id].features = features
    global_state_dict[world_id].points_of_interest = points_of_interest
    global_lock.release()
