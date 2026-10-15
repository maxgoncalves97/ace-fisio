"""Provision a synthetic professional only in the isolated UI-test database."""
import asyncio
import json
import os
import re
import sys
import uuid
from pathlib import Path
import bcrypt
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

async def main():
    unique = sys.argv[1]
    if not re.fullmatch(r'[a-zA-Z0-9-]{8,40}', unique):
        raise SystemExit('Invalid E2E fixture identifier')
    load_dotenv(Path(__file__).with_name('.env'))
    client = AsyncIOMotorClient(os.environ['MONGO_URL'], serverSelectionTimeoutMS=10000)
    doc = {'id': str(uuid.uuid4()), 'name': f'E2E-professional-{unique}',
           'email': f'e2e-professional-{unique}@example.com', 'role': 'admin_fisio',
           'clinic_id': 'default', 'patient_id': None,
           'password_hash': bcrypt.hashpw(b'Demo123!', bcrypt.gensalt()).decode()}
    try:
        await client['ace_fisio_ui_test'].users.insert_one(dict(doc))
        print(json.dumps({key: doc[key] for key in ('id', 'name', 'email')}))
    finally:
        client.close()

if __name__ == '__main__':
    asyncio.run(main())
