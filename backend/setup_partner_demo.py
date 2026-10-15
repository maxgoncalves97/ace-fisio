"""Provision persistent synthetic partner data on the existing Atlas cluster.

Only ace_fisio_partner_demo is writable; never copies or resets clinic data.
Local secrets are saved in the git-ignored .env.partner file.
"""
import asyncio
import os
from pathlib import Path
import secrets

from dotenv import dotenv_values, load_dotenv, set_key

ROOT = Path(__file__).parent
TARGET = "ace_fisio_partner_demo"
SECRETS = ROOT / ".env.partner"
load_dotenv(ROOT / ".env")
os.environ["DB_NAME"] = TARGET
os.environ["SEED_DEMO"] = "true"


async def main():
    from server import client, db, seed, verify_password

    try:
        await asyncio.wait_for(client.admin.command("ping"), timeout=25)
        settings = dotenv_values(SECRETS) if SECRETS.exists() else {}
        password = settings.get("PARTNER_TEST_PASSWORD")
        if not password:
            if await db.users.count_documents({}) or await db.patients.count_documents({}):
                raise RuntimeError("Existing partner data found without its local credentials; refusing to change it.")
            SECRETS.touch(exist_ok=True)
            password = secrets.token_urlsafe(20)
            set_key(str(SECRETS), "DB_NAME", TARGET)
            set_key(str(SECRETS), "SEED_DEMO", "false")
            set_key(str(SECRETS), "JWT_SECRET_KEY", secrets.token_urlsafe(48))
            set_key(str(SECRETS), "PARTNER_TEST_PASSWORD", password)
        if dotenv_values(SECRETS).get("DB_NAME") != TARGET or db.name != TARGET:
            raise RuntimeError("Partner database guard failed.")
        await seed(demo_password=password)
        for email in ("fisio@demo.com", "pilates@demo.com", "joao@demo.com"):
            user = await db.users.find_one({"email": email})
            if not user or not verify_password(password, user["password_hash"]):
                raise RuntimeError("Partner account verification failed.")
        counts = {name: await db[name].count_documents({})
                  for name in ("users", "patients", "appointments")}
        print(f"Verified partner database: {TARGET}; counts: {counts}")
        print("Verified professional and patient passwords. Secrets: backend/.env.partner (not printed).")
        print("Existing clinic and automated-test databases were not modified.")
    finally:
        client.close()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as error:
        # Database exceptions can contain connection details; keep stdout sanitized.
        print(f"Partner setup failed ({type(error).__name__}); no connection secrets printed.")
        raise SystemExit(1) from None
