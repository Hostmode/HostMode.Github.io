"""The nightly test customer.

Part 1, scripted checks: a fixed tour of the demos (planner, support, vendor, guest) on a phone-sized and a
desktop-sized screen, plus every saved regression check in regressions.json. Free to run.
Part 2, the AI test customer: Claude uses the demo like a real person (a different role each night),
and reports anything broken or confusing. Paid from the prepaid credits, within the nightly limit.

Only the demos are used (games.html?pdemo=1 and ?e=demo), which keep their data in the test browser.
Real customer data is never touched. Problems become tickets in the support inbox, marked as found by the
nightly tester, unless an open ticket already describes the same problem.

Run: python agents/tester.py [--scripted-only] [--no-tickets] [--base http://localhost:8765]
"""
import argparse, hashlib, json, os, re, sys, time
from playwright.sync_api import sync_playwright
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import ROOT, Run, DB, Stop, claude, read_skill, text_of

ROLES = [
 ("planner", "a wedding and event planner in Charlotte trying Host Mode for the first time", "games.html?pdemo=1#planner"),
 ("venue", "a venue manager who books rooms, blocks off days and tracks rentals", "games.html?pdemo=1#planner"),
 ("vendor", "a caterer who just got a link from a planner, on a phone, in a hurry", "games.html?pdemo=1&vendor=demoVendor3x&p=northlight"),
 ("guest", "a guest at a party who scanned a QR code and wants to play the games", "games.html?e=demo"),
 ("support", "Icee, the support teammate, working the support inbox", "games.html?pdemo=1#support"),
]
SIZES = [("phone", 390, 844), ("desktop", 1280, 900)]


def sig(*parts):
    return hashlib.sha1("|".join(str(p) for p in parts).encode()).hexdigest()[:12]


class Browser:
    def __init__(self, pw, base, w, h):
        self.base = base.rstrip("/")
        self.b = pw.chromium.launch(**({"executable_path": os.environ["TEST_CHROME"], "args": ["--no-sandbox"]} if os.environ.get("TEST_CHROME") else {}))
        self.ctx = self.b.new_context(viewport={"width": w, "height": h})
        self.pg = self.ctx.new_page()
        self.errors = []
        self.pg.on("pageerror", lambda e: self.errors.append(str(e)[:300]))
        self.pg.on("dialog", lambda d: d.dismiss())

    def open(self, path, fresh=False):
        self.pg.goto(f"{self.base}/{path}", wait_until="load")
        if fresh:
            self.pg.evaluate("localStorage.clear()")
            self.pg.reload(wait_until="load")
        self.pg.wait_for_timeout(1800)

    def text(self, n=4000):
        return (self.pg.evaluate("(document.querySelector('#app')||document.body).innerText") or "")[:n]

    def close(self):
        self.b.close()


