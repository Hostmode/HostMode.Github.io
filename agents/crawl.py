"""The tap-everything check: opens every demo screen (and every tab of the planner portal and the admin console),
taps every button, fills every box, follows every link inside the site, and records anything that breaks.
No AI and no secrets: it's free, and it only ever uses the demos.

Run it (it starts nothing itself; serve the repo first):
  python3 -m http.server 8765 &   then   python3 agents/crawl.py [--base http://localhost:8765] [--max-minutes 20]
Writes agent-screens/crawl.json: {"screens": n, "taps": n, "problems": [{sig, screen, url, what, kind, detail, risk}]}.
agents/file_crawl_issues.py turns new problems into GitHub issues.

What counts as a problem:
  - an error on the page after a tap or while typing in a box ("error")
  - a button wired to an action that doesn't exist, so tapping it does nothing ("dead")
  - a link inside the site that goes to a page that isn't there ("link")
"""
import argparse, hashlib, json, os, re, time, urllib.request
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JSZIP = "/opt/npm-tools/node_modules/jszip/dist/jszip.min.js"  # the sandbox can't reach the internet copy
# (name, url, risk). risk: "low" = planner and staff screens, "normal" = admin console, "roy" = guest, moderator,
# big screen, new event and sign-in screens, which always wait for Roy.
SCREENS = [
    ("Planner portal", "games.html?pdemo=1#planner", "low"),
    ("Host dashboard", "games.html?pdemo=1&host=1#planner", "low"),
    ("Host Plan page", "games.html?pdemo=1&e=JORDAN&only=plan#moderator", "roy"),
    ("Client portal", "games.html?pdemo=1&p=northlight&client=dublin", "low"),
    ("Teammate page", "games.html?pdemo=1&p=northlight&mate=liam", "low"),
    ("Vendor page", "games.html?pdemo=1&vendor=demoVendor3x&p=northlight", "low"),
    ("Support area", "games.html?pdemo=1#support", "low"),
    ("Showcase page", "games.html?pdemo=1&p=northlight&show=1", "low"),
    ("Inquiry form", "games.html?pdemo=1&p=northlight&inquire=1", "low"),
    ("Admin console", "games.html?pdemo=1#host", "normal"),
    ("Agent office (3D)", "office3d.html", "low"),
    ("Demo host dashboard", "games.html?e=DEMO#planner", "roy"),
    ("Guest view", "games.html?e=demo", "roy"),
    ("Moderator console", "games.html?e=demo#moderator", "roy"),
    ("Big screen", "games.html?e=demo#screen", "roy"),
    ("Planner event console", "games.html?e=DUBLIN&pdemo=1#moderator", "roy"),
    ("New event page", "games.html#new", "roy"),
    ("Sign-in page", "games.html#signin", "roy"),
    ("Front page", "index.html", "roy"),
    ("Hosts page", "hosts.html", "low"),
    ("Planners page", "planners.html", "low"),
]
# Taps that would leave the demo, wipe it, or sign out, so the rest of the screen can't be checked. Each is still checked for "dead".
SKIP_TAP = {"pdemoReset", "signOut", "plSignOut", "supSignOut", "hostOut", "logout", "pdemoGo", "goRole"}
# Errors that come from the test machine having no internet, not from Host Mode.
NOISE = re.compile(r"(?i)permission_denied|failed to fetch|networkerror|net::|firebase|load failed|network request failed|websocket|ERR_")
CLICKABLES = ("[data-act]:not([disabled]), button:not([disabled]), a[href], summary, [role=button]")


def sig(*parts):
    return hashlib.sha1("|".join(str(p) for p in parts).encode()).hexdigest()[:12]


def label_of(pg, el):
    try:
        t = el.evaluate("e=>((e.getAttribute('aria-label')||e.innerText||e.value||e.getAttribute('title')||'').trim().replace(/\\s+/g,' ').slice(0,60))")
        a = el.get_attribute("data-act") or ""
        return t or (a and f"[{a}]") or el.evaluate("e=>e.tagName.toLowerCase()")
    except Exception:
        return "?"


