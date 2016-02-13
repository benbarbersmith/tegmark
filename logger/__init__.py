# -*- coding: utf-8 -*-
import logging
import logging.handlers as handlers

logger = logging.getLogger(__name__)


logFormatter = logging.Formatter("%(asctime)s [%(filename)-12.12s:%(funcName)-17.17s] %(levelname)-5.5s  %(message)s")


consoleHandler = logging.StreamHandler()
consoleHandler.setFormatter(logFormatter)
logger.addHandler(consoleHandler)

logger.setLevel(logging.DEBUG)