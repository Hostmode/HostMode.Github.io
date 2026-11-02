"""Nightly backup of the Host Mode database.

Runs in GitHub Actions (see .github/workflows/nightly-backup.yml). It reads the whole
Realtime Database with a Firebase service account, compresses it and encrypts it with
BACKUP_PASSPHRASE before anything is saved. The encrypted file is kept as a workflow
artifact for 30 days. Nothing readable ever lands in this public repo or its logs.

Secrets (GitHub repo settings, Secrets and variables, Actions):
  FIREBASE_SERVICE_ACCOUNT  the whole JSON key from Firebase (Project settings, Service accounts)
  BACKUP_PASSPHRASE         a long phrase only Roy knows; needed to open a backup
"""
import gzip, json, os, subprocess, sys, time, urllib.request

DB_URL = "https://spark-drinks-2d185-default-rtdb.firebaseio.com"
OUT = "backup/hostmode-backup.json.gz.enc"


def note(msg):
    print(msg, flush=True)


def token(sa_json):
    from google.oauth2 import service_account
    from google.auth.transport.requests import Request
    creds = service_account.Credentials.from_service_account_info(
        json.loads(sa_json),
        scopes=["https://www.googleapis.com/auth/firebase.database", "https://www.googleapis.com/auth/userinfo.email"])
    creds.refresh(Request())
    return creds.token


def call(path, tok, method="GET", body=None):
    req = urllib.request.Request(f"{DB_URL}/{path}.json", method=method, data=None if body is None else json.dumps(body).encode(),
                                 headers={"Authorization": f"Bearer {tok}", "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=300) as r:
        return r.read()


def main():
    sa, phrase = os.environ.get("FIREBASE_SERVICE_ACCOUNT", "").strip(), os.environ.get("BACKUP_PASSPHRASE", "")
    if not sa or not phrase:
        note("Backups aren't set up yet: add the FIREBASE_SERVICE_ACCOUNT and BACKUP_PASSPHRASE secrets. Skipping.")
        return 0
    if len(phrase) < 12:
        note("BACKUP_PASSPHRASE is too short. Use at least 12 characters. Skipping.")
        return 1
    tok = token(sa)
    raw = call("", tok)
    size = len(raw)
    json.loads(raw)  # make sure it's a complete copy before saving it
    os.makedirs("backup", exist_ok=True)
    with open("backup/plain.json.gz", "wb") as f:
        f.write(gzip.compress(raw, 9))
    subprocess.run(["openssl", "enc", "-aes-256-cbc", "-pbkdf2", "-iter", "200000", "-salt", "-in", "backup/plain.json.gz", "-out", OUT,
                    "-pass", "env:BACKUP_PASSPHRASE"], check=True)
    os.remove("backup/plain.json.gz")
    note(f"Backed up {size / 1e6:.2f} MB (encrypted file {os.path.getsize(OUT) / 1e6:.2f} MB).")
    try:  # so the admin console can show when the last backup ran
        call("partygames/backupStatus", tok, "PUT", {"t": int(time.time() * 1000), "mb": round(size / 1e6, 2), "ok": True})
    except Exception as e:  # the backup itself still counts
        note(f"Couldn't record the backup time: {type(e).__name__}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
