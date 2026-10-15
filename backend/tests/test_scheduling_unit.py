"""Isolated scheduling regression tests: no server, network or MongoDB required."""
import asyncio
import copy
import os
import sys
from types import SimpleNamespace
from datetime import datetime, timedelta
from pathlib import Path

import pytest
from fastapi import HTTPException
from pymongo.errors import DuplicateKeyError

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "unit_tests_not_connected")
os.environ.setdefault("JWT_SECRET_KEY", "unit-test-key-only-not-for-production")
import server as s


def matches(doc, query):
    for key, value in query.items():
        if key == "$or":
            if not any(matches(doc, q) for q in value):
                return False
            continue
        actual = doc.get(key)
        if isinstance(value, dict):
            for op, expected in value.items():
                if op == "$in" and actual not in expected: return False
                if op == "$ne" and actual == expected: return False
                if op == "$gte" and (actual is None or actual < expected): return False
                if op == "$lte" and (actual is None or actual > expected): return False
                if op == "$exists" and (key in doc) != expected: return False
        elif actual != value:
            return False
    return True


class Cursor:
    def __init__(self, docs): self.docs = docs
    async def to_list(self, limit): return copy.deepcopy(self.docs[:limit])


class Collection:
    def __init__(self, docs=()): self.docs = list(copy.deepcopy(docs))
    async def find_one(self, query, projection=None):
        return next((copy.deepcopy(d) for d in self.docs if matches(d, query)), None)
    def find(self, query, projection=None):
        return Cursor([d for d in self.docs if matches(d, query)])
    async def insert_many(self, docs, **kwargs):
        for doc in docs:
            if "_id" in doc and any(d.get("_id") == doc["_id"] for d in self.docs):
                raise DuplicateKeyError("occupied")
            self.docs.append(copy.deepcopy(doc))
            await asyncio.sleep(0)  # Force concurrent requests to interleave.
    async def insert_one(self, doc): self.docs.append(copy.deepcopy(doc))
    async def delete_many(self, query): self.docs = [d for d in self.docs if not matches(d, query)]
    async def update_one(self, query, update, upsert=False):
        for doc in self.docs:
            if matches(doc, query): doc.update(update.get("$set", {})); return SimpleNamespace(matched_count=1)
        if upsert: self.docs.append({**query, **update.get("$set", {})})
        return SimpleNamespace(matched_count=0)


class Database:
    def __init__(self):
        self.users = Collection([{"id": "therapist", "role": "admin_fisio", "name": "Ana"}])
        self.patients = Collection([{"id": "patient", "name": "João"}])
    def __getattr__(self, name):
        collection = Collection(); setattr(self, name, collection); return collection


ADMIN = {"id": "therapist", "role": "admin_fisio"}
PATIENT = {"id": "user", "role": "patient", "patient_id": "patient"}


@pytest.fixture
def db(monkeypatch):
    database = Database(); monkeypatch.setattr(s, "db", database); return database


def body(**changes):
    return s.RecurringAppointmentIn(**{"patient_id": "patient", "professional_id": "therapist", "date": "2030-06-03", "time": "09:00", "occurrences": 4, **changes})


def test_weekly_series(db):
    result = asyncio.run(s.create_appointment_series(body(), ADMIN))
    dates = [datetime.fromisoformat(a["datetime"]) for a in result["appointments"]]
    assert all(b - a == timedelta(days=7) for a, b in zip(dates, dates[1:]))
    assert len(db.appointments.docs) == 4
    assert len(db.calendar_reservations.docs) == 240


def test_later_conflict_keeps_no_partial_series(db):
    db.appointments.docs.append({"id": "existing", "professional_id": "therapist", "date": "2030-06-17", "datetime": "2030-06-17T09:00:00", "status": "agendado", "duration_min": 60})
    with pytest.raises(HTTPException) as exc: asyncio.run(s.create_appointment_series(body(), ADMIN))
    assert exc.value.status_code == 409
    assert len(db.appointments.docs) == 1
    assert not db.calendar_reservations.docs


