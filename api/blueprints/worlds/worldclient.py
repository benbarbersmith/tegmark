from logger import logger


def issue_world_command(command_dict):
    import socket
    import json
    logger.debug("Creating a socket to the world server")
    client_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    client_socket.settimeout(None)
    client_socket.connect(('localhost', 31332))
    client_socket.sendall(u"{j}\n".format(j=json.dumps(command_dict)))
    data = ""
    try:
        buff = client_socket.recv(4096)
        while len(buff) > 0:
            data = data + buff
            buff = client_socket.recv(4096)
    except:
        pass
    response_json = data.strip()
    try:
        response_dict = json.loads(response_json)
    except:
        response_dict = {}  # there's been a catastrophic error that we should smartly handle
    client_socket.close()
    return response_dict
