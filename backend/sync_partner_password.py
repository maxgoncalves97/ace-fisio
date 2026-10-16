"""Explicitly sync only the three partner demo accounts to the local password."""
import asyncio
from pathlib import Path

import bcrypt
from dotenv import dotenv_values
from motor.motor_asyncio import AsyncIOMotorClient
import requests

ROOT = Path(__file__).parent
TARGET = "ace_fisio_partner_demo"
ACCOUNTS = {"fisio@demo.com": "admin_fisio", "pilates@demo.com": "admin_pilates", "joao@demo.com": "patient"}


async def sync():
    partner = dotenv_values(ROOT / ".env.partner")
    password = partner.get("PARTNER_TEST_PASSWORD")
    if partner.get("DB_NAME") != TARGET or not password or len(password.encode("utf-8")) > 72:
        raise RuntimeError("Partner settings invalid; no accounts changed.")
    client = AsyncIOMotorClient(dotenv_values(ROOT / ".env")["MONGO_URL"], serverSelectionTimeoutMS=25000)
    try:
        db = client[TARGET]
        users = []
        for email, role in ACCOUNTS.items():
            user = await db.users.find_one({"email": email, "role": role})
            if not user:
                raise RuntimeError("Expected partner account missing; no accounts changed.")
            users.append(user)
        for user in users:
            hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
            result = await db.users.update_one({"_id": user["_id"], "email": user["email"], "role": user["role"]},
                                               {"$set": {"password_hash": hashed}})
            if result.matched_count != 1:
                raise RuntimeError("Partner account changed concurrently; rerun sync.")
        print("Synced passwords for the three partner demo accounts only.")
    finally:
        client.close()
    for email, role in ACCOUNTS.items():
        response = requests.post("https://ace-fisio-partner-demo.onrender.com/api/auth/login",
                                 json={"email": email, "password": password}, timeout=90)
        if response.status_code != 200 or response.json().get("user", {}).get("role") != role:
            raise RuntimeError("Password sync completed but public login verification failed.")
    print("Verified all three public logins with the saved password. No redeployment needed.")


if __name__ == "__main__":
    try:
        asyncio.run(sync())
    except Exception as error:
        print(f"Sync/verification failed ({type(error).__name__}); secrets were not printed.")
        raise SystemExit(1) from None
