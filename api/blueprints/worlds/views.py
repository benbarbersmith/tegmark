from flask import Blueprint, Response, request, url_for
from werkzeug.datastructures import Headers


import worldclient
import json

blueprint_api = Blueprint('worlds', __name__, template_folder='templates')


def json_headers():
    jh = Headers()
    jh.add('Content-Type', 'application/json')
    return jh


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
    return Response(json.dumps(worldclient.issue_world_command({'command': 'create_new_world'})), 202, json_headers())


@blueprint_api.route('/world/<world_id>')
def get_world(world_id=None):
    return json.dumps(worldclient.issue_world_command({'command': 'get_world', 'world_id': world_id}))


@blueprint_api.route('/worlds/', methods=['GET', 'POST'])
def worlds():
    if request.method == 'POST':
        world = worldclient.issue_world_command({'command': 'create_new_world'})
        return Response(json.dumps({'world_id': world['world_id'],
                                   'uri': url_for('worlds.get_world', world_id=world['world_id'])}), 202, json_headers())
    else:  # if request.method == 'GET':
        current_worlds = worldclient.issue_world_command({'command': 'list_worlds'})
        worlds_list = [{'world_id': k, 'world': v} for k, v in current_worlds['worlds'].iteritems()]
        return Response(json.dumps(worlds_list), 200, json_headers())