"""Run HTTP regression tests against the local demo API, never a remote URL."""
import os
import sys
from pathlib import Path
import pytest
import requests

os.environ['EXPO_PUBLIC_BACKEND_URL'] = 'http://127.0.0.1:8000'
if __name__ == '__main__':
    ready = requests.get('http://127.0.0.1:8000/local-demo-health', timeout=5)
    if not ready.ok or ready.json().get('mode') != 'isolated-ui-test':
        raise SystemExit('Refusing mutation tests: start the isolated demo API with npm --prefix frontend run test:ui first.')
    tests = Path(__file__).parent / 'tests'
    raise SystemExit(pytest.main([str(tests / 'backend_test.py'), str(tests / 'test_live_scheduling.py'), '-q', '--tb=short', '-p', 'no:cacheprovider', *sys.argv[1:]]))
