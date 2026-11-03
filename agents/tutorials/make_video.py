"""Makes one tutorial video from its steps file (agents/tutorials/steps/HM-Txx.json).

1. Narration: each step's "say" line becomes speech with HeyGen (HEYGEN_API_KEY). With no key, the video is
   captions-only and its status says "Narration In Progress".
2. Recording: a real browser plays the demo (never real customer data) at the step's pace, with a visible cursor and
   an orange ring on each control it uses. Every step must find its button, or the video is not made.
3. Render: a vertical (1080x1920) and a wide (1920x1080) MP4 with the Host Mode look, captions in a navy band
   (white text, orange accent line), the narration mixed in, plus an .srt, a thumbnail and a QC contact sheet.
4. Quality check: every step found its control, both files decode, the length matches the narration.

Usage: python agents/tutorials/make_video.py HM-T03 [--out DIR] [--no-voice]
Needs the repo served on port 8765 (python -m http.server 8765). TEST_CHROME = a local Chrome, if Playwright's
own browser isn't installed.
"""
import argparse, asyncio, json, os, re, subprocess, sys, time, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
BASE = os.environ.get("TUTORIAL_BASE", "http://localhost:8765/")
NAVY, ORANGE, GREEN = "0x16255a", "0xf6892f", "0x9fd3a8"
WPS = 2.6  # spoken words per second, for timing when there is no voice

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


# ---------- narration (HeyGen) ----------
def heygen(path, method="GET", body=None):
    key = os.environ.get("HEYGEN_API_KEY", "")
    req = urllib.request.Request("https://api.heygen.com" + path, method=method,
                                 data=json.dumps(body).encode() if body is not None else None,
                                 headers={"X-Api-Key": key, "Content-Type": "application/json", "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.loads(r.read().decode())


def pick_voice():
    v = os.environ.get("TUTORIAL_VOICE_ID", "").strip()
    if v:
        return v
    voices = heygen("/v3/voices").get("data", [])
    voices = voices.get("voices", voices) if isinstance(voices, dict) else voices
    en = [x for x in voices if str(x.get("language", "")).lower().startswith(("en", "english"))] or voices
    if not en:
        raise RuntimeError("HeyGen returned no voices")
    return en[0].get("voice_id") or en[0].get("id")


def narrate(lines, out, voice):
    """One MP3 per line. Returns [(file, seconds)]."""
    clips = []
    for i, text in enumerate(lines):
        d = heygen("/v3/voices/speech", "POST", {"text": text, "voice_id": voice, "speed": 1.0, "language": "en"}).get("data", {})
        f = os.path.join(out, f"say{i:02d}.mp3")
        urllib.request.urlretrieve(d["audio_url"], f)
        dur = float(d.get("duration") or probe(f))
        clips.append((f, dur))
        log(f"voice line {i + 1}/{len(lines)}: {dur:.1f}s")
    return clips


def probe(f):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f], capture_output=True, text=True)
    return float(r.stdout.strip() or 0)


# ---------- recording ----------
async def find(pg, a):
    """The control an action points at: a CSS selector, or exact visible text, optionally inside a card containing `within`."""
    scope = pg
    if a.get("within"):
        scope = pg.locator(a.get("in", ".card")).filter(has_text=a["within"]).first
    loc = scope.locator(a["sel"]) if a.get("sel") else scope.get_by_text(a["text"], exact=True)
    n = await loc.count()
    for i in range(n):
        if await loc.nth(i).is_visible():
            return loc.nth(i)
    raise LookupError(f"couldn't find {a.get('sel') or repr(a.get('text'))}" + (f" in {a['within']!r}" if a.get("within") else ""))


async def act(pg, a):
    k = a["act"]
    if k in ("point", "click", "type"):
        el = await find(pg, a)
        await el.scroll_into_view_if_needed()
        await pg.evaluate(CURSOR_JS)
        b = await el.bounding_box()
        await pg.evaluate("b=>{hmRing(b);hmMove(b.x+b.width/2+Math.min(b.width/2,26),b.y+b.height/2+16)}", b)
        await pg.wait_for_timeout(int(a.get("hold", 1.2) * 1000))
        if k == "click":
            await pg.evaluate("hmTap()")
            await el.click()
            await pg.wait_for_timeout(400)
        elif k == "type":
            await el.click()
            await el.type(a["value"], delay=90)
        await pg.evaluate(CURSOR_JS)
        if k != "point" or a.get("unring"):
            await pg.evaluate("hmRing(null)")
    elif k == "scroll":
        await pg.evaluate("hmRing&&hmRing(null)")
        await pg.mouse.wheel(0, a.get("y", 400))
        await pg.wait_for_timeout(900)
    elif k == "back":
        await pg.go_back()
        await pg.wait_for_timeout(1500)
    elif k == "goto":
        await pg.goto(BASE + a["url"], wait_until="load")
        await pg.wait_for_timeout(2500)
    elif k == "wait":
        await pg.wait_for_timeout(int(a.get("s", 1) * 1000))
    else:
        raise ValueError(f"unknown action {k}")


