"""Manage only the explicitly free ACE partner preview; never print secrets."""
from pathlib import Path
import sys
import requests
from dotenv import dotenv_values

ROOT = Path(__file__).parent
NAME = "ace-fisio-partner-demo"
BRANCH = "deploy/free-render-partner-demo"
REPO = "https://github.com/maxgoncalves97/ace-fisio"


def main():
    config = dotenv_values(ROOT / ".env.render")
    token = config.get("RENDER_API_KEY")
    if not token:
        raise SystemExit("Save RENDER_API_KEY in ignored backend/.env.render before deploying.")
    session = requests.Session()
    session.headers.update({"Authorization": "Bearer " + token, "Accept": "application/json"})

    def call(method, path, **kwargs):
        response = session.request(method, "https://api.render.com/v1" + path, timeout=60, **kwargs)
        if not response.ok:
            # Responses can echo settings; report status only, never secrets.
            raise SystemExit(f"Render API {method} {path}: HTTP {response.status_code}. No secret response content printed.")
        return response.json() if response.content else None

    owners = [entry["owner"] for entry in call("GET", "/owners", params={"limit": 100})]
    owner_id = config.get("RENDER_OWNER_ID")
    if not owner_id:
        if len(owners) != 1:
            print("Choose a workspace by setting RENDER_OWNER_ID in backend/.env.render:")
            for owner in owners:
                print(owner["id"], owner["name"])
            raise SystemExit(1)
        owner_id = owners[0]["id"]
    if owner_id not in {owner["id"] for owner in owners}:
        raise SystemExit("Configured workspace is not available to this key.")
    matches = [entry["service"] for entry in call("GET", "/services", params={"ownerId": owner_id, "name": NAME, "limit": 100})
               if entry["service"]["name"] == NAME]
    if len(matches) > 1:
        raise SystemExit("Multiple matching previews found; refusing to modify resources.")
    if not matches:
        if "--create" not in sys.argv:
            print("No preview service exists yet. Use --create to create the explicitly free service.")
            return
        backend = dotenv_values(ROOT / ".env")
        partner = dotenv_values(ROOT / ".env.partner")
        if partner.get("DB_NAME") != "ace_fisio_partner_demo":
            raise SystemExit("Partner database guard failed.")
        values = {"MONGO_URL": backend["MONGO_URL"], "JWT_SECRET_KEY": partner["JWT_SECRET_KEY"],
                  "DB_NAME": "ace_fisio_partner_demo", "SEED_DEMO": "false"}
        payload = {"type": "web_service", "name": NAME, "ownerId": owner_id, "repo": REPO,
                   "branch": BRANCH, "autoDeployTrigger": "off",
                   "envVars": [{"key": key, "value": value} for key, value in values.items()],
                   "serviceDetails": {"runtime": "docker", "plan": "free", "region": "virginia",
                                      "numInstances": 1, "healthCheckPath": "/healthz",
                                      "envSpecificDetails": {"dockerfilePath": "./Dockerfile", "dockerContext": "."}}}
        matches = [call("POST", "/services", json=payload)["service"]]
        print("Created the free partner preview; initial deployment requested.")
    service = matches[0]
    details = service["serviceDetails"]
    if details.get("plan") != "free" or service.get("branch") != BRANCH or service.get("repo", "").removesuffix(".git") != REPO:
        raise SystemExit("Existing service does not match the free preview configuration; no changes made.")
    service_id = service["id"]
    print("Service:", service_id, "Plan:", details["plan"], "URL:", details.get("url", "pending"))
    if "--deploy" in sys.argv:
        call("POST", f"/services/{service_id}/deploys", json={"clearCache": "do_not_clear"})
        print("Requested manual deployment of the free preview.")
    deploys = call("GET", f"/services/{service_id}/deploys", params={"limit": 1})
    if deploys:
        latest = deploys[0]["deploy"]
        print("Latest deployment:", latest["id"], latest["status"])


if __name__ == "__main__":
    try:
        main()
    except requests.RequestException:
        raise SystemExit("Render API network error; no secrets printed.") from None
