from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="Ace Scheduler API")
api_router = APIRouter(prefix="/api")


# ---------- Models ----------
SessionType = Literal["physio", "pilates"]


class Therapist(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    role: str  # e.g., "Senior Physiotherapist", "Pilates Instructor"
    bio: str = ""
    specialties: List[str] = []
    photo_url: str = ""
    types: List[SessionType] = []  # which session types they can lead
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class TherapistCreate(BaseModel):
    name: str
    role: str
    bio: str = ""
    specialties: List[str] = []
    photo_url: str = ""
    types: List[SessionType] = []


class Session(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: SessionType
    title: str
    therapist_id: str
    start_time: datetime
    duration_min: int = 60
    capacity: int = 1  # 1 for physio, N for pilates
    booked_count: int = 0
    location: str = "Ace Studio"
    notes: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class SessionCreate(BaseModel):
    type: SessionType
    title: str
    therapist_id: str
    start_time: datetime
    duration_min: int = 60
    capacity: int = 1
    location: str = "Ace Studio"
    notes: str = ""


class SessionWithTherapist(Session):
    therapist: Optional[Therapist] = None


class Booking(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    user_id: str  # guest device id
    user_name: str
    user_phone: str = ""
    status: Literal["confirmed", "cancelled"] = "confirmed"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class BookingCreate(BaseModel):
    session_id: str
    user_id: str
    user_name: str
    user_phone: str = ""


class BookingRich(Booking):
    session: Optional[Session] = None
    therapist: Optional[Therapist] = None


class RescheduleReq(BaseModel):
    new_session_id: str


# ---------- Helpers ----------
def _clean(doc: dict) -> dict:
    if not doc:
        return doc
    doc.pop("_id", None)
    return doc


# ---------- Routes ----------
@api_router.get("/")
async def root():
    return {"message": "Ace Scheduler API"}


# --- Therapists ---
@api_router.post("/therapists", response_model=Therapist)
async def create_therapist(payload: TherapistCreate):
    obj = Therapist(**payload.dict())
    await db.therapists.insert_one(obj.dict())
    return obj


@api_router.get("/therapists", response_model=List[Therapist])
async def list_therapists(type: Optional[SessionType] = None):
    q = {}
    if type:
        q = {"types": type}
    docs = await db.therapists.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)
    return [Therapist(**d) for d in docs]


@api_router.get("/therapists/{tid}", response_model=Therapist)
async def get_therapist(tid: str):
    doc = await db.therapists.find_one({"id": tid}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Therapist not found")
    return Therapist(**doc)


@api_router.delete("/therapists/{tid}")
async def delete_therapist(tid: str):
    await db.therapists.delete_one({"id": tid})
    return {"ok": True}


# --- Sessions ---
@api_router.post("/sessions", response_model=Session)
async def create_session(payload: SessionCreate):
    # Validate therapist exists
    t = await db.therapists.find_one({"id": payload.therapist_id}, {"_id": 0})
    if not t:
        raise HTTPException(400, "Therapist not found")
    obj = Session(**payload.dict())
    await db.sessions.insert_one(obj.dict())
    return obj


@api_router.get("/sessions", response_model=List[SessionWithTherapist])
async def list_sessions(
    type: Optional[SessionType] = None,
    date: Optional[str] = None,  # YYYY-MM-DD
    upcoming_only: bool = True,
):
    q: dict = {}
    if type:
        q["type"] = type
    if date:
        try:
            day_start = datetime.fromisoformat(f"{date}T00:00:00+00:00")
            day_end = datetime.fromisoformat(f"{date}T23:59:59+00:00")
            q["start_time"] = {"$gte": day_start, "$lte": day_end}
        except Exception:
            raise HTTPException(400, "Invalid date format, use YYYY-MM-DD")
    elif upcoming_only:
        q["start_time"] = {"$gte": datetime.now(timezone.utc)}

    docs = await db.sessions.find(q, {"_id": 0}).sort("start_time", 1).to_list(500)
    # Attach therapists
    therapist_ids = list({d["therapist_id"] for d in docs})
    tdocs = await db.therapists.find({"id": {"$in": therapist_ids}}, {"_id": 0}).to_list(500)
    tmap = {t["id"]: Therapist(**t) for t in tdocs}
    out = []
    for d in docs:
        s = SessionWithTherapist(**d)
        s.therapist = tmap.get(d["therapist_id"])
        out.append(s)
    return out


@api_router.get("/sessions/{sid}", response_model=SessionWithTherapist)
async def get_session(sid: str):
    d = await db.sessions.find_one({"id": sid}, {"_id": 0})
    if not d:
        raise HTTPException(404, "Session not found")
    s = SessionWithTherapist(**d)
    t = await db.therapists.find_one({"id": d["therapist_id"]}, {"_id": 0})
    if t:
        s.therapist = Therapist(**t)
    return s


@api_router.delete("/sessions/{sid}")
async def delete_session(sid: str):
    await db.sessions.delete_one({"id": sid})
    await db.bookings.update_many({"session_id": sid}, {"$set": {"status": "cancelled"}})
    return {"ok": True}


# --- Bookings ---
@api_router.post("/bookings", response_model=BookingRich)
async def create_booking(payload: BookingCreate):
    session = await db.sessions.find_one({"id": payload.session_id}, {"_id": 0})
    if not session:
        raise HTTPException(404, "Session not found")
    if session["booked_count"] >= session["capacity"]:
        raise HTTPException(400, "Session is fully booked")

    # Prevent duplicate active booking by same user for same session
    existing = await db.bookings.find_one({
        "session_id": payload.session_id,
        "user_id": payload.user_id,
        "status": "confirmed",
    }, {"_id": 0})
    if existing:
        raise HTTPException(400, "You already have an active booking for this session")

    obj = Booking(**payload.dict())
    await db.bookings.insert_one(obj.dict())
    await db.sessions.update_one({"id": payload.session_id}, {"$inc": {"booked_count": 1}})

    rich = BookingRich(**obj.dict())
    session["booked_count"] += 1
    rich.session = Session(**session)
    t = await db.therapists.find_one({"id": session["therapist_id"]}, {"_id": 0})
    if t:
        rich.therapist = Therapist(**t)
    return rich


@api_router.get("/bookings", response_model=List[BookingRich])
async def list_bookings(user_id: str, status: Optional[str] = None):
    q: dict = {"user_id": user_id}
    if status:
        q["status"] = status
    docs = await db.bookings.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)
    session_ids = list({d["session_id"] for d in docs})
    sdocs = await db.sessions.find({"id": {"$in": session_ids}}, {"_id": 0}).to_list(500)
    smap = {s["id"]: Session(**s) for s in sdocs}
    tids = list({s["therapist_id"] for s in sdocs})
    tdocs = await db.therapists.find({"id": {"$in": tids}}, {"_id": 0}).to_list(500)
    tmap = {t["id"]: Therapist(**t) for t in tdocs}

    out = []
    for d in docs:
        b = BookingRich(**d)
        s = smap.get(d["session_id"])
        b.session = s
        if s:
            b.therapist = tmap.get(s.therapist_id)
        out.append(b)
    return out


@api_router.delete("/bookings/{bid}")
async def cancel_booking(bid: str):
    b = await db.bookings.find_one({"id": bid}, {"_id": 0})
    if not b:
        raise HTTPException(404, "Booking not found")
    if b["status"] == "cancelled":
        return {"ok": True}
    await db.bookings.update_one({"id": bid}, {"$set": {"status": "cancelled"}})
    await db.sessions.update_one({"id": b["session_id"]}, {"$inc": {"booked_count": -1}})
    return {"ok": True}


@api_router.patch("/bookings/{bid}/reschedule", response_model=BookingRich)
async def reschedule_booking(bid: str, payload: RescheduleReq):
    b = await db.bookings.find_one({"id": bid}, {"_id": 0})
    if not b:
        raise HTTPException(404, "Booking not found")
    if b["status"] != "confirmed":
        raise HTTPException(400, "Only confirmed bookings can be rescheduled")

    new_session = await db.sessions.find_one({"id": payload.new_session_id}, {"_id": 0})
    if not new_session:
        raise HTTPException(404, "New session not found")
    if new_session["booked_count"] >= new_session["capacity"]:
        raise HTTPException(400, "New session is fully booked")

    old_session_id = b["session_id"]
    await db.sessions.update_one({"id": old_session_id}, {"$inc": {"booked_count": -1}})
    await db.sessions.update_one({"id": payload.new_session_id}, {"$inc": {"booked_count": 1}})
    await db.bookings.update_one({"id": bid}, {"$set": {"session_id": payload.new_session_id}})

    updated = await db.bookings.find_one({"id": bid}, {"_id": 0})
    rich = BookingRich(**updated)
    ns = await db.sessions.find_one({"id": payload.new_session_id}, {"_id": 0})
    if ns:
        rich.session = Session(**ns)
        t = await db.therapists.find_one({"id": ns["therapist_id"]}, {"_id": 0})
        if t:
            rich.therapist = Therapist(**t)
    return rich


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
