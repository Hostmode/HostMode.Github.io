"""Eddie render farm: renders an Eddie clip on several GitHub machines at once and puts the result on GitLab.

The rig (scripts, parts and the approved art it needs) is a private GitLab package (eddie-rig/<version>/eddie-rig.tar.gz).
Nothing of Eddie is kept on GitHub or in GitHub artifacts (this repo is public): shards hand their frames to each other
through a private GitLab package (eddie-renders/<run>/), and the finished video, contact sheet and frames go there too.

  python agents/eddie_render.py shard  --clip thinking --index 0 --of 8 --run thinking-12 --rig 2026.11.10
  python agents/eddie_render.py gather --clip thinking --of 8 --run thinking-12 --rig 2026.11.10
  python agents/eddie_render.py --self-test
"""
import argparse, glob, json, os, shutil, subprocess, sys, tarfile, urllib.request

PROJECT = os.environ.get("GITLAB_PROJECT", "88624897")
API = f"https://gitlab.com/api/v4/projects/{PROJECT}/packages/generic"
WORK = os.path.abspath(os.environ.get("EDDIE_WORK", "work"))
# clip -> (frames 1..N-1, compose command run from rig-front, frames folder)
CLIPS = {
    "greeting": (81, lambda fs: ["greet/compose.py", ",".join(map(str, fs))], "frames_greeting"),
    "thinking": (193, lambda fs: ["think/compose_think.py", ",".join(map(str, fs))], "frames_thinking"),
    "idle2": (145, lambda fs: ["greet/compose_idle.py"], "frames_idle2"),
}
IVORY = "F5F0E4"


def token():
    t = os.environ.get("GITLAB_TOKEN", "").strip()
    if not t:
        sys.exit("GITLAB_TOKEN isn't set (Settings → Secrets and variables → Actions).")
    return t


def gl_get(path, dest):
    req = urllib.request.Request(f"{API}/{path}", headers={"PRIVATE-TOKEN": token()})
    with urllib.request.urlopen(req, timeout=300) as r, open(dest, "wb") as f:
        shutil.copyfileobj(r, f)


def gl_put(path, src):
    with open(src, "rb") as f:
        req = urllib.request.Request(f"{API}/{path}", data=f.read(), method="PUT", headers={"PRIVATE-TOKEN": token()})
    with urllib.request.urlopen(req, timeout=600) as r:
        assert r.status in (200, 201), r.status


def frames_for(n, index, of):
    """Every of-th frame starting at index+1, so each machine gets a spread of easy and hard frames."""
    return [f for f in range(1, n) if (f - 1) % of == index]


def get_rig(rig):
    rf = os.path.join(WORK, "rig-front")
    if not os.path.isdir(rf):
        os.makedirs(WORK, exist_ok=True)
        tgz = os.path.join(WORK, "rig.tar.gz")
        gl_get(f"eddie-rig/{rig}/eddie-rig.tar.gz", tgz)
        with tarfile.open(tgz) as t:
            t.extractall(WORK, filter="data")
    return rf


def run(cmd, cwd, env=None):
    r = subprocess.run(cmd, cwd=cwd, env={**os.environ, **(env or {})}, capture_output=True, text=True)
    tail = (r.stdout + r.stderr).strip().splitlines()[-3:]
    print(f"$ {'blender' if cmd[1] == '-c' else os.path.basename(cmd[1])}: exit {r.returncode}" + ("" if r.returncode == 0 else "\n" + "\n".join(tail)))
    if r.returncode:
        sys.exit(r.returncode)


def shard(a):
    n, compose, fd = CLIPS[a.clip]
    fs = frames_for(n, a.index, a.of)
    rf = get_rig(a.rig)
    env = {"EDDIE_CLIP": a.clip, "EDDIE_FRAMES": ",".join(map(str, fs)), "EDDIE_SAMPLES": str(a.samples)}
    run([sys.executable, "-c", "import runpy;runpy.run_path('build_rig_rest.py',run_name='__main__')"], rf, env)
    run([os.environ.get("COMPOSE_PY", sys.executable)] + compose(fs), rf)
    out = os.path.join(rf, fd)
    missing = [f for f in fs if not os.path.exists(os.path.join(out, f"frame_{f:04d}.png"))]
    if missing:
        sys.exit(f"Frames not made: {missing[:10]}")
    tar = os.path.join(WORK, f"shard-{a.index}.tar")
    with tarfile.open(tar, "w") as t:
        for f in fs:
            t.add(os.path.join(out, f"frame_{f:04d}.png"), f"frame_{f:04d}.png")
        t.add(os.path.join(out, "body_motion.json"), f"motion_{a.index}.json")
    gl_put(f"eddie-renders/{a.run}/shard-{a.index}.tar", tar)
    print(f"Shard {a.index + 1} of {a.of}: {len(fs)} frames rendered and handed over.")


