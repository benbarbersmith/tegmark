from geojson import FeatureCollection, Feature, Polygon
import json
# import StringIO

# import everett


def make_fake_geography():
    g = ""
    with open('worldserver/sample_geojson.json', 'r') as f:
        g = f.read()
    return json.loads(g)


def geography_from_everett_world(world):
    geo_features = []
    for cell in world.cells:
        initial_point = None
        polygon_points = []
        for node in cell.nodes:
            if initial_point is None:
                initial_point = node
            polygon_points.append((node.lon, node.lat))
        if initial_point is not None:
            polygon_points.append((initial_point.lon, initial_point.lat))
        if len(polygon_points) > 0:
            terrain_type = cell_terrain_type(cell)
            geo_features.append(Feature(geometry=Polygon([polygon_points[::-1]]),
                                        properties={'cell_id':[cell.centre.lon, cell.centre.lat],
                                                    'terrain_type' : terrain_type['terrain_type'], 'altitude' : terrain_type['altitude'] }))
    return FeatureCollection(geo_features)


def cell_terrain_type(cell):
    #=(((-0.8)*E1^2 + 3800))
    # tile is alpine if for an altitude range of 10000 to -10000, (-0.8)*lat^2 + 3800 < 0
    # so for an altitude range of 1 to -1, this should be 3800/10000 = 0.38
    alt_sum = 0.0
    alt_count = 0
    for node in cell.nodes:
        alt_count += 1
        alt_sum += node.alt
    alt_mean = alt_sum/float(alt_count)
    if alt_mean <= 0:
        return {'altitude' : alt_mean, 'terrain_type' : "sea" }
    elif alt_mean <= 0.05:
        return {'altitude' : alt_mean, 'terrain_type' : "lowlands" }
    elif alt_mean < ((-0.8)*pow(cell.centre.lat, 2) + 3800)/10000.0: # the tree line in irl life
        return {'altitude' : alt_mean, 'terrain_type' : "highlands" }
    else:
        return {'altitude' : alt_mean, 'terrain_type' : "alpine" }