def test_concurrent_overlapping_bookings(db):
    async def run():
        return await asyncio.gather(s.create_appointment(body(), ADMIN), s.create_appointment(body(time="09:30"), ADMIN), return_exceptions=True)
    results = asyncio.run(run())
    assert sum(isinstance(r, dict) for r in results) == 1
    assert sum(isinstance(r, HTTPException) and r.status_code == 409 for r in results) == 1
    assert len(db.appointments.docs) == 1
    assert len(db.calendar_reservations.docs) == 60


def test_cancellation_releases_calendar(db):
    async def run():
        a = await s.create_appointment(body(), ADMIN)
        await s.cancel_appointment(a["id"], ADMIN)
        return await s.create_appointment(body(), ADMIN)
    assert asyncio.run(run())["status"] == "agendado"
    assert len(db.calendar_reservations.docs) == 60


def test_reschedule_moves_reservations(db):
    async def run():
        a = await s.create_appointment(body(), ADMIN)
        return await s.reschedule_appointment(a["id"], body(time="09:30"), ADMIN)
    assert asyncio.run(run())["time"] == "09:30"
    assert len(db.calendar_reservations.docs) == 60
    assert all("T09:0" not in r["_id"] for r in db.calendar_reservations.docs)


def test_cancel_only_future_series(db):
    async def run():
        result = await s.create_appointment_series(body(), ADMIN)
        db.appointments.docs.append({"id": "past", "series_id": result["id"], "clinic_id": "default", "datetime": "2020-01-01T09:00:00", "status": "presente"})
        return await s.cancel_future_series(result["id"], ADMIN)
    assert asyncio.run(run())["cancelled"] == 4
    assert next(d for d in db.appointments.docs if d["id"] == "past")["status"] == "presente"
    assert not db.calendar_reservations.docs


def test_patient_recurrence_permission():
    with pytest.raises(HTTPException) as exc: s.require_admin(PATIENT)
    assert exc.value.status_code == 403


def test_patient_must_choose_professional(db):
    with pytest.raises(HTTPException) as exc: asyncio.run(s.create_appointment(body(professional_id=None), PATIENT))
    assert exc.value.status_code == 400


def test_patient_12_hour_rule(db):
    now = datetime.now(s.ZoneInfo("America/Sao_Paulo")) + timedelta(hours=1)
    with pytest.raises(HTTPException) as exc: asyncio.run(s.create_appointment(body(date=now.strftime("%Y-%m-%d"), time=now.strftime("%H:%M")), PATIENT))
    assert exc.value.status_code == 400
    assert not db.appointments.docs


def test_clinic_boundary(db):
    with pytest.raises(HTTPException) as exc: asyncio.run(s.create_appointment_series(body(), {**ADMIN, "clinic_id": "other"}))
    assert exc.value.status_code == 403


def test_service_price_and_duration(db):
    db.professional_services.docs.append({"id": "service", "clinic_id": "default", "professional_id": "therapist", "name": "Pilates", "area": "pilates", "duration_min": 45, "price_cents": 15000})
    result = asyncio.run(s.create_appointment(body(service_id="service"), ADMIN))
    assert result["duration_min"] == 45 and result["price_cents"] == 15000
    assert len(db.calendar_reservations.docs) == 45


def test_availability_applies_to_every_occurrence(db):
    db.professional_availability.docs.append({"professional_id": "therapist", "weekdays": [0], "start": "10:00", "end": "18:00"})
    with pytest.raises(HTTPException): asyncio.run(s.create_appointment_series(body(), ADMIN))
    assert not db.appointments.docs


def test_consent_default_and_revocation(db):
    async def run():
        assert not (await s.notification_preferences(PATIENT))["enabled"]
        await s.whatsapp_consent(s.WhatsAppConsentIn(enabled=True, phone="5511999999999"), PATIENT)
        await s.whatsapp_consent(s.WhatsAppConsentIn(enabled=False), PATIENT)
        return await s.notification_preferences(PATIENT)
    result = asyncio.run(run())
    assert result["enabled"] is False and result["phone"] == ""
    assert result["whatsapp_status"] == "requires_provider_setup"
    assert len(db.consent_audit.docs) == 2


@pytest.mark.parametrize("changes", [{"occurrences": 1}, {"occurrences": 53}, {"duration_min": 0}, {"duration_min": 241}])
def test_bounded_inputs(changes):
    with pytest.raises(ValueError): body(**changes)
