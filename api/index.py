import os
import sys

# Ensure parent directory (project root) is on the Python path
# so that the Vercel serverless function can load root-level files like api.py and the src/ module.
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from server import app
