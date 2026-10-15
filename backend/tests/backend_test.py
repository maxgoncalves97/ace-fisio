"""FisioPilates backend regression tests.

Covers: auth, RBAC, patients, anamnese, evolutions, assessments,
appointments (incl. 12h rule, conflict), attendance summary,
exercises, notes, payments, notifications, dashboards, procedures.
"""
import os
from datetime import datetime, timedelta

import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "http://localhost:8000").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_FISIO = ("fisio@demo.com", "Demo123!")
ADMIN_PILATES = ("pilates@demo.com", "Demo123!")
PATIENT = ("joao@demo.com", "Demo123!")


# ------- helpers / fixtures -------
def _login(email, pw):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": pw}, timeout=15)
    assert r.status_code == 200, f"login {email} -> {r.status_code} {r.text}"
    return r.json()


@pytest.fixture(scope="session")
def fisio_auth():
    data = _login(*ADMIN_FISIO)
    return {"Authorization": f"Bearer {data['access_token']}"}, data["user"]


@pytest.fixture(scope="session")
def pilates_auth():
    data = _login(*ADMIN_PILATES)
    return {"Authorization": f"Bearer {data['access_token']}"}, data["user"]


@pytest.fixture(scope="session")
def patient_auth():
    data = _login(*PATIENT)
    return {"Authorization": f"Bearer {data['access_token']}"}, data["user"]


# ============ AUTH ============
class TestAuth:
    def test_login_admin_fisio(self):
        data = _login(*ADMIN_FISIO)
        assert data["user"]["role"] == "admin_fisio"
        assert "password_hash" not in data["user"]
        assert "_id" not in data["user"]

    def test_login_admin_pilates(self):
        assert _login(*ADMIN_PILATES)["user"]["role"] == "admin_pilates"

    def test_login_patient(self):
        d = _login(*PATIENT)
        assert d["user"]["role"] == "patient"
        assert d["user"].get("patient_id")

    def test_login_wrong_password(self):
        r = requests.post(f"{API}/auth/login", json={"email": "fisio@demo.com", "password": "wrong"})
        assert r.status_code == 401

    def test_me_returns_role(self, fisio_auth):
        headers, _ = fisio_auth
        r = requests.get(f"{API}/auth/me", headers=headers)
        assert r.status_code == 200
        body = r.json()
        assert body["role"] == "admin_fisio"
        assert "password_hash" not in body


# ============ RBAC ============
class TestRBAC:
    def test_patient_cannot_list_patients(self, patient_auth):
        h, _ = patient_auth
        r = requests.get(f"{API}/patients", headers=h)
        assert r.status_code == 403

    def test_patient_cannot_create_patient(self, patient_auth):
        h, _ = patient_auth
        r = requests.post(f"{API}/patients", headers=h, json={"name": "X"})
        assert r.status_code == 403

    def test_patient_cannot_read_evolutions(self, patient_auth):
        h, u = patient_auth
        r = requests.get(f"{API}/patients/{u['patient_id']}/evolutions", headers=h)
        assert r.status_code == 403

    def test_patient_can_get_own_patient(self, patient_auth):
        h, u = patient_auth
        r = requests.get(f"{API}/patients/{u['patient_id']}", headers=h)
        assert r.status_code == 200

    def test_patient_cannot_get_other_patient(self, patient_auth, fisio_auth):
        fh, _ = fisio_auth
        others = [p for p in requests.get(f"{API}/patients", headers=fh).json() if p["email"] != "joao@demo.com"]
        assert others
        h, _ = patient_auth
        r = requests.get(f"{API}/patients/{others[0]['id']}", headers=h)
        assert r.status_code == 403


# ============ PATIENTS ============
class TestPatients:
    def test_list_patients(self, fisio_auth):
        h, _ = fisio_auth
        r = requests.get(f"{API}/patients", headers=h)
        assert r.status_code == 200
        assert len(r.json()) >= 5

    def test_list_filter_area_fisio(self, fisio_auth):
        h, _ = fisio_auth
        r = requests.get(f"{API}/patients?area=fisio", headers=h)
        assert r.status_code == 200
        for p in r.json():
            assert p["area"] in ("fisio", "ambos")

    def test_list_search_q(self, fisio_auth):
        h, _ = fisio_auth
        r = requests.get(f"{API}/patients?q=Joao", headers=h)
        assert r.status_code == 200

    def test_create_update_patient_with_login(self, fisio_auth):
        h, _ = fisio_auth
        payload = {
            "name": "TEST Paciente Auto",
            "area": "fisio",
            "email": "test_auto@example.com",
            "phone": "(11) 90000-0000",
            "create_login": True,
            "login_password": "Test123!",
        }
        r = requests.post(f"{API}/patients", headers=h, json=payload)
        assert r.status_code == 200, r.text
        pid = r.json()["id"]
        # verify login works
        lg = requests.post(f"{API}/auth/login", json={"email": "test_auto@example.com", "password": "Test123!"})
        assert lg.status_code == 200
        # verify GET
        g = requests.get(f"{API}/patients/{pid}", headers=h).json()
        assert g["name"] == "TEST Paciente Auto"
        # update
        u = requests.put(f"{API}/patients/{pid}", headers=h, json={**payload, "phone": "(11) 91111-1111"})
        assert u.status_code == 200
        assert u.json()["phone"] == "(11) 91111-1111"
        # cleanup
        requests.delete(f"{API}/patients/{pid}", headers=h)


