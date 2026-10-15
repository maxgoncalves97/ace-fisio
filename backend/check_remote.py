"""Read-only checks against the named HTTPS partner preview; never print credentials."""
from pathlib import Path
from dotenv import dotenv_values
import requests

BASE = "https://ace-fisio-partner-demo.onrender.com"


def main():
    password = dotenv_values(Path(__file__).with_name(".env.partner"))["PARTNER_TEST_PASSWORD"]
    session = requests.Session()
    health = session.get(BASE + "/healthz", timeout=60)
    assert health.status_code == 200 and health.json() == {"status": "ok"}, "Health check failed"
    for route in ("/login", "/patient/dashboard", "/admin/agenda"):
        response = session.get(BASE + route, headers={"Accept": "text/html"}, timeout=30)
        assert response.status_code == 200 and "<html" in response.text, route
        assert "no-store" in response.headers.get("Cache-Control", ""), "Missing cache header"
    for route in ("/manifest.json", "/sw.js", "/offline.html", "/icons/icon-192.png"):
        assert session.get(BASE + route, timeout=30).status_code == 200, route
    assert session.get(BASE + "/api/missing", timeout=30).status_code == 404
    for email, role, dashboard in (("fisio@demo.com", "admin_fisio", "/api/admin/dashboard"),
                                   ("joao@demo.com", "patient", "/api/patient/dashboard")):
        response = session.post(BASE + "/api/auth/login", json={"email": email, "password": password}, timeout=30)
        assert response.status_code == 200 and response.json()["user"]["role"] == role, "Partner login failed"
        headers = {"Authorization": "Bearer " + response.json()["access_token"]}
        assert session.get(BASE + dashboard, headers=headers, timeout=30).status_code == 200, "Dashboard failed"
    assert session.post(BASE + "/api/auth/login", json={"email": "fisio@demo.com", "password": "Demo123!"}, timeout=30).status_code == 401
    print("Public HTTPS checks passed: database health, professional/patient logins and dashboards, deep links, PWA assets, cache headers and rejection of local demo password.")


if __name__ == "__main__":
    try:
        main()
    except requests.RequestException:
        raise SystemExit("Public preview network check failed; no secrets printed.") from None
