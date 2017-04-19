# -*- coding: utf-8 -*-
import SocketServer
import threading
import json
import traceback, sys

import commands

from logger import logger

import everett


class ThreadedServer(SocketServer.ThreadingMixIn, SocketServer.TCPServer):
    # Ctrl-C will cleanly kill all spawned threads
    daemon_threads = True
    # much faster rebinding
    allow_reuse_address = True

    timeout = 2

    def __init__(self, server_address, request_handler_class):
        SocketServer.TCPServer.__init__(self, server_address, request_handler_class)
        self.global_state_dict = {}
        self.global_lock = threading.RLock()

    def socket_close(self):
        self.socket.close()


class ThreadedCommandHandler(SocketServer.StreamRequestHandler):

    def finish(self):
        return SocketServer.StreamRequestHandler.finish(self)

    def setup(self):
        return SocketServer.StreamRequestHandler.setup(self)

    def close_out(self):
        # done_json = { 'command' : 'done' }
        # self.wfile.write(u"{dump}\n".format(dump=json.dumps(done_json)))
        self.wfile.flush()

    def handle(self):
        # self.rfile is a file-like object created by the handler;
        # we can now use e.g. readline() instead of raw recv() calls

        try:
            line = self.rfile.readline().decode('utf8')
            self.data = u"{data}".format(data=line)
            logger.debug(u"Message received from flask websever")
            # logger.debug(u"Raw data {data}".format(data=self.data))
            world_command = json.loads(self.data, strict=False)
            response = commands.resolve_command(world_command, self.server.global_state_dict, self.server.global_lock)
        except Exception, e:
            logger.exception(e)
            response = {}
        if type(response) is dict:
            dumped_string = json.dumps(response)
            if len(dumped_string.strip()) > 0:
                # logger.debug(u"Writing data to socket {data}".format(data=response))
                logger.debug(u"Sending data back to waiting flask webserver")
                self.wfile.write(u"{j}\n".format(j=json.dumps(response)))
        else:
            self.wfile.write(response)
        self.close_out()
        return


def run(port=31332):
    host, port = "127.0.0.1", port
    worlds = {}
    worlds_lock = threading.RLock()

    # Create the server
    server = ThreadedServer((host, port), ThreadedCommandHandler)

    # Activate the server; this will keep running until you
    # interrupt the program with Ctrl-C
    server.serve_forever()
