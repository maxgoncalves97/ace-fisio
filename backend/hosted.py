"""One free Render service serves both the PWA and partner-demo API."""
import os
from pathlib import Path

if os.environ.get("DB_NAME") != "ace_fisio_partner_demo":
    raise RuntimeError("Hosted partner preview requires its dedicated demo database.")
os.environ["SEED_DEMO"] = "false"

from starlette.exceptions import HTTPException
from starlette.datastructures import Headers
from starlette.staticfiles import StaticFiles
import uvicorn
from server import app, db


@app.middleware("http")
async def prevent_preview_caching(request, call_next):
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-store"
    return response


class WebAppFiles(StaticFiles):
    async def get_response(self, path, scope):
        # Never return an HTML success page for a missing API endpoint.
        route = path.replace("\\", "/").lstrip("/")
        if route == "api" or route.startswith("api/"):
            raise HTTPException(status_code=404)
        try:
            response = await super().get_response(path, scope)
        except HTTPException as error:
            if error.status_code != 404:
                raise
            if "text/html" not in Headers(scope=scope).get("accept", ""):
                raise
            response = await super().get_response("index.html", scope)
        response.headers["Cache-Control"] = "no-store"
        return response


@app.on_event("startup")
async def verify_partner_database():
    await db.command("ping")
    if not await db.users.count_documents({}):
        raise RuntimeError("Partner database has not been provisioned.")


@app.get("/healthz")
async def health():
    await db.command("ping")
    return {"status": "ok"}


app.mount("/", WebAppFiles(directory=Path(__file__).resolve().parents[1] / "frontend" / "dist", html=True))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", "10000")))
