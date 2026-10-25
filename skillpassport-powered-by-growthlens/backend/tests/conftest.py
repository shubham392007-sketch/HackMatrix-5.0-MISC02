import os
import sys
from unittest.mock import MagicMock
import pytest

# Ensure isolated test environment
os.environ["APP_ENV"] = "test"

for mod in ("chromadb", "chromadb.config", "trafilatura", "pypdf", "fitz", "docx"):
    try:
        __import__(mod)
    except ModuleNotFoundError:
        sys.modules[mod] = MagicMock()

@pytest.fixture(autouse=True)
def set_test_env():
    os.environ["APP_ENV"] = "test"
