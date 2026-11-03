"""Shared pieces for the nightly agents: the agent's Host Mode login, the database, Claude, cost limits and the run log.

The agents sign in with their own limited support login (like Icee's), never Roy's account.
Secrets come from GitHub (Settings, Secrets and variables, Actions) and are never printed:
  ANTHROPIC_API_KEY    pays for Claude (prepaid credits)
  AGENT_SUPPORT_CODE   the one-time support code Roy made, used once to create the agent's login
  AGENT_PASSWORD       a long password Roy makes up for the agent's login
"""
import json, os, re, time, urllib.error, urllib.parse, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_URL = "https://spark-drinks-2d185-default-rtdb.firebaseio.com"
API_KEY = "AIzaSyAMWgxbGsq4yiQrsuLYJ1pEb5Qc-8o4zg0"  # Firebase's public web key; it's in games.html too
AGENT_EMAIL = "support-assistant@hostmode.github.io"
AGENT_NAME = "Support Assistant"
MODEL = os.environ.get("AGENT_MODEL", "claude-sonnet-5-5")
CHEAP_MODEL = os.environ.get("AGENT_CHEAP_MODEL", "claude-haiku-5-5")
# dollars per million tokens (in, out); estimates for the run report, not a bill
PRICE = {"claude-haiku-5-5": (0.10, 0.50), "claude-sonnet-5-5": (2.0, 10.0), "claude-opus-5-5": (4.0, 20.0)}
MAX_USD = float(os.environ.get("AGENT_MAX_USD", "1.50"))  # per night, both agents together


class Stop(Exception):
    """Raised when the night's spending limit is reached."""


class Run:
    """One night's work: log lines, token use and results, saved to partygames/agentRuns for the morning summary."""
    def __init__(self):
        self.id = "r" + time.strftime("%Y%m%d%H%M", time.gmtime())
        self.t = int(time.time() * 1000)
        self.log, self.tin, self.tout, self.usd = [], 0, 0, 0.0
        self.tester, self.tech = {}, {}
        state_file = os.path.join(ROOT, "agent-run.json")
        if os.path.exists(state_file):  # the tester and the tech agent share one run
            d = json.load(open(state_file))
            self.__dict__.update({k: d[k] for k in ("id", "t", "log", "tin", "tout", "usd", "tester", "tech") if k in d})
        self.state_file = state_file

    def say(self, msg):
        line = time.strftime("%H:%M ", time.gmtime()) + str(msg)[:300]
        self.log.append(line)
        print(line, flush=True)

    def spend(self, model, usage):
        i, o = usage.get("input_tokens", 0) + usage.get("cache_read_input_tokens", 0) + usage.get("cache_creation_input_tokens", 0), usage.get("output_tokens", 0)
        p = PRICE.get(model, PRICE["claude-sonnet-5-5"])
        self.tin += i; self.tout += o; self.usd += i / 1e6 * p[0] + o / 1e6 * p[1]

    def left(self):
        return MAX_USD - self.usd

    def save(self, db=None):
        json.dump({k: getattr(self, k) for k in ("id", "t", "log", "tin", "tout", "usd", "tester", "tech")}, open(self.state_file, "w"))
        if db:
            try:
                db.put(f"partygames/agentRuns/{self.id}", {"t": self.t, "done": int(time.time() * 1000), "tester": self.tester, "tech": self.tech,
                                                            "usage": {"in": self.tin, "out": self.tout, "usd": round(self.usd, 3)}, "log": self.log[-120:]})
                db.prune_runs(keep=14)
            except Exception as e:
                print("Couldn't save the run report:", type(e).__name__)


def _http(url, method="GET", body=None, headers=None, timeout=120):
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(url, method=method, data=data, headers=dict({"Content-Type": "application/json"}, **(headers or {})))
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            raw = r.read()
            return json.loads(raw) if raw else None
    except urllib.error.HTTPError as e:
        txt = e.read().decode(errors="replace")[:400]
        raise RuntimeError(f"HTTP {e.code}: {txt}") from None


