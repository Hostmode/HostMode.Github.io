"""Makes one tutorial video from its steps file.

1. Voice: each step's "say" line is spoken. HeyGen when HEYGEN_API_KEY is set, otherwise Piper (free, runs on
   GitHub's machine). If no voice works, the video is made with captions only and its report says voice: false.
2. Recording: a real browser plays the demo (never real customer data) at the voice's pace, with a visible
   cursor and an orange ring on each control it uses. Every action must find its control, or the video fails.
3. Render: vertical (1080x1920) and wide (1920x1080) MP4s in the Host Mode look, with captions as white text on
   a navy band with an orange accent line, plus an .srt, a thumbnail and a contact sheet for checking.
4. Quality check: every step found its control, no page errors, both files play, the voice fits each step.

Usage: python agents/tutorials/make_video.py STEPS.json --out DIR [--no-voice] [--fast]
  --fast skips voice and rendering: a quick rehearsal that only checks every step can be done.
Needs the repo served on port 8765. TEST_CHROME = a local Chrome, if Playwright's own browser isn't installed.
"""
import argparse, asyncio, json, os, subprocess, sys, time, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
BASE = os.environ.get("TUTORIAL_BASE", "http://localhost:8765/")
NAVY, ORANGE, GREEN = "0x16255a", "0xf6892f", "0x9fd3a8"
WPS = 2.6  # words per second, for timing without a voice
PIPER_VOICE = os.environ.get("TUTORIAL_PIPER_VOICE", "en_US-lessac-medium")

CURSOR_JS = """(()=>{if(document.getElementById('hmcur'))return;const d=document.createElement('div');d.id='hmcur';
d.style.cssText='position:fixed;left:-50px;top:-50px;width:20px;height:20px;border-radius:50%;background:rgba(246,137,47,.7);border:3px solid #fff;box-shadow:0 0 0 2px #16255a;z-index:2147483647;pointer-events:none;transition:left .6s ease,top .6s ease,transform .15s';
document.documentElement.appendChild(d);const r=document.createElement('div');r.id='hmring';
r.style.cssText='position:fixed;border:4px solid #f6892f;border-radius:12px;z-index:2147483646;pointer-events:none;opacity:0;transition:opacity .3s;box-shadow:0 0 0 6px rgba(246,137,47,.25)';
document.documentElement.appendChild(r);
window.hmMove=(x,y)=>{d.style.left=(x-10)+'px';d.style.top=(y-10)+'px'};
window.hmRing=b=>{if(!b){r.style.opacity=0;return}r.style.left=(b.x-6)+'px';r.style.top=(b.y-6)+'px';r.style.width=(b.width+12)+'px';r.style.height=(b.height+12)+'px';r.style.opacity=1};
window.hmTap=()=>{d.style.transform='scale(.6)';setTimeout(()=>d.style.transform='scale(1)',180)};})()"""


def log(*a):
    print(time.strftime("%H:%M:%S"), *a, flush=True)


def probe(f):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f], capture_output=True, text=True)
    try:
        return float(r.stdout.strip())
    except ValueError:
        return 0.0


