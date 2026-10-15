import os
import logging
from pathlib import Path
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
from typing import List, Optional, Literal, Annotated
import uuid

import bcrypt
import jwt
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr
from pymongo.errors import DuplicateKeyError

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

JWT_SECRET_KEY = os.environ["JWT_SECRET_KEY"]
JWT_ALGORITHM = "HS256"
ACCESS_MINUTES = 60 * 24 * 7  # 7 days for a smooth demo experience

app = FastAPI(title="FisioPilates Clinic API")
api_router = APIRouter(prefix="/api")
bearer = HTTPBearer(auto_error=False)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("clinic")

Role = Literal["patient", "admin_fisio", "admin_pilates"]
Area = Literal["fisio", "pilates", "ambos"]
ApptStatus = Literal["agendado", "confirmado", "presente", "faltou", "cancelado", "remarcado"]
PayStatus = Literal["pago", "pendente", "atrasado"]


# ============ Security helpers ============
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except (ValueError, TypeError):
        return False


DUMMY_HASH = hash_password("dummy-password-not-used")


def create_access_token(user_id: str, role: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "role": role,
        "type": "access",
        "iat": now,
        "exp": now + timedelta(minutes=ACCESS_MINUTES),
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


async def current_user(
    credentials: Annotated[Optional[HTTPAuthorizationCredentials], Depends(bearer)]
):
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(401, "Token ausente")
    try:
        payload = jwt.decode(
            credentials.credentials,
            JWT_SECRET_KEY,
            algorithms=[JWT_ALGORITHM],
            options={"require": ["sub", "exp", "type"]},
        )
        if payload["type"] != "access":
            raise ValueError("wrong token type")
        user_id = payload["sub"]
    except (jwt.InvalidTokenError, KeyError, ValueError):
        raise HTTPException(401, "Token inválido ou expirado", headers={"WWW-Authenticate": "Bearer"})

    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(401, "Usuário não encontrado")
    return user


def require_admin(user=Depends(current_user)):
    if user["role"] not in ("admin_fisio", "admin_pilates"):
        raise HTTPException(403, "Sem permissão para esta operação")
    return user


AdminUser = Annotated[dict, Depends(require_admin)]
AnyUser = Annotated[dict, Depends(current_user)]


# ============ Models ============
class LoginIn(BaseModel):
    email: EmailStr
    password: str


class PublicUser(BaseModel):
    id: str
    email: EmailStr
    role: str
    name: str = ""
    patient_id: Optional[str] = None


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: PublicUser


class ResetIn(BaseModel):
    email: EmailStr


class PatientIn(BaseModel):
    name: str
    birth_date: Optional[str] = None
    phone: str = ""
    whatsapp: str = ""
    email: str = ""
    cpf: str = ""
    address: str = ""
    emergency_contact: str = ""
    area: Area = "fisio"
    procedure_types: List[str] = []
    # optional login creation
    create_login: bool = False
    login_password: Optional[str] = None


class Patient(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    clinic_id: str = "default"
    name: str
    birth_date: Optional[str] = None
    phone: str = ""
    whatsapp: str = ""
    email: str = ""
    cpf: str = ""
    address: str = ""
    emergency_contact: str = ""
    area: Area = "fisio"
    procedure_types: List[str] = []
    user_id: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class ProcedureIn(BaseModel):
    name: str
    area: Area


class Anamnese(BaseModel):
    queixa_principal: str = ""
    tempo_queixa: str = ""
    tratamento_anterior: bool = False
    qual_tratamento: str = ""
    exames: str = ""
    diagnostico: str = ""
    condicao_medica: str = ""
    cirurgias: str = ""
    medicamentos: str = ""
    observacoes: str = ""


class EvolutionIn(BaseModel):
    date: Optional[str] = None
    area: Area = "fisio"
    tipo_atendimento: str = ""
    evolucao_clinica: str = ""
    observacoes: str = ""
    condutas: str = ""
    resposta_paciente: str = ""
    recomendacoes: str = ""
    proximos_passos: str = ""


class AssessmentIn(BaseModel):
    date: Optional[str] = None
    dor: int = 0
    local_dor: str = ""
    amplitude_movimento: float = 0
    mobilidade: str = ""
    flexibilidade: str = ""
    forca: str = ""
    limitacoes: str = ""
    observacoes: str = ""


class AppointmentIn(BaseModel):
    patient_id: str
    professional_id: Optional[str] = None
    service_id: Optional[str] = None
    area: Area = "fisio"
    procedure: str = ""
    date: str  # YYYY-MM-DD
    time: str  # HH:mm
    duration_min: int = Field(default=60, ge=5, le=240)
    notes: str = ""


class RecurringAppointmentIn(AppointmentIn):
    occurrences: int = Field(default=4, ge=2, le=52)


class WhatsAppConsentIn(BaseModel):
    enabled: bool
    phone: str = Field(default="", max_length=30)


class ProfessionalServiceIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    area: Area = "fisio"
    duration_min: int = Field(default=60, ge=5, le=240)
    price_cents: int = Field(default=0, ge=0)


class AvailabilityIn(BaseModel):
    weekdays: List[int] = Field(default_factory=lambda: [0, 1, 2, 3, 4])
    start: str = "08:00"
    end: str = "18:00"


async def validate_availability(prof_id: str, dt: datetime, duration: int):
    schedule = await db.professional_availability.find_one({"professional_id": prof_id})
    if not schedule:
        return  # Legacy calendars remain usable until working hours are configured.
    end = dt + timedelta(minutes=duration)
    if dt.weekday() not in schedule["weekdays"] or dt.strftime("%H:%M") < schedule["start"] or end.date() != dt.date() or end.strftime("%H:%M") > schedule["end"]:
        raise HTTPException(400, "Horário fora da disponibilidade do profissional")


def clinic_id(user: dict) -> str:
    return user.get("clinic_id", "default")


async def reserve_calendar(docs: list, owner: str):
    # Unique minute keys make overlapping writes mutually exclusive across workers.
    keys = []
    for doc in docs:
        start = datetime.fromisoformat(doc["datetime"])
        for minute in range(doc["duration_min"]):
            keys.append({"_id": f'{doc["professional_id"]}:{(start + timedelta(minutes=minute)).isoformat()}',
                         "owner": owner, "appointment_id": doc["id"]})
    try:
        await db.calendar_reservations.insert_many(keys, ordered=True)
    except Exception as exc:
        await db.calendar_reservations.delete_many({"owner": owner})
        if isinstance(exc, DuplicateKeyError) or getattr(exc, "details", {}).get("writeErrors", [{}])[0].get("code") == 11000:
            raise HTTPException(409, "Horário ocupado. Atualize a agenda e tente novamente.")
        raise


async def build_appointment(body: AppointmentIn, user: dict, dt: datetime, series_id=None):
    cid = clinic_id(user)
    patient = await _get_patient_or_404(body.patient_id)
    if patient.get("clinic_id", "default") != cid:
        raise HTTPException(403, "Paciente de outra clínica")
    prof_id = body.professional_id or (user["id"] if user["role"] != "patient" else None)
    if not prof_id:
        raise HTTPException(400, "Selecione um profissional")
    prof = await db.users.find_one({"id": prof_id, "role": {"$in": ["admin_fisio", "admin_pilates"]}}, {"_id": 0, "password_hash": 0})
    if not prof or prof.get("clinic_id", "default") != cid:
        raise HTTPException(400, "Profissional inválido")
    service = None
    if body.service_id:
        service = await db.professional_services.find_one({"id": body.service_id, "professional_id": prof_id, "clinic_id": cid})
        if not service:
            raise HTTPException(400, "Serviço inválido para este profissional")
    duration = service["duration_min"] if service else body.duration_min
    await validate_availability(prof_id, dt, duration)
    if await _has_conflict(prof_id, dt, duration):
        raise HTTPException(409, f"Horário ocupado em {dt.date().isoformat()}")
    return {"id": str(uuid.uuid4()), "clinic_id": cid, "series_id": series_id,
            "patient_id": patient["id"], "patient_name": patient["name"],
            "professional_id": prof_id, "professional_name": prof.get("name", ""),
            "area": service["area"] if service else body.area, "procedure": service["name"] if service else body.procedure,
            "service_id": body.service_id, "price_cents": service["price_cents"] if service else None, "currency": "BRL",
            "date": dt.date().isoformat(), "time": dt.strftime("%H:%M"), "datetime": dt.isoformat(),
            "duration_min": duration, "notes": body.notes, "status": "agendado",
            "created_by_role": user["role"], "created_at": datetime.now(timezone.utc).isoformat()}


async def persist_appointments(docs: list):
    owner = str(uuid.uuid4())
    await reserve_calendar(docs, owner)
    try:
        await db.appointments.insert_many([dict(d) for d in docs])
    except Exception:
        await db.appointments.delete_many({"id": {"$in": [d["id"] for d in docs]}})
        await db.calendar_reservations.delete_many({"owner": owner})
        raise


class StatusIn(BaseModel):
    status: ApptStatus


class ExerciseIn(BaseModel):
    name: str
    description: str = ""
    series: str = ""
    repetitions: str = ""
    frequency: str = ""
    duration: str = ""
    observacoes: str = ""


class NoteIn(BaseModel):
    text: str


class PaymentIn(BaseModel):
    patient_id: str
    area: Area = "fisio"
    description: str = ""
    amount: float = 0
    status: PayStatus = "pendente"
    due_date: Optional[str] = None


# ============ Helpers ============
def public_user(u: dict) -> PublicUser:
    return PublicUser(
        id=u["id"], email=u["email"], role=u["role"],
        name=u.get("name", ""), patient_id=u.get("patient_id"),
    )


async def push_notification(user_id: Optional[str], title: str, body: str, ntype: str = "info"):
    if not user_id:
        return
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "title": title,
        "body": body,
        "type": ntype,
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.notifications.insert_one(doc)


# ============ Auth routes ============
@api_router.post("/auth/login", response_model=TokenOut)
async def login(body: LoginIn):
    user = await db.users.find_one({"email": body.email.lower()})
    ph = user["password_hash"] if user else DUMMY_HASH
    if not user or not verify_password(body.password, ph):
        raise HTTPException(401, "Email ou senha inválidos")
    pu = public_user(user)
    return TokenOut(access_token=create_access_token(pu.id, pu.role), user=pu)


@api_router.get("/auth/me", response_model=PublicUser)
async def me(user: AnyUser):
    return public_user(user)


@api_router.post("/auth/password-reset")
async def password_reset(_: ResetIn):
    return {"message": "Se o email existir, enviaremos instruções de recuperação.", "implemented": False}


# ============ Procedures ============
@api_router.get("/procedures")
async def list_procedures(area: Optional[str] = None):
    q = {}
    if area and area != "ambos":
        q = {"area": {"$in": [area, "ambos"]}}
    docs = await db.procedures.find(q, {"_id": 0}).to_list(500)
    return docs


@api_router.post("/procedures")
async def create_procedure(body: ProcedureIn, admin: AdminUser):
    doc = {"id": str(uuid.uuid4()), **body.dict()}
    await db.procedures.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.delete("/procedures/{pid}")
async def delete_procedure(pid: str, admin: AdminUser):
    await db.procedures.delete_one({"id": pid})
    return {"ok": True}


# ============ Patients ============
@api_router.post("/patients", response_model=Patient)
async def create_patient(body: PatientIn, admin: AdminUser):
    p = Patient(**{k: v for k, v in body.dict().items() if k in Patient.model_fields})
    p.clinic_id = clinic_id(admin)
    if body.create_login and body.email and body.login_password:
        existing = await db.users.find_one({"email": body.email.lower()})
        if existing:
            raise HTTPException(409, "Já existe um usuário com este email")
        uid = str(uuid.uuid4())
        await db.users.insert_one({
            "id": uid,
            "email": body.email.lower(),
            "password_hash": hash_password(body.login_password),
            "role": "patient",
            "name": body.name,
            "patient_id": p.id,
            "clinic_id": p.clinic_id,
        })
        p.user_id = uid
    await db.patients.insert_one(p.dict())
    return p


@api_router.get("/patients", response_model=List[Patient])
async def list_patients(admin: AdminUser, q: Optional[str] = None, area: Optional[str] = None):
    query: dict = {}
    if area and area in ("fisio", "pilates"):
        query["area"] = {"$in": [area, "ambos"]}
    if q:
        query["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"phone": {"$regex": q, "$options": "i"}},
            {"email": {"$regex": q, "$options": "i"}},
        ]
    docs = await db.patients.find(query, {"_id": 0}).sort("name", 1).to_list(1000)
    return [Patient(**d) for d in docs]


async def _get_patient_or_404(pid: str) -> dict:
    p = await db.patients.find_one({"id": pid}, {"_id": 0})
    if not p:
        raise HTTPException(404, "Paciente não encontrado")
    return p


@api_router.get("/patients/{pid}", response_model=Patient)
async def get_patient(pid: str, user: AnyUser):
    if user["role"] == "patient" and user.get("patient_id") != pid:
        raise HTTPException(403, "Sem permissão")
    return Patient(**await _get_patient_or_404(pid))


@api_router.put("/patients/{pid}", response_model=Patient)
async def update_patient(pid: str, body: PatientIn, admin: AdminUser):
    await _get_patient_or_404(pid)
    upd = {k: v for k, v in body.dict().items() if k in Patient.model_fields and k not in ("id",)}
    await db.patients.update_one({"id": pid}, {"$set": upd})
    return Patient(**await _get_patient_or_404(pid))


@api_router.delete("/patients/{pid}")
async def delete_patient(pid: str, admin: AdminUser):
    p = await db.patients.find_one({"id": pid}, {"_id": 0})
    if p and p.get("user_id"):
        await db.users.delete_one({"id": p["user_id"]})
    await db.patients.delete_one({"id": pid})
    return {"ok": True}


# ============ Anamnese ============
@api_router.get("/patients/{pid}/anamnese")
async def get_anamnese(pid: str, admin: AdminUser):
    doc = await db.anamneses.find_one({"patient_id": pid}, {"_id": 0})
    return doc or {"patient_id": pid, **Anamnese().dict()}


@api_router.put("/patients/{pid}/anamnese")
async def upsert_anamnese(pid: str, body: Anamnese, admin: AdminUser):
    await _get_patient_or_404(pid)
    doc = {"patient_id": pid, **body.dict(), "updated_at": datetime.now(timezone.utc).isoformat()}
    await db.anamneses.update_one({"patient_id": pid}, {"$set": doc}, upsert=True)
    return doc


# ============ Evolutions (professional only) ============
@api_router.get("/patients/{pid}/evolutions")
async def list_evolutions(pid: str, admin: AdminUser):
    docs = await db.evolutions.find({"patient_id": pid}, {"_id": 0}).sort("date", -1).to_list(500)
    return docs


@api_router.post("/patients/{pid}/evolutions")
async def create_evolution(pid: str, body: EvolutionIn, admin: AdminUser):
    await _get_patient_or_404(pid)
    doc = {
        "id": str(uuid.uuid4()),
        "patient_id": pid,
        "professional": admin.get("name", admin["email"]),
        "professional_id": admin["id"],
        **body.dict(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    if not doc.get("date"):
        doc["date"] = datetime.now(timezone.utc).date().isoformat()
    await db.evolutions.insert_one(doc)
    doc.pop("_id", None)
    return doc


# ============ Assessments ============
@api_router.get("/patients/{pid}/assessments")
async def list_assessments(pid: str, user: AnyUser):
    if user["role"] == "patient" and user.get("patient_id") != pid:
        raise HTTPException(403, "Sem permissão")
    docs = await db.assessments.find({"patient_id": pid}, {"_id": 0}).sort("date", 1).to_list(500)
    return docs


@api_router.post("/patients/{pid}/assessments")
async def create_assessment(pid: str, body: AssessmentIn, admin: AdminUser):
    await _get_patient_or_404(pid)
    doc = {"id": str(uuid.uuid4()), "patient_id": pid, **body.dict()}
    if not doc.get("date"):
        doc["date"] = datetime.now(timezone.utc).date().isoformat()
    await db.assessments.insert_one(doc)
    doc.pop("_id", None)
    return doc


# ============ Appointments / Agenda ============
async def _has_conflict(professional_id: Optional[str], dt: datetime, duration: int, exclude_id: Optional[str] = None) -> bool:
    if not professional_id:
        return False
    q = {"professional_id": professional_id, "date": {"$gte": (dt - timedelta(days=1)).date().isoformat(), "$lte": (dt + timedelta(days=1)).date().isoformat()}, "status": {"$ne": "cancelado"}}
    if exclude_id:
        q["id"] = {"$ne": exclude_id}
    others = await db.appointments.find(q, {"_id": 0}).to_list(200)
    new_start = dt
    new_end = dt + timedelta(minutes=duration)
    for o in others:
        try:
            o_start = datetime.fromisoformat(o["datetime"])
            o_end = o_start + timedelta(minutes=o.get("duration_min", 60))
            if new_start < o_end and o_start < new_end:
                return True
        except Exception:
            continue
    return False


@api_router.get("/appointments")
async def list_appointments(
    user: AnyUser,
    date: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    area: Optional[str] = None,
    patient_id: Optional[str] = None,
):
    q: dict = {"clinic_id": clinic_id(user)}
    if clinic_id(user) == "default":
        q = {"$or": [{"clinic_id": "default"}, {"clinic_id": {"$exists": False}}]}
    if user["role"] == "patient":
        q["patient_id"] = user.get("patient_id")
    elif patient_id:
        q["patient_id"] = patient_id
    if date:
        q["date"] = date
    elif date_from and date_to:
        q["date"] = {"$gte": date_from, "$lte": date_to}
    if area and area in ("fisio", "pilates"):
        q["area"] = area
    docs = await db.appointments.find(q, {"_id": 0}).sort("datetime", 1).to_list(1000)
    return docs


@api_router.post("/appointments")
async def create_appointment(body: AppointmentIn, user: AnyUser):
    if user["role"] == "patient" and body.patient_id != user.get("patient_id"):
        raise HTTPException(403, "Sem permissão")
    try:
        dt = datetime.strptime(f"{body.date}T{body.time}", "%Y-%m-%dT%H:%M")
    except ValueError:
        raise HTTPException(400, "Data ou horário inválidos")
    if user["role"] == "patient":
        clinic = await db.clinics.find_one({"id": clinic_id(user)}) or {}
        now = datetime.now(ZoneInfo(clinic.get("timezone", "America/Sao_Paulo"))).replace(tzinfo=None)
        if dt < now + timedelta(hours=12):
            raise HTTPException(400, "Agendamentos exigem pelo menos 12 horas de antecedência")
    doc = await build_appointment(body, user, dt)
    await persist_appointments([doc])
    await notify_booking(body.patient_id, 1)
    return doc


@api_router.post("/appointment-series")
async def create_appointment_series(body: RecurringAppointmentIn, admin: AdminUser):
    try:
        start = datetime.strptime(f"{body.date}T{body.time}", "%Y-%m-%dT%H:%M")
    except ValueError:
        raise HTTPException(400, "Data ou horário inválidos")
    series_id = str(uuid.uuid4())
    docs = [await build_appointment(body, admin, start + timedelta(weeks=i), series_id)
            for i in range(body.occurrences)]
    await persist_appointments(docs)
    await notify_booking(body.patient_id, len(docs))
    return {"id": series_id, "appointments": docs}


async def notify_booking(patient_id: str, count: int):
    patient = await db.patients.find_one({"id": patient_id})
    if patient and patient.get("user_id"):
        try:
            await push_notification(patient["user_id"], "Agendamento registrado", f"{count} atendimento(s) registrado(s). Confira as datas na sua agenda.", "appointment")
        except Exception:
            logger.warning("Appointment saved but in-app notification could not be created")


@api_router.delete("/appointment-series/{sid}")
async def cancel_future_series(sid: str, admin: AdminUser):
    clinic = await db.clinics.find_one({"id": clinic_id(admin)}) or {}
    now = datetime.now(ZoneInfo(clinic.get("timezone", "America/Sao_Paulo"))).replace(tzinfo=None).isoformat()
    query = {"series_id": sid, "clinic_id": clinic_id(admin), "datetime": {"$gte": now},
             "status": {"$in": ["agendado", "confirmado", "remarcado"]}}
    docs = await db.appointments.find(query, {"_id": 0}).to_list(52)
    for doc in docs:
        await db.appointments.update_one({"id": doc["id"]}, {"$set": {"status": "cancelado"}})
        await db.calendar_reservations.delete_many({"appointment_id": doc["id"]})
    return {"cancelled": len(docs)}


@api_router.patch("/appointments/{aid}/status")
async def set_status(aid: str, body: StatusIn, admin: AdminUser):
    a = await db.appointments.find_one({"id": aid}, {"_id": 0})
    if not a:
        raise HTTPException(404, "Agendamento não encontrado")
    if a.get("clinic_id", "default") != clinic_id(admin):
        raise HTTPException(403, "Sem permissão")
    if a["status"] == "cancelado" and body.status != "cancelado":
        raise HTTPException(400, "Crie um novo agendamento para reativar este horário")
    await db.appointments.update_one({"id": aid}, {"$set": {"status": body.status}})
    if body.status == "cancelado":
        await db.calendar_reservations.delete_many({"appointment_id": aid})
    a["status"] = body.status
    return a


@api_router.patch("/appointments/{aid}")
async def reschedule_appointment(aid: str, body: AppointmentIn, user: AnyUser):
    a = await db.appointments.find_one({"id": aid}, {"_id": 0})
    if not a:
        raise HTTPException(404, "Agendamento não encontrado")
    if a.get("clinic_id", "default") != clinic_id(user):
        raise HTTPException(403, "Sem permissão")
    is_patient = user["role"] == "patient"
    if is_patient and a["patient_id"] != user.get("patient_id"):
        raise HTTPException(403, "Sem permissão")
    if body.patient_id != a["patient_id"]:
        raise HTTPException(400, "Não é possível alterar o paciente")
    try:
        dt = datetime.fromisoformat(f"{body.date}T{body.time}:00")
    except Exception:
        raise HTTPException(400, "Data ou horário inválidos")
    clinic = await db.clinics.find_one({"id": clinic_id(user)}) or {}
    now = datetime.now(ZoneInfo(clinic.get("timezone", "America/Sao_Paulo"))).replace(tzinfo=None)
    if is_patient and dt < now + timedelta(hours=12):
        raise HTTPException(400, "Os agendamentos devem ser realizados com pelo menos 12 horas de antecedência.")
    prof_id = body.professional_id or a.get("professional_id")
    prof = await db.users.find_one({"id": prof_id, "role": {"$in": ["admin_fisio", "admin_pilates"]}})
    if not prof or prof.get("clinic_id", "default") != clinic_id(user):
        raise HTTPException(400, "Profissional inválido")
    service_id = body.service_id or a.get("service_id")
    service = None
    if service_id:
        service = await db.professional_services.find_one({"id": service_id, "professional_id": prof_id, "clinic_id": clinic_id(user)})
        if not service:
            raise HTTPException(400, "Serviço inválido")
        body.duration_min = service["duration_min"]
        body.procedure = service["name"]
        body.area = service["area"]
    await validate_availability(prof_id, dt, body.duration_min)
    if await _has_conflict(prof_id, dt, body.duration_min, exclude_id=aid):
        raise HTTPException(400, "Conflito de horário para este profissional")
    upd = {
        "date": body.date, "time": body.time, "datetime": dt.isoformat(),
        "duration_min": body.duration_min, "procedure": body.procedure,
        "area": body.area, "notes": body.notes, "status": "remarcado",
        "professional_id": prof_id,
        "professional_name": prof.get("name", ""),
        "service_id": service_id,
        "price_cents": service["price_cents"] if service else a.get("price_cents"),
    }
    # Reserve only new minutes, retaining the old reservation until the update succeeds.
    owner = str(uuid.uuid4())
    old_keys = await db.calendar_reservations.find({"appointment_id": aid}).to_list(240)
    old_ids = {r["_id"] for r in old_keys}
    minutes = []
    for i in range(body.duration_min):
        key = f'{prof_id}:{(dt + timedelta(minutes=i)).isoformat()}'
        if key not in old_ids:
            minutes.append({"_id": key, "owner": owner, "appointment_id": aid})
    try:
        if minutes:
            await db.calendar_reservations.insert_many(minutes, ordered=True)
        result = await db.appointments.update_one({"id": aid, "datetime": a["datetime"], "status": a["status"]}, {"$set": upd})
        if result.matched_count != 1:
            raise HTTPException(409, "O agendamento mudou. Atualize a agenda.")
    except Exception as exc:
        await db.calendar_reservations.delete_many({"owner": owner})
        if getattr(exc, "code", None) == 11000 or getattr(exc, "details", {}).get("writeErrors"):
            raise HTTPException(409, "Horário ocupado")
        raise
    keep = {f'{prof_id}:{(dt + timedelta(minutes=i)).isoformat()}' for i in range(body.duration_min)}
    await db.calendar_reservations.delete_many({"_id": {"$in": list(old_ids - keep)}})
    return {**a, **upd}


@api_router.delete("/appointments/{aid}")
async def cancel_appointment(aid: str, user: AnyUser):
    a = await db.appointments.find_one({"id": aid}, {"_id": 0})
    if not a:
        raise HTTPException(404, "Agendamento não encontrado")
    if a.get("clinic_id", "default") != clinic_id(user):
        raise HTTPException(403, "Sem permissão")
    if user["role"] == "patient" and a["patient_id"] != user.get("patient_id"):
        raise HTTPException(403, "Sem permissão")
    await db.appointments.update_one({"id": aid}, {"$set": {"status": "cancelado"}})
    await db.calendar_reservations.delete_many({"appointment_id": aid})
    return {"ok": True}


@api_router.get("/patients/{pid}/attendance-summary")
async def attendance_summary(pid: str, admin: AdminUser):
    docs = await db.appointments.find({"patient_id": pid}, {"_id": 0}).to_list(1000)
    now = datetime.now()
    realizadas = sum(1 for d in docs if d["status"] == "presente")
    faltas = sum(1 for d in docs if d["status"] == "faltou")
    cancelamentos = sum(1 for d in docs if d["status"] == "cancelado")
    past = [d for d in docs if d["status"] == "presente"]
    past.sort(key=lambda d: d["datetime"])
    future = [d for d in docs if datetime.fromisoformat(d["datetime"]) >= now and d["status"] not in ("cancelado", "faltou")]
    future.sort(key=lambda d: d["datetime"])
    return {
        "realizadas": realizadas,
        "faltas": faltas,
        "cancelamentos": cancelamentos,
        "ultimo_atendimento": past[-1]["datetime"] if past else None,
        "proximo_atendimento": future[0]["datetime"] if future else None,
    }


# ============ Exercises ============
@api_router.get("/patients/{pid}/exercises")
async def list_exercises(pid: str, user: AnyUser):
    if user["role"] == "patient" and user.get("patient_id") != pid:
        raise HTTPException(403, "Sem permissão")
    docs = await db.exercises.find({"patient_id": pid}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return docs


@api_router.post("/patients/{pid}/exercises")
async def create_exercise(pid: str, body: ExerciseIn, admin: AdminUser):
    await _get_patient_or_404(pid)
    doc = {
        "id": str(uuid.uuid4()), "patient_id": pid, **body.dict(),
        "active": True, "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.exercises.insert_one(doc)
    doc.pop("_id", None)
    p = await db.patients.find_one({"id": pid}, {"_id": 0})
    if p and p.get("user_id"):
        await push_notification(p["user_id"], "Novo exercício prescrito", body.name, "exercise")
    return doc


@api_router.patch("/exercises/{eid}")
async def update_exercise(eid: str, body: dict, admin: AdminUser):
    allowed = {k: v for k, v in body.items() if k in {"name", "description", "series", "repetitions", "frequency", "duration", "observacoes", "active"}}
    await db.exercises.update_one({"id": eid}, {"$set": allowed})
    doc = await db.exercises.find_one({"id": eid}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Exercício não encontrado")
    return doc


@api_router.delete("/exercises/{eid}")
async def delete_exercise(eid: str, admin: AdminUser):
    await db.exercises.delete_one({"id": eid})
    return {"ok": True}


# ============ Patient public notes ============
@api_router.get("/patients/{pid}/notes")
async def list_notes(pid: str, user: AnyUser):
    if user["role"] == "patient" and user.get("patient_id") != pid:
        raise HTTPException(403, "Sem permissão")
    docs = await db.patient_notes.find({"patient_id": pid}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return docs


@api_router.post("/patients/{pid}/notes")
async def create_note(pid: str, body: NoteIn, admin: AdminUser):
    await _get_patient_or_404(pid)
    doc = {
        "id": str(uuid.uuid4()), "patient_id": pid, "text": body.text,
        "professional": admin.get("name", admin["email"]),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.patient_notes.insert_one(doc)
    doc.pop("_id", None)
    p = await db.patients.find_one({"id": pid}, {"_id": 0})
    if p and p.get("user_id"):
        await push_notification(p["user_id"], "Nova orientação do profissional", body.text[:80], "note")
    return doc


# ============ Payments ============
@api_router.get("/payments")
async def list_payments(user: AnyUser, status: Optional[str] = None, area: Optional[str] = None, patient_id: Optional[str] = None):
    q: dict = {"clinic_id": clinic_id(user)}
    if clinic_id(user) == "default":
        q = {"$or": [{"clinic_id": "default"}, {"clinic_id": {"$exists": False}}]}
    if user["role"] == "patient":
        q["patient_id"] = user.get("patient_id")
    elif patient_id:
        q["patient_id"] = patient_id
    if status:
        q["status"] = status
    if area and area in ("fisio", "pilates"):
        q["area"] = area
    docs = await db.payments.find(q, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return docs


@api_router.post("/payments")
async def create_payment(body: PaymentIn, admin: AdminUser):
    patient = await _get_patient_or_404(body.patient_id)
    doc = {
        "id": str(uuid.uuid4()), "patient_name": patient["name"],
        **body.dict(), "paid_date": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.payments.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.patch("/payments/{pid}/pay")
async def mark_paid(pid: str, admin: AdminUser):
    await db.payments.update_one({"id": pid}, {"$set": {"status": "pago", "paid_date": datetime.now(timezone.utc).date().isoformat()}})
    doc = await db.payments.find_one({"id": pid}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Pagamento não encontrado")
    return doc


# ============ Notifications ============
@api_router.get("/notifications")
async def list_notifications(user: AnyUser):
    docs = await db.notifications.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return docs


@api_router.patch("/notifications/{nid}/read")
async def read_notification(nid: str, user: AnyUser):
    await db.notifications.update_one({"id": nid, "user_id": user["id"]}, {"$set": {"read": True}})
    return {"ok": True}


@api_router.post("/notifications/read-all")
async def read_all(user: AnyUser):
    await db.notifications.update_many({"user_id": user["id"]}, {"$set": {"read": True}})
    return {"ok": True}


# ============ Dashboards ============
@api_router.get("/admin/dashboard")
async def admin_dashboard(admin: AdminUser, area: Optional[str] = None):
    today = datetime.now().date().isoformat()
    base: dict = {}
    if area and area in ("fisio", "pilates"):
        base["area"] = area
    today_appts = await db.appointments.find({**base, "date": today}, {"_id": 0}).sort("datetime", 1).to_list(500)
    confirmados = sum(1 for a in today_appts if a["status"] in ("confirmado", "presente"))
    faltas = sum(1 for a in today_appts if a["status"] == "faltou")
    upcoming = await db.appointments.find(
        {**base, "date": {"$gte": today}, "status": {"$nin": ["cancelado", "faltou"]}},
        {"_id": 0},
    ).sort("datetime", 1).to_list(5)
    pat_q = {}
    if area and area in ("fisio", "pilates"):
        pat_q = {"area": {"$in": [area, "ambos"]}}
    total_patients = await db.patients.count_documents(pat_q)
    pending_payments = await db.payments.count_documents({**base, "status": {"$in": ["pendente", "atrasado"]}})
    return {
        "today_count": len(today_appts),
        "today_appointments": today_appts,
        "confirmados": confirmados,
        "faltas": faltas,
        "upcoming": upcoming,
        "total_patients": total_patients,
        "pending_payments": pending_payments,
    }


@api_router.get("/patient/dashboard")
async def patient_dashboard(user: AnyUser):
    if user["role"] != "patient":
        raise HTTPException(403, "Apenas pacientes")
    pid = user.get("patient_id")
    now = datetime.now()
    appts = await db.appointments.find({"patient_id": pid}, {"_id": 0}).to_list(1000)
    future = [a for a in appts if datetime.fromisoformat(a["datetime"]) >= now and a["status"] not in ("cancelado", "faltou")]
    future.sort(key=lambda a: a["datetime"])
    past = [a for a in appts if datetime.fromisoformat(a["datetime"]) < now or a["status"] in ("presente", "faltou")]
    past.sort(key=lambda a: a["datetime"], reverse=True)
    exercises = await db.exercises.find({"patient_id": pid, "active": True}, {"_id": 0}).to_list(200)
    pending = await db.payments.count_documents({"patient_id": pid, "status": {"$in": ["pendente", "atrasado"]}})
    unread = await db.notifications.count_documents({"user_id": user["id"], "read": False})
    return {
        "next_appointment": future[0] if future else None,
        "history": past[:10],
        "active_exercises": len(exercises),
        "pending_payments": pending,
        "unread_notifications": unread,
    }


# ============ Professionals list (for assignment) ============
@api_router.get("/professionals")
async def list_professionals(admin: AdminUser):
    docs = await db.users.find({"role": {"$in": ["admin_fisio", "admin_pilates"]}}, {"_id": 0, "password_hash": 0}).to_list(500)
    docs = [d for d in docs if d.get("clinic_id", "default") == clinic_id(admin)]
    return docs


@api_router.get("/booking/professionals")
async def booking_professionals(user: AnyUser):
    docs = await list_professionals(user)
    return [{"id": d["id"], "name": d.get("name", ""), "role": d["role"]} for d in docs]


@api_router.get("/booking/slots")
async def booking_slots(user: AnyUser, professional_id: str, date: str, duration_min: int = Query(default=60, ge=5, le=240), service_id: Optional[str] = None):
    prof = await db.users.find_one({"id": professional_id, "role": {"$in": ["admin_fisio", "admin_pilates"]}})
    if not prof or prof.get("clinic_id", "default") != clinic_id(user):
        raise HTTPException(400, "Profissional inválido")
    if service_id:
        service = await db.professional_services.find_one({"id": service_id, "professional_id": professional_id, "clinic_id": clinic_id(user)})
        if not service:
            raise HTTPException(400, "Serviço inválido")
        duration_min = service["duration_min"]
    try:
        day = datetime.strptime(date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(400, "Data inválida")
    clinic = await db.clinics.find_one({"id": clinic_id(user)}) or {}
    earliest = datetime.now(ZoneInfo(clinic.get("timezone", "America/Sao_Paulo"))).replace(tzinfo=None) + timedelta(hours=12)
    slots = []
    for minute in range(7 * 60, 20 * 60 + 1, 30):
        dt = day + timedelta(minutes=minute)
        if user["role"] == "patient" and dt < earliest:
            continue
        try:
            await validate_availability(professional_id, dt, duration_min)
        except HTTPException:
            continue
        if not await _has_conflict(professional_id, dt, duration_min):
            slots.append(dt.strftime("%H:%M"))
    return slots


@api_router.get("/clinic")
async def get_clinic(user: AnyUser):
    return await db.clinics.find_one({"id": clinic_id(user)}, {"_id": 0}) or {
        "id": clinic_id(user), "name": "ACE Fisio", "timezone": "America/Sao_Paulo", "currency": "BRL"}


@api_router.get("/professional-services")
async def professional_services(user: AnyUser):
    return await db.professional_services.find({"clinic_id": clinic_id(user)}, {"_id": 0}).to_list(500)


@api_router.get("/professional-availability")
async def get_availability(admin: AdminUser):
    return await db.professional_availability.find_one({"professional_id": admin["id"]}, {"_id": 0}) or AvailabilityIn().model_dump()


@api_router.put("/professional-availability")
async def save_availability(body: AvailabilityIn, admin: AdminUser):
    try:
        start = datetime.strptime(body.start, "%H:%M").strftime("%H:%M")
        end = datetime.strptime(body.end, "%H:%M").strftime("%H:%M")
    except ValueError:
        raise HTTPException(400, "Use horários HH:mm")
    if start >= end or any(day < 0 or day > 6 for day in body.weekdays):
        raise HTTPException(400, "Disponibilidade inválida")
    doc = {"professional_id": admin["id"], "clinic_id": clinic_id(admin), "weekdays": sorted(set(body.weekdays)), "start": start, "end": end}
    await db.professional_availability.update_one({"professional_id": admin["id"]}, {"$set": doc}, upsert=True)
    return doc


@api_router.post("/professional-services")
async def save_professional_service(body: ProfessionalServiceIn, admin: AdminUser):
    doc = {"id": str(uuid.uuid4()), "clinic_id": clinic_id(admin),
           "professional_id": admin["id"], "currency": "BRL", **body.model_dump()}
    await db.professional_services.insert_one(dict(doc))
    return doc


@api_router.get("/notification-preferences")
async def notification_preferences(user: AnyUser):
    doc = await db.notification_preferences.find_one({"user_id": user["id"]}, {"_id": 0})
    return {**(doc or {"enabled": False, "phone": ""}), "whatsapp_status": "requires_provider_setup"}


@api_router.put("/notification-preferences/whatsapp")
async def whatsapp_consent(body: WhatsAppConsentIn, user: AnyUser):
    if user["role"] != "patient":
        raise HTTPException(403, "Apenas o paciente pode autorizar")
    phone = "".join(c for c in body.phone if c.isdigit())
    if body.enabled and (not phone.startswith("55") or not 12 <= len(phone) <= 13):
        raise HTTPException(400, "Informe WhatsApp com código do Brasil (55), DDD e número")
    doc = {"user_id": user["id"], "clinic_id": clinic_id(user), "enabled": body.enabled,
           "phone": phone if body.enabled else "", "consent_version": "whatsapp-reminders-v1",
           "updated_at": datetime.now(timezone.utc).isoformat()}
    await db.notification_preferences.update_one({"user_id": user["id"]}, {"$set": doc}, upsert=True)
    await db.consent_audit.insert_one({"id": str(uuid.uuid4()), **doc})
    return {**doc, "whatsapp_status": "requires_provider_setup"}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============ Seed ============
async def seed(demo_password: str = "Demo123!"):
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.appointments.create_index([("professional_id", 1), ("date", 1)])
    await db.appointments.create_index("id", unique=True)
    await db.appointments.create_index([("clinic_id", 1), ("series_id", 1)])
    await db.notification_preferences.create_index("user_id", unique=True)
    await db.professional_availability.create_index("professional_id", unique=True)
    await db.professional_services.create_index("id", unique=True)
    await db.clinics.create_index("id", unique=True)
    await db.clinics.update_one({"id": "default"}, {"$setOnInsert": {
        "id": "default", "name": "ACE Fisio", "timezone": "America/Sao_Paulo", "currency": "BRL"}}, upsert=True)

    # Demo data is opt-in and must never overwrite an existing database.
    if os.environ.get("SEED_DEMO", "false").lower() != "true":
        return
    if await db.users.count_documents({}) or await db.patients.count_documents({}):
        return

    admins = [
        ("fisio@demo.com", "admin_fisio", "Dr. Ana Ribeiro (Fisio)"),
        ("pilates@demo.com", "admin_pilates", "Marina Costa (Pilates)"),
    ]
    admin_ids = {}
    for email, role, name in admins:
        existing = await db.users.find_one({"email": email})
        if existing:
            admin_ids[role] = existing["id"]
            continue
        uid = str(uuid.uuid4())
        await db.users.insert_one({
            "id": uid, "email": email, "password_hash": hash_password(demo_password),
            "role": role, "name": name, "patient_id": None,
        })
        admin_ids[role] = uid

    if await db.meta.find_one({"key": "demo_seeded_v3"}):
        return

    # Existing collections are preserved.

    # Procedures
    procs = [
        ("Avaliação", "fisio"), ("Sessão de fisioterapia", "fisio"),
        ("Reabilitação", "fisio"), ("Pós-operatório", "fisio"), ("Terapia manual", "fisio"),
        ("Avaliação", "pilates"), ("Aula individual", "pilates"),
        ("Aula em dupla", "pilates"), ("Aula em grupo", "pilates"),
    ]
    await db.procedures.insert_many([{"id": str(uuid.uuid4()), "name": n, "area": a} for n, a in procs])

    fisio_id = admin_ids.get("admin_fisio")
    pilates_id = admin_ids.get("admin_pilates")

    # Demo patients (one with a login)
    demo_patients = [
        {"name": "João Almeida", "area": "fisio", "phone": "(11) 98888-1111", "email": "joao@demo.com", "birth_date": "1988-04-12", "login": True},
        {"name": "Beatriz Souza", "area": "pilates", "phone": "(11) 98888-2222", "email": "beatriz@demo.com", "birth_date": "1993-09-01"},
        {"name": "Carlos Mendes", "area": "ambos", "phone": "(11) 98888-3333", "email": "carlos@demo.com", "birth_date": "1979-12-23"},
        {"name": "Fernanda Lima", "area": "fisio", "phone": "(11) 98888-4444", "email": "fernanda@demo.com", "birth_date": "2000-06-15"},
        {"name": "Rafael Torres", "area": "pilates", "phone": "(11) 98888-5555", "email": "rafael@demo.com", "birth_date": "1985-02-28"},
    ]

    patient_ids = []
    for dp in demo_patients:
        p = Patient(name=dp["name"], area=dp["area"], phone=dp["phone"], whatsapp=dp["phone"],
                    email=dp["email"], birth_date=dp["birth_date"])
        if dp.get("login"):
            uid = str(uuid.uuid4())
            await db.users.insert_one({
                "id": uid, "email": dp["email"].lower(), "password_hash": hash_password(demo_password),
                "role": "patient", "name": dp["name"], "patient_id": p.id,
            })
            p.user_id = uid
        await db.patients.insert_one(p.dict())
        patient_ids.append(p.id)

    # Anamnese for João
    await db.anamneses.insert_one({
        "patient_id": patient_ids[0],
        "queixa_principal": "Dor lombar após esforço", "tempo_queixa": "3 semanas",
        "tratamento_anterior": True, "qual_tratamento": "Anti-inflamatório",
        "exames": "Raio-X sem alterações", "diagnostico": "Lombalgia mecânica",
        "condicao_medica": "Hipertensão controlada", "cirurgias": "Nenhuma",
        "medicamentos": "Losartana", "observacoes": "Pratica corrida 2x/semana",
        "updated_at": datetime.now(timezone.utc).isoformat(),
    })

    # Assessments for João (progression)
    base_day = datetime.now().date()
    assessments = [
        (base_day - timedelta(days=21), 8, 60), (base_day - timedelta(days=14), 6, 75),
        (base_day - timedelta(days=7), 4, 90), (base_day, 2, 110),
    ]
    for d, dor, amp in assessments:
        await db.assessments.insert_one({
            "id": str(uuid.uuid4()), "patient_id": patient_ids[0], "date": d.isoformat(),
            "dor": dor, "local_dor": "Lombar", "amplitude_movimento": amp,
            "mobilidade": "Boa", "flexibilidade": "Moderada", "forca": "Melhorando",
            "limitacoes": "Flexão de tronco", "observacoes": "",
        })

    # Evolutions for João
    for i, d in enumerate([base_day - timedelta(days=21), base_day - timedelta(days=14), base_day - timedelta(days=7)]):
        await db.evolutions.insert_one({
            "id": str(uuid.uuid4()), "patient_id": patient_ids[0], "date": d.isoformat(),
            "professional": "Dr. Ana Ribeiro (Fisio)", "professional_id": fisio_id,
            "area": "fisio", "tipo_atendimento": "Sessão de fisioterapia",
            "evolucao_clinica": f"Sessão {i+1}: paciente evoluindo bem, redução da dor.",
            "observacoes": "Sem intercorrências", "condutas": "Terapia manual + exercícios",
            "resposta_paciente": "Boa", "recomendacoes": "Manter alongamentos",
            "proximos_passos": "Progredir carga", "created_at": datetime.now(timezone.utc).isoformat(),
        })

    # Appointments
    def mk_appt(pidx, area, proc, day_offset, time, status, prof):
        d = (base_day + timedelta(days=day_offset))
        dt = datetime.combine(d, datetime.strptime(time, "%H:%M").time())
        return {
            "id": str(uuid.uuid4()), "patient_id": patient_ids[pidx],
            "patient_name": demo_patients[pidx]["name"],
            "professional_id": prof, "professional_name": "Dr. Ana Ribeiro (Fisio)" if prof == fisio_id else "Marina Costa (Pilates)",
            "area": area, "procedure": proc, "date": d.isoformat(), "time": time,
            "datetime": dt.isoformat(), "duration_min": 60, "status": status,
            "created_by_role": "admin_fisio", "notes": "",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

    appts = [
        mk_appt(0, "fisio", "Sessão de fisioterapia", 1, "09:00", "confirmado", fisio_id),
        mk_appt(3, "fisio", "Avaliação", 0, "10:00", "agendado", fisio_id),
        mk_appt(1, "pilates", "Aula individual", 0, "11:00", "presente", pilates_id),
        mk_appt(4, "pilates", "Aula em grupo", 1, "08:00", "agendado", pilates_id),
        mk_appt(2, "fisio", "Reabilitação", 2, "14:00", "agendado", fisio_id),
        mk_appt(0, "fisio", "Sessão de fisioterapia", -7, "09:00", "presente", fisio_id),
        mk_appt(0, "fisio", "Sessão de fisioterapia", -3, "09:00", "faltou", fisio_id),
        mk_appt(0, "pilates", "Aula individual", 3, "15:00", "agendado", pilates_id),
    ]
    await db.appointments.insert_many(appts)

    # Exercises for João
    exs = [
        {"name": "Alongamento lombar", "description": "Deitado, puxe os joelhos ao peito.", "series": "3", "repetitions": "10", "frequency": "Diário", "duration": "30s"},
        {"name": "Ponte de glúteo", "description": "Eleve o quadril mantendo a coluna neutra.", "series": "3", "repetitions": "12", "frequency": "3x/semana", "duration": ""},
    ]
    for e in exs:
        await db.exercises.insert_one({
            "id": str(uuid.uuid4()), "patient_id": patient_ids[0], **e, "observacoes": "",
            "active": True, "created_at": datetime.now(timezone.utc).isoformat(),
        })

    # Payments
    pays = [
        {"pidx": 0, "area": "fisio", "desc": "Pacote 10 sessões - Fisioterapia", "amount": 900.0, "status": "pendente", "due": (base_day + timedelta(days=5)).isoformat()},
        {"pidx": 1, "area": "pilates", "desc": "Mensalidade Pilates", "amount": 320.0, "status": "pago", "due": (base_day - timedelta(days=2)).isoformat()},
        {"pidx": 3, "area": "fisio", "desc": "Avaliação inicial", "amount": 150.0, "status": "atrasado", "due": (base_day - timedelta(days=10)).isoformat()},
        {"pidx": 2, "area": "fisio", "desc": "Sessão avulsa", "amount": 120.0, "status": "pendente", "due": (base_day + timedelta(days=3)).isoformat()},
    ]
    for p in pays:
        await db.payments.insert_one({
            "id": str(uuid.uuid4()), "patient_id": patient_ids[p["pidx"]],
            "patient_name": demo_patients[p["pidx"]]["name"], "area": p["area"],
            "description": p["desc"], "amount": p["amount"], "status": p["status"],
            "due_date": p["due"], "paid_date": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    # Notification for demo patient João
    joao_user = await db.users.find_one({"email": "joao@demo.com"})
    if joao_user:
        await push_notification(joao_user["id"], "Bem-vindo à clínica", "Seu próximo atendimento está agendado.", "info")
        await push_notification(joao_user["id"], "Pagamento pendente", "Você possui um pacote em aberto.", "payment")

    await db.meta.insert_one({"key": "demo_seeded_v3", "at": datetime.now(timezone.utc).isoformat()})
    logger.info("Demo data seeded.")


@app.on_event("startup")
async def on_startup():
    try:
        await seed()
    except Exception as e:
        logger.error(f"Seed error: {e}")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
