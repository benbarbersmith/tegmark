from flask import Flask

app = Flask(__name__)
app.secret_key = "BANANAS"  # TODO: generate later

from views import *