# ---------------- voice ----------------
def heygen(path, method="GET", body=None):
    req = urllib.request.Request("https://api.heygen.com" + path, method=method,
                                 data=json.dumps(body).encode() if body is not None else None,
                                 headers={"X-Api-Key": os.environ["HEYGEN_API_KEY"], "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.loads(r.read().decode())


def voice_heygen(lines, out):
    vid = os.environ.get("TUTORIAL_VOICE_ID", "").strip()
    if not vid:
        vs = heygen("/v3/voices").get("data", [])
        vs = vs.get("voices", vs) if isinstance(vs, dict) else vs
        en = [x for x in vs if str(x.get("language", "")).lower().startswith(("en", "english"))] or vs
        vid = en[0].get("voice_id") or en[0].get("id")
    clips = []
    for i, text in enumerate(lines):
        d = heygen("/v3/voices/speech", "POST", {"text": text, "voice_id": vid, "speed": 1.0, "language": "en"})["data"]
        f = os.path.join(out, f"say{i:02d}.mp3")
        urllib.request.urlretrieve(d["audio_url"], f)
        clips.append((f, float(d.get("duration") or probe(f))))
    return clips, "HeyGen"


def piper_model():
    """The free voice's model file, downloaded once (GitHub keeps it in its cache between runs)."""
    vdir = os.environ.get("PIPER_DIR", os.path.expanduser("~/.cache/piper"))
    model = os.path.join(vdir, PIPER_VOICE + ".onnx")
    if not (os.path.exists(model) and os.path.exists(model + ".json")):
        os.makedirs(vdir, exist_ok=True)
        lang, name, quality = PIPER_VOICE.split("-", 2)  # like en_US-lessac-medium
        url = f"https://huggingface.co/rhasspy/piper-voices/resolve/main/{lang.split('_')[0]}/{lang}/{name}/{quality}/{PIPER_VOICE}.onnx"
        urllib.request.urlretrieve(url, model + ".part")
        urllib.request.urlretrieve(url + ".json", model + ".json")
        os.replace(model + ".part", model)
    return model


def voice_piper(lines, out):
    model = piper_model()
    try:
        import wave
        from piper import PiperVoice
        voice = PiperVoice.load(model)

        def speak(text, f):
            with wave.open(f, "wb") as w:
                voice.synthesize_wav(text, w)
    except (ImportError, AttributeError):
        speak = lambda text, f: subprocess.run([sys.executable, "-m", "piper", "-m", model, "-f", f], input=text.encode(), check=True, capture_output=True)
    clips = []
    for i, text in enumerate(lines):
        f = os.path.join(out, f"say{i:02d}.wav")
        speak(text, f)
        clips.append((f, probe(f)))
    return clips, "Piper"


def make_voice(lines, out):
    tries = ([voice_heygen] if os.environ.get("HEYGEN_API_KEY") else []) + [voice_piper]
    for fn in tries:
        try:
            clips, who = fn(lines, out)
            if clips and all(d > 0.3 for _, d in clips):
                log(f"voice: {who}, {sum(d for _, d in clips):.1f}s")
                return clips, who
        except Exception as e:
            log(f"voice {fn.__name__} didn't work: {type(e).__name__}: {str(e)[:200]}")
    return [], ""


# ---------------- recording ----------------
async def find(pg, a):
    """A CSS selector, or exact visible text, optionally inside a card (or `in` selector) that contains `within`."""
    scope = pg
    if a.get("within"):
        scope = pg.locator(a.get("in", ".card")).filter(has_text=a["within"]).first
    if a.get("within") and not a.get("sel") and not a.get("text"):
        loc = pg.locator(a.get("in", ".card")).filter(has_text=a["within"])  # the card itself
    else:
        loc = scope.locator(a["sel"]) if a.get("sel") else scope.get_by_text(a["text"], exact=True)
    for _ in range(10):
        n = await loc.count()
        for i in range(n):
            if await loc.nth(i).is_visible():
                return loc.nth(i)
        await pg.wait_for_timeout(300)
    raise LookupError(f"couldn't find {a.get('sel') or repr(a.get('text'))}" + (f" inside {a['within']!r}" if a.get("within") else ""))


async def act(pg, a, fast):
    k = a["act"]
    hold = 0.1 if fast else a.get("hold", 1.2)
    if k in ("point", "click", "type"):
        for attempt in range(4):  # the app redraws often; find the control again if it was swapped out
            try:
                el = await find(pg, a)
                await el.scroll_into_view_if_needed(timeout=5000)
                await pg.evaluate(CURSOR_JS)
                b = await el.bounding_box()
                await pg.evaluate("b=>{hmRing(b);hmMove(b.x+b.width/2+Math.min(b.width/2,26),b.y+b.height/2+16)}", b)
                await pg.wait_for_timeout(int(hold * 1000))
                el = await find(pg, a)
                if k == "click":
                    await pg.evaluate("hmTap()")
                    await el.click(timeout=8000)
                    await pg.wait_for_timeout(500)
                elif k == "type":
                    await el.click(timeout=8000)
                    await el.type(str(a["value"]), delay=20 if fast else 90)
                break
            except LookupError:
                raise
            except Exception as e:
                if attempt == 3 or "not attached" not in str(e) and "detached" not in str(e) and "not stable" not in str(e):
                    raise
                await pg.wait_for_timeout(400)
        await pg.evaluate(CURSOR_JS)
        if k != "point":
            await pg.evaluate("hmRing(null)")
    elif k == "scroll":
        await pg.evaluate("window.hmRing&&hmRing(null)")
        await pg.mouse.wheel(0, a.get("y", 400))
        await pg.wait_for_timeout(300 if fast else 900)
    elif k == "back":
        await pg.go_back()
        await pg.wait_for_timeout(1500)
    elif k == "goto":
        await pg.goto(BASE + a["url"], wait_until="load")
        await pg.wait_for_timeout(2500)
    elif k == "wait":
        await pg.wait_for_timeout(int((0.2 if fast else a.get("s", 1)) * 1000))
    else:
        raise ValueError(f"unknown action {k!r}")


async def record(spec, durs, out, fast=False):
    from playwright.async_api import async_playwright
    w, h = spec.get("viewport", [430, 860])
    caps, errs = [], []
    async with async_playwright() as p:
        kw = {"executable_path": os.environ["TEST_CHROME"], "args": ["--no-sandbox"]} if os.environ.get("TEST_CHROME") else {}
        b = await p.chromium.launch(**kw)
        opts = {"viewport": {"width": w, "height": h}, "device_scale_factor": 2}
        if not fast:
            opts.update(record_video_dir=out, record_video_size={"width": w, "height": h})
        c = await b.new_context(**opts)
        # the demo's contact popup, marked as already closed (the same as a visitor tapping X)
        await c.add_init_script("try{localStorage.setItem('hm_lead_done','closed')}catch(e){}")
        if spec.get("hide_demo_bar", True):  # the demo-only switcher bar; real hosts never see it
            await c.add_init_script("addEventListener('DOMContentLoaded',()=>{const s=document.createElement('style');s.textContent='.demoslot,.demobar{display:none!important}';document.head.appendChild(s)})")
        pg = await c.new_page()
        pg.on("pageerror", lambda e: errs.append(str(e)[:200]))
        t0 = time.time()
        src, failed = None, None
        try:
            await pg.goto(BASE + spec["url"], wait_until="load", timeout=45000)
            await pg.wait_for_timeout(1000 if fast else 3000)
            await pg.evaluate(CURSOR_JS)
            await pg.evaluate(f"hmMove({w // 2},{h // 2})")
            for i, st in enumerate(spec["steps"]):
                start = time.time() - t0
                for a in st.get("do", []):
                    try:
                        await act(pg, a, fast)
                    except Exception as e:
                        failed = f"step {i + 1} ({st['say'][:50]}): {str(e).splitlines()[0][:200]}"
                        raise
                if not fast:
                    left = durs[i] + 0.4 - (time.time() - t0 - start)
                    if left > 0:
                        await pg.wait_for_timeout(int(left * 1000))
                caps.append((start, time.time() - t0 - start, st["say"]))
            if not fast:
                await pg.wait_for_timeout(1500)
        except Exception as e:
            failed = failed or f"{type(e).__name__}: {str(e).splitlines()[0][:200]}"
        finally:
            video = pg.video
            await c.close()
            await b.close()
            if video:
                src = await video.path()
    return src, caps, errs, failed


# ---------------- render ----------------
def ts(s, srt=False):
    if srt:
        return "%02d:%02d:%02d,%03d" % (s // 3600, s % 3600 // 60, int(s % 60), int(s * 1000) % 1000)
    return "%d:%02d:%02d.%02d" % (s // 3600, s % 3600 // 60, int(s % 60), int(s * 100) % 100)


def ass(caps, W, H, size, ml, mr, mv, align):
    # white bold text with a soft navy edge and shadow (BorderStyle 1): no box
    style = f"Style: Cap,DejaVu Sans,{size},&H00FFFFFF,&H00FFFFFF,&H00351A0E,&H78000000,-1,0,0,0,100,100,0,0,1,2,2,{align},{ml},{mr},{mv},1"
    head = ("[Script Info]\nScriptType: v4.00+\nPlayResX: %d\nPlayResY: %d\nWrapStyle: 0\n\n[V4+ Styles]\n"
            "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, "
            "ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n%s\n\n[Events]\n"
            "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n") % (W, H, style)
    return head + "".join(f"Dialogue: 0,{ts(t)},{ts(t + d)},Cap,,0,0,0,,{x}\n" for t, d, x in caps)


def esc_dt(s):
    return s.replace("\\", "").replace("'", "’").replace(":", "\\:").replace("%", "\\%")


def render(spec, src, caps, clips, out):
    tid = spec["id"]
    title = esc_dt(spec["title"])
    dur = probe(src)
    font = subprocess.run(["fc-match", "-f", "%{file}", "DejaVu Sans:bold"], capture_output=True, text=True).stdout.strip()
    open(os.path.join(out, f"{tid}.srt"), "w").write("\n".join(f"{i + 1}\n{ts(t, 1)} --> {ts(t + d, 1)}\n{x}\n" for i, (t, d, x) in enumerate(caps)))
    open(os.path.join(out, "v.ass"), "w").write(ass(caps, 1080, 1920, 42, 70, 70, 52, 2))
    open(os.path.join(out, "w.ass"), "w").write(ass(caps, 1920, 1080, 48, 120, 760, 530, 7))
    words = title.split(" ")
    l1, l2 = " ".join(words[: (len(words) + 1) // 2]), " ".join(words[(len(words) + 1) // 2:])
    layouts = {
        # phone screen on a navy page; captions sit in the navy band under the screen, under an orange line
        "vertical": (1080, 1920, f"[0:v]scale=800:1600:flags=lanczos,setsar=1[v];[bg][v]overlay=140:100[o];"
                     f"[o]drawtext=fontfile={font}:text='Host Mode  ·  {title}':fontcolor=white:fontsize=34:x=(w-tw)/2:y=36,"
                     f"drawbox=x=480:y=1730:w=120:h=6:color={ORANGE}:t=fill,ass=v.ass[vout]"),
        "wide": (1920, 1080, f"[0:v]scale=480:960:flags=lanczos,setsar=1[v];[bg][v]overlay=1320:60[o];"
                 f"[o]drawtext=fontfile={font}:text='Host Mode tutorial':fontcolor={GREEN}:fontsize=36:x=120:y=200,"
                 f"drawtext=fontfile={font}:text='{l1}':fontcolor=white:fontsize=72:x=120:y=270,"
                 f"drawtext=fontfile={font}:text='{l2}':fontcolor={ORANGE}:fontsize=72:x=120:y=360,"
                 f"drawbox=x=120:y=490:w=160:h=6:color={ORANGE}:t=fill,ass=w.ass[vout]"),
    }
    audio_in, mix = [], ""
    for f, _ in clips:
        audio_in += ["-i", f]
    if clips:
        mix = "".join(f"[{i + 1}:a]adelay={int(caps[i][0] * 1000)}:all=1[a{i}];" for i in range(len(clips)))
        mix += "".join(f"[a{i}]" for i in range(len(clips))) + f"amix=inputs={len(clips)}:normalize=0,apad[aud];"
    files = {}
    for name, (W, H, vf) in layouts.items():
        o = os.path.join(out, f"{tid}_{name}.mp4")
        fc = f"color=c={NAVY}:s={W}x{H}:d={dur:.2f}[bg];" + mix + vf
        cmd = ["ffmpeg", "-y", "-v", "error", "-i", src] + audio_in + ["-filter_complex", fc, "-map", "[vout]"]
        if clips:
            cmd += ["-map", "[aud]", "-c:a", "aac", "-b:a", "160k", "-shortest"]
        cmd += ["-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p", "-r", "30", "-movflags", "+faststart", o]
        subprocess.run(cmd, check=True, cwd=out)
        files[name] = o
    mid = caps[len(caps) // 2][0] + 1.5
    thumb = os.path.join(out, f"{tid}.jpg")
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-ss", f"{mid:.2f}", "-i", files["wide"], "-frames:v", "1", "-q:v", "3", thumb], check=True)
    ins = []
    for i, s in enumerate([caps[0][0] + 1.5, mid, caps[-1][0] + 1.5]):
        p = os.path.join(out, f"qc{i}.png")
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-ss", f"{s:.2f}", "-i", files["vertical"], "-frames:v", "1", "-vf", "scale=405:-1", p], check=True)
        ins += ["-i", p]
    sheet = os.path.join(out, f"{tid}_check.png")
    subprocess.run(["ffmpeg", "-y", "-v", "error"] + ins + ["-filter_complex", "hstack=3", sheet], check=True)
    for i in range(3):
        os.remove(os.path.join(out, f"qc{i}.png"))
    return files, thumb, sheet


def make(steps_path, out, no_voice=False, fast=False):
    spec = json.load(open(steps_path))
    os.makedirs(out, exist_ok=True)
    for f in os.listdir(out):
        os.remove(os.path.join(out, f))
    lines = [s["say"] for s in spec["steps"]]
    clips, who = ([], "") if (no_voice or fast) else make_voice(lines, out)
    durs = [d for _, d in clips] if clips else [max(2.5, len(l.split()) / WPS) for l in lines]
    src, caps, errs, failed = asyncio.run(record(spec, durs, out, fast))
    rep = {"id": spec["id"], "title": spec["title"], "voice": who or False, "failed": failed, "errors": errs, "checks": []}
    if failed or fast:
        rep["checks"] = [("every step found its control", not failed), ("no page errors", not errs)]
        rep["ok"] = not failed and not errs
        if src and os.path.exists(src):
            os.remove(src)
        return rep
    files, thumb, sheet = render(spec, src, caps, clips, out)
    os.remove(src)
    checks = [("every step found its control", len(caps) == len(spec["steps"])), ("no page errors", not errs)]
    for n, f in files.items():
        checks.append((f"{n} file plays", subprocess.run(["ffmpeg", "-v", "error", "-i", f, "-f", "null", "-"], capture_output=True).returncode == 0))
    if clips:
        checks.append(("the voice fits each step", all(caps[i][1] + 0.05 >= clips[i][1] for i in range(len(clips)))))
    rep.update(checks=checks, ok=all(ok for _, ok in checks), seconds=round(probe(files["wide"]), 1),
               files=[os.path.basename(f) for f in files.values()] + [f"{spec['id']}.srt", os.path.basename(thumb), os.path.basename(sheet)])
    return rep


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("steps")
    ap.add_argument("--out", required=True)
    ap.add_argument("--no-voice", action="store_true")
    ap.add_argument("--fast", action="store_true")
    a = ap.parse_args()
    rep = make(a.steps, a.out, a.no_voice, a.fast)
    json.dump(rep, open(os.path.join(a.out, "report.json"), "w"), indent=1)
    for n, ok in rep["checks"]:
        log(("PASS " if ok else "FAIL ") + n)
    if rep.get("failed"):
        log("FAILED: " + rep["failed"])
    sys.exit(0 if rep["ok"] else 2)


if __name__ == "__main__":
    main()
