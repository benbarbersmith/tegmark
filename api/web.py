from flask import Flask
from api.blueprints.worlds.views import blueprint_api
from flask.ext.cors import CORS

app = Flask(__name__)
app.secret_key = "BANANAS"  # TODO: generate later
CORS(app)


app.register_blueprint(blueprint_api, url_prefix='/api')