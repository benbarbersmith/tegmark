from flask import Blueprint, Response, request, url_for
from werkzeug.datastructures import Headers


import worldclient
import json

blueprint_api = Blueprint('worlds', __name__, template_folder='templates')


def json_headers():
    jh = Headers()
    jh.add('Content-Type', 'application/json')
    return jh


def binary_headers():
    bh = Headers()
    bh.add('Content-Type', 'application/octet-stream')
    return bh


def git_label(path):
    import subprocess
    import os
    os.chdir(path)
    git_path = None
    label = ""
    for possible_path in ["C:/Git/bin/git.exe", "C:/Program Files/Git/bin/git.exe",
                          "C:/Program Files (x86)/Git/bin/git.exe"]:  # this is where they live on my computer
        if os.path.isfile(possible_path):
            git_path = possible_path
            break
    try:
        label = subprocess.check_output(["git", "describe", "--always"])
    except Exception as e:
        # Git not on PATH
        if possible_path is not None:
            try:
                label = subprocess.check_output(
                    [possible_path, "describe", "--always"])
            except Exception as e:
                label = "Git not found! {}".format(e)
        else:
            label = "Git not on PATH"
    return label


@blueprint_api.route("/")
def hello_world():
    return "Hello world"


@blueprint_api.route("/version")
def about_page():
    import os
    original_dir = os.getcwd()
    tegmark_label = git_label(os.curdir)
    os.chdir(original_dir)
    return Response(json.dumps({'tegmark_version': tegmark_label}), 200, json_headers())


@blueprint_api.route('/world/<world_id>', methods=['GET', 'PUT'])
def get_world(world_id=None):
    if request.method == 'PUT':
        try:
            user_data = request.get_json()
        except Exception as e:
            return Response(json.dumps({'error' : 'Bad Request', 'message' : u"Malformed JSON? {}".format(e)}), 400, json_headers())

        command = {'command': 'take_action', 'world_id': world_id, 'actions': {}}
        for action in user_data:
            command['actions'][action] = user_data[action]
        result = worldclient.issue_world_command(command)
        if result['result'] == 'success':
            return Response(json.dumps(result), 200, json_headers())
        else:
            return Response(json.dumps(result), 422, json_headers())
    else:
        got_world = worldclient.issue_world_command(
            {'command': 'get_world', 'world_id': world_id})
        if got_world['result'] == 'success':
            return Response(json.dumps(got_world), 200, json_headers())
        else:
            return Response(json.dumps(got_world), 404, json_headers())


@blueprint_api.route('/world/<world_id>/structures', methods=['GET'])
def get_world_structures(world_id=None):
    got_world_structures = worldclient.issue_world_command(
        {'command': 'get_world_structures', 'world_id': world_id})
    if type(got_world_structures) is not dict:
        return Response(got_world_structures, 200, binary_headers())
    else:
        return Response(json.dumps(got_world_structures), 404, json_headers())


@blueprint_api.route('/world/<world_id>/features', methods=['GET'])
def get_world_features(world_id=None):
    got_world_features = worldclient.issue_world_command({'command': 'get_world_features', 'world_id': world_id})
    if got_world_features['result'] == 'success':
        return Response(json.dumps(got_world_features), 200, json_headers())
    else:
        return Response(json.dumps(got_world_features), 404, json_headers())


@blueprint_api.route('/world/<world_id>/qualities', methods=['GET'])
def get_world_qualities(world_id=None):
    got_world_qualities = worldclient.issue_world_command(
        {'command': 'get_world_qualities', 'world_id': world_id})
    if got_world_qualities['result'] == 'success':
        return Response(json.dumps(got_world_qualities), 200, json_headers())
    else:
        return Response(json.dumps(got_world_qualities), 404, json_headers())


@blueprint_api.route('/world/<world_id>/points_of_interest', methods=['GET'])
def get_world_points_of_interest(world_id=None):
    got_world_points_of_interest = worldclient.issue_world_command(
        {'command': 'get_world_points_of_interest', 'world_id': world_id})
    if got_world_points_of_interest['result'] == 'success':
        return Response(json.dumps(got_world_points_of_interest), 200, json_headers())
    else:
        return Response(json.dumps(got_world_points_of_interest), 404, json_headers())


@blueprint_api.route('/worlds/', methods=['GET'])
def worlds():
    current_worlds = worldclient.issue_world_command(
        {'command': 'list_worlds'})
    worlds_list = [{'world_id': world_id, 'name': world.get('name', 'Unnamed world'),
                    'uri': url_for('worlds.get_world', world_id=world_id)} for world_id, world in current_worlds['worlds'].iteritems()]
    return Response(json.dumps(worlds_list), 200, json_headers())
