"""Host Mode's security watch: a nightly, read-only check that files each new problem as one GitLab issue.

It never changes code or data. Because this GitHub repo is public, the run log only shows counts;
the details go to GitLab (private), into issues labeled "security watch".

Checks:
  1. headers   the live site's safety headers (HTTPS-only, no sniffing, no framing by other sites, referrer)
  2. files     private files (notes, agent code, settings) must not be served by the live site
  3. database  private database areas must refuse reads from someone who isn't signed in
  4. secrets   gitleaks scans the code on GitLab for keys or passwords (values are always hidden)

  python agents/security_watch.py               run the checks and file issues (needs GITLAB_TOKEN to file)
  python agents/security_watch.py --self-test   prove each check catches a planted problem (no network)
"""
import json, os, re, subprocess, sys, tempfile, urllib.error, urllib.parse, urllib.request

SITE = os.environ.get("HM_SITE", "https://hostmode.app")
DB = os.environ.get("HM_DB", "https://spark-drinks-2d185-default-rtdb.firebaseio.com")
PROJECT = os.environ.get("GITLAB_PROJECT", "88624897")
REPO = os.environ.get("GITLAB_REPO", "host-mode-group/hostmode")
LABEL = "security watch"
UA = {"User-Agent": "HostMode-SecurityWatch/1.0"}

PRIVATE_FILES = ["CLAUDE.md", "CHANGELOG.md", ".gitlab-ci.yml", ".gitignore", ".claude/skills/foreman/SKILL.md",
                 "agents/README.md", "agents/common.py", "agents/tech.py", "ops/BACKUPS.md", "ops/backup.py",
                 "workers/hostmode-backup/src/index.js", "workers/eddie-brain/src/index.js", "database.rules.json",
                 ".git/config", ".git/HEAD", "plans/", "3d/PROJECT-RECORD.md"]
PRIVATE_DB = ["", "partygames", "partygames/tickets", "partygames/ticketNotes", "partygames/staff", "partygames/admins",
              "partygames/sinvites", "partygames/sales", "partygames/salesLog", "partygames/team",
              "partygames/onboard", "partygames/agentRuns", "partygames/resources", "planners"]
# Public by design, never reported: the Firebase web key (it only names the project; the database rules protect the
# data) and the App Check reCAPTCHA site key in appcheck.js (a site key is meant to sit in the page). partygames/owner
# is readable on purpose (pages check whether the signed-in account is the owner), so it isn't in PRIVATE_DB.
IGNORE_RULES = {"gcp-api-key"}
IGNORE_FILES = {"appcheck.js"}


def fetch(url, method="GET", timeout=20):
    req = urllib.request.Request(url, method=method, headers=UA)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, {k.lower(): v for k, v in r.headers.items()}, r.read(400000)
    except urllib.error.HTTPError as e:
        return e.code, {k.lower(): v for k, v in e.headers.items()}, e.read(400000)


def finding(key, severity, title, body):
    return {"key": key, "severity": severity, "title": title, "body": body}


# ---------- the checks (each takes its fetcher so the self-test can plant problems) ----------

def check_headers(get=fetch):
    st, h, _ = get(SITE + "/")
    out = []
    if st != 200:
        return [finding("site-down", "high", f"The live site answered {st} instead of 200", f"{SITE}/ answered HTTP {st}.")]
    csp = h.get("content-security-policy", "")
    want = [("strict-transport-security", "Strict-Transport-Security", "browsers always use HTTPS for hostmode.app"),
            ("x-content-type-options", "X-Content-Type-Options: nosniff", "browsers don't guess file types")]
    for k, name, why in want:
        if k not in h:
            out.append(finding("header-" + k, "low", f"The live site doesn't send {name.split(':')[0]}",
                               f"Missing header `{name}` ({why}). On Cloudflare Pages this goes in a `_headers` file at the site root."))
    if "x-frame-options" not in h and "frame-ancestors" not in csp:
        out.append(finding("header-framing", "medium", "Other sites can show Host Mode inside a frame",
                           "Neither `X-Frame-Options` nor a `frame-ancestors` rule is sent, so another site could load Host Mode "
                           "in a hidden frame and trick people into tapping (clickjacking). Add `X-Frame-Options: SAMEORIGIN` in `_headers` "
                           "(check first that nothing of ours frames the app from another address)."))
    if "referrer-policy" not in h:
        out.append(finding("header-referrer-policy", "low", "The live site doesn't send Referrer-Policy",
                           "Without it, full page addresses (which can include event codes) may be passed to other sites. "
                           "Add `Referrer-Policy: strict-origin-when-cross-origin` in `_headers`."))
    return out


