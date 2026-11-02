# Host Mode backups

Every night GitHub copies the whole database, compresses it and locks it with your backup
passphrase. The last 30 nights are kept. Without the passphrase the files can't be read,
so they're safe even though this repo is public.

## One-time setup (Roy, about 10 minutes)

1. Firebase console → the gear next to Project Overview → **Project settings** → **Service accounts**
   → **Generate new private key** → Generate key. A .json file downloads.
2. GitHub → this repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**:
   - Name `FIREBASE_SERVICE_ACCOUNT`, value: open the .json file and paste everything in it.
   - Name `BACKUP_PASSPHRASE`, value: a long phrase only you know (at least 12 characters).
     Write it down somewhere safe. **Without it, nobody can open a backup, including you.**
3. Delete the downloaded .json file from your phone or computer.
4. Try it: GitHub → **Actions** → **Nightly backup** → **Run workflow**. When it finishes with a
   green check, the admin console's Support tab shows the time of the last backup.

## Getting a backup back

1. GitHub → **Actions** → **Nightly backup** → pick a night → download the file under Artifacts and unzip it.
2. On a computer with a terminal:
   `openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -in hostmode-backup.json.gz.enc -out backup.json.gz`
   (it asks for the passphrase), then `gunzip backup.json.gz`.
3. Firebase console → Realtime Database → Data → the three dots → **Import JSON** → pick backup.json.
   Importing replaces everything at that spot, so ask Claude to help restore just one part if that's all you need.