async def record(spec, durs, out):
    from playwright.async_api import async_playwright
    w, h = spec.get("viewport", [430, 860])
    caps, errs = [], []
    async with async_playwright() as p:
        kw = {"executable_path": os.environ["TEST_CHROME"], "args": ["--no-sandbox"]} if os.environ.get("TEST_CHROME") else {}
        b = await p.chromium.launch(**kw)
        c = await b.new_context(viewport={"width": w, "height": h}, device_scale_factor=2, record_video_dir=out, record_video_size={"width": w, "height": h})
        # the demo's contact popup, marked as already closed (the same as a visitor tapping X)
        await c.add_init_script("try{localStorage.setItem('hm_lead_done','closed')}catch(e){}")
        pg = await c.new_page()
        pg.on("pageerror", lambda e: errs.append(str(e)[:200]))
        t0 = time.time()
        try:
            await pg.goto(BASE + spec["url"], wait_until="load", timeout=45000)
            await pg.wait_for_timeout(3000)
            await pg.evaluate(CURSOR_JS)
            await pg.evaluate(f"hmMove({w // 2},{h // 2})")
            for i, st in enumerate(spec["steps"]):
                start = time.time() - t0
                for a in st.get("do", []):
                    await act(pg, a)
                left = durs[i] + 0.4 - (time.time() - t0 - start)
                if left > 0:
                    await pg.wait_for_timeout(int(left * 1000))
                caps.append((start, time.time() - t0 - start, st["say"]))
            await pg.wait_for_timeout(1500)
        finally:
            video = pg.video
            await c.close()
            await b.close()
        src = await video.path()
    return src, caps, errs