def check_files(get=fetch):
    _, _, home = get(SITE + "/")
    out = []
    for p in PRIVATE_FILES:
        st, h, body = get(SITE + "/" + p)
        # Cloudflare Pages answers unknown paths with the front page, which is fine.
        if st == 200 and body and body != home and body[:200] != home[:200]:
            out.append(finding("file-" + p, "medium", f"The live site serves a private file: {p}",
                               f"`{SITE}/{p}` returns the file ({len(body)} bytes, {h.get('content-type', '?')}). "
                               "It isn't secret, but it shows how Host Mode is built. Leave it out of the deploy "
                               "(the deploy copies the repo and removes private folders: add this one)."))
    return out


def check_database(get=fetch):
    out = []
    for p in PRIVATE_DB:
        st, _, body = get(f"{DB}/{p}.json?shallow=true")
        if st == 200 and body.strip() not in (b"null", b""):
            where = p or "the whole database"
            out.append(finding("db-" + (p or "root"), "high", f"Private database area can be read without signing in: {where}",
                               f"Reading `{where}` with no sign-in returned data (HTTP 200). The database rules should refuse it. "
                               "Check database.rules.json, publish the fix (Firebase console → Realtime Database → Rules → Publish), "
                               "and look at what was exposed."))
    return out


def check_secrets(token, workdir, run=subprocess.run):
    """Clone the GitLab code and scan it with gitleaks. Values are never printed or kept."""
    out = []
    src = os.path.join(workdir, "code")
    url = f"https://oauth2:{token}@gitlab.com/{REPO}.git"
    r = run(["git", "clone", "-q", "--depth", "60", url, src], capture_output=True, text=True)
    if r.returncode != 0:
        return [finding("secrets-clone", "low", "Security watch couldn't read the code on GitLab",
                        "The clone failed, so the key scan didn't run. Check that the GitHub secret GITLAB_TOKEN is current.")]
    rep = os.path.join(workdir, "leaks.json")
    run(["gitleaks", "git", src, "--redact", "--no-banner", "--log-opts=-60", "--report-format", "json", "--report-path", rep],
        capture_output=True, text=True)
    try:
        leaks = json.load(open(rep))
    except Exception:
        leaks = []
    for L in leaks or []:
        if L.get("RuleID") in IGNORE_RULES or L.get("File") in IGNORE_FILES:
            continue
        f, line, rule = L.get("File", "?"), L.get("StartLine", "?"), L.get("RuleID", "?")
        out.append(finding(f"secret-{rule}-{f}", "high", f"Possible key or password in the code: {f}",
                           f"gitleaks rule `{rule}` matched `{f}` line {line} (commit {str(L.get('Commit', ''))[:10]}). "
                           "The value is hidden here. If it's real: make a new key, delete the old one where it was issued, "
                           "and remove it from the code. A key that was ever pushed counts as leaked even after it's deleted."))
    return out


# ---------- GitLab issues ----------

