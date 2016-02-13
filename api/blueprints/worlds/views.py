from flask import Blueprint


import worldclient
import json

blueprint_api = Blueprint('worlds', __name__, template_folder='templates')


@blueprint_api.route("/")
def hello_world():
    return "Hello world"


@blueprint_api.route("/version")
def about_page():
    import subprocess,os
    git_path = None
    for possible_path in ["C:/Git/bin/git.exe", "C:/Program Files/Git/bin/git.exe",
                          "C:/Program Files (x86)/Git/bin/git.exe"]: # this is where they live on my computer
        if os.path.isfile(possible_path):
            git_path = possible_path
            break
    try:
        label = subprocess.check_output(["git", "describe", "--always"])
    except Exception as e:
        # Git not on PATH
        if possible_path is not None:
            try:
                label = subprocess.check_output([possible_path, "describe", "--always"])
            except Exception as e:
                label = "Git not found! {}".format(e)
        else:
            label = "Git not on PATH"
    return label


@blueprint_api.route('/create_world')
def create_world():
    return json.dumps(worldclient.issue_world_command({'command' : 'create_new_world'}))


@blueprint_api.route('/world/<world_id>')
def get_world(world_id=None):
    return json.dumps(worldclient.issue_world_command({'command' : 'get_world', 'world_id' : world_id}))


@blueprint_api.route('/worlds')
def list_worlds(world_id=None):
    return json.dumps(worldclient.issue_world_command({'command' : 'list_worlds'}))