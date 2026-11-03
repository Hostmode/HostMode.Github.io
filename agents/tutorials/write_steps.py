"""Writes the steps file (narration + clicks) for one tutorial, using Claude and the real demo.

How it works, in at most 4 calls to Claude:
1. Map: a browser opens the topic's demo page and lists what's on screen (headings, buttons, tabs, fields).
2. Explore: Claude may ask to see up to 3 more screens (by tapping through tabs); the browser maps those too.
3. Write: Claude writes the steps from what is really on screen, plus the Help desk answers.
4. Rehearse: the steps run in the browser (no video). If one fails, Claude gets the error and the screen at that
   moment, and fixes the steps once.

Model-written steps are only ever run as browser actions from a short fixed list (point, click, type, scroll,
wait, back, goto); they are checked first (demo pages only), and nothing Claude writes reaches a shell.
Usage: python agents/tutorials/write_steps.py HM-T14 --out STEPS_DIR
"""
import argparse, asyncio, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
import common  # noqa: E402
import make_video as mv  # noqa: E402

ACTS = {"point", "click", "type", "scroll", "wait", "back", "goto"}
PAGES = ("games.html", "index.html", "hosts.html", "planners.html", "demo.html")


def safe_url(u):
    """Only the demo: an event demo (e=DEMO), the planner demo (pdemo=1) or a public page."""
    u = str(u or "")
    if u.startswith(("http:", "https:", "//", "/")) or ".." in u or not u.startswith(PAGES):
        return False
    if u.startswith("games.html") and "e=DEMO" not in u and "pdemo=1" not in u:
        return False
    return True


def check_steps(spec, topic):
    errs = []
    if not isinstance(spec.get("steps"), list) or not 4 <= len(spec["steps"]) <= 14:
        errs.append("there must be 4 to 14 steps")
    for i, st in enumerate(spec.get("steps") or []):
        if not isinstance(st.get("say"), str) or not 3 <= len(st["say"].split()) <= 40:
            errs.append(f"step {i + 1}: 'say' must be one or two short sentences")
        for a in st.get("do", []):
            if a.get("act") not in ACTS:
                errs.append(f"step {i + 1}: unknown act {a.get('act')!r}")
            if a.get("act") == "goto" and not safe_url(a.get("url")):
                errs.append(f"step {i + 1}: goto must stay on the demo")
            if a.get("act") in ("point", "click", "type") and not (a.get("sel") or a.get("text") or a.get("within")):
                errs.append(f"step {i + 1}: {a.get('act')} needs sel, text or within")
            if a.get("act") == "type" and len(str(a.get("value", ""))) > 60:
                errs.append(f"step {i + 1}: typed text is too long")
    if not safe_url(spec.get("url")):
        errs.append("url must be a demo page")
    return errs


MAP_JS = """(()=>{const vis=e=>e.offsetParent!==null||getComputedStyle(e).position==='fixed';
const t=e=>(e.innerText||e.getAttribute('aria-label')||e.placeholder||e.value||'').trim().replace(/\\s+/g,' ').slice(0,60);
const pick=(q,n)=>[...new Set([...document.querySelectorAll(q)].filter(e=>vis(e)&&!e.closest('.demobar')).map(t).filter(Boolean))].slice(0,n);
return {headings:pick('h1,h2,h3,.eyebrow,b',40),buttons:pick('button,a,[role=tab]',80),fields:[...document.querySelectorAll('input,select,textarea')].filter(vis).slice(0,20).map(e=>(e.id?'#'+e.id:e.name?`[name=${e.name}]`:e.tagName.toLowerCase())+' '+t(e)),
text:document.body.innerText.replace(/\\s+\\n/g,'\\n').slice(0,1800)}})()"""


async def page_maps(start, paths):
    """What's on screen at `start`, and after tapping each path (a list of exact button texts)."""
    from playwright.async_api import async_playwright
    out = []
    async with async_playwright() as p:
        kw = {"executable_path": os.environ["TEST_CHROME"], "args": ["--no-sandbox"]} if os.environ.get("TEST_CHROME") else {}
        b = await p.chromium.launch(**kw)
        for path in [[]] + paths:
            c = await b.new_context(viewport={"width": 430, "height": 860})
            await c.add_init_script("try{localStorage.setItem('hm_lead_done','closed')}catch(e){}")
            pg = await c.new_page()
            note = ""
            try:
                await pg.goto(mv.BASE + start, wait_until="load", timeout=45000)
                await pg.wait_for_timeout(2500)
                for label in path:
                    try:
                        el = await mv.find(pg, {"text": label})
                        await el.click(timeout=6000)
                        await pg.wait_for_timeout(1200)
                    except Exception as e:
                        note = f"couldn't tap {label!r}: {str(e).splitlines()[0][:100]}"
                        break
                m = await pg.evaluate(MAP_JS)
                m["url"] = pg.url.replace(mv.BASE, "")
            except Exception as e:
                m = {"error": str(e).splitlines()[0][:200]}
            out.append({"after_tapping": path, "note": note, **m})
            await c.close()
        await b.close()
    return out


