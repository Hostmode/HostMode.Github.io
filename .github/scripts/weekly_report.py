"""The Monday report: one GitHub issue a week, @mentioning Roy, so he never has to go looking.
What merged, what's waiting, what's queued, how the nightly agents did, what they cost, and the builder scorecard.
Run by .github/workflows/weekly-report.yml with the repo's own token. Try it locally without posting: python3 .github/scripts/weekly_report.py --dry-run
Facts come from GitHub's API and the agents' saved nightly reports; nothing here is passed to a shell."""
import datetime as dt, json, os, re, sys, urllib.request

R = os.environ.get("GITHUB_REPOSITORY", "Hostmode/HostMode.Github.io")
TOKEN = os.environ.get("GH_TOKEN", "")
DRY = "--dry-run" in sys.argv
NOW = dt.datetime.now(dt.timezone.utc)
WEEK_AGO = NOW - dt.timedelta(days=7)


def api(path, method="GET", body=None):
    h = {"Accept": "application/vnd.github+json", "User-Agent": "hostmode-weekly-report"}
    if TOKEN:
        h["Authorization"] = "Bearer " + TOKEN
    req = urllib.request.Request("https://api.github.com/" + path, method=method, data=None if body is None else json.dumps(body).encode(), headers=h)
    with urllib.request.urlopen(req, timeout=60) as r:
        raw = r.read()
        return json.loads(raw) if raw else None


def when(s):
    return dt.datetime.fromisoformat(s.replace("Z", "+00:00")) if s else None


def nightly_cost():
    """This week's and this month's spending from the agents' saved reports, if the agents' login is available."""
    try:
        sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "agents"))
        from common import Run, DB
        db = DB(Run()); db.sign_in()
        runs = db.get("partygames/agentRuns") or {}
        wk = mo = 0.0
        for r in runs.values():
            t = dt.datetime.fromtimestamp((r or {}).get("t", 0) / 1000, dt.timezone.utc)
            usd = float(((r or {}).get("usage") or {}).get("usd") or 0)
            if t >= WEEK_AGO:
                wk += usd
            if (t.year, t.month) == (NOW.year, NOW.month):
                mo += usd
        return wk, mo
    except BaseException as e:  # no login here, or the database is unreachable: the report still goes out
        print("No cost figures:", type(e).__name__)
        return None


def main():
    prs = api(f"repos/{R}/pulls?state=all&per_page=100&sort=updated&direction=desc")
    mine = [p for p in prs if p["head"]["ref"].startswith("claude/")]
    reverts = {p["title"][8:-1] for p in prs if p["title"].startswith('Revert "') and p.get("merged_at")}
    merged_wk = [p for p in prs if p.get("merged_at") and when(p["merged_at"]) >= WEEK_AGO]
    closed_wk = [p for p in mine if p["state"] == "closed" and not p.get("merged_at") and when(p["closed_at"]) >= WEEK_AGO]
    waiting = [p for p in prs if p["state"] == "open"]
    m_all = [p for p in mine if p.get("merged_at")]
    undone = [p for p in m_all if p["title"] in reverts]
    gate = min(5, len(m_all) - len(undone))
    issues = api(f"repos/{R}/issues?state=open&per_page=100")
    issues = [i for i in issues if "pull_request" not in i]
    lab = lambda i: {l["name"] for l in i["labels"]}
    queued = [i for i in issues if "queue" in lab(i)]
    needs_roy = [i for i in issues if "needs Roy" in lab(i) and "weekly report" not in lab(i)]
    runs = api(f"repos/{R}/actions/runs?per_page=100")["workflow_runs"]
    wk_runs = [r for r in runs if when(r["created_at"]) >= WEEK_AGO and r["conclusion"] not in ("skipped", "cancelled", None)]
    def tally(name):
        l = [r for r in wk_runs if r["name"] == name]
        return len([r for r in l if r["conclusion"] == "success"]), len([r for r in l if r["conclusion"] == "failure"])
    nightly, backup, builder, reviewer = tally("Nightly agents"), tally("Nightly backup"), tally("Claude builder"), tally("Claude reviewer")
    cost = nightly_cost()
    link = lambda p: f"[#{p['number']}]({p['html_url']}) {p['title']}"
    out = ["@Hostmode here's your Monday report.", "", f"## This week ({WEEK_AGO:%b %-d} to {NOW:%b %-d})", ""]
    out += ["**Went live:**"] + ([f"- {link(p)}" + (" (merged on its own)" if p["head"]["ref"].startswith("claude/") and p.get("merged_by") and p["merged_by"]["login"] == "github-actions[bot]" else "") for p in merged_wk] or ["- Nothing this week"])
    if closed_wk:
        out += ["", "**Closed without merging:**"] + [f"- {link(p)}" for p in closed_wk]
    out += ["", "**Waiting for you:**"] + ([f"- {link(p)}" for p in waiting] or ["- Nothing waiting"])
    out += ["", "**Queued for the builder (in order):**"] + ([f"- [#{i['number']}]({i['html_url']}) {i['title']}" for i in queued] or ['- Nothing queued. Add the "queue" label to an issue to line it up.'])
    if needs_roy:
        out += ["", "**Needs a decision from you:**"] + [f"- [#{i['number']}]({i['html_url']}) {i['title']}" for i in needs_roy]
    out += ["", "## The agents", "",
            f"- Nightly agents: {nightly[0]} good night{'s' if nightly[0] != 1 else ''}, {nightly[1]} with trouble",
            f"- Backups: {backup[0]} done, {backup[1]} failed",
            f"- Builder: {builder[0]} job{'s' if builder[0] != 1 else ''} · Reviewer: {reviewer[0]} review{'s' if reviewer[0] != 1 else ''}"]
    if cost:
        out += [f"- Nightly agents' spending: ${cost[0]:.2f} this week, ${cost[1]:.2f} this month (the builder and reviewer are in the Anthropic Console, under Usage)"]
    else:
        out += ["- Spending: see the Anthropic Console, under Usage (the $100 monthly limit covers every agent)"]
    out += ["", "## Builder scorecard", "",
            f"- {len(m_all)} merged · {len([p for p in mine if p['state']=='closed' and not p.get('merged_at')])} closed without merging · {len(undone)} undone",
            f"- Toward Phase 2: {gate} of 5 merged with none undone" + (" ✅ ready to move to Phase 2" if gate >= 5 and not undone else ""),
            "", "_Made by the weekly report job. It runs every Monday morning._"]
    body = "\n".join(out)
    title = f"Weekly report · week of {NOW:%b %-d, %Y}"
    if DRY:
        print(title); print(body); return 0
    for i in api(f"repos/{R}/issues?state=open&labels=weekly%20report&per_page=20"):
        api(f"repos/{R}/issues/{i['number']}", "PATCH", {"state": "closed"})
    made = api(f"repos/{R}/issues", "POST", {"title": title, "body": body, "labels": ["weekly report"]})
    print("Posted", made["html_url"])
    return 0


if __name__ == "__main__":
    sys.exit(main())
