"""Eddie in the 3D designer, checked in a real browser at phone size (part of agents/check_all.sh).

- The Add tab's "Ask Eddie" box: a request becomes a preview to keep or undo; words that can't be set up search the library.
- New pieces land where you're looking (the middle of the view), not always the middle of the room.
- "Where I tap": tap a piece, then tap the floor, and it lands there; switching tabs cancels it.
- In the planner portal, Eddie docks beside "Open full screen" (never over the designer) and passes room requests to it.
Planted problems: a request with nothing to set up must not change the design, and a cancelled tap must not add anything.
Run from the repo root with the site served on port 8765. Pass a folder to keep the screenshots.
"""
import os, sys, tempfile
from playwright.sync_api import sync_playwright

BASE = os.environ.get("TEST_BASE", "http://localhost:8765")
fails = []
def ok(c, what):
    print(("ok   " if c else "FAIL ") + what)
    if not c: fails.append(what)

SPOT = """([x, z]) => { const e = hm3d.editor, V = e.persp.position.constructor, v = new V(x, 0, z).project(e.cam), r = e.r.domElement.getBoundingClientRect(); return [r.left + (v.x + 1) / 2 * r.width, r.top + (1 - v.y) / 2 * r.height]; }"""
COUNT = "hm3d.scene().items.length"

