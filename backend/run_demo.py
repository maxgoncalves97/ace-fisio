"""Run a local UI test API using a separate demo database on the configured server."""
import os
from pathlib import Path
from dotenv import load_dotenv
import uvicorn

load_dotenv(Path(__file__).with_name('.env'))
# Keep all UI test writes out of the configured clinic database.
os.environ['DB_NAME'] = 'ace_fisio_ui_test'
os.environ['SEED_DEMO'] = 'true'

if __name__ == '__main__':
    from server import app, db

    @app.get('/local-demo-health')
    async def local_demo_health():
        await db.command('ping')
        return {'mode': 'isolated-ui-test', 'status': 'ready'}

    print('Local demo API: http://127.0.0.1:8000; isolated database: ace_fisio_ui_test')
    uvicorn.run(app, host='127.0.0.1', port=8000)
