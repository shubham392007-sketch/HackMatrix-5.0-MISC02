"""Pytest configuration for Feature 4 test suite ensuring proper module resolution."""
import sys
from pathlib import Path

# Add project root and feature-4 directory to sys.path
TEST_DIR = Path(__file__).resolve().parent
FEAT4_DIR = TEST_DIR.parent.parent
ROOT_DIR = FEAT4_DIR.parent

for p in [str(ROOT_DIR), str(FEAT4_DIR)]:
    if p not in sys.path:
        sys.path.insert(0, p)
