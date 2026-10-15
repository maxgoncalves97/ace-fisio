"""Read-only smoke test of the hosted entry point against the partner database."""
import os
from pathlib import Path
import subprocess
import sys
import time

from dotenv import dotenv_values
import requests

ROOT = Path(__file__).parent


def main():
    env = {**os.environ, **dotenv_values(ROOT / ".env"), **dotenv_values(ROOT / ".env.partner"), "PORT": "10001"}
    password = env.pop("PARTNER_TEST_PASSWORD")
    base = "http://127.0.0.1:10001"
    process = subprocess.Popen([sys.executable, str(ROOT / "hosted.py")], env=env,
                               stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        for _ in range(60):
            if process.poll() is not None:
                raise RuntimeError("Hosted server exited during startup.")
            try:
                if requests.get(base + "/healthz", timeout=2).status_code == 200:
                    break
            except requests.RequestException:
                pass
            time.sleep(0.5)
        else:
            raise RuntimeError("Hosted server did not become ready.")
        for route in ("/", "/login", "/patient/dashboard", "/admin/agenda"):
            response = requests.get(base + route, headers={"Accept": "text/html"}, timeout=10)
            assert response.status_code == 200 and "<html" in response.text, route
            assert response.headers["Cache-Control"] == "no-store"
        for route in ("/manifest.json", "/sw.js", "/icons/icon-192.png", "/offline.html"):
            assert requests.get(base + route, timeout=10).status_code == 200, route
        assert requests.get(base + "/api/missing", headers={"Accept": "text/html"}, timeout=10).status_code == 404
        assert requests.get(base + "/missing.js", timeout=10).status_code == 404
        assert requests.get(base + "/api/auth/me", timeout=10).status_code == 401
        for email, role in (("fisio@demo.com", "admin_fisio"), ("joao@demo.com", "patient")):
            response = requests.post(base + "/api/auth/login", json={"email": email, "password": password}, timeout=10)
            assert response.status_code == 200 and response.json()["user"]["role"] == role
            headers = {"Authorization": "Bearer " + response.json()["access_token"]}
            assert requests.get(base + "/api/auth/me", headers=headers, timeout=10).status_code == 200
        assert requests.post(base + "/api/auth/login", json={"email": "fisio@demo.com", "password": "Demo123!"}, timeout=10).status_code == 401
        print("Hosted smoke checks passed: deep links, API routing, PWA assets, private account login, cache headers, and rejection of public demo password.")
    finally:
        process.terminate()
        process.wait(timeout=10)


if __name__ == "__main__":
    main()
