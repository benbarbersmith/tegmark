

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
    lines = data.splitlines()
    jsons = []
    for line in lines:
        try:
            jsons.append(json.loads(line))
        except:
            pass
    sockety.close()
    return jsons