def gather(a):
    n, _, fd = CLIPS[a.clip]
    rf = get_rig(a.rig)
    out = os.path.join(rf, fd)
    os.makedirs(out, exist_ok=True)
    motion = {}
    for k in range(a.of):
        tar = os.path.join(WORK, f"shard-{k}.tar")
        gl_get(f"eddie-renders/{a.run}/shard-{k}.tar", tar)
        with tarfile.open(tar) as t:
            t.extractall(out, filter="data")
        motion.update(json.load(open(os.path.join(out, f"motion_{k}.json"))))
    json.dump(motion, open(os.path.join(out, "body_motion.json"), "w"))
    missing = [f for f in range(1, n) if not os.path.exists(os.path.join(out, f"frame_{f:04d}.png"))]
    if missing:
        sys.exit(f"Missing frames after gathering: {missing[:10]}")
    from PIL import Image
    w, h = Image.open(os.path.join(out, "frame_0001.png")).size
    mp4 = os.path.join(WORK, f"eddie-{a.clip}.mp4")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", "24", "-start_number", "1", "-i", os.path.join(out, "frame_%04d.png"),
                    "-f", "lavfi", "-i", f"color=c=0x{IVORY}:s={w}x{h}:r=24",
                    "-filter_complex", "[1][0]overlay=shortest=1,format=yuv420p", "-frames:v", str(n - 1),
                    "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-movflags", "+faststart", mp4], check=True)
    probe = subprocess.run(["ffprobe", "-v", "error", "-count_frames", "-select_streams", "v:0", "-show_entries",
                            "stream=nb_read_frames,r_frame_rate,width,height", "-of", "json", mp4], capture_output=True, text=True)
    st = json.loads(probe.stdout)["streams"][0]
    assert int(st["nb_read_frames"]) == n - 1 and st["r_frame_rate"] == "24/1", st
    os.makedirs(os.path.join(rf, "review"), exist_ok=True)
    run([os.environ.get("COMPOSE_PY", sys.executable), "check_frames.py", fd], rf)
    sheet = os.path.join(rf, "review", f"contact-{fd}.png")
    frames = os.path.join(WORK, f"eddie-{a.clip}-frames.tar.gz")
    with tarfile.open(frames, "w:gz") as t:
        t.add(out, fd)
    for f in (mp4, sheet, frames):
        gl_put(f"eddie-renders/{a.run}/{os.path.basename(f)}", f)
    msg = (f"## Eddie render farm\n\n{a.clip}: {n - 1} frames on {a.of} machines, {st['width']}x{st['height']}, 24 fps.\n\n"
           f"On GitLab (private): Deploy → Package registry → eddie-renders, version `{a.run}`.\n")
    print(msg)
    if os.environ.get("GITHUB_STEP_SUMMARY"):
        open(os.environ["GITHUB_STEP_SUMMARY"], "a").write(msg)


def self_test():
    for n in (81, 145, 193):
        for of in (1, 3, 8):
            got = sorted(f for k in range(of) for f in frames_for(n, k, of))
            assert got == list(range(1, n)), (n, of)
    print("Self-test passed: every frame goes to exactly one machine.")


if __name__ == "__main__":
    if "--self-test" in sys.argv:
        self_test(); sys.exit(0)
    p = argparse.ArgumentParser()
    p.add_argument("step", choices=["shard", "gather"])
    p.add_argument("--clip", choices=sorted(CLIPS), required=True)
    p.add_argument("--index", type=int, default=0)
    p.add_argument("--of", type=int, default=8)
    p.add_argument("--run", required=True)
    p.add_argument("--rig", required=True)
    p.add_argument("--samples", type=int, default=12)
    a = p.parse_args()
    shard(a) if a.step == "shard" else gather(a)
