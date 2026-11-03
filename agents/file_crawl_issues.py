"""Turns the tap-everything check's problems (agent-screens/crawl.json) into GitHub issues, then starts the builder queue.
Run by the nightly agents workflow with the repo's own token. Try it without posting: python3 agents/file_crawl_issues.py --dry-run

  - Each problem becomes ONE issue, marked <!-- crawl:SIG -->, so the same problem is never filed twice.
    If an issue for it was closed (fixed) and it's back, a new issue says so.
  - Planner and staff screens: labeled queue + low risk, so the builder fixes them and small fixes can merge on their own.
  - The admin console: labeled queue (Roy merges).
  - Guest, moderator, big screen, new event and sign-in screens: labeled needs Roy and high risk, and not queued.
  - At most 5 new issues a night, so a bad night can't flood the queue.
Nothing here is passed to a shell; problem text is only written into issue bodies."""
import json, os, sys, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
R = os.environ.get("GITHUB_REPOSITORY", "Hostmode/HostMode.Github.io")
TOKEN = os.environ.get("GH_TOKEN", "")
DRY = "--dry-run" in sys.argv
MAX_NEW = 5
SITE = "https://hostmode.github.io/"
LABELS = {"low": ["bug", "front end", "phase 1", "size S", "queue", "low risk"],
          "normal": ["bug", "front end", "phase 1", "size S", "queue"],
          "roy": ["bug", "front end", "needs Roy", "high risk"]}
KIND = {"error": "shows an error", "dead": "has a button that does nothing", "link": "has a broken link"}


def api(path, method="GET", body=None):
    h = {"Accept": "application/vnd.github+json", "User-Agent": "hostmode-crawl"}
    if TOKEN:
        h["Authorization"] = "Bearer " + TOKEN
    req = urllib.request.Request("https://api.github.com/" + path, method=method, data=None if body is None else json.dumps(body).encode(), headers=h)
    with urllib.request.urlopen(req, timeout=60) as r:
        raw = r.read()
        return json.loads(raw) if raw else None


def summary(lines):
    print("\n".join(lines))
    if os.environ.get("GITHUB_STEP_SUMMARY"):
        open(os.environ["GITHUB_STEP_SUMMARY"], "a").write("\n".join(lines) + "\n")


def main():
    p = os.path.join(ROOT, "agent-screens", "crawl.json")
    if not os.path.exists(p):
        summary(["### Tap-everything check", "", "No results (the check didn't run)."]); return 0
    crawl = json.load(open(p))
    probs = crawl.get("problems", [])
    head = ["### Tap-everything check", "", f"Checked {crawl.get('screens')} screens with {crawl.get('taps')} taps in {crawl.get('minutes')} min"
            + ("" if crawl.get("finished", True) else " (ran out of time before the end)") + f": {len(probs)} problem(s)."]
    if not probs:
        summary(head + ["", "Nothing broken."]); return 0
    have = {}  # sig -> (number, state)
    for page in range(1, 4):
        batch = api(f"repos/{R}/issues?state=all&labels=bug&per_page=100&page={page}") or []
        for i in batch:
            body = i.get("body") or ""
            if "<!-- crawl:" in body:
                s = body.split("<!-- crawl:")[1].split(" -->")[0]
                if s not in have or i["state"] == "open":
                    have[s] = (i["number"], i["state"])
        if len(batch) < 100:
            break
    made, queued, lines = 0, 0, []
    order = {"error": 0, "dead": 1, "link": 2}
    for pr in sorted(probs, key=lambda x: (order.get(x["kind"], 9), {"low": 0, "normal": 1, "roy": 2}[x["risk"]])):
        old = have.get(pr["sig"])
        if old and old[1] == "open":
            lines.append(f"- Already filed: #{old[0]} ({pr['screen']}: {pr['what']})"); continue
        if made >= MAX_NEW:
            lines.append(f"- Waiting for tomorrow (5 a night): {pr['screen']}: {pr['what']}"); continue
        title = f"Bug: {pr['screen']} {KIND[pr['kind']]} ({pr['what'][:60]})"
        back = f"\n\nThis came back after #{old[0]} was closed." if old else ""
        body = f"""Found by the nightly tap-everything check (no AI, demos only).{back}

### Steps to repeat
1. Open {SITE}{pr['url']}
2. {('Open the screen' if pr['what'] == 'opening the screen' else pr['what'][0].upper() + pr['what'][1:])} on **{pr['screen']}**

### What should happen, and what happened instead
It should work without an error. Instead: {pr['detail']}

### Where
{pr['screen']} · `{pr['url']}`

### Done when
- [ ] Doing the steps above works with no error
- [ ] A check added to agents/regressions.json so it can't come back
- [ ] `bash agents/check_all.sh` passes

<!-- crawl:{pr['sig']} -->"""
        labels = LABELS[pr["risk"]]
        if DRY:
            lines.append(f"- Would file: {title} [{', '.join(labels)}]")
        else:
            i = api(f"repos/{R}/issues", "POST", {"title": title[:200], "body": body, "labels": labels})
            lines.append(f"- Filed #{i['number']}: {title}" + (" (queued)" if "queue" in labels else " (needs Roy)"))
        made += 1
        queued += "queue" in labels
    summary(head + [""] + lines)
    if queued and not DRY:
        try:  # an issue labeled by the repo's own token doesn't start other jobs, so start the queue here
            api(f"repos/{R}/actions/workflows/builder-queue.yml/dispatches", "POST", {"ref": "main"})
            print("Started the builder queue.")
        except Exception as e:
            print("Couldn't start the builder queue:", type(e).__name__)
    return 0


if __name__ == "__main__":
    sys.exit(main())