def gl(token, method, path, data=None):
    body = urllib.parse.urlencode(data).encode() if data else None
    req = urllib.request.Request(f"https://gitlab.com/api/v4/projects/{PROJECT}{path}", data=body, method=method,
                                 headers={"PRIVATE-TOKEN": token, **UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def file_issues(token, found):
    open_titles, page = set(), 1
    while True:
        batch = gl(token, "GET", f"/issues?state=opened&labels={urllib.parse.quote(LABEL)}&per_page=100&page={page}")
        open_titles |= {i["title"] for i in batch}
        if len(batch) < 100:
            break
        page += 1
    new = 0
    for f in found:
        title = f"Security watch: {f['title']}"[:250]
        if title in open_titles:
            continue
        labels = [LABEL, f"severity {f['severity']}"] + (["needs Roy"] if f["severity"] == "high" else [])
        gl(token, "POST", "/issues", {"title": title, "labels": ",".join(labels),
                                      "description": f["body"] + "\n\n_Filed by the security watch (GitHub: HostMode/hostmode.github.io). "
                                      "It checks again every night and won't file this again while this issue is open._"})
        open_titles.add(title)
        new += 1
    return new


def summary(lines):
    print("\n".join(lines))
    p = os.environ.get("GITHUB_STEP_SUMMARY")
    if p:
        open(p, "a").write("\n".join(lines) + "\n")


def main():
    token = os.environ.get("GITLAB_TOKEN", "").strip()
    found, ran = [], []
    for name, fn in [("headers", check_headers), ("files", check_files), ("database", check_database)]:
        try:
            r = fn(); found += r; ran.append(f"{name}: {len(r)}")
        except Exception as e:
            ran.append(f"{name}: couldn't run ({type(e).__name__})")
    if token:
        with tempfile.TemporaryDirectory() as wd:
            try:
                r = check_secrets(token, wd); found += r; ran.append(f"secrets: {len(r)}")
            except Exception as e:
                ran.append(f"secrets: couldn't run ({type(e).__name__})")
    else:
        ran.append("secrets: skipped (no GITLAB_TOKEN)")
    sev = {s: sum(f["severity"] == s for f in found) for s in ("high", "medium", "low")}
    lines = ["## Security watch", "", f"Problems found: {len(found)} (high {sev['high']}, medium {sev['medium']}, low {sev['low']})",
             "", "Checks: " + "; ".join(ran)]
    if token and found:
        try:
            lines.append(f"New GitLab issues: {file_issues(token, found)} (problems already filed and still open are skipped)")
        except Exception as e:
            lines.append(f"Couldn't file issues on GitLab ({type(e).__name__}); details stay private, so they aren't shown here.")
    elif found:
        lines.append("No GITLAB_TOKEN, so nothing was filed. Details aren't printed here because this repo is public.")
    summary(lines)
    return 1 if sev["high"] else 0


def self_test():
    home = b"<html>front page</html>"
    def site(url, *a, **k):
        if url.endswith("/CLAUDE.md"):
            return 200, {"content-type": "text/markdown"}, b"# notes"
        return 200, {"content-type": "text/html"}, home
    def db(url, *a, **k):
        return (200, {}, b'{"t1":true}') if "/partygames/tickets.json" in url else (401, {}, b'{"error":"Permission denied"}')
    def run(cmd, **k):
        class R: returncode = 0
        if cmd[0] == "gitleaks":
            json.dump([{"RuleID": "anthropic-api-key", "File": "agents/x.py", "StartLine": 3, "Commit": "abc"},
                       {"RuleID": "gcp-api-key", "File": "js/02-core.js", "StartLine": 4}], open(cmd[cmd.index("--report-path") + 1], "w"))
        return R()
    h = check_headers(site)
    assert {f["key"] for f in h} >= {"header-strict-transport-security", "header-framing"}, h
    fl = check_files(site)
    assert [f["key"] for f in fl] == ["file-CLAUDE.md"], fl
    d = check_database(db)
    assert [f["key"] for f in d] == ["db-partygames/tickets"], d
    with tempfile.TemporaryDirectory() as wd:
        s = check_secrets("t", wd, run)
    assert len(s) == 1 and "anthropic" in s[0]["key"], s
    good = lambda url, *a, **k: (200, {"strict-transport-security": "x", "x-content-type-options": "nosniff",
                                       "x-frame-options": "DENY", "referrer-policy": "x"}, home)
    assert check_headers(good) == [] and check_files(good) == []
    print("Self-test passed: every check caught its planted problem and passed the clean case.")
    return 0


if __name__ == "__main__":
    sys.exit(self_test() if "--self-test" in sys.argv else main())
