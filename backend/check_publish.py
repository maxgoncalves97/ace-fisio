"""Check staged files do not contain this checkout's private deployment values."""
from pathlib import Path
import subprocess
from dotenv import dotenv_values

root = Path(__file__).parent
private = []
for source in (root / ".env", root / ".env.partner"):
    settings = dotenv_values(source)
    private.extend(value.encode() for key, value in settings.items()
                   if key in ("MONGO_URL", "JWT_SECRET_KEY", "PARTNER_TEST_PASSWORD") and value)
paths = subprocess.check_output(["git", "diff", "--cached", "--name-only", "--diff-filter=ACMR"]).decode().splitlines()
for path in paths:
    data = subprocess.check_output(["git", "show", ":" + path])
    if any(value in data for value in private):
        raise SystemExit("Private deployment value found in staged file: " + path)
print(f"Checked {len(paths)} staged files: no local database, signing-key or partner-password values found.")
