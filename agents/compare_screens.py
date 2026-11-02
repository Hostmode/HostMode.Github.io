"""Before-and-after check for big changes: records what 14 key screens show, then compares.

1. Serve the repo on port 8765 (python -m http.server 8765), still on the old code.
2. python agents/compare_screens.py before        (saves agent-screens/before.json)
3. Make the change.
4. python agents/compare_screens.py after         (saves after.json and lists any screen that changed or shows an error)

Set TEST_CHROME to a local Chrome if Playwright's own browser isn't installed. Times like "3 min ago" are ignored.
"""
import json, os, re, sys
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = os.environ.get("TEST_BASE", "http://localhost:8765")
URLS = ["games.html?e=demo", "games.html?e=demo#moderator", "games.html?e=demo#screen", "games.html?pdemo=1#planner",
        "games.html?pdemo=1&p=northlight&client=dublin", "games.html?pdemo=1&p=northlight&mate=liam", "games.html?pdemo=1#support",
        "games.html?pdemo=1&vendor=demoVendor3x&p=northlight", "games.html?pdemo=1#host", "games.html#new",
        "games.html?pdemo=1&p=northlight&show=1", "games.html?pdemo=1&p=northlight&inquire=1", "games.html?e=DUBLIN&pdemo=1#moderator",
        "games.html?pdemo=1&e=DUBLIN#screen"]
JSZIP = "/opt/npm-tools/node_modules/jszip/dist/jszip.min.js"  # the sandbox can't reach the internet copy


def snap():
    out = {}
    with sync_playwright() as pw:
        opts = {"executable_path": os.environ["TEST_CHROME"], "args": ["--no-sandbox"]} if os.environ.get("TEST_CHROME") else {}
        b = pw.chromium.launch(**opts)
        for u in URLS:
            ctx = b.new_context(viewport={"width": 400, "height": 900}); pg = ctx.new_page(); errs = []
            pg.on("pageerror", lambda e: errs.append(str(e)[:160]))
            if os.path.exists(JSZIP):
                pg.route("**/jszip.min.js", lambda r: r.fulfill(path=JSZIP, content_type="application/javascript"))
            pg.goto(f"{BASE}/{u}"); pg.wait_for_timeout(2500)
            t = pg.evaluate("(document.querySelector('#app')||document.body).innerText")
            h = pg.evaluate("(document.querySelector('#hdr')||{}).innerText||''")
            out[u] = {"text": " ".join(t.split())[:600], "hdr": " ".join(h.split())[:100], "errs": errs}
            ctx.close()
        b.close()
    return out


def main():
    which = (sys.argv[1:] or ["before"])[0]
    os.makedirs(os.path.join(ROOT, "agent-screens"), exist_ok=True)
    data = snap()
    json.dump(data, open(os.path.join(ROOT, "agent-screens", which + ".json"), "w"), indent=1)
    if which != "after":
        print(f"Recorded {len(data)} screens. Make the change, then run: python agents/compare_screens.py after")
        return 0
    before = json.load(open(os.path.join(ROOT, "agent-screens", "before.json")))
    norm = lambda t: re.sub(r"\d{1,2}:\d{2}\s?[AP]M|\d+ (min|sec|hr)s? ago|just now", "T", t)
    bad = 0
    for u in URLS:
        a, b = before.get(u, {}), data[u]
        same = norm(a.get("text", "")) == norm(b["text"]) and a.get("hdr") == b["hdr"]
        if not same or b["errs"]:
            bad += 1
            print(("CHANGED " if not same else "ERRORS  ") + u + ("  " + b["errs"][0] if b["errs"] else ""))
            if not same:
                print("   before:", a.get("text", "")[:160]); print("   after: ", b["text"][:160])
    print(f"{len(URLS) - bad} of {len(URLS)} screens unchanged with no errors.")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
