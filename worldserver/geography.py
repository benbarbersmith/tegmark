from geojson import FeatureCollection, Feature, Polygon
from topojson import topojson
import json
import StringIO

import everett


def make_fake_geography():
    g = ""
    with open('worldserver/sample_geojson.js', 'r') as f:
        g = f.read()
    return json.loads(g)
    features = [
        Feature(geometry=Polygon([(50.0, 0), (50.0, 50.0), (0.0, 50.0), (0.0, 0.0), (50.0, 50.0)])),
        Feature(geometry=Polygon([(-50.0,-10.0), (-50.0, -50.0), (-10.0, -50.0), (-10.0, -10.0), (-50.0, -50.0)])),
    ]
    return FeatureCollection(features)


def geography_to_topography(gj):
    mister_buffer = StringIO.StringIO()
    mister_buffer.write(json.dumps(gj))
    mister_buffer.flush()
    mister_buffer.seek(0)

    outy_buffer = StringIO.StringIO()

    topojson(gj, outy_buffer)
    mister_buffer.close()

    return json.loads(outy_buffer.getvalue())


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
            geo_features.append(Feature(geometry=Polygon([polygon_points])))
    return FeatureCollection(geo_features)