# ============ ANAMNESE / EVOLUTIONS / ASSESSMENTS ============
class TestClinicalDocs:
    def _joao_id(self, headers):
        r = requests.get(f"{API}/patients?q=Almeida", headers=headers).json()
        return r[0]["id"]

    def test_anamnese_upsert(self, fisio_auth):
        h, _ = fisio_auth
        pid = self._joao_id(h)
        r = requests.get(f"{API}/patients/{pid}/anamnese", headers=h)
        assert r.status_code == 200
        body = r.json()
        upd = {**{k: body.get(k, "") for k in ["queixa_principal", "tempo_queixa", "qual_tratamento", "exames", "diagnostico", "condicao_medica", "cirurgias", "medicamentos", "observacoes"]},
               "tratamento_anterior": bool(body.get("tratamento_anterior", False))}
        upd["observacoes"] = "TEST updated"
        put = requests.put(f"{API}/patients/{pid}/anamnese", headers=h, json=upd)
        assert put.status_code == 200
        assert put.json()["observacoes"] == "TEST updated"

    def test_evolutions_list_and_create(self, fisio_auth):
        h, _ = fisio_auth
        pid = self._joao_id(h)
        c = requests.post(f"{API}/patients/{pid}/evolutions", headers=h, json={
            "area": "fisio", "tipo_atendimento": "TEST", "evolucao_clinica": "TEST evo"})
        assert c.status_code == 200
        assert c.json()["evolucao_clinica"] == "TEST evo"
        l = requests.get(f"{API}/patients/{pid}/evolutions", headers=h)
        assert l.status_code == 200 and len(l.json()) >= 1

    def test_assessments_list_and_create(self, fisio_auth):
        h, _ = fisio_auth
        pid = self._joao_id(h)
        c = requests.post(f"{API}/patients/{pid}/assessments", headers=h,
                          json={"dor": 3, "amplitude_movimento": 100})
        assert c.status_code == 200
        l = requests.get(f"{API}/patients/{pid}/assessments", headers=h).json()
        assert len(l) >= 4
        dates = [a["date"] for a in l]
        assert dates == sorted(dates), "assessments not in chronological order"


# ============ APPOINTMENTS ============
class TestAppointments:
    def test_admin_can_book_within_12h(self, fisio_auth):
        h, u = fisio_auth
        patients = requests.get(f"{API}/patients?area=fisio", headers=h).json()
        pid = patients[0]["id"]
        dt = datetime.now() + timedelta(hours=2)
        # find non-conflicting slot by picking odd time
        body = {"patient_id": pid, "area": "fisio", "procedure": "TEST Admin",
                "date": dt.date().isoformat(), "time": "23:17", "duration_min": 30}
        r = requests.post(f"{API}/appointments", headers=h, json=body)
        assert r.status_code == 200, r.text
        aid = r.json()["id"]
        # cleanup
        requests.delete(f"{API}/appointments/{aid}", headers=h)

    def test_patient_12h_rule_blocks(self, patient_auth):
        h, u = patient_auth
        dt = datetime.now() + timedelta(hours=2)
        body = {"patient_id": u["patient_id"], "area": "fisio", "procedure": "TEST",
                "date": dt.date().isoformat(), "time": dt.strftime("%H:%M")}
        r = requests.post(f"{API}/appointments", headers=h, json=body)
        assert r.status_code == 400
        assert "12 horas" in r.json().get("detail", "")

    def test_patient_can_book_beyond_12h(self, patient_auth, fisio_auth):
        h, u = patient_auth
        dt = datetime.now() + timedelta(hours=48)
        body = {"patient_id": u["patient_id"], "professional_id": fisio_auth[1]["id"], "area": "fisio", "procedure": "TEST Patient",
                "date": dt.date().isoformat(), "time": "22:37", "duration_min": 30}
        r = requests.post(f"{API}/appointments", headers=h, json=body)
        assert r.status_code == 200, r.text
        aid = r.json()["id"]
        # cleanup via admin (patient can also DELETE)
        requests.delete(f"{API}/appointments/{aid}", headers=h)

    def test_conflict_same_professional(self, fisio_auth):
        h, u = fisio_auth
        patients = requests.get(f"{API}/patients?area=fisio", headers=h).json()
        pid = patients[0]["id"]
        dt = datetime.now() + timedelta(days=5)
        base = {"patient_id": pid, "area": "fisio", "procedure": "TEST Conflict",
                "date": dt.date().isoformat(), "time": "10:00", "duration_min": 60,
                "professional_id": u["id"]}
        r1 = requests.post(f"{API}/appointments", headers=h, json=base)
        assert r1.status_code == 200
        try:
            r2 = requests.post(f"{API}/appointments", headers=h, json=base)
            assert r2.status_code == 409
        finally:
            requests.delete(f"{API}/appointments/{r1.json()['id']}", headers=h)

    def test_list_appointments_filters(self, fisio_auth):
        h, _ = fisio_auth
        r = requests.get(f"{API}/appointments?area=fisio", headers=h)
        assert r.status_code == 200
        for a in r.json():
            assert a["area"] == "fisio"

    def test_status_transitions(self, fisio_auth):
        h, u = fisio_auth
        patients = requests.get(f"{API}/patients?area=fisio", headers=h).json()
        pid = patients[0]["id"]
        dt = datetime.now() + timedelta(days=10)
        r = requests.post(f"{API}/appointments", headers=h, json={
            "patient_id": pid, "area": "fisio", "procedure": "TEST",
            "date": dt.date().isoformat(), "time": "07:03", "duration_min": 30})
        aid = r.json()["id"]
        for s in ("confirmado", "presente", "faltou"):
            pr = requests.patch(f"{API}/appointments/{aid}/status", headers=h, json={"status": s})
            assert pr.status_code == 200 and pr.json()["status"] == s
        requests.delete(f"{API}/appointments/{aid}", headers=h)


