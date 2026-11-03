"""One tutorial time slot: make the next videos until today's count reaches this slot's target.

Four slots a day (tutorials.yml) aim for 4 finished videos a day: by slot N, N videos should be done today,
so a slot that failed is made up by the next one (at most 2 videos per slot).
For each video: write its steps if it has none (write_steps.py, Claude), then make it (make_video.py), then put
the files in the draft release "tutorial-library" (only people with access to the repo can see a draft), and
record everything in the tutorials-data branch (one queue: queue.json, shown as queue.md).

A video is Completed when every check passes and it has a voice. Roy approves before anything is published.
Nothing runs during the event freeze (Dec 31 to Jan 3).
Usage: python agents/tutorials/run.py --data DIR [--slot N] [--dry-run]
"""
import argparse, datetime, json, os, re, shutil, subprocess, sys, time
from zoneinfo import ZoneInfo

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
import common  # noqa: E402
import make_video as mv  # noqa: E402
import write_steps as ws  # noqa: E402

TZ = ZoneInfo("America/New_York")
RELEASE = "tutorial-library"
DONE = "Completed"
NO_RETRY = {DONE, "Blocked"}
MAX_TRIES = 3


def now():
    return datetime.datetime.now(TZ)


def load(p, default):
    try:
        return json.load(open(p))
    except (OSError, ValueError):
        return default


def gh(*args, check=True):
    r = subprocess.run(["gh", *args], capture_output=True, text=True)
    if check and r.returncode:
        raise RuntimeError(f"gh {args[0]} {args[1] if len(args) > 1 else ''}: {r.stderr.strip()[:200]}")
    return r


def upload(files, dry):
    if dry:
        return
    if gh("release", "view", RELEASE, check=False).returncode:
        gh("release", "create", RELEASE, "--draft", "--title", "Host Mode tutorial library",
           "--notes", "Finished tutorial videos. This is a draft, so only people with access to the repo can see it. Nothing here is public until Roy publishes it.")
    gh("release", "upload", RELEASE, "--clobber", *files)


def md_queue(lib, q, data):
    rows = ["# Tutorial queue", "", "The one source of truth for the tutorial library. Updated by the tutorial job (agents/tutorials/run.py).", "",
            f"Done: {sum(1 for t in q['topics'].values() if t.get('status') == DONE)} of {len(lib['topics'])}", "",
            "| ID | Title | Status | Updated | Note |", "|---|---|---|---|---|"]
    for t in lib["topics"]:
        s = q["topics"].get(t["id"], {})
        ready = os.path.exists(os.path.join(HERE, "steps", t["id"] + ".json")) or os.path.exists(os.path.join(data, "steps", t["id"] + ".json"))
        rows.append(f"| {t['id']} | {t['title']} | {s.get('status', 'Awaiting Recording' if ready else 'Research Needed')} | {s.get('updated', '')} | {s.get('note', '').replace('|', '/')} |")
    return "\n".join(rows) + "\n"