def main():
    out = sys.argv[1] if len(sys.argv) > 1 else tempfile.mkdtemp(); os.makedirs(out, exist_ok=True)
    chrome = os.environ.get("TEST_CHROME", "")
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=chrome if chrome and os.path.exists(chrome) else None, args=["--use-gl=swiftshader", "--enable-unsafe-swiftshader"])
        errs = []
        pg = b.new_page(viewport={"width": 390, "height": 844}); pg.on("pageerror", lambda e: errs.append(str(e)[:300]))
        pg.goto(BASE + "/venue3d.html?demo=1"); pg.evaluate("localStorage.clear(); indexedDB.deleteDatabase('hm3d')"); pg.reload()
        pg.wait_for_function("window.hm3d && hm3d.editor.s", timeout=120000); pg.wait_for_timeout(1500)
        pg.click(".tabs [data-tab=add]"); pg.wait_for_selector("#libQ")
        ok(pg.is_visible(".eddiebar .eddieface") and "Ask Eddie" in (pg.get_attribute("#libQ", "placeholder") or ""), "the Add tab's box is Ask Eddie, with his face")

        # 1. a request becomes a preview; Keep it keeps it
        before = pg.evaluate("JSON.stringify(hm3d.scene().items)")
        pg.fill("#libQ", "Add a dance floor in the center"); pg.click("[data-x=eddieGo]")
        pg.wait_for_function("getComputedStyle(document.querySelector('#banner')).display !== 'none'", timeout=30000)
        ok("Keep it" in pg.inner_text("#banner") and "Keep it" in pg.inner_text(".eddiesays"), "Ask Eddie shows the request as a preview to keep or undo")
        pg.screenshot(path=os.path.join(out, "eddie3d-1-preview.png"))
        pg.click("#bnKeep"); pg.wait_for_timeout(500)
        ok(pg.evaluate("JSON.stringify(hm3d.scene().items)") != before, "Keep it changes the design")

        # 2. planted: words with nothing to set up search the library and change nothing
        n1 = pg.evaluate(COUNT)
        pg.fill("#libQ", "rustic"); pg.press("#libQ", "Enter"); pg.wait_for_timeout(500)
        ok(pg.evaluate(COUNT) == n1 and pg.locator("#libList .lib[data-add]").count() > 0 and "match" in pg.inner_text(".eddiesays"), "planted: words with nothing to set up search the library and change nothing")

        # 3. where I'm looking: point the camera at a corner, add a piece, it lands near there
        pg.click("[data-x=libClear]"); pg.wait_for_timeout(200)
        R = pg.evaluate("(() => { const R = hm3d.editor.s.room; return [R.w, R.d]; })()")
        tx, tz = round(R[0] * 0.25, 2), round(R[1] * 0.7, 2)
        pg.evaluate(f"(() => {{ const e = hm3d.editor; e.setView('orbit'); e.orbit.target.set({tx}, 0, {tz}); e.persp.position.set({tx}, 9, {tz} + 7); e.orbit.update(); }})()")
        land = pg.evaluate("hm3d.editor.landingSpot()")
        ok(abs(land[0] - tx) < 0.6 and abs(land[1] - tz) < 0.6, f"where I'm looking: the landing spot follows the view ({land} for {tx},{tz})")
        pg.fill("#libQ", "cocktail"); pg.dispatch_event("#libQ", "input"); pg.wait_for_timeout(300)
        card = pg.locator("#libList .lib[data-add]").first; kind = card.get_attribute("data-add"); card.click(); pg.wait_for_timeout(500)
        it = pg.evaluate(f"(() => {{ const s = hm3d.scene(); const i = s.items.filter(i => i.kind === '{kind}').pop(); return i ? [i.x, i.z] : null; }})()")
        ok(it and abs(it[0] - tx) < 1.5 and abs(it[1] - tz) < 1.5, f"a new {kind} lands where the camera looks, not the middle ({it})")
        pg.screenshot(path=os.path.join(out, "eddie3d-2-landed.png"))

        # 4. where I tap: the Top view, a piece, a tap on the floor
        pg.click(".tabs [data-tab=add]"); pg.click("[data-x=landTap]"); pg.wait_for_timeout(200)
        pg.evaluate("hm3d.setView('top')"); pg.wait_for_timeout(600)
        want = [round(R[0] * 0.75, 2), round(R[1] * 0.3, 2)]
        n2 = pg.evaluate(COUNT)
        pg.locator("#libList .lib[data-add]").first.click(); pg.wait_for_timeout(300)
        ok("Tap the floor" in pg.inner_text("#banner") and pg.evaluate(COUNT) == n2, "Where I tap: picking a piece asks for a spot and adds nothing yet")
        xy = pg.evaluate(SPOT, want); pg.mouse.click(xy[0], xy[1]); pg.wait_for_timeout(600)
        it = pg.evaluate(f"(() => {{ const s = hm3d.scene(); const i = s.items[s.items.length - 1]; return [i.x, i.z]; }})()")
        ok(pg.evaluate(COUNT) == n2 + 1 and abs(it[0] - want[0]) < 0.8 and abs(it[1] - want[1]) < 0.8, f"the tapped spot is where it lands ({it} for {want})")
        # planted: picking a piece, then leaving the tab, adds nothing and stops waiting for a tap
        n3 = pg.evaluate(COUNT)
        pg.click(".tabs [data-tab=add]"); pg.locator("#libList .lib[data-add]").first.click(); pg.wait_for_timeout(200)
        pg.click(".tabs [data-tab=light]"); pg.wait_for_timeout(200); pg.mouse.click(xy[0], xy[1] + 40); pg.wait_for_timeout(400)
        ok(pg.evaluate(COUNT) == n3 and not pg.evaluate("!!hm3d.editor.groundTap"), "planted: leaving the tab cancels the tap and adds nothing")
        pg.click(".tabs [data-tab=add]"); pg.click("[data-x=landLook]")

        # 5. the planner portal: Eddie docks beside Open full screen and passes room requests to the designer
        pp = b.new_page(viewport={"width": 390, "height": 844}); pp.on("pageerror", lambda e: errs.append(str(e)[:300]))
        pp.add_init_script("try{localStorage.setItem('hm_lead_done','closed')}catch(e){}")
        pp.goto(BASE + "/games.html?pdemo=1#planner"); pp.wait_for_function("typeof D==='object' && D.gear", timeout=30000)
        pp.evaluate("L.plTab='d3';render(true)")
        pp.wait_for_function("(() => { const f = document.querySelector('iframe.pl3dfloat'); return f && f.contentWindow.hm3d && f.contentWindow.hm3d.editor.s; })()", timeout=120000); pp.wait_for_timeout(800)
        pp.wait_for_timeout(1200)
        box = pp.evaluate("(() => { const e = document.querySelector('#eddie.edd3 .edfab'), f = document.querySelector('iframe.pl3dfloat'), c = document.querySelector('#app .hmfloat').closest('.card'); if (!e) return null; const a = e.getBoundingClientRect(), b = f.getBoundingClientRect(), k = c.getBoundingClientRect(); return { over: !(a.bottom <= b.top || a.top >= b.bottom || a.right <= b.left || a.left >= b.right), inCard: a.left >= k.left && a.right <= k.right && a.top >= k.top }; })()")
        ok(box and not box["over"] and box["inCard"], "portal: on the 3D designer tab Eddie docks in the card, never over the designer")
        pp.evaluate("scrollTo(0, 300)"); pp.wait_for_timeout(200)
        moved = pp.evaluate("(() => { const e = document.querySelector('#eddie .edfab').getBoundingClientRect(), f = document.querySelector('iframe.pl3dfloat').getBoundingClientRect(); return e.bottom <= f.top + 1; })()")
        ok(moved, "he scrolls with the page instead of floating over the designer")
        pp.evaluate("scrollTo(0, 0)"); pp.screenshot(path=os.path.join(out, "eddie3d-3-docked.png"))
        pp.click("#eddie .edfab", force=True); pp.fill("#ed_in", "Arrange ten round tables with eight chairs at each table"); pp.click("#eddie [data-ed=send]")
        pp.wait_for_function("(() => { const f = document.querySelector('iframe.pl3dfloat'); return getComputedStyle(f.contentDocument.querySelector('#banner')).display !== 'none'; })()", timeout=30000)
        ok(not pp.is_visible("#eddie .edpanel") and "Keep it" in pp.evaluate("document.querySelector('iframe.pl3dfloat').contentDocument.querySelector('#banner').innerText"), "portal: a room request goes to the designer as a preview, and Eddie steps back so it can be seen")
        pp.screenshot(path=os.path.join(out, "eddie3d-4-handoff.png"))
        ok(not errs, "no page errors" + ("" if not errs else ": " + "; ".join(errs[:3])))
        b.close()
    print("Eddie 3D check: " + ("all passed" if not fails else f"{len(fails)} failed"))
    sys.exit(1 if fails else 0)

if __name__ == "__main__":
    main()
