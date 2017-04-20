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
@app.route('/<id>')
def hello(world_id=None):
    return render_template('world.html', world_id=id)

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=15000)