SYSTEM = """You write Host Mode video tutorials: a real browser follows your steps on the demo while a voice reads your lines.

{rules}

## How a steps file works
JSON: {{"id","title","collection","audience","help":[help desk titles it answers],"url": the demo page it starts on,
"viewport":[430,860],"steps":[{{"say": one or two short spoken sentences, "do":[actions done while that line is spoken]}}]}}
Actions: {{"act":"point"|"click"|"type","text": exact visible text}} or {{"act":..., "sel": CSS selector}}; add "within": text of the
card (or "in": a CSS selector for the container, like ".gamerow") to pick the one inside it. {{"act":"type","sel":"#id","value":"Sam K"}}.
{{"act":"scroll","y":400}} (negative scrolls up), {{"act":"wait","s":1.5}}, {{"act":"back"}}, {{"act":"goto","url":"games.html?e=DEMO#screen"}}.
Use only buttons, tabs and text that appear in the screen maps you're given, spelled exactly. Never invent a feature.
6 to 10 steps, 45 to 90 seconds spoken. First line: a friendly hook. Last line: a one-sentence wrap-up.
Voice: warm, confident, plain words, second person ("tap Budget"). Say "and" not "&". No jargon, no exclamation marks.

## A good example
{example}
"""


def ask(run, msgs, system):
    r = common.claude(run, msgs, system, max_tokens=3000)
    return common.text_of(r), common.json_of(r)


def write(topic, out_dir, run):
    lib = json.load(open(os.path.join(HERE, "library.json")))
    rules = "Project rules (follow them):\n" + "\n".join(l for l in common.claude_md().splitlines() if l.startswith("- ") and any(
        k in l for k in ("only tracks money", "Host Mode only", "Competitor", "coming soon", "plain and friendly", "Host\" means", "teammates")))
    example = open(os.path.join(HERE, "steps", "HM-T03.json")).read()
    system = SYSTEM.format(rules=rules, example=example)
    helps = common.help_library()
    maps = asyncio.run(page_maps(topic["start"], []))
    brief = (f"Tutorial: {topic['id']} \"{topic['title']}\" ({topic['collection']}).\nWhere it lives: {topic.get('hint', '')}\n"
             f"Must follow: {topic.get('caution', 'nothing extra')}\nDemo pages: {json.dumps(lib['demos'])}\n\n"
             f"Help desk answers:\n{helps}\n\nScreen map of the start page:\n{json.dumps(maps, ensure_ascii=False)[:6000]}")
    msgs = [{"role": "user", "content": brief + "\n\nFirst: which screens do you need to see? Reply with JSON "
             "{\"explore\": [[\"Tab\", \"Button\"], ...]} listing up to 3 tap paths from the start page (exact button texts), or {\"explore\": []}."}]
    txt, j = ask(run, msgs, system)
    paths = [p for p in (j or {}).get("explore", []) if isinstance(p, list)][:3]
    more = asyncio.run(page_maps(topic["start"], [[str(x)[:40] for x in p][:4] for p in paths])) if paths else []
    msgs += [{"role": "assistant", "content": txt},
             {"role": "user", "content": f"Screen maps:\n{json.dumps(more[1:], ensure_ascii=False)[:9000]}\n\nNow write the steps file. Reply with the JSON only."}]
    for attempt in range(2):
        txt, spec = ask(run, msgs, system)
        if not spec:
            problems = ["your reply had no JSON"]
        else:
            spec.update(id=topic["id"], title=topic["title"], collection=topic["collection"], url=spec.get("url") or topic["start"],
                        viewport=[430, 860])
            problems = check_steps(spec, topic)
        if not problems:
            path = os.path.join(out_dir, topic["id"] + ".json")
            json.dump(spec, open(path, "w"), indent=1, ensure_ascii=False)
            rep = mv.make(path, os.path.join(out_dir, "_rehearsal"), fast=True)
            if rep["ok"]:
                return path, None
            os.remove(path)
            problems = [rep.get("failed") or "page errors: " + "; ".join(rep["errors"][:2])]
            fail_at = None
            m = re.match(r"step (\d+)", problems[0])
            if m and spec:
                taps = [a["text"] for st in spec["steps"][: int(m.group(1)) - 1] for a in st.get("do", []) if a.get("act") == "click" and a.get("text")]
                fail_at = asyncio.run(page_maps(spec["url"], [taps[-4:]]))[-1]
            problems.append(f"The screen at that moment: {json.dumps(fail_at, ensure_ascii=False)[:5000]}" if fail_at else "")
        msgs += [{"role": "assistant", "content": txt}, {"role": "user", "content": "That didn't work: " + " ".join(problems) + "\nFix it and reply with the whole JSON only."}]
    return None, "; ".join(problems)[:300]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("tid")
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    topic = next(t for t in json.load(open(os.path.join(HERE, "library.json")))["topics"] if t["id"] == a.tid)
    os.makedirs(a.out, exist_ok=True)
    run = common.Run()
    path, err = write(topic, a.out, run)
    print(f"cost about ${run.usd:.2f}")
    print(path or ("FAILED: " + err))
    sys.exit(0 if path else 2)


if __name__ == "__main__":
    main()
