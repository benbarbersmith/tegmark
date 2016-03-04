import math
from geojson import FeatureCollection, Feature, Polygon
import json
from StringIO import StringIO

# import everett


def make_fake_topography():
    g = ""
    with open('worldserver/sample_geojson.json', 'r') as f:
        g = f.read()
    return topography_from_geography(json.loads(g))


def geography_from_everett_world(world):
    geo_features = []
    for (i, cell) in enumerate(world.cells):
        initial_point = None
        polygon_points = []
        for node in cell.nodes:
            if initial_point is None:
                initial_point = node
            polygon_points.append((node.longitude, node.latitude))
        if initial_point is not None:
            polygon_points.append((initial_point.longitude, initial_point.latitude))
        if len(polygon_points) > 0:
            properties = cell_properties(cell)
            properties['cell_id'] = i
            properties['latitude'] = cell.centre.latitude
            properties['longitude'] = cell.centre.longitude
            properties['terrain_type'] = cell_terrain_type(cell, properties['terrain_altitude'])
            geo_features.append(Feature(geometry=Polygon([polygon_points[::-1]]),
                                        properties=properties))
    return FeatureCollection(geo_features)

def topography_from_geography(geography):
    from topojson import topojson
    topography = topojson(json.loads(json.dumps(geography)), None, "land")  # topojson parameters here?
    return topography  # json.loads(out_io.getValue())

def cell_properties(cell):
    # THERE MIGHT BE DIFFERENT FEATURES ON EACH NODE
    counter = dict()
    values = dict()

    def add_value(key, value):
        if key in values:
            values[key] += value
            counter[key] += 1
        else:
            values[key] = value
            counter[key] = 1

    for node in cell.nodes:
        for (key, value) in node.get_features().iteritems():
            add_value(key, value)

    properties = {}
    for key in values:
        properties[key] = values[key] / counter[key]

    return properties

def cell_terrain_type(cell, alt_mean):
    #=(((-0.8)*E1^2 + 3800))
    # tile is alpine if for an altitude range of 10000 to -10000, (-0.8)*latitude^2 + 3800 < 0
    # so for an altitude range of 1 to -1, this should be 3800/10000 = 0.38
    if alt_mean <= 0 and abs(cell.centre.latitude) < 66:
         terrain_type = "sea"
    elif alt_mean <= 0 and abs(cell.centre.latitude) >= 66:
         terrain_type = "permafrost"
    elif alt_mean <= 0.05:
        terrain_type = "lowlands"
    elif alt_mean < ((-0.8)*pow(cell.centre.latitude, 2) + 3800)/10000.0: # the tree line in irl life
        terrain_type = "highlands"
    else:
        terrain_type = "alpine"
    return terrain_type