# ============ ATTENDANCE / EXERCISES / NOTES / PAYMENTS ============
class TestPatientResources:
    def _joao(self, headers):
        return requests.get(f"{API}/patients?q=Almeida", headers=headers).json()[0]["id"]

    def test_attendance_summary(self, fisio_auth):
        h, _ = fisio_auth
        pid = self._joao(h)
        r = requests.get(f"{API}/patients/{pid}/attendance-summary", headers=h)
        assert r.status_code == 200
        s = r.json()
        for k in ("realizadas", "faltas", "cancelamentos", "ultimo_atendimento", "proximo_atendimento"):
            assert k in s

    def test_exercises_flow(self, fisio_auth, patient_auth):
        h, _ = fisio_auth
        pid = self._joao(h)
        c = requests.post(f"{API}/patients/{pid}/exercises", headers=h,
                          json={"name": "TEST Ex", "series": "3", "repetitions": "10"})
        assert c.status_code == 200
        eid = c.json()["id"]
        # patient can list own
        ph, _ = patient_auth
        pl = requests.get(f"{API}/patients/{pid}/exercises", headers=ph)
        assert pl.status_code == 200
        # toggle active
        t = requests.patch(f"{API}/exercises/{eid}", headers=h, json={"active": False})
        assert t.status_code == 200 and t.json()["active"] is False
        d = requests.delete(f"{API}/exercises/{eid}", headers=h)
        assert d.status_code == 200

    def test_notes_flow(self, fisio_auth, patient_auth):
        h, _ = fisio_auth
        pid = self._joao(h)
        c = requests.post(f"{API}/patients/{pid}/notes", headers=h, json={"text": "TEST orientação"})
        assert c.status_code == 200
        ph, _ = patient_auth
        l = requests.get(f"{API}/patients/{pid}/notes", headers=ph)
        assert l.status_code == 200 and any(n["text"] == "TEST orientação" for n in l.json())

    def test_payments_flow(self, fisio_auth):
        h, _ = fisio_auth
        pid = self._joao(h)
        c = requests.post(f"{API}/payments", headers=h, json={
            "patient_id": pid, "area": "fisio", "description": "TEST pay", "amount": 100.0, "status": "pendente"})
        assert c.status_code == 200
        payid = c.json()["id"]
        p = requests.patch(f"{API}/payments/{payid}/pay", headers=h)
        assert p.status_code == 200 and p.json()["status"] == "pago"
        assert p.json()["paid_date"] is not None


# ============ NOTIFICATIONS / DASHBOARDS / PROCEDURES ============
class TestMisc:
    def test_notifications_get(self, patient_auth):
        h, _ = patient_auth
        r = requests.get(f"{API}/notifications", headers=h)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_read_all_notifications(self, patient_auth):
        h, _ = patient_auth
        r = requests.post(f"{API}/notifications/read-all", headers=h)
        assert r.status_code == 200

    def test_admin_dashboard(self, fisio_auth):
        h, _ = fisio_auth
        r = requests.get(f"{API}/admin/dashboard?area=fisio", headers=h)
        assert r.status_code == 200
        for k in ("today_count", "confirmados", "faltas", "total_patients", "pending_payments", "upcoming"):
            assert k in r.json()

    def test_patient_dashboard(self, patient_auth):
        h, _ = patient_auth
        r = requests.get(f"{API}/patient/dashboard", headers=h)
        assert r.status_code == 200
        for k in ("next_appointment", "active_exercises", "pending_payments"):
            assert k in r.json()

    def test_procedures_crud(self, fisio_auth):
        h, _ = fisio_auth
        r = requests.get(f"{API}/procedures?area=fisio", headers=h)
        assert r.status_code == 200 and len(r.json()) >= 1
        c = requests.post(f"{API}/procedures", headers=h, json={"name": "TEST Proc", "area": "fisio"})
        assert c.status_code == 200
        pid = c.json()["id"]
        d = requests.delete(f"{API}/procedures/{pid}", headers=h)
        assert d.status_code == 200
