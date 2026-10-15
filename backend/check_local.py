"""Read-only local readiness check. Does not seed or change the database."""
import asyncio
import importlib.util
import argparse
from pathlib import Path
from urllib.parse import urlsplit
from dotenv import dotenv_values
from motor.motor_asyncio import AsyncIOMotorClient

async def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--expected-host')
    parser.add_argument('--summary', action='store_true', help='Print collection counts only; never patient details')
    parser.add_argument('--e2e-summary', action='store_true', help='Count leftover synthetic browser fixtures in the isolated test database')
    args = parser.parse_args()
    settings = dotenv_values(Path(__file__).with_name('.env'))
    url = settings.get('MONGO_URL', 'mongodb://localhost:27017')
    if args.expected_host:
        configured = urlsplit(url)
        print('Configured cluster matches supplied address:', configured.hostname == args.expected_host)
        print('Password placeholder still present:', '<db_password>' in url)
    client = None
    try:
        client = AsyncIOMotorClient(url, serverSelectionTimeoutMS=2000, connectTimeoutMS=2000)
        await client.admin.command('ping')
        print('MongoDB reachable; configured database is ready for a local API start.')
        if args.summary:
            database = client[settings['DB_NAME']]
            for name in ('users', 'patients', 'appointments'):
                print(f'{name}: {await database[name].count_documents({})}')
        if args.e2e_summary:
            database = client['ace_fisio_ui_test']
            for name in ('users', 'patients', 'professional_services'):
                count = await database[name].count_documents({'name': {'$regex': '^E2E-'}})
                print(f'Remaining synthetic {name}: {count}')
    except Exception as error:
        print('MongoDB unavailable:', type(error).__name__)
        detail = str(error).lower()
        if any(term in detail for term in ('nxdomain', 'query name does not exist', 'no answer')):
            print('Reason: DNS reports no record for the configured MongoDB hostname.')
        elif any(term in detail for term in ('dns', 'resolution')) and any(term in detail for term in ('timed out', 'timeout', 'expired')):
            print('Reason: DNS lookup timed out; the network resolver did not answer.')
        elif any(term in detail for term in ('dns', 'resolution')):
            print('Reason: DNS cannot resolve the configured MongoDB server or SRV record.')
        elif 'authentication' in detail:
            print('Reason: MongoDB rejected authentication.')
        elif any(term in detail for term in ('timed out', 'timeout', 'connection refused')):
            print('Reason: MongoDB could not be reached; check server, network and access rules.')
        else:
            print('Reason: connection configuration needs review (connection string withheld).')
    finally:
        if client is not None:
            client.close()
    print('httpx available:', importlib.util.find_spec('httpx') is not None)

asyncio.run(main())
