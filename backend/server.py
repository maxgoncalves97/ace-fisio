import os
import logging
from pathlib import Path
from datetime import datetime, timedelta, timezone
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
    area: Area = "fisio"
    procedure: str = ""
    date: str  # YYYY-MM-DD
    time: str  # HH:mm
    duration_min: int = 60
    notes: str = ""


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
    day = dt.date().isoformat()
    q = {"professional_id": professional_id, "date": day, "status": {"$ne": "cancelado"}}
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
    q: dict = {}
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
    is_patient = user["role"] == "patient"
    if is_patient and body.patient_id != user.get("patient_id"):
        raise HTTPException(403, "Sem permissão")

    try:
        dt = datetime.fromisoformat(f"{body.date}T{body.time}:00")
    except Exception:
        raise HTTPException(400, "Data ou horário inválidos")

    # 12h advance rule for patients only
    if is_patient:
        naive_now = datetime.now()
        if dt < naive_now + timedelta(hours=12):
            raise HTTPException(
                400,
                "Este horário não pode ser agendado online. Os agendamentos devem ser realizados com pelo menos 12 horas de antecedência. Entre em contato com a clínica para verificar disponibilidade.",
            )

    prof_id = body.professional_id or (None if is_patient else user["id"])
    if await _has_conflict(prof_id, dt, body.duration_min):
        raise HTTPException(400, "Já existe um atendimento para este profissional neste horário")

    patient = await _get_patient_or_404(body.patient_id)
    prof = None
    if prof_id:
        prof = await db.users.find_one({"id": prof_id}, {"_id": 0, "password_hash": 0})

    doc = {
        "id": str(uuid.uuid4()),
        "patient_id": body.patient_id,
        "patient_name": patient["name"],
        "professional_id": prof_id,
        "professional_name": (prof.get("name") if prof else "") or (prof.get("email") if prof else ""),
        "area": body.area,
        "procedure": body.procedure,
        "date": body.date,
        "time": body.time,
        "datetime": dt.isoformat(),
        "duration_min": body.duration_min,
        "status": "agendado",
        "created_by_role": user["role"],
        "notes": body.notes,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.appointments.insert_one(doc)
    doc.pop("_id", None)

    # notify patient user if exists
    if patient.get("user_id"):
        await push_notification(
            patient["user_id"], "Consulta agendada",
            f"{body.procedure or 'Atendimento'} em {datetime.fromisoformat(body.date).strftime('%d/%m/%Y')} às {body.time}.",
            "appointment",
        )
    return doc


@api_router.patch("/appointments/{aid}/status")
async def set_status(aid: str, body: StatusIn, admin: AdminUser):
    a = await db.appointments.find_one({"id": aid}, {"_id": 0})
    if not a:
        raise HTTPException(404, "Agendamento não encontrado")
    await db.appointments.update_one({"id": aid}, {"$set": {"status": body.status}})
    a["status"] = body.status
    return a


@api_router.patch("/appointments/{aid}")
async def reschedule_appointment(aid: str, body: AppointmentIn, user: AnyUser):
    a = await db.appointments.find_one({"id": aid}, {"_id": 0})
    if not a:
        raise HTTPException(404, "Agendamento não encontrado")
    is_patient = user["role"] == "patient"
    if is_patient and a["patient_id"] != user.get("patient_id"):
        raise HTTPException(403, "Sem permissão")
    try:
        dt = datetime.fromisoformat(f"{body.date}T{body.time}:00")
    except Exception:
        raise HTTPException(400, "Data ou horário inválidos")
    if is_patient and dt < datetime.now() + timedelta(hours=12):
        raise HTTPException(400, "Os agendamentos devem ser realizados com pelo menos 12 horas de antecedência.")
    prof_id = body.professional_id or a.get("professional_id")
    if await _has_conflict(prof_id, dt, body.duration_min, exclude_id=aid):
        raise HTTPException(400, "Conflito de horário para este profissional")
    upd = {
        "date": body.date, "time": body.time, "datetime": dt.isoformat(),
        "duration_min": body.duration_min, "procedure": body.procedure,
        "area": body.area, "notes": body.notes, "status": "remarcado",
        "professional_id": prof_id,
    }
    await db.appointments.update_one({"id": aid}, {"$set": upd})
    return {**a, **upd}


@api_router.delete("/appointments/{aid}")
async def cancel_appointment(aid: str, user: AnyUser):
    a = await db.appointments.find_one({"id": aid}, {"_id": 0})
    if not a:
        raise HTTPException(404, "Agendamento não encontrado")
    if user["role"] == "patient" and a["patient_id"] != user.get("patient_id"):
        raise HTTPException(403, "Sem permissão")
    await db.appointments.update_one({"id": aid}, {"$set": {"status": "cancelado"}})
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
    q: dict = {}
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
    docs = await db.users.find({"role": {"$in": ["admin_fisio", "admin_pilates"]}}, {"_id": 0, "password_hash": 0}).to_list(50)
    return docs


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============ Seed ============
async def seed():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)

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
            "id": uid, "email": email, "password_hash": hash_password("Demo123!"),
            "role": role, "name": name, "patient_id": None,
        })
        admin_ids[role] = uid

    if await db.meta.find_one({"key": "demo_seeded_v3"}):
        return

    # Fresh demo data: wipe previous demo docs (keep admin users)
    for coll in ["patients", "appointments", "assessments", "evolutions",
                 "exercises", "payments", "anamneses", "patient_notes",
                 "procedures", "notifications"]:
        await db[coll].delete_many({})
    await db.users.delete_many({"role": "patient"})
    await db.meta.delete_many({"key": "demo_seeded_v2"})

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
                "id": uid, "email": dp["email"].lower(), "password_hash": hash_password("Demo123!"),
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
