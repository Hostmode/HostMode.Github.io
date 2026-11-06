"""Eddie, the planner portal's assistant, checked end to end in a real browser at phone size (part of agents/check_all.sh).

Uses the planner demo with a pretend brain (the real one is on Cloudflare; this check needs no network):
the first-visit hello, asking for each job (pull list, calendar date, client, lead, how-to), the Yes card, No, Undo,
"Show me" pointing at a tab, the backup understanding when the brain can't be reached, and that he stays out of the
host dashboard, and docks out of the way on the 3D designer tab. Planted problems: the brain answering a job that doesn't exist, an item that isn't
in the inventory, and a sentence nobody could act on must never change anything.
Run from the repo root with the site served on port 8765. Pass a folder to keep the screenshots.
"""
import json, os, sys, tempfile
from playwright.sync_api import sync_playwright

BASE = os.environ.get("TEST_BASE", "http://localhost:8765")
BRAIN = "https://eddie-brain.hostmode.workers.dev/ask"
fails = []
def ok(c, what):
    print(("ok   " if c else "FAIL ") + what)
    if not c: fails.append(what)

BLANK = {"job": "none", "for": "", "items": [], "title": "", "date": "", "time": "", "name": "", "email": "", "phone": "", "kind": "", "guests": 0, "help": 0, "say": ""}
def brain_answer(text, help_titles):
    t = text.lower()
    a = dict(BLANK, ok=True, model="pretend")
    if "gold chairs" in t: a.update(job="pull", items=[{"what": "gold chairs", "qty": 20}], say="Adding 20 gold chairs to the Whelan pull list!"); a["for"] = "Whelan wedding"
    elif "walkthrough" in t: a.update(job="date", title="Venue walkthrough", date="2030-05-02", time="15:00", say="Putting the walkthrough on the calendar!"); a["for"] = "Margaret"
    elif "lead" in t: a.update(job="lead", name="Maria Lopez", email="maria@example.com", kind="Wedding", guests=120, say="Adding Maria as a lead!")
    elif "new client" in t: a.update(job="client", name="Priya Shah", date="2030-06-14", say="Adding Priya as a client!")
    elif "invoice" in t: a.update(job="help", help=next((i + 1 for i, h in enumerate(help_titles) if "invoice" in h.lower()), 0), say="Here's how.")
    elif "unicorn" in t: a.update(job="pull", items=[{"what": "glitter unicorn", "qty": 3}], say="Adding unicorns!"); a["for"] = "Whelan wedding"
    elif "wipe" in t: a.update(job="delete_everything", say="Deleting everything!")
    else: a.update(job="none", say="Could you say that another way?")
    return a

