from flask import Flask
from api.blueprints.worlds.views import blueprint_api


app = Flask(__name__)
app.secret_key = "BANANAS"  # TODO: generate later


app.register_blueprint(blueprint_api, url_prefix='/api')