from logger import logger


def issue_world_command(command_dict):
    import socket
    import json
    logger.debug("Creating a socket to the world server")
    client_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    client_socket.settimeout(None)
    client_socket.connect(('localhost', 31332))
    client_socket.sendall("{j}\n".format(j=json.dumps(command_dict)))
    data = ""
    try:
        buff = client_socket.recv(4096)
        while len(buff) > 0:
            data = data + buff
            buff = client_socket.recv(4096)
    except:
        pass
    try:
        response_json = data.strip()
        response = json.loads(response_json)
    except Exception as e:
        logger.exception(e)
        response = data  # It's not JSON, so assume it's binary and share as-is
    client_socket.close()
    return response