class Crawl:
    def __init__(self, pw, base, deadline):
        self.base, self.deadline = base.rstrip("/"), deadline
        opts = {"executable_path": os.environ["TEST_CHROME"], "args": ["--no-sandbox"]} if os.environ.get("TEST_CHROME") else {}
        self.b = pw.chromium.launch(**opts)
        self.problems, self.seen, self.taps, self.screens = [], set(), 0, 0
        self.link_ok = {}

    def page(self):
        ctx = self.b.new_context(viewport={"width": 400, "height": 900}, accept_downloads=True)
        ctx.add_init_script("window.print=()=>{};window.open=()=>null;window.alert=()=>{};window.confirm=()=>true;window.prompt=()=>null;")
        pg = ctx.new_page()
        pg.errs = []
        pg.on("pageerror", lambda e: pg.errs.append(str(e).split("\n")[0][:300]))
        pg.on("dialog", lambda d: d.dismiss())
        if os.path.exists(JSZIP):
            pg.route("**/jszip.min.js", lambda r: r.fulfill(path=JSZIP, content_type="application/javascript"))
        return ctx, pg

    def add(self, screen, url, risk, kind, what, detail):
        if kind == "error" and NOISE.search(detail):
            return
        # one bug = one problem: errors are grouped by their message (the first tap that showed it is kept), the rest by what was tapped
        s = sig(screen.split(",")[0], kind, re.sub(r"\d+", "#", detail)[:80]) if kind == "error" else sig(screen.split(",")[0], kind, re.sub(r"\d+", "#", what))
        if s in self.seen:
            return
        self.seen.add(s)
        self.problems.append({"sig": s, "screen": screen, "url": url, "risk": risk, "kind": kind, "what": what, "detail": detail})
        print(f"  PROBLEM [{kind}] {screen}: {what} — {detail[:120]}", flush=True)

    def check_links(self, screen, url, risk, pg):
        hrefs = pg.evaluate("[...document.querySelectorAll('a[href]')].map(a=>[a.getAttribute('href'),(a.innerText||a.getAttribute('aria-label')||'').trim().slice(0,60)])")
        for href, text in hrefs:
            if not href or href.startswith(("#", "mailto:", "tel:", "sms:", "javascript:", "data:", "blob:")) or re.match(r"^[a-z]+:", href) and not href.startswith(self.base):
                continue
            path = href.replace(self.base + "/", "").split("#")[0].split("?")[0].lstrip("./")
            if not path or path in self.link_ok:
                if path and not self.link_ok[path]:
                    self.add(screen, url, risk, "link", f'the link "{text or href}"', f"goes to {path}, which isn't there")
                continue
            try:
                urllib.request.urlopen(urllib.request.Request(f"{self.base}/{path}", method="HEAD"), timeout=10); self.link_ok[path] = True
            except Exception:
                self.link_ok[path] = False
                self.add(screen, url, risk, "link", f'the link "{text or href}"', f"goes to {path}, which isn't there")

    def check_dead(self, screen, url, risk, pg):
        dead = pg.evaluate("typeof ACT==='undefined'?[]:[...new Set([...document.querySelectorAll('[data-act]')].map(e=>e.dataset.act||e.getAttribute('data-act')))].filter(a=>typeof ACT[a]!=='function')")
        for a in dead:
            self.add(screen, url, risk, "dead", f'a button wired to "{a}"', "tapping it does nothing: there's no action with that name")

    def fill_boxes(self, screen, url, risk, pg):
        boxes = pg.query_selector_all("input:not([type=hidden]):not([type=file]):not([disabled]), textarea:not([disabled]), select:not([disabled])")
        for el in boxes[:40]:
            if time.time() > self.deadline:
                return
            try:
                if not el.is_visible():
                    continue
                tag = el.evaluate("e=>e.tagName.toLowerCase()"); typ = (el.get_attribute("type") or "text").lower(); before = len(pg.errs)
                if tag == "select":
                    n = el.evaluate("e=>e.options.length")
                    if n > 1:
                        el.select_option(index=1)
                elif typ in ("checkbox", "radio"):
                    el.click(timeout=1500)
                elif typ in ("date",):
                    el.fill(time.strftime("%Y-%m-%d"))
                elif typ in ("time",):
                    el.fill("18:30")
                elif typ in ("number", "range"):
                    el.fill("3")
                elif typ == "email":
                    el.fill("test@example.com")
                elif typ == "color":
                    el.evaluate("e=>{e.value='#f6892f';e.dispatchEvent(new Event('input',{bubbles:true}))}")
                else:
                    el.fill("Test 123")
                pg.wait_for_timeout(150)
                for e in pg.errs[before:]:
                    self.add(screen, url, risk, "error", f'typing in the box "{label_of(pg, el)}"', e)
            except Exception:
                continue

    def tap_all(self, screen, url, risk, setup=None):
        ctx, pg = self.page()
        try:
            pg.goto(f"{self.base}/{url}", wait_until="load")
            if "pdemo=1" in url:
                pg.evaluate("localStorage.clear()"); pg.reload(wait_until="load")
            pg.wait_for_timeout(2200)
            if setup:
                pg.evaluate(setup); pg.wait_for_timeout(500)
            name = screen
            self.screens += 1
            for e in pg.errs:
                self.add(name, url, risk, "error", "opening the screen", e)
            self.check_dead(name, url, risk, pg)
            self.check_links(name, url, risk, pg)
            self.fill_boxes(name, url, risk, pg)
            done, start_url = set(), pg.url
            for _ in range(150):
                if time.time() > self.deadline:
                    break
                # one look at the page: every visible thing to tap that hasn't been tapped yet, tagged so it can be found again
                cand = pg.evaluate("""([sel,skip,done])=>{const S=new Set(skip),D=new Set(done),out=[];let i=0;
                  for(const e of document.querySelectorAll(sel)){const r=e.getBoundingClientRect();if(!r.width||!r.height||getComputedStyle(e).visibility==='hidden')continue;
                   const act=e.getAttribute('data-act')||'',href=e.getAttribute('href')||'';if(S.has(act))continue;if(href&&!href.startsWith('#')&&!act)continue;
                   if(/^(INPUT|SELECT|TEXTAREA)$/.test(e.tagName))continue;
                   const lab=((e.getAttribute('aria-label')||e.innerText||e.getAttribute('title')||'').trim().replace(/\\s+/g,' ').slice(0,60))||(act?'['+act+']':e.tagName.toLowerCase());
                   const key=[act,e.getAttribute('data-k')||'',lab,href].join('|');if(D.has(key))continue;
                   e.setAttribute('data-crawl',String(i));out.push([i++,key,lab]);if(out.length>=1)break}return out}""", [CLICKABLES, sorted(SKIP_TAP), sorted(done)])
                if not cand:
                    break
                cid, key, lab = cand[0]
                done.add(key)
                before = len(pg.errs)
                try:
                    pg.click(f'[data-crawl="{cid}"]', timeout=1500)
                except Exception:
                    continue  # covered or moved: not a Host Mode problem
                self.taps += 1
                pg.wait_for_timeout(180)
                for e in pg.errs[before:]:
                    self.add(name, url, risk, "error", f'tapping "{lab}"', e)
                if pg.url.split("#")[0] != start_url.split("#")[0]:  # it went to another page: come back
                    pg.goto(start_url, wait_until="load"); pg.wait_for_timeout(1500)
                    if setup:
                        pg.evaluate(setup); pg.wait_for_timeout(400)
                elif self.taps % 5 == 0:
                    self.check_dead(name, url, risk, pg)
            self.check_dead(name, url, risk, pg)
        except Exception as e:
            self.add(screen, url, risk, "error", "opening the screen", f"{type(e).__name__}: {str(e)[:200]}")
        finally:
            ctx.close()

    def tabs(self, url, fn, key):
        """The tab keys of a screen with tabs (the planner portal, the admin console)."""
        ctx, pg = self.page()
        try:
            pg.goto(f"{self.base}/{url}", wait_until="load"); pg.wait_for_timeout(2200)
            return pg.evaluate(f"(()=>{{try{{return {fn}}}catch(e){{return []}}}})()") or []
        finally:
            ctx.close()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default=os.environ.get("TEST_BASE", "http://localhost:8765"))
    ap.add_argument("--max-minutes", type=float, default=20)
    ap.add_argument("--self-test", action="store_true", help="plant a broken button, a dead button and a broken link, and check all three are caught")
    a = ap.parse_args()
    t0 = time.time()
    if a.self_test:
        plant = ("document.getElementById('app').insertAdjacentHTML('afterbegin','<button data-act=\"crawlBoom\">Boom</button>"
                 "<button data-act=\"crawlNope\">Dead</button><a href=\"no-such-page.html\">Missing</a>');"
                 "ACT.crawlBoom=()=>{throw new Error('planted test error')};bind(document.getElementById('app'))")
        with sync_playwright() as pw:
            c = Crawl(pw, a.base, t0 + 300)
            c.tap_all("Self-test", "games.html?pdemo=1#planner", "low", plant)
            c.b.close()
        kinds = {p["kind"] for p in c.problems}
        ok = {"error", "dead", "link"} <= kinds
        print("Self-test", "passed: all three planted problems were caught." if ok else f"FAILED: only caught {sorted(kinds)}")
        return 0 if ok else 1
    with sync_playwright() as pw:
        c = Crawl(pw, a.base, t0 + a.max_minutes * 60)
        for name, url, risk in SCREENS:
            if time.time() > c.deadline:
                break
            print(f"{name} ({url})", flush=True)
            c.tap_all(name, url, risk)
            if name == "Planner portal":
                for k, label in c.tabs(url, "PL_TABS", "plTab"):
                    if time.time() > c.deadline:
                        break
                    print(f"  tab: {label}", flush=True)
                    c.tap_all(f"Planner portal, {label} tab", url, "low", f"ACT.plTab({{dataset:{{k:{json.dumps(k)}}}}})")
            if name == "Host dashboard":
                for k, label in c.tabs(url, "HOST_TABS", "plTab"):
                    if time.time() > c.deadline:
                        break
                    print(f"  tab: {label}", flush=True)
                    c.tap_all(f"Host dashboard, {label} tab", url, "low", f"ACT.plTab({{dataset:{{k:{json.dumps(k)}}}}})")
            if name == "Admin console":
                for k in c.tabs(url, "[...document.querySelectorAll('[data-act=hostTab]')].map(b=>b.dataset.k)", "hostTab"):
                    if time.time() > c.deadline:
                        break
                    print(f"  tab: {k}", flush=True)
                    c.tap_all(f"Admin console, {k} tab", url, "normal", f"ACT.hostTab({{dataset:{{k:{json.dumps(k)}}}}})")
        c.b.close()
    out = {"screens": c.screens, "taps": c.taps, "minutes": round((time.time() - t0) / 60, 1), "finished": time.time() <= c.deadline, "problems": c.problems}
    os.makedirs(os.path.join(ROOT, "agent-screens"), exist_ok=True)
    json.dump(out, open(os.path.join(ROOT, "agent-screens", "crawl.json"), "w"), indent=1)
    print(f"Checked {c.screens} screens, {c.taps} taps in {out['minutes']} min: {len(c.problems)} problem(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