def main():
    out = sys.argv[1] if len(sys.argv) > 1 else tempfile.mkdtemp(); os.makedirs(out, exist_ok=True)
    chrome = os.environ.get("TEST_CHROME", "")
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=chrome) if chrome else p.chromium.launch()
        pg = b.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=2)
        errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
        mode = {"brain": "on"}; seen = []
        def handle(route):
            if mode["brain"] == "down": return route.abort()
            body = json.loads(route.request.post_data or "{}"); seen.append(body)
            route.fulfill(status=200, content_type="application/json", body=json.dumps(brain_answer(body.get("text", ""), body.get("help", []))))
        pg.route(BRAIN, handle)
        pg.add_init_script("try{localStorage.clear();localStorage.setItem('hm_lead_done','closed')}catch(e){}")
        pg.goto(BASE + "/games.html?pdemo=1#planner")
        pg.wait_for_function("typeof D==='object' && D.gear && Object.keys(D.gear).length>0 && document.querySelector('#eddie .edfab')", timeout=30000)
        pg.add_init_script("")  # later reloads keep the greeting flag
        ok(pg.is_visible("#eddie .edtip"), "first visit: Eddie says hello once")
        pg.screenshot(path=os.path.join(out, "eddie-1-hello.png"))
        S = lambda e: pg.evaluate(e)
        n0 = S("({gres:Object.keys(D.gres||{}).length,inq:Object.keys(D.inq||{}).length,cl:Object.keys(D.clients||{}).length,cd:JSON.stringify(D.cdates||{}).length})")

        def ask(text, wait=".edcard, .edbub:not(:has(.eddots))"):
            if not pg.is_visible("#eddie .edpanel"): pg.click("#eddie .edfab", force=True)
            pg.fill("#ed_in", text); pg.click("#eddie [data-ed=send]")
            pg.wait_for_function("!document.querySelector('#eddie .eddots')", timeout=15000); pg.wait_for_timeout(150)

        # 1. pull list: matched to the Whelan wedding and the Gold Chiavari chair; nothing saved until Yes
        ask("Add 20 gold chairs to the pull list for the Whelan wedding")
        card = S("({gk:(document.getElementById('ed_gk0')||{}).value,ref:(document.getElementById('ed_ref')||{}).value,q:(document.getElementById('ed_q0')||{}).value})")
        ok(card["gk"] == "g5" and card["ref"].startswith("c:") and card["q"] == "20", "pull list: chairs and the wedding are matched on the phone")
        ok(seen and set(seen[-1].keys()) == {"text", "today", "help"} and "Whelan" in seen[-1]["text"] and not any("Dublin" in h for h in seen[-1]["help"]), "only the sentence, today and Help desk titles go to the brain")
        ok(S("Object.keys(D.gres||{}).length") == n0["gres"], "nothing is saved before Yes")
        pg.screenshot(path=os.path.join(out, "eddie-2-pull-card.png"))
        pg.click("#eddie [data-ed=yes]"); pg.wait_for_timeout(400)
        r = S("Object.values(D.gres).find(r=>r.ref&&D.clients[r.ref.slice(2)]&&/Whelan/.test(D.clients[r.ref.slice(2)].name))")
        ok(r and r.get("items", {}).get("g5") == 20 and r.get("status") == "held" and r.get("from"), "Yes makes the pull list in the Inventory tab's own shape")
        pg.screenshot(path=os.path.join(out, "eddie-3-done.png"))
        pg.click("#eddie [data-ed=undo]"); pg.wait_for_timeout(400)
        ok(S("Object.keys(D.gres||{}).length") == n0["gres"], "Undo takes the new pull list away")

        # 2. a calendar date for Margaret
        ask("Put a walkthrough with Margaret on Thursday at 3")
        ok(S("(D.clients[document.getElementById('ed_cid').value]||{}).name||''").startswith("Margaret") and S("document.getElementById('ed_time').value") == "15:00", "calendar: Margaret and 3pm are filled in")
        pg.click("#eddie [data-ed=yes]"); pg.wait_for_timeout(400)
        ok("Venue walkthrough" in S("JSON.stringify(D.cdates)") and "2030-05-02" in S("JSON.stringify(D.cdates)"), "Yes puts the date on the client's calendar")

        # 3. a lead, then No on a client
        ask("Add a new lead, Maria Lopez, wedding for 120")
        pg.click("#eddie [data-ed=yes]"); pg.wait_for_timeout(400)
        ld = S("Object.values(D.inq).find(x=>x.name==='Maria Lopez')")
        ok(ld and ld["email"] == "maria@example.com" and ld["status"] == "new" and ld["guests"] == 120, "Yes adds the lead the way the inquiry form does")
        ask("Add a new client Priya Shah")
        pg.click("#eddie [data-ed=no]"); pg.wait_for_timeout(300)
        ok(S("Object.keys(D.clients).length") == n0["cl"] and "nothing changed" in pg.inner_text("#eddie .edbub"), "No changes nothing")
        ask("Add a new client Priya Shah"); pg.click("#eddie [data-ed=yes]"); pg.wait_for_timeout(400)
        ok(S("Object.values(D.clients).some(c=>c.name==='Priya Shah'&&c.date==='2030-06-14')"), "Yes adds the client")

        # 4. how-to: the Help desk's own answer, then Eddie points at the tab
        ask("How do I send an invoice?")
        ok("invoice" in pg.inner_text("#eddie .edbub").lower(), "how-to: Eddie answers from the Help desk")
        pg.click("#eddie [data-ed=show]"); pg.wait_for_selector("#edpoint.in", timeout=5000); pg.wait_for_timeout(900)
        ring = S("(()=>{const r=document.querySelector('.edring'),p=document.getElementById('edpoint');if(!r||!p)return null;const a=r.getBoundingClientRect(),b=p.getBoundingClientRect();return {tab:r.dataset.k,near:Math.abs((b.top+b.height*0.71)-(a.top+a.height/2))<30}})()")
        ok(ring and ring["tab"] == "clients" and ring["near"], "Show me: Eddie walks over and points at the Clients tab")
        pg.screenshot(path=os.path.join(out, "eddie-4-pointing.png"))
        pg.click("#edpoint"); pg.wait_for_timeout(200)

        # 5. planted problems never change anything
        before = S("JSON.stringify([D.gres,D.cdates,D.inq,D.clients]).length")
        ask("wipe it all"); ok(not pg.is_visible("#eddie .edcard [data-ed=yes]"), "planted: a job that doesn't exist gets no Yes button")
        ask("add 3 unicorns to the Whelan pull list")
        ok(S("document.getElementById('ed_gk0').value") == "", "planted: an item not in the inventory isn't guessed")
        pg.click("#eddie [data-ed=yes]"); pg.wait_for_timeout(300)
        ok("Pick an item" in pg.inner_text("#eddie .edbub"), "planted: Yes without an inventory item asks to pick one")
        ask("blorp"); ok(not pg.is_visible("#eddie .edcard"), "planted: nonsense gets a question back, not a card")
        ok(S("JSON.stringify([D.gres,D.cdates,D.inq,D.clients]).length") == before, "planted problems saved nothing")

        # 6. the brain can't be reached: the backup still understands the common ways to say it
        mode["brain"] = "down"
        ask("add 10 uplights to the pull list for the Dublin conference")
        bk = S("({gk:(document.getElementById('ed_gk0')||{}).value,q:(document.getElementById('ed_q0')||{}).value,ref:(document.getElementById('ed_ref')||{}).value,into:(document.getElementById('ed_into')||{}).value})")
        ok(bk["gk"] == "g8" and bk["q"] == "10" and bk["ref"] == "c:dublin" and bk["into"] == "r1", "backup: pull list understood and added to Dublin's open pull list")
        ask("add a lead named Tom Reyes"); ok(S("document.getElementById('ed_name').value") == "Tom Reyes", "backup: lead understood")
        ask("how do I add a teammate"); ok(pg.is_visible("#eddie [data-ed=show]"), "backup: how-to answered from the Help desk")
        pg.screenshot(path=os.path.join(out, "eddie-5-backup.png"))
        pg.click("#eddie [data-ed=close]")

        # 7. the 3D designer tab (docked out of the way; agents/venue3d_eddie_check.py checks it in full) and the host dashboard
        S("L.plTab='d3';render(true)"); pg.wait_for_timeout(300)
        ok(pg.is_visible("#eddie.edd3 .edfab"), "on the 3D designer tab Eddie docks out of the designer's way")
        S("L.plTab='home';render(true)"); pg.wait_for_timeout(300)
        ok(pg.is_visible("#eddie .edfab") and not pg.is_visible("#eddie.edd3"), "and floats at the bottom right again on Home")
        pg.goto(BASE + "/games.html?pdemo=1&host=1#planner"); pg.wait_for_function("typeof D==='object' && D.plMe", timeout=30000); pg.wait_for_timeout(800)
        ok(not pg.is_visible("#eddie .edfab"), "not in the host dashboard")
        ok(not errs, "no page errors" + ("" if not errs else ": " + "; ".join(errs[:3])))
        b.close()
    print("Eddie check: " + ("all passed" if not fails else f"{len(fails)} failed"))
    sys.exit(1 if fails else 0)

if __name__ == "__main__":
    main()
