

def issue_world_command(command_dict):
    import socket, json
    #print "making the socket"
    sockety = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sockety.settimeout(None)
    #print "made the socket. connecting to the socket"
    sockety.connect(('localhost', 31332))
    #print "connected to the socket"
    sockety.sendall(u"{j}\n".format(j=json.dumps(command_dict)))
    data = ""
    try:
        buff = sockety.recv(4096)
        while len(buff) > 0:
            data = data + buff
            buff = sockety.recv(4096)
    except:
        pass
    response_json = data.strip()
    try:
        response_dict = json.loads(response_json)
    except:
        response_dict = {}  # there's been a catastrophic error that we should smartly handle
    sockety.close()
    return response_dict