# ---------- part 1: scripted checks ----------
def scripted(base, run):
    issues, passed = [], 0

    def check(name, fn, br):
        nonlocal passed
        before = len(br.errors)
        try:
            fn(br)
            new = br.errors[before:]
            if new:
                raise AssertionError("The page showed an error: " + new[0])
            passed += 1
        except Exception as e:
            msg = str(e).split("\n")[0][:300]
            issues.append({"title": name + " is broken", "steps": f"{name} (on a {br.size} screen)", "what": msg, "sig": sig("scripted", name, msg[:60]), "page": br.pg.url.replace(br.base + "/", "")})
            run.say(f"FAIL {name} ({br.size}): {msg}")

    def planner_tabs(br):
        br.open("games.html?pdemo=1#planner", fresh=True)
        tabs = br.pg.eval_on_selector_all('[data-act="plTab"]', "e=>e.map(x=>x.dataset.k)")
        assert len(tabs) >= 10, f"only {len(tabs)} planner tabs showed up"
        for k in tabs:
            br.pg.evaluate(f"document.querySelector('[data-act=\"plTab\"][data-k=\"{k}\"]').click()")
            br.pg.wait_for_timeout(250)
            assert len(br.text(200).strip()) > 20, f"the {k} tab is empty"

    def support_inbox(br):
        br.open("games.html?pdemo=1#support")
        t = br.text()
        assert "Support" in t and "Being worked on" in t, "the support inbox didn't load"
        first = br.pg.query_selector('[data-act="tkOpen"]')
        assert first, "no tickets showed in the support demo"
        first.click(); br.pg.wait_for_timeout(300)
        assert br.pg.query_selector('[data-act="tkReply"]'), "opening a ticket didn't show the reply box"

    def report_problem(br):
        br.open("games.html?pdemo=1#planner")
        br.pg.click('.supfoot [data-act="supOpen"][data-k="new"]'); br.pg.wait_for_timeout(300)
        br.pg.fill('[data-draft="rp_msg"]', "Nightly test report, please ignore.")
        br.pg.click('[data-act="supSend"]'); br.pg.wait_for_timeout(600)
        assert "sent" in br.text(9000).lower() or br.pg.evaluate("String(L.report).startsWith('sent:')"), "the report didn't send"

    def vendor_page(br):
        br.open("games.html?pdemo=1&vendor=demoVendor3x&p=northlight")
        t = br.text()
        assert "Your arrival" in t and "Schedule" in t, "the vendor page didn't load"
        br.pg.click('[data-act="vpHere"]'); br.pg.wait_for_timeout(400)
        assert "checked in" in br.text().lower(), "I'm here didn't check the vendor in"

    def venue_booking(br):
        br.open("games.html?pdemo=1#planner")
        br.pg.evaluate("document.querySelector('[data-act=\"plTab\"][data-k=\"venue\"]').click()"); br.pg.wait_for_timeout(300)
        br.pg.click('[data-act="bkNew"]'); br.pg.wait_for_timeout(300)
        br.pg.fill('[data-draft="bk_name"]', "Nightly test booking")
        br.pg.fill('[data-draft="bk_date"]', time.strftime("%Y-%m-%d", time.gmtime(time.time() + 86400 * 90)))
        br.pg.click('[data-act="bkSave"]'); br.pg.wait_for_timeout(500)
        if br.pg.query_selector('[data-act="bkSave"]'):
            br.pg.click('[data-act="bkSave"]'); br.pg.wait_for_timeout(500)
        assert br.pg.evaluate("bkList().some(b=>b.name==='Nightly test booking')"), "a new booking didn't save"

    def import_inventory(br):
        br.open("games.html?pdemo=1#planner")
        br.pg.evaluate("document.querySelector('[data-act=\"plTab\"][data-k=\"data\"]').click()"); br.pg.wait_for_timeout(300)
        p = os.path.join(ROOT, "agent-test-inventory.csv")
        open(p, "w").write("Item,Category,Qty on hand,Color\nNightly test lantern,Lighting,12,Gold\n")
        br.pg.set_input_files('[data-act="imFile"]', p); br.pg.wait_for_timeout(1200)
        assert br.pg.evaluate("L.im&&L.im.type") == "gear", "an inventory sheet wasn't recognized as inventory"
        br.pg.click('[data-act="imStep"][data-k="preview"]'); br.pg.wait_for_timeout(300)
        br.pg.click('[data-act="imGo"]'); br.pg.wait_for_timeout(800)
        assert br.pg.evaluate("gearList().some(x=>x.name==='Nightly test lantern')"), "the imported item isn't in Inventory"

    def guest_demo(br):
        br.open("games.html?e=demo", fresh=True)
        assert len(br.text().strip()) > 40, "the guest demo is blank"

    def regressions(br):
        p = os.path.join(os.path.dirname(os.path.abspath(__file__)), "regressions.json")
        for r in json.load(open(p)) if os.path.exists(p) else []:
            def one(b, r=r):
                b.open(r["url"], fresh=r.get("fresh", False))
                for st in r.get("steps", []):
                    if "click" in st: b.pg.click(st["click"]); b.pg.wait_for_timeout(300)
                    if "fill" in st: b.pg.fill(st["fill"][0], st["fill"][1])
                    if "js" in st: b.pg.evaluate(st["js"]); b.pg.wait_for_timeout(300)
                    if "expect_text" in st: assert st["expect_text"] in b.text(20000), f"expected to see \"{st['expect_text']}\""
                    if "expect_js" in st: assert b.pg.evaluate(st["expect_js"]), f"check failed: {st['expect_js'][:80]}"
            check("Regression check: " + r["name"], one, br)

    with sync_playwright() as pw:
        for size, w, h in SIZES:
            br = Browser(pw, base, w, h); br.size = size
            for name, fn in [("Planner portal tabs", planner_tabs), ("Support inbox", support_inbox), ("Report a problem", report_problem),
                             ("Vendor page", vendor_page), ("Venue booking", venue_booking), ("Inventory import", import_inventory), ("Guest demo", guest_demo)]:
                check(name, fn, br)
            if size == "phone":
                regressions(br)
            br.close()
    return passed, issues


