import os
import pytest

# Ensure isolated test environment
os.environ["APP_ENV"] = "test"

@pytest.fixture(autouse=True)
def set_test_env():
    os.environ["APP_ENV"] = "test"
