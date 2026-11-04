"""Outdoor sites in the 3D designer, checked end to end in a real browser at phone size (part of agents/check_all.sh).

Opens the corporate luncheon sample site and checks the Site tab: the shade report, moving the sun with the time slider,
marking sunny seats, tracing a property line and painting a gravel area by tapping the ground, choosing an aerial picture
and putting it to scale with two marks and one typed length, tapping a table under a tent, saving and reopening, and
Start over. Planted problems (a generator beside a tent, a canopy past the property line) must be flagged.
Run from the repo root with the site served on port 8765. Pass a folder to keep the screenshots.
"""
import base64, io, os, sys, tempfile
from playwright.sync_api import sync_playwright

BASE = os.environ.get("TEST_BASE", "http://localhost:8765") + "/venue3d.html?demo=1"
FT = 0.3048
fails = []
def ok(c, what):
    print(("ok   " if c else "FAIL ") + what)
    if not c: fails.append(what)

# Screen spot of a ground point in the current view.
SPOT = """([x, z]) => { const e = hm3d.editor, V = e.persp.position.constructor, v = new V(x, 0, z).project(e.cam), r = e.r.domElement.getBoundingClientRect(); return [r.left + (v.x + 1) / 2 * r.width, r.top + (1 - v.y) / 2 * r.height]; }"""

def tap_ground(pg, pts):
    for q in pts:
        x, y = pg.evaluate(SPOT, q); pg.mouse.click(x, y); pg.wait_for_timeout(150)

def picture(path):
    # a 1000 x 800 "site plan" (plain shapes), so the test needs no outside picture
    try:
        from PIL import Image, ImageDraw
        im = Image.new("RGB", (1000, 800), (120, 160, 90)); d = ImageDraw.Draw(im); d.rectangle([100, 100, 600, 260], fill=(200, 200, 200)); d.rectangle([700, 80, 950, 700], fill=(70, 70, 75)); im.save(path, "JPEG")
    except ImportError:
        open(path, "wb").write(base64.b64decode("/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q=="))