# ---------- part 2: the AI test customer ----------
LOOK_JS = """() => {
 document.querySelectorAll('[data-agent-i]').forEach(e=>e.removeAttribute('data-agent-i'));
 const vis=e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(e).visibility!=='hidden'};
 const els=[...document.querySelectorAll('button,a[href],input,select,textarea,[data-act]')].filter(vis).slice(0,120);
 return {text:((document.querySelector('#sheet')||{}).innerText||'')+'\\n'+(document.querySelector('#app')||document.body).innerText,
  items:els.map((e,i)=>{e.setAttribute('data-agent-i',i);const t=(e.innerText||e.value||e.placeholder||e.getAttribute('aria-label')||e.name||'').trim().replace(/\\s+/g,' ').slice(0,60);
   return i+': '+e.tagName.toLowerCase()+(e.type?'['+e.type+']':'')+' '+t})}}"""

TOOLS = [
 {"name": "look", "description": "See the screen: its text and a numbered list of things you can tap or type into.", "input_schema": {"type": "object", "properties": {}}},
 {"name": "tap", "description": "Tap item number n from the last look.", "input_schema": {"type": "object", "properties": {"n": {"type": "integer"}}, "required": ["n"]}},
 {"name": "type", "description": "Type text into item number n (a text box).", "input_schema": {"type": "object", "properties": {"n": {"type": "integer"}, "text": {"type": "string"}}, "required": ["n", "text"]}},
 {"name": "choose", "description": "Pick an option in drop-down n by its visible label.", "input_schema": {"type": "object", "properties": {"n": {"type": "integer"}, "label": {"type": "string"}}, "required": ["n", "label"]}},
 {"name": "report", "description": "Report one problem: something broken, wrong, or confusing for a real person.",
  "input_schema": {"type": "object", "properties": {"title": {"type": "string"}, "steps": {"type": "string"}, "what_happened": {"type": "string"}, "expected": {"type": "string"},
   "kind": {"type": "string", "enum": ["broken", "wrong", "confusing"]}}, "required": ["title", "steps", "what_happened", "kind"]}},
 {"name": "done", "description": "Finish, with a one-paragraph summary of how it went.", "input_schema": {"type": "object", "properties": {"summary": {"type": "string"}}, "required": ["summary"]}},
]


