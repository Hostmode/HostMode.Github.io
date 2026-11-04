"""The 3D designer's Photo feature, checked end to end in a real browser (part of agents/check_all.sh).

It takes a "venue photo" of the sample ballroom from a known spot (tables removed), then, in a fresh designer at phone size:
chooses that photo, drags the four dots onto the dance floor's corners, types its width, and checks that the camera worked
out from the dots is where the photo was really taken. Then it checks the design shows over the photo, the bare-room
switch, tapping a piece in the photo, saving a picture, and that the photo comes back after the page is reopened.
Run from the repo root with the site served on port 8765. Pass a folder to keep the screenshots.
"""
import base64, os, sys, tempfile
from playwright.sync_api import sync_playwright

BASE = os.environ.get("TEST_BASE", "http://localhost:8765") + "/venue3d.html?demo=1"
CAM = {"pos": [17.5, 2.2, 15.8], "target": [8.5, 0.4, 5.5]}
fails = []
def ok(c, what):
    print(("ok   " if c else "FAIL ") + what)
    if not c: fails.append(what)

def main():
    out = sys.argv[1] if len(sys.argv) > 1 else tempfile.mkdtemp(); os.makedirs(out, exist_ok=True)
    chrome = os.environ.get("TEST_CHROME", "")
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=chrome if chrome and os.path.exists(chrome) else None, args=["--use-gl=swiftshader", "--enable-unsafe-swiftshader"])
        errs = []
        pg = b.new_page(viewport={"width": 1200, "height": 1300}); pg.on("pageerror", lambda e: errs.append(str(e)[:300]))
        pg.goto(BASE); pg.evaluate("localStorage.clear()"); pg.reload(); pg.wait_for_function("window.hm3d && hm3d.editor.s", timeout=120000); pg.wait_for_timeout(2500)
        info = pg.evaluate("""(cam) => { const e = hm3d.editor, gone = e.s.items.filter(i => /^(table|chair)/.test(i.kind)).map(i => ({ op: 'delete_object', id: i.id, confirm: true }));
          hm3d.run(gone); e.select(null); const cv = e.r.domElement; cv.style.width = '1200px'; cv.style.height = '900px'; e.r.setSize(1200, 900, false); e.persp.aspect = 4 / 3; e.persp.fov = 50; e.persp.updateProjectionMatrix();
          e.orbit.enabled = false; e.persp.position.set(...cam.pos); e.persp.lookAt(...cam.target); e.orbit.target.set(...cam.target); e.tick();
          const df = e.s.items.find(i => i.kind === 'dance_floor'), V = e.persp.position.constructor, x0 = df.x - df.w / 2, x1 = df.x + df.w / 2, z0 = df.z - df.d / 2, z1 = df.z + df.d / 2;
          const pts = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]].map(([x, z]) => { const v = new V(x, 0.03, z).project(e.persp); return [(v.x + 1) / 2, (1 - v.y) / 2]; });
          return { url: cv.toDataURL('image/jpeg', 0.9), pts, w: df.w, d: df.d, ox: x0, oz: z0 }; }""", CAM)
        photo = os.path.join(out, "test-venue.jpg"); open(photo, "wb").write(base64.b64decode(info["url"].split(",", 1)[1])); pg.close()

        pg = b.new_page(viewport={"width": 390, "height": 844}); pg.on("pageerror", lambda e: errs.append(str(e)[:300]))
        pg.goto(BASE); pg.evaluate("localStorage.clear(); indexedDB.deleteDatabase('hm3d')"); pg.reload(); pg.wait_for_function("window.hm3d && hm3d.editor.s", timeout=120000); pg.wait_for_timeout(2500)
        ok(not pg.is_visible("[data-view=photo]"), "no Photo view button before there's a photo")
        pg.click(".tabs button[data-tab=photo]"); pg.set_input_files("#phFile", photo)
        pg.wait_for_function("hm3d.editor.view === 'photo' && hm3d.editor.photoImg", timeout=60000); pg.wait_for_timeout(800)
        ok(pg.is_visible("#phDots") and pg.evaluate("hm3d.scene().photo.iw === 1200 && hm3d.scene().photo.ih === 900"), "choosing a photo opens the Photo view with the four dots")
        same = pg.evaluate("(() => { const a = document.querySelector('.v3-photo').getBoundingClientRect(), c = hm3d.editor.r.domElement.getBoundingClientRect(); return Math.abs(a.width - c.width) < 1 && Math.abs(a.top - c.top) < 1 && Math.abs(c.width / c.height - 4 / 3) < 0.02; })()")
        ok(same, "the photo and the 3D view line up exactly, in the photo's shape")
        rc = pg.evaluate("(() => { const r = document.querySelector('#phDots').getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; })()")
        for n, (u, v) in enumerate(info["pts"]):
            box = pg.locator(f".phd[data-n='{n}']").bounding_box(); pg.mouse.move(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2); pg.mouse.down()
            pg.mouse.move(rc[0] + u * rc[2], rc[1] + v * rc[3], steps=6); pg.mouse.up(); pg.wait_for_timeout(120)
        ft = 0.3048
        for k, v in (("w", info["w"]), ("ox", info["ox"]), ("oz", info["oz"])): pg.fill(f"[data-ph={k}]", str(round(v / ft, 2))); pg.press(f"[data-ph={k}]", "Tab"); pg.wait_for_timeout(250)
        pg.screenshot(path=os.path.join(out, "photo-marking.png"))
        c = pg.evaluate("hm3d.editor.photoFit")
        d = sum((c["pos"][i] - CAM["pos"][i]) ** 2 for i in range(3)) ** 0.5 if c and c.get("ok") else 99
        ok(d < 0.25 and abs(c["fov"] - 50) < 2 and abs(c["d"] - info["d"]) < 0.25, "from 4 dragged dots and one length, the camera is where the photo was taken (%.2f m off, lens %.1f°, depth %.2f m of %.2f)" % (d, c["fov"] if c else 0, c["d"] if c else 0, info["d"]))
        ok("estimated" in pg.inner_text("#body") and "measured" in pg.inner_text("#body"), "the panel marks the typed length measured and the rest estimated")
        pg.click("[data-x=phAlign]"); pg.wait_for_timeout(800)
        ok(not pg.is_visible("#phDots") and pg.evaluate("[...hm3d.editor.objs.values()].some(g => g.visible) && !hm3d.editor.floorMesh.visible && hm3d.editor.shadowCatch.visible"), "done marking: the design shows over the photo, on the photo's own floor")
        pg.screenshot(path=os.path.join(out, "photo-design.png"))
        pg.click("[data-x=phBare]"); pg.wait_for_timeout(500)
        ok(pg.evaluate("![...hm3d.editor.objs.values()].some(g => g.visible && !g.userData.light)"), "Show the bare room hides the design"); pg.click("[data-x=phBare]"); pg.wait_for_timeout(400)
        at = pg.evaluate("""(() => { const e = hm3d.editor, t = e.s.items.find(i => i.kind === 'table_round'), V = e.persp.position.constructor, v = new V(t.x, 0.77, t.z).project(e.persp), r = e.r.domElement.getBoundingClientRect(); return [r.left + (v.x + 1) / 2 * r.width, r.top + (1 - v.y) / 2 * r.height, t.id]; })()""")
        pg.mouse.click(at[0], at[1]); pg.wait_for_timeout(500)
        ok(pg.evaluate("(id => { const s = hm3d.scene(), i = s.items.find(x => x.id === hm3d.editor.sel); return !!i && (i.id === id || i.group === id); })", at[2]), "tapping a table in the photo selects it (or a chair at it)")
        pic = pg.evaluate("hm3d.editor.snapshot(1200)"); open(os.path.join(out, "photo-saved.jpg"), "wb").write(base64.b64decode(pic.split(",", 1)[1]))
        ok(pic.startswith("data:image/jpeg") and len(pic) > 60000, "Save picture gives the photo with the design drawn in")
        pg.evaluate("hm3d.save()"); pg.wait_for_timeout(400); pg.reload(); pg.wait_for_function("window.hm3d && hm3d.editor.s", timeout=120000); pg.wait_for_timeout(2500)
        pg.click("[data-view=photo]"); pg.wait_for_timeout(1200)
        ok(pg.evaluate("hm3d.editor.view === 'photo' && !!hm3d.editor.photoImg && !!hm3d.scene().photo.w"), "after closing and reopening, the photo and its marking come back")
        pg.click("[data-view=orbit]"); pg.wait_for_timeout(400)
        ok(pg.evaluate("hm3d.editor.view === 'orbit' && hm3d.editor.r.domElement.style.width === '' && hm3d.editor.floorMesh.visible"), "back to 3D: the room, its floor and the full-size view return")
        ok(not pg.evaluate("document.documentElement.scrollWidth > innerWidth"), "no sideways scrolling at phone width")
        # Start over (Save & share): tap twice, and the demo's designs, versions and photos are gone from the device
        pg.evaluate("hm3d.run([{ op: 'add_item', kind: 'chair_throne', id: 'keepme', x: 3, z: 3 }])"); pg.evaluate("hm3d.save()"); pg.wait_for_timeout(300)
        pg.click(".tabs button[data-tab=file]"); pg.click("[data-x=reset]"); pg.wait_for_timeout(200)
        asked = "can't be undone" in pg.inner_text("#body") and pg.evaluate("!!hm3d.scene().photo")
        pg.click("[data-x=reset]"); pg.wait_for_function("!hm3d.scene().items.some(i => i.id === 'keepme')", timeout=60000); pg.wait_for_timeout(500)
        left = pg.evaluate("""async () => { const idx = JSON.parse(localStorage.getItem('hm3d_index') || '{}'), revs = Object.keys(localStorage).filter(k => k.startsWith('hm3d_r_'));
          const n = await new Promise(res => { const r = indexedDB.open('hm3d', 1); r.onsuccess = () => { const q = r.result.transaction('photos').objectStore('photos').count(); q.onsuccess = () => res(q.result); }; r.onerror = () => res(-1); });
          const s = hm3d.scene(); return { designs: Object.keys(idx).length, revs: revs.length, photos: n, photo: !!s.photo, throne: s.items.some(i => i.id === 'keepme'), tables: s.items.filter(i => i.kind === 'table_round').length }; }""")
        ok(asked and left["designs"] == 1 and left["revs"] == 1 and left["photos"] == 0 and not left["photo"] and not left["throne"] and left["tables"] > 0,
           "Start over asks first, then deletes the demo's designs, versions and photos and opens a fresh sample (%s)" % left)
        ok(not errs, "no page errors" + (": " + "; ".join(errs) if errs else ""))
        b.close()
    print("Photo check: %d problem(s)" % len(fails) if fails else "Photo check: all passed")
    return 1 if fails else 0

if __name__ == "__main__":
    sys.exit(main())
