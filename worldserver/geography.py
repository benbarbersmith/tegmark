from geojson import GeometryCollection, Polygon
# from topojson import topojson
import json
import StringIO


def make_fake_geography():
    polygons = [
        Polygon([(50.0, 0), (50.0, 50.0), (0.0, 50.0), (0.0, 0.0), (50.0, 50.0)]),
        Polygon([(-50.0,-10.0), (-50.0, -50.0), (-10.0, -50.0), (-10.0, -10.0), (-50.0, -50.0)]),
    ]
    return GeometryCollection(polygons)


def geography_to_topography(gj):
    mister_buffer = StringIO.StringIO()
    mister_buffer.write(json.dumps(gj))
    mister_buffer.flush()
    mister_buffer.seek(0)

    outy_buffer = StringIO.StringIO()

    topojson(mister_buffer, outy_buffer)
    mister_buffer.close()

    return json.loads(outy_buffer.getvalue())