# ---------- render ----------
def ts(s, srt=False):
    return ("%02d:%02d:%02d,%03d" if srt else "%d:%02d:%02d.%02d") % (s // 3600, s % 3600 // 60, int(s % 60), int(s * (1000 if srt else 100)) % (1000 if srt else 100))


def ass(caps, W, H, size, ml, mr, mv, align):
    style = f"Style: Cap,DejaVu Sans,{size},&H00FFFFFF,&H00FFFFFF,&H00351A0E,&H64000000,-1,0,0,0,100,100,0,0,1,2,2,{align},{ml},{mr},{mv},1"
    head = ("[Script Info]\nScriptType: v4.00+\nPlayResX: %d\nPlayResY: %d\nWrapStyle: 0\n\n[V4+ Styles]\n"
            "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, "
            "ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n%s\n\n[Events]\n"
            "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n") % (W, H, style)
    return head + "".join(f"Dialogue: 0,{ts(t)},{ts(t + d)},Cap,,0,0,0,,{x}\n" for t, d, x in caps)


def render(spec, src, caps, clips, out):
    tid, title = spec["id"], spec["title"].replace("'", "’").replace(":", "\\:")
    dur = probe(src)
    font = subprocess.run(["fc-match", "-f", "%{file}", "DejaVu Sans:bold"], capture_output=True, text=True).stdout.strip()
    srt = "\n".join(f"{i + 1}\n{ts(t, 1)} --> {ts(t + d, 1)}\n{x}\n" for i, (t, d, x) in enumerate(caps))
    open(os.path.join(out, f"{tid}.srt"), "w").write(srt)
    open(os.path.join(out, "v.ass"), "w").write(ass(caps, 1080, 1920, 44, 80, 80, 70, 2))
    open(os.path.join(out, "w.ass"), "w").write(ass(caps, 1920, 1080, 50, 120, 760, 300, 1))
    audio_in, mix = [], ""
    if clips:
        for f, _ in clips:
            audio_in += ["-i", f]
        mix = "".join(f"[{i + 1}:a]adelay={int(caps[i][0] * 1000)}|{int(caps[i][0] * 1000)}[a{i}];" for i in range(len(clips)))
        mix += "".join(f"[a{i}]" for i in range(len(clips))) + f"amix=inputs={len(clips)}:normalize=0[aud];"
    words = title.split(" ")
    l1, l2 = " ".join(words[: (len(words) + 1) // 2]), " ".join(words[(len(words) + 1) // 2:])
    layouts = {
        "vertical": (1080, 1920, f"[0:v]scale=800:1600:flags=lanczos,setsar=1[v];[bg][v]overlay=140:110[o];"
                     f"[o]drawtext=fontfile={font}:text='Host Mode  ·  {title}':fontcolor=white:fontsize=36:x=(w-tw)/2:y=40,"
                     f"drawbox=x=440:y=1748:w=200:h=6:color={ORANGE}:t=fill,ass=v.ass"),
        "wide": (1920, 1080, f"[0:v]scale=480:960:flags=lanczos,setsar=1[v];[bg][v]overlay=1320:60[o];"
                 f"[o]drawtext=fontfile={font}:text='Host Mode tutorial':fontcolor={GREEN}:fontsize=36:x=120:y=200,"
                 f"drawtext=fontfile={font}:text='{l1}':fontcolor=white:fontsize=72:x=120:y=270,"
                 f"drawtext=fontfile={font}:text='{l2}':fontcolor={ORANGE}:fontsize=72:x=120:y=360,"
                 f"drawbox=x=120:y=640:w=160:h=6:color={ORANGE}:t=fill,ass=w.ass"),
    }
    files = {}
    for name, (W, H, f) in layouts.items():
        o = os.path.join(out, f"{tid}_{name}.mp4")
        fc = f"color=c={NAVY}:s={W}x{H}:d={dur}[bg];" + mix + f
        cmd = ["ffmpeg", "-y", "-v", "error", "-i", src] + audio_in + ["-filter_complex", fc, "-map", "[0:v]" if False else "0:v"]
        cmd = ["ffmpeg", "-y", "-v", "error", "-i", src] + audio_in + ["-filter_complex", fc.replace(",ass=", ",ass=") + "[vout]"]
        cmd += ["-map", "[vout]"] + (["-map", "[aud]", "-c:a", "aac", "-b:a", "160k"] if clips else []) + [
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p", "-r", "30", "-shortest" if clips else "-y", o]
        subprocess.run([x for x in cmd if x != "-y" or cmd.index(x) == 1], check=True, cwd=out)
        files[name] = o
    thumb = os.path.join(out, f"{tid}.jpg")
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-ss", str(min(dur / 2, caps[len(caps) // 2][0] + 1)), "-i", files["wide"], "-frames:v", "1", thumb], check=True)
    sheet = os.path.join(out, f"{tid}_qc.png")
    picks = [caps[0][0] + 1, caps[len(caps) // 2][0] + 1, caps[-1][0] + 1]
    ins = []
    for i, s in enumerate(picks):
        p = os.path.join(out, f"qc{i}.png")
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-ss", f"{s:.2f}", "-i", files["vertical"], "-frames:v", "1", "-vf", "scale=405:-1", p], check=True)
        ins += ["-i", p]
    subprocess.run(["ffmpeg", "-y", "-v", "error"] + ins + ["-filter_complex", "hstack=3", sheet], check=True)
    return files, thumb, sheet


def qc(files, caps, clips, errs, spec):
    res = []
    for n, f in files.items():
        ok = subprocess.run(["ffmpeg", "-v", "error", "-i", f, "-f", "null", "-"], capture_output=True).returncode == 0
        res.append((f"{n} file plays", ok))
    res.append(("every step found its control", len(caps) == len(spec["steps"])))
    res.append(("no page errors", not errs))
    if clips:
        res.append(("voice fits each step", all(caps[i][1] + 0.05 >= clips[i][1] for i in range(len(clips)))))
    return res


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("tid")
    ap.add_argument("--out", default=os.path.join(ROOT, "tutorial-out"))
    ap.add_argument("--no-voice", action="store_true")
    a = ap.parse_args()
    spec = json.load(open(os.path.join(HERE, "steps", a.tid + ".json")))
    out = os.path.join(a.out, a.tid)
    os.makedirs(out, exist_ok=True)
    for f in os.listdir(out):
        os.remove(os.path.join(out, f))
    lines = [s["say"] for s in spec["steps"]]
    clips = []
    if os.environ.get("HEYGEN_API_KEY") and not a.no_voice:
        clips = narrate(lines, out, pick_voice())
    durs = [c[1] for c in clips] if clips else [max(2.5, len(l.split()) / WPS) for l in lines]
    src, caps, errs = asyncio.run(record(spec, durs, out))
    files, thumb, sheet = render(spec, src, caps, clips, out)
    checks = qc(files, caps, clips, errs, spec)
    report = {"id": a.tid, "voice": bool(clips), "seconds": round(probe(files["wide"]), 1), "checks": checks, "errors": errs,
              "files": {k: os.path.basename(v) for k, v in files.items()}, "thumb": os.path.basename(thumb), "sheet": os.path.basename(sheet)}
    json.dump(report, open(os.path.join(out, "report.json"), "w"), indent=1)
    for n, ok in checks:
        log(("PASS " if ok else "FAIL ") + n)
    sys.exit(0 if all(ok for _, ok in checks) else 2)


if __name__ == "__main__":
    main()
