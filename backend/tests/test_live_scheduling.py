"""Live regression checks for the local isolated UI-test API only."""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta
import requests
import pytest

BASE = 'http://127.0.0.1:8000'
API = BASE + '/api'

@pytest.fixture(scope='module')
def auth():
    ready = requests.get(BASE + '/local-demo-health', timeout=5)
    assert ready.ok and ready.json()['mode'] == 'isolated-ui-test'
    def login(email):
        r = requests.post(API + '/auth/login', json={'email': email, 'password': 'Demo123!'}, timeout=10)
        assert r.ok, r.text
        return r.json()
    admin = login('fisio@demo.com')
    patient = login('joao@demo.com')
    headers = {'Authorization': 'Bearer ' + admin['access_token']}
    ph = {'Authorization': 'Bearer ' + patient['access_token']}
    return headers, ph, admin['user']['id'], patient['user']['patient_id']

def payload(auth, days=100):
    _, _, professional, patient = auth
    return {'patient_id': patient, 'professional_id': professional, 'date': (datetime.now() + timedelta(days=days)).date().isoformat(), 'time': '13:30', 'duration_min': 30, 'procedure': 'UI TEST — removable'}

def test_series_persists_and_cancel_releases_slots(auth):
    headers, _, _, _ = auth
    body = {**payload(auth), 'occurrences': 4}
    r = requests.post(API + '/appointment-series', headers=headers, json=body, timeout=15)
    assert r.ok, r.text
    series = r.json()
    try:
        saved = requests.get(API + '/appointments', headers=headers, timeout=10).json()
        docs = [a for a in saved if a.get('series_id') == series['id']]
        assert len(docs) == 4
        dates = sorted(datetime.fromisoformat(a['datetime']) for a in docs)
        assert all(b - a == timedelta(days=7) for a, b in zip(dates, dates[1:]))
        conflict = requests.post(API + '/appointment-series', headers=headers, json=body, timeout=15)
        assert conflict.status_code == 409
    finally:
        cleanup = requests.delete(API + '/appointment-series/' + series['id'], headers=headers, timeout=15)
        assert cleanup.ok and cleanup.json()['cancelled'] == 4

def test_simultaneous_overlaps_with_real_mongodb(auth):
    headers, _, _, _ = auth
    body = payload(auth, 120)
    def book(_):
        return requests.post(API + '/appointments', headers=headers, json=body, timeout=15)
    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(book, range(2)))
    try:
        assert sorted(r.status_code for r in results) == [200, 409]
    finally:
        for r in results:
            if r.ok: requests.delete(API + '/appointments/' + r.json()['id'], headers=headers, timeout=10)

def test_patient_cannot_create_series(auth):
    _, ph, _, _ = auth
    r = requests.post(API + '/appointment-series', headers=ph, json={**payload(auth), 'occurrences': 4}, timeout=10)
    assert r.status_code == 403

def test_whatsapp_consent_persists_and_revokes(auth):
    _, headers, _, _ = auth
    original = requests.get(API + '/notification-preferences', headers=headers, timeout=10).json()
    try:
        r = requests.put(API + '/notification-preferences/whatsapp', headers=headers, json={'enabled': True, 'phone': '5511999999999'}, timeout=10)
        assert r.ok and r.json()['whatsapp_status'] == 'requires_provider_setup'
        saved = requests.get(API + '/notification-preferences', headers=headers, timeout=10).json()
        assert saved['enabled'] is True
        r = requests.put(API + '/notification-preferences/whatsapp', headers=headers, json={'enabled': False}, timeout=10)
        assert r.ok and r.json()['phone'] == ''
    finally:
        requests.put(API + '/notification-preferences/whatsapp', headers=headers, json={'enabled': original['enabled'], 'phone': original['phone']}, timeout=10)
