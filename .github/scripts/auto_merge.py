"""Auto-merge for small, safe builder changes. Run by the reviewer workflow after a review, with the repo's own token.
It merges ONLY when every one of these is true, and otherwise does nothing and says why:
  - the pull request comes from a builder branch (claude/...) and is still on the version that was reviewed
  - its issue is labeled "low risk" (and not "high risk" or "needs Roy")
  - the pull request checks passed (the workflow only calls this when they did)
  - the reviewer's comment for this exact version says "Ready for you" and "Rating: sure"
  - it only touches safe files (styles, the planner and staff screens, checks, CLAUDE.md, Skills) and changes 200 lines or fewer
No AI decides this step: it reads facts from GitHub. Nothing here is passed to a shell."""
import json, os, re, sys, urllib.request

R, TOKEN = os.environ["GITHUB_REPOSITORY"], os.environ["GH_TOKEN"]
N, SHA, BR = int(os.environ["N"]), os.environ["SHA"], os.environ.get("BR", "")
SAFE = re.compile(r"^(css/games\.css|js/(0[5-9]|1[0-9])-[\w-]+\.js|agents/regressions\.json|CLAUDE\.md|\.claude/skills/[\w-]+/SKILL\.md)$")
NEVER = re.compile(r"^js/(00|01|02|03|04)-")  # shared core, guest and moderator/big-screen screens always wait for Roy
MAX_LINES = 200


def api(path, method="GET", body=None):
    req = urllib.request.Request("https://api.github.com/" + path, method=method, data=None if body is None else json.dumps(body).encode(),
                                 headers={"Authorization": "Bearer " + TOKEN, "Accept": "application/vnd.github+json", "User-Agent": "hostmode-auto-merge"})
    with urllib.request.urlopen(req, timeout=60) as r:
        raw = r.read()
        return json.loads(raw) if raw else None


def stop(why):
    print("Not merging on its own:", why)
    return 0


def main():
    pr = api(f"repos/{R}/pulls/{N}")
    if pr["state"] != "open" or pr["base"]["ref"] != "main":
        return stop("it isn't an open pull request into main")
    if not pr["head"]["ref"].startswith("claude/"):
        return stop("it isn't from a builder branch")
    if pr["head"]["sha"] != SHA:
        return stop("it changed after the review")
    m = re.match(r"claude/issue-(\d+)", pr["head"]["ref"]) or re.search(r"(?i)\b(?:closes|fixes|resolves) #(\d+)", pr.get("body") or "")
    if not m:
        return stop("I can't tell which issue it's for")
    labels = {l["name"] for l in api(f"repos/{R}/issues/{m.group(1)}")["labels"]}
    if "low risk" not in labels:
        return stop(f'issue #{m.group(1)} isn\'t labeled "low risk"')
    if labels & {"high risk", "needs Roy"}:
        return stop(f"issue #{m.group(1)} is labeled high risk or needs Roy")
    files = api(f"repos/{R}/pulls/{N}/files?per_page=100")
    bad = [f["filename"] for f in files if not SAFE.match(f["filename"]) or NEVER.match(f["filename"])]
    if bad:
        return stop("it touches files that always wait for Roy: " + ", ".join(bad[:5]))
    lines = sum(f["additions"] + f["deletions"] for f in files)
    if lines > MAX_LINES:
        return stop(f"it changes {lines} lines (the limit is {MAX_LINES})")
    comments = api(f"repos/{R}/issues/{N}/comments?per_page=100")
    review = [c for c in comments if c["user"]["login"] == "claude[bot]" and f"reviewed-final:{SHA}" in (c["body"] or "")]
    if not review:
        return stop("there's no review for this version")
    body = review[-1]["body"]
    if "Ready for you" not in body or "Rating: sure" not in body:
        return stop('the reviewer didn\'t say "Ready for you" with "Rating: sure"')
    api(f"repos/{R}/pulls/{N}/merge", "PUT", {"merge_method": "squash", "sha": SHA})
    print(f"Merged pull request #{N} on its own.")
    api(f"repos/{R}/issues/{N}/comments", "POST", {"body": "Merged on its own: issue labeled low risk, all checks passed, reviewer rating sure, "
                                                           f"only safe files ({lines} lines). To undo it, tap Revert on this pull request."})
    for path, body in ((f"repos/{R}/pages/builds", None), (f"repos/{R}/actions/workflows/builder-queue.yml/dispatches", {"ref": "main"})):
        try:  # a merge made with the repo's own token doesn't start other jobs, so start them here
            api(path, "POST", body)
        except Exception as e:
            print("Couldn't start", path.split("/")[-1], "-", type(e).__name__)
    return 0


if __name__ == "__main__":
    sys.exit(main())