def ai_customer(base, run, max_steps=30):
    day = int(time.time() // 86400)
    role, who, url = ROLES[day % len(ROLES)]
    size = SIZES[(day // len(ROLES)) % 2]
    lang = "Spanish" if day % 7 == 3 and role in ("guest", "vendor") else "English"
    system = (read_skill("test-as-customer") + f"\n\nTonight you are {who}. Use the app in {lang} if it offers it. "
              f"Screen: {size[0]}. You have up to {max_steps} actions. Report each real problem once with the report tool, then call done.")
    issues, summary, steps = [], "", 0
    with sync_playwright() as pw:
        br = Browser(pw, base, size[1], size[2]); br.size = size[0]
        br.open(url, fresh=True)
        msgs = [{"role": "user", "content": f"You're on {url}. Start by looking at the screen."}]
        try:
            while steps < max_steps:
                r = claude(run, msgs, system, TOOLS, max_tokens=1200)
                msgs.append({"role": "assistant", "content": r["content"]})
                calls = [b for b in r["content"] if b.get("type") == "tool_use"]
                if not calls:
                    break
                results, finished = [], False
                for c in calls:
                    steps += 1
                    n, a = c["name"], c.get("input", {})
                    before = len(br.errors)
                    try:
                        if n == "look":
                            st = br.pg.evaluate(LOOK_JS)
                            out = st["text"][:5000] + "\n\nThings you can use:\n" + "\n".join(st["items"])
                        elif n in ("tap", "type", "choose"):
                            el = br.pg.query_selector(f'[data-agent-i="{int(a["n"])}"]')
                            if not el:
                                out = "There's no item with that number. Look again."
                            else:
                                if n == "tap":
                                    el.click(timeout=5000)
                                elif n == "type":
                                    el.fill(str(a.get("text", ""))[:300], timeout=5000)
                                else:
                                    el.select_option(label=str(a.get("label", "")), timeout=5000)
                                br.pg.wait_for_timeout(700)
                                out = "Done. Look to see what changed."
                        elif n == "report":
                            issues.append({"title": a.get("title", "Problem")[:120], "steps": a.get("steps", "")[:800], "what": (a.get("what_happened", "") + ("\nExpected: " + a["expected"] if a.get("expected") else ""))[:800],
                                           "kind": a.get("kind", "broken"), "sig": sig("ai", role, a.get("title", "")[:50].lower()), "page": br.pg.url.replace(br.base + "/", "")})
                            out = "Reported. Keep going."
                        elif n == "done":
                            summary, finished, out = a.get("summary", "")[:800], True, "Thanks."
                        else:
                            out = "Unknown tool."
                    except Exception as e:
                        out = "That didn't work: " + str(e).split("\n")[0][:200]
                    if len(br.errors) > before:
                        out += "\n(The page showed an error: " + br.errors[-1][:200] + ")"
                    results.append({"type": "tool_result", "tool_use_id": c["id"], "content": out})
                msgs.append({"role": "user", "content": results})
                if finished:
                    break
                if len(msgs) > 24:  # keep the conversation small: drop old screens
                    msgs = msgs[:1] + msgs[-16:]
                    while msgs[1]["role"] != "assistant":
                        msgs.pop(1)
        except Stop as e:
            run.say(f"AI test customer stopped: {e}")
        br.pg.screenshot(path=os.path.join(ROOT, "agent-screens", f"ai-{role}.png"), full_page=True)
        br.close()
    run.say(f"AI test customer ({role}, {size[0]}, {lang}) took {steps} steps and reported {len(issues)} problem(s).")
    return {"role": role, "size": size[0], "lang": lang, "steps": steps, "summary": summary}, issues


def file_tickets(db, issues, run):
    if not issues:
        return 0
    open_sigs = {t.get("sig") for t in (db.get("partygames/tickets") or {}).values() if t and t.get("status") != "solved" and t.get("sig")}
    n = 0
    for i in issues:
        if i["sig"] in open_sigs:
            continue
        now = int(time.time() * 1000)
        msg = f"{i['title']}\n\nSteps: {i['steps']}\n\nWhat happened: {i['what']}"[:2000]
        db.push("partygames/tickets", {"msg": msg, "who": "tester", "name": "Nightly tester", "sig": i["sig"], "page": i.get("page", "")[:300],
                                       "device": "GitHub test browser", "kind": i.get("kind", "broken"), "status": "new", "t": now, "last": now, "lastFrom": "reporter"})
        open_sigs.add(i["sig"]); n += 1
    run.say(f"Filed {n} new ticket(s); {len(issues) - n} were already open.")
    return n


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default="http://localhost:8765")
    ap.add_argument("--scripted-only", action="store_true")
    ap.add_argument("--no-tickets", action="store_true")
    a = ap.parse_args()
    os.makedirs(os.path.join(ROOT, "agent-screens"), exist_ok=True)
    run = Run()
    passed, issues = scripted(a.base, run)
    run.say(f"Scripted checks: {passed} passed, {len(issues)} failed.")
    if a.scripted_only:
        print(json.dumps({"passed": passed, "failed": [i["title"] + ": " + i["what"] for i in issues]}))
        return 1 if issues else 0
    db = DB(run); db.sign_in()
    if db.paused():
        run.say("The agents are paused in the admin console. Stopping.")
        return 0
    ai, more = ({}, [])
    if os.environ.get("ANTHROPIC_API_KEY"):
        try:
            ai, more = ai_customer(a.base, run)
        except Stop as e:
            run.say(f"Skipped the AI test customer: {e}")
    filed = 0 if a.no_tickets else file_tickets(db, issues + more, run)
    run.tester = {"passed": passed, "failed": len(issues), "aiProblems": len(more), "filed": filed, "ai": ai,
                  "problems": [i["title"] for i in (issues + more)][:12]}
    run.save(db)
    return 0


if __name__ == "__main__":
    sys.exit(main())