def md_status(lib, q, today_done, target, log):
    done = [t for t in lib["topics"] if q["topics"].get(t["id"], {}).get("status") == DONE]
    blocked = [t for t in lib["topics"] if q["topics"].get(t["id"], {}).get("status") == "Blocked"]
    left = len(lib["topics"]) - len(done) - len(blocked)
    return "\n".join([
        "# Production status", "", f"Updated {now():%b %d, %Y %I:%M %p} (Charlotte time).", "",
        f"- Today: {today_done} of {target} videos so far (goal: 4 a day).",
        f"- Library: {len(done)} finished, {len(blocked)} blocked, {left} to go (about {-(-left // 4)} more days).",
        f"- Videos are in the draft release \"{RELEASE}\" (GitHub → Releases). Only people with access to the repo can see it.",
        "", "## Blocked", *([f"- {t['id']} {t['title']}: {q['topics'][t['id']].get('note', '')}" for t in blocked] or ["- Nothing"]),
        "", "## This run", *[f"- {l}" for l in log], ""])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", required=True, help="the tutorials-data branch checkout")
    ap.add_argument("--slot", type=int, default=0, help="1 to 4; 0 means one more video than today's count")
    ap.add_argument("--out", default=os.path.join(common.ROOT, "tutorial-out"))
    ap.add_argument("--dry-run", action="store_true", help="no uploads and no voice")
    a = ap.parse_args()
    t = now()
    if (t.month, t.day) in ((12, 31), (1, 1), (1, 2), (1, 3)):
        print("Event freeze (Dec 31 to Jan 3): no tutorials today.")
        return
    lib = load(os.path.join(HERE, "library.json"), {})
    qp = os.path.join(a.data, "queue.json")
    q = load(qp, {"topics": {}, "done_log": []})
    today = t.strftime("%Y-%m-%d")
    today_done = sum(1 for d in q["done_log"] if d.get("date") == today)
    target = a.slot or today_done + 1
    steps_dir = os.path.join(a.data, "steps")
    os.makedirs(steps_dir, exist_ok=True)
    run = common.Run()
    log, made = [], 0

    def mark(tid, status, note=""):
        s = q["topics"].setdefault(tid, {})
        s.update(status=status, note=note[:200], updated=now().strftime("%b %d %I:%M %p"))

    for topic in lib["topics"]:
        tid = topic["id"]
        s = q["topics"].get(tid, {})
        if topic.get("blocked") and s.get("status") != DONE:
            mark(tid, "Blocked", topic["blocked"])
            continue
        if today_done >= target or made >= 2:
            break
        if s.get("status") in NO_RETRY:
            continue
        if s.get("status") == "Narration In Progress" and not os.environ.get("HEYGEN_API_KEY") and s.get("voice_failed_on") == today:
            continue  # wait a day before trying the voice again
        if s.get("tries", 0) >= MAX_TRIES:
            mark(tid, "Blocked", s.get("note", "") or "failed 3 times")
            continue
        # 1. the steps: hand-written ones in agents/tutorials/steps win; otherwise the step writer's, kept in the data branch
        path = os.path.join(HERE, "steps", tid + ".json")
        if not os.path.exists(path):
            path = os.path.join(steps_dir, tid + ".json")
        if not os.path.exists(path):
            mark(tid, "Script In Progress")
            try:
                path, err = ws.write(topic, steps_dir, run)
            except common.Stop as e:
                log.append(f"Stopped writing scripts: {e}.")
                break
            shutil.rmtree(os.path.join(steps_dir, "_rehearsal"), ignore_errors=True)
            if not path:
                s = q["topics"][tid]
                s["tries"] = s.get("tries", 0) + 1
                mark(tid, "Research Needed", f"step writer: {err}")
                log.append(f"{tid}: couldn't write steps ({err[:120]}).")
                continue
            log.append(f"{tid}: steps written (about ${run.usd:.2f} so far).")
        mark(tid, "Recording In Progress")
        out = os.path.join(a.out, tid)
        rep = mv.make(path, out, no_voice=a.dry_run)
        made += 1
        s = q["topics"][tid]
        if not rep["ok"]:
            s["tries"] = s.get("tries", 0) + 1
            why = rep.get("failed") or "; ".join(n for n, ok in rep["checks"] if not ok)
            mark(tid, "Research Needed" if rep.get("failed") else "Quality Review", why)
            if rep.get("failed") and path.startswith(steps_dir):
                os.remove(path)  # the screen changed or the steps were wrong: write them again next time
            log.append(f"{tid}: not finished: {why[:150]}")
            continue
        # 2. keep the files: videos in the draft release, the small files in the data branch
        names = rep["files"]
        try:
            upload([os.path.join(out, n) for n in names if n.endswith(".mp4")], a.dry_run)
        except RuntimeError as e:
            mark(tid, "Quality Review", f"made, but the upload failed: {e}")
            log.append(f"{tid}: upload failed: {e}")
            continue
        for sub, ext in (("captions", ".srt"), ("thumbnails", ".jpg"), ("quality-control", "_check.png")):
            os.makedirs(os.path.join(a.data, sub), exist_ok=True)
            for n in names:
                if n.endswith(ext):
                    shutil.copy(os.path.join(out, n), os.path.join(a.data, sub, n))
        spec = load(path, {})
        os.makedirs(os.path.join(a.data, "scripts"), exist_ok=True)
        open(os.path.join(a.data, "scripts", tid + ".md"), "w").write(
            f"# {tid} · {spec.get('title')}\n\n{spec.get('collection')} · {spec.get('audience', '')} · {rep['seconds']} s · voice: {rep['voice'] or 'none'}\n\n"
            f"Help desk answers it goes with: {', '.join(spec.get('help', [])) or 'none yet'}\n\nStarts at: `{spec.get('url')}`\n\n## Script\n"
            + "\n".join(f"{i + 1}. {st['say']}" for i, st in enumerate(spec.get("steps", []))) + "\n")
        json.dump(rep, open(os.path.join(a.data, "quality-control", tid + ".json"), "w"), indent=1)
        s.update(seconds=rep["seconds"], voice=rep["voice"], files=[n for n in names if n.endswith(".mp4")])
        if rep["voice"]:
            mark(tid, DONE, f"{rep['seconds']}s, voice by {rep['voice']}; waiting for Roy's OK to publish")
            q["done_log"].append({"id": tid, "date": today})
            today_done += 1
            log.append(f"{tid}: finished ({rep['seconds']}s, voice by {rep['voice']}).")
        else:
            s["voice_failed_on"] = today
            mark(tid, "Narration In Progress", "made with captions only: the voice didn't work")
            log.append(f"{tid}: made with captions only; the voice didn't work.")
    if not log:
        log.append("Nothing to do: today's goal is met, or every tutorial is finished or blocked.")
    json.dump(q, open(qp, "w"), indent=1)
    open(os.path.join(a.data, "queue.md"), "w").write(md_queue(lib, q, a.data))
    open(os.path.join(a.data, "production-status.md"), "w").write(md_status(lib, q, today_done, max(target, today_done), log))
    print("\n".join(log))
    print(f"Claude cost this run: about ${run.usd:.2f}")


if __name__ == "__main__":
    main()
