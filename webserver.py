from flask import Flask
from flask import render_template
from flask.ext.cors import CORS
from flask_assets import Environment

from api.blueprints.worlds.views import blueprint_api

app = Flask(__name__)

app.secret_key = "BANANAS"  # TODO: generate later
CORS(app)

assets = Environment()
assets.init_app(app)

app.register_blueprint(blueprint_api, url_prefix='/api')

@app.route('/')
@app.route('/<world_id>')
def hello(world_id=None):
    from everett.features.climate.holdridge import HoldridgeBiomes
    return render_template('world.html', world_id=world_id, biomes=HoldridgeBiomes.biome_list())

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=15000, threaded=True)
