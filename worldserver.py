from worldserver import worldserver
from threading import Thread, Timer
from multiprocessing import Process
import os
import signal
import sys

from logger import logger


def signal_handler(signal, frame):
    global t
    logger.info("Forcibly shutting down.")
    t.cancel()
    sys.exit(0)


if __name__ == '__main__':
    worldserver.run()