def main():
    out = sys.argv[1] if len(sys.argv) > 1 else tempfile.mkdtemp(); os.makedirs(out, exist_ok=True)
    chrome = os.environ.get("TEST_CHROME", "")
    pic = os.path.join(out, "site-plan.jpg"); picture(pic)
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=chrome if chrome and os.path.exists(chrome) else None, args=["--use-gl=swiftshader", "--enable-unsafe-swiftshader"])
        errs = []
        pg = b.new_page(viewport={"width": 390, "height": 844}); pg.on("pageerror", lambda e: errs.append(str(e)[:300]))
        pg.goto(BASE); pg.evaluate("localStorage.clear(); indexedDB.deleteDatabase('hm3d')"); pg.reload(); pg.wait_for_function("window.hm3d && hm3d.editor.s", timeout=120000); pg.wait_for_timeout(2000)
        ok(pg.is_visible(".tabs [data-tab=room]") and not pg.is_visible(".tabs [data-tab=site]"), "indoors: the Room tab shows and the Site tab doesn't")
        pg.click(".tabs [data-tab=file]"); pg.click("[data-x=newLunch]"); pg.wait_for_function("!!hm3d.scene().site && !!document.querySelector('#shadeTxt')", timeout=120000); pg.wait_for_timeout(1500)
        txt = pg.inner_text("#shadeTxt")
        ok(not pg.is_visible(".tabs [data-tab=room]") and pg.is_visible(".tabs [data-tab=site]") and "120 of 120 seats are in shade" in txt, "the luncheon sample opens on the Site tab: " + txt.split("\n")[0])
        pg.screenshot(path=os.path.join(out, "site-tab.png"))
        # the sun: slide to 7:15 pm, then mark the sunny seats
        pg.evaluate("(() => { const r = document.querySelector('#sunTime'); r.value = 1155; r.dispatchEvent(new Event('input', { bubbles: true })); r.dispatchEvent(new Event('change', { bubbles: true })); })()"); pg.wait_for_timeout(600)
        rep = pg.evaluate("(() => { const s = hm3d.scene(); return [s.site.sun.time, document.querySelector('#shadeTxt').innerText]; })()")
        ok(rep[0] == "19:15" and "7:15 pm" in rep[1] and "in the sun" in rep[1], "the time slider moves the sun to 7:15 pm and the seats in the sun are counted: " + rep[1].split("\n")[0])
        pg.click("[data-x=sunMarks]"); pg.wait_for_timeout(500)
        n = pg.evaluate("hm3d.editor.sunG ? hm3d.editor.sunG.count : 0"); ok(n > 0, "Mark seats in the sun puts a marker over each sunny seat (%d)" % n)
        sun = pg.evaluate("(() => { const L = hm3d.scene().lights.find(l => l.kind === 'sun'); return L.y < 15 && L.x < 20; })()"); ok(sun, "the sun light is low in the west at 7:15 pm")
        pg.click("[data-x=sunMarks]")
        # planted problems must be flagged
        w = pg.evaluate("hm3d.run([{ op: 'move_object', id: 'gen1', x: 47.5, z: 36 }]).warnings.map(x => x.msg).join(' | ')"); pg.evaluate("hm3d.undo()")
        ok("closer than 20 ft" in w, "a generator moved beside the buffet tent is flagged")
        w = pg.evaluate("hm3d.run([{ op: 'add_item', kind: 'canopy', id: 'cx', x: 3, z: 47 }]).warnings.map(x => x.msg).join(' | ')"); pg.evaluate("hm3d.undo()")
        ok("past the property line" in w, "a canopy past the property line is flagged")
        # trace a new property line by tapping the ground in the Top view
        pg.click("[data-x=trEdge]"); pg.wait_for_function("hm3d.editor.view === 'top' && !!hm3d.editor.groundTap", timeout=20000); pg.wait_for_timeout(600)
        want = [[3, 3], [66, 3], [66, 47], [3, 47]]; tap_ground(pg, want)
        ok("4 points so far" in pg.inner_text("#body"), "tapping the ground adds the corners, one by one")
        pg.screenshot(path=os.path.join(out, "site-trace.png"))
        pg.click("[data-x=trDone]"); pg.wait_for_timeout(500)
        got = pg.evaluate("hm3d.scene().site.edge.pts")
        off = max(abs(a - b) for P, Q in zip(got, want) for a, b in zip(P, Q))
        ok(len(got) == 4 and off < 0.3, "Done keeps the traced property line where it was tapped (%.2f m off at most)" % off)
        # paint a gravel area
        pg.select_option("#paintMat", "gravel"); pg.click("[data-x=trArea]"); pg.wait_for_timeout(400)
        tap_ground(pg, [[40, 40], [50, 40], [50, 45], [40, 45]]); pg.click("[data-x=trDone]"); pg.wait_for_timeout(500)
        a = pg.evaluate("(() => { const a = hm3d.scene().site.areas.slice(-1)[0]; let s = 0; a.pts.forEach((p, i) => { const q = a.pts[(i + 1) % a.pts.length]; s += p[0] * q[1] - q[0] * p[1]; }); return [a.mat, Math.abs(s) / 2]; })()")
        ok(a[0] == "gravel" and abs(a[1] - 50) < 2, "a gravel area drawn by tapping four corners is about 50 m² (%.1f)" % a[1])
        # an aerial picture: choose it, mark two spots 40 m apart, type the real length (131.2 ft = 40 m... typed as 200 ft here)
        pg.set_input_files("#aeFile", pic); pg.wait_for_function("hm3d.scene().site.aerial && hm3d.editor.aerialTex", timeout=60000); pg.wait_for_timeout(800)
        ok(pg.evaluate("hm3d.editor.world.children.some(o => o.material && o.material.map === hm3d.editor.aerialTex)"), "the chosen picture lies on the ground")
        pg.click("[data-x=trMarks]"); pg.wait_for_timeout(400); tap_ground(pg, [[15, 25], [55, 25]]); pg.click("[data-x=trDone]"); pg.wait_for_timeout(500)
        pg.fill("#aeLen", "200"); pg.press("#aeLen", "Tab"); pg.wait_for_timeout(800)
        A = pg.evaluate("hm3d.scene().site.aerial"); px = ((A["pb"][0] - A["pa"][0]) * A["iw"]) ** 2 + ((A["pb"][1] - A["pa"][1]) * A["ih"]) ** 2
        w_m = A["iw"] * 200 * FT / px ** 0.5
        ok(abs(A["len"] - 200 * FT) < 0.01 and abs(w_m - 1000 * 200 * FT / (40 / 70 * 1000)) / w_m < 0.02 and "to scale" in pg.inner_text("#body"), "two marks and a typed 200 ft put the picture to scale (%.1f m wide)" % w_m)
        pg.screenshot(path=os.path.join(out, "site-aerial.png"))
        # tapping a table under the dining tent picks the table (the roof lets taps through)
        pg.click("[data-view=top]"); pg.wait_for_timeout(500)
        pg.evaluate("hm3d.run([{ op: 'set_aerial', opacity: 0.3 }])"); x, y = pg.evaluate(SPOT, [26.3, 26.4]); pg.mouse.click(x, y); pg.wait_for_timeout(400)
        got = pg.evaluate("(() => { const s = hm3d.scene(), i = s.items.find(x => x.id === hm3d.editor.sel); return i ? i.kind : 'nothing'; })()")
        ok(got.startswith("table") or got.startswith("chair"), "tapping a table under the tent's roof selects it, not the tent (%s)" % got)
        ok(not pg.evaluate("document.documentElement.scrollWidth > innerWidth"), "no sideways scrolling at phone width")
        # save, reopen: the site and its picture come back
        pg.evaluate("hm3d.save()"); pg.wait_for_timeout(400); pg.reload(); pg.wait_for_function("window.hm3d && hm3d.editor.s && hm3d.editor.s.site", timeout=120000)
        pg.wait_for_function("!!hm3d.editor.aerialTex", timeout=60000)
        ok(pg.evaluate("hm3d.scene().site.edge.pts.length === 4 && hm3d.scene().site.areas.some(a => a.mat === 'gravel')"), "after closing and reopening, the site, its line, its areas and its picture come back")
        # Start over on an outdoor design: a fresh sample site, and the picture is deleted from the device
        pg.click(".tabs [data-tab=file]"); pg.click("[data-x=reset]"); pg.wait_for_timeout(200); pg.click("[data-x=reset]")
        pg.wait_for_function("hm3d.scene().site && !hm3d.scene().site.aerial", timeout=60000); pg.wait_for_timeout(600)
        left = pg.evaluate("""async () => new Promise(res => { const r = indexedDB.open('hm3d', 1); r.onsuccess = () => { const q = r.result.transaction('photos').objectStore('photos').count(); q.onsuccess = () => res(q.result); }; r.onerror = () => res(-1); })""")
        ok(left == 0 and pg.evaluate("hm3d.scene().items.some(i => i.kind === 'tent_40x60')"), "Start over opens a fresh sample site and deletes the picture (%d left)" % left)
        ok(not errs, "no page errors" + (": " + "; ".join(errs) if errs else ""))
        b.close()
    print("Site check: %d problem(s)" % len(fails) if fails else "Site check: all passed")
    return 1 if fails else 0

if __name__ == "__main__":
    sys.exit(main())