class DB:
    """The Realtime Database over REST, signed in as the agent's support login."""
    def __init__(self, run):
        self.run, self.tok, self.uid = run, None, None

    def sign_in(self):
        pw, code = os.environ.get("AGENT_PASSWORD", ""), os.environ.get("AGENT_SUPPORT_CODE", "").strip().upper()
        if len(pw) < 10:
            raise SystemExit("AGENT_PASSWORD isn't set (or is shorter than 10 characters). See agents/README.md.")
        auth = "https://identitytoolkit.googleapis.com/v1/accounts:"
        try:
            r = _http(auth + "signInWithPassword?key=" + API_KEY, "POST", {"email": AGENT_EMAIL, "password": pw, "returnSecureToken": True})
        except RuntimeError as e:
            if "EMAIL_NOT_FOUND" not in str(e) and "INVALID_LOGIN_CREDENTIALS" not in str(e):
                raise
            if not code:
                raise SystemExit("The agent has no login yet and AGENT_SUPPORT_CODE isn't set. See agents/README.md.")
            if not code.startswith("SUP-"):
                code = "SUP-" + code
            r = _http(auth + "signUp?key=" + API_KEY, "POST", {"email": AGENT_EMAIL, "password": pw, "returnSecureToken": True})
            self.tok, self.uid = r["idToken"], r["localId"]
            now = int(time.time() * 1000)
            self.patch(f"partygames/sinvites/{code}", {"by": self.uid, "usedAt": now, "name": AGENT_NAME})
            self.put(f"partygames/staff/{self.uid}", {"name": AGENT_NAME, "role": "support", "code": code, "t": now, "active": now})
            self.run.say("Created the agent's support login with the support code.")
            return
        self.tok, self.uid = r["idToken"], r["localId"]

    def _url(self, path, q=None):
        qs = {"auth": self.tok} if self.tok else {}
        qs.update(q or {})
        return f"{DB_URL}/{path}.json?" + urllib.parse.urlencode(qs)

    def get(self, path, q=None):
        return _http(self._url(path, q))

    def put(self, path, val):
        return _http(self._url(path), "PUT", val)

    def patch(self, path, val):
        return _http(self._url(path), "PATCH", val)

    def push(self, path, val):
        return _http(self._url(path), "POST", val)["name"]

    def delete(self, path):
        return _http(self._url(path), "DELETE")

    def paused(self):
        a = self.get("partygames/agents") or {}
        return bool(a.get("paused"))

    def heartbeat(self):
        try:
            self.put(f"partygames/staff/{self.uid}/active", int(time.time() * 1000))
        except Exception:
            pass

    def prune_runs(self, keep=14):
        runs = self.get("partygames/agentRuns", {"shallow": "true"}) or {}
        for k in sorted(runs)[:-keep]:
            self.delete(f"partygames/agentRuns/{k}")


def claude(run, messages, system, tools=None, model=None, max_tokens=2000):
    """One call to Claude. Stops the night's work once the spending limit is reached."""
    key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not key:
        raise Stop("ANTHROPIC_API_KEY isn't set")
    if run.left() <= 0.02:
        raise Stop(f"reached tonight's limit of ${MAX_USD:.2f}")
    model = model or MODEL
    body = {"model": model, "max_tokens": max_tokens, "system": system, "messages": messages}
    if tools:
        body["tools"] = tools
    for attempt in range(3):
        try:
            r = _http("https://api.anthropic.com/v1/messages", "POST", body, {"x-api-key": key, "anthropic-version": "2023-06-01"}, timeout=300)
            run.spend(model, r.get("usage", {}))
            return r
        except RuntimeError as e:
            if ("HTTP 529" in str(e) or "HTTP 429" in str(e) or "HTTP 5" in str(e)) and attempt < 2:
                time.sleep(20 * (attempt + 1))
                continue
            if "credit balance" in str(e).lower():
                raise Stop("the prepaid credits have run out")
            raise


def text_of(resp):
    return "".join(b.get("text", "") for b in resp.get("content", []) if b.get("type") == "text")


def json_of(resp):
    """The first JSON object in Claude's reply."""
    t = text_of(resp)
    m = re.search(r"\{[\s\S]*\}", t)
    if not m:
        return None
    try:
        return json.loads(m.group(0))
    except json.JSONDecodeError:
        return None


def claude_md():
    """The project rules every agent follows (CLAUDE.md at the repo root)."""
    p = os.path.join(ROOT, "CLAUDE.md")
    return open(p, encoding="utf-8").read() if os.path.exists(p) else ""


def read_skill(name):
    p = os.path.join(ROOT, ".claude", "skills", name, "SKILL.md")
    s = open(p, encoding="utf-8").read() if os.path.exists(p) else ""
    return re.sub(r"^---[\s\S]*?---\s*", "", s)


def help_library():
    """The Help desk articles from the app's code (js/), as the answer library."""
    jsdir = os.path.join(ROOT, "js")
    s = "\n".join(open(os.path.join(jsdir, f), encoding="utf-8").read() for f in sorted(os.listdir(jsdir)) if f.endswith(".js"))
    rows = re.findall(r'\[\s*"([^"]{3,80})"\s*,\s*"((?:[^"\\]|\\.){10,400})"\s*,\s*"([a-z]+)"\s*,\s*"[^"]*"\s*\]', s)
    return "\n".join(f"- {t}: {d}" for t, d, _ in rows)
