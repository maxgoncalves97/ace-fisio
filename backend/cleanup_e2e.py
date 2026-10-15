"""Delete only an explicitly named E2E fixture from the isolated UI test database."""
import argparse
import asyncio
import os
from pathlib import Path
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

async def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('kind', choices=['patient', 'service', 'professional'])
    parser.add_argument('id')
    parser.add_argument('expected_name')
    args = parser.parse_args()
    if not args.expected_name.startswith('E2E-'):
        raise SystemExit('Refusing cleanup of a non-E2E record')
    load_dotenv(Path(__file__).with_name('.env'))
    client = AsyncIOMotorClient(os.environ['MONGO_URL'], serverSelectionTimeoutMS=10000)
    db = client['ace_fisio_ui_test']  # Never read DB_NAME from environment for cleanup.
    try:
        collection = db.patients if args.kind == 'patient' else db.users if args.kind == 'professional' else db.professional_services
        doc = await collection.find_one({'id': args.id, 'name': args.expected_name})
        if not doc:
            return
        if args.kind == 'professional':
            for name in ['professional_services', 'professional_availability']:
                await db[name].delete_many({'professional_id': args.id})
            await db.notifications.delete_many({'user_id': args.id})
            await collection.delete_one({'id': args.id, 'name': args.expected_name})
            return
        if args.kind == 'service':
            await collection.delete_one({'id': args.id, 'name': args.expected_name})
            return
        appointments = await db.appointments.find({'patient_id': args.id}, {'id': 1}).to_list(1000)
        await db.calendar_reservations.delete_many({'appointment_id': {'$in': [a['id'] for a in appointments]}})
        for name in ['appointments', 'anamneses', 'evolutions', 'assessments', 'exercises', 'payments', 'patient_notes']:
            await db[name].delete_many({'patient_id': args.id})
        if doc.get('user_id'):
            uid = doc['user_id']
            for name in ['notifications', 'notification_preferences', 'consent_audit']:
                await db[name].delete_many({'user_id': uid})
            await db.users.delete_one({'id': uid, 'patient_id': args.id})
        await db.patients.delete_one({'id': args.id, 'name': args.expected_name})
    finally:
        client.close()

if __name__ == '__main__':
    asyncio.run(main())
