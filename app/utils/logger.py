import logging
from logging.handlers import RotatingFileHandler
import os

LOG_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'logs')
os.makedirs(LOG_DIR, exist_ok=True)
LOG_FILE = os.path.join(LOG_DIR, 'app.log')

handler = RotatingFileHandler(LOG_FILE, maxBytes=5*1024*1024, backupCount=2)
formatter = logging.Formatter('%(asctime)s %(levelname)s %(name)s %(message)s')
handler.setFormatter(formatter)

logger = logging.getLogger('app')
logger.setLevel(logging.INFO)
if not logger.handlers:
    logger.addHandler(handler)
