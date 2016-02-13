from flask import Flask
from flask.ext.cors import CORS

app = Flask(__name__)
app.secret_key = "BANANAS"  # TODO: generate later
CORS(app)

from views import *
