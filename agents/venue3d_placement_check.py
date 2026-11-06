"""Placement tools in the 3D designer, checked end to end in a real browser at phone size (part of agents/check_all.sh).

Selected tab: the Snap switch (and that it is remembered), snapping to a wall with a guide line while dragging, the chair stepper
(chairs checked from straight above to face the table, one undo step, too many refused), copy in a pattern with preview and
Keep, and Ctrl+Z / Ctrl+Shift+Z. Planted mistakes must be caught: a pattern that runs out of the room, chairs turned away from
the table, and a snap that leaves a gap.
Run from the repo root with the site served on port 8765. Pass a folder to keep the screenshots.
"""
import os, sys, tempfile
from playwright.sync_api import sync_playwright

BASE = os.environ.get("TEST_BASE", "http://localhost:8765") + "/venue3d.html?demo=1"
fails = []
def ok(c, what):
    print(("ok   " if c else "FAIL ") + what)
    if not c: fails.append(what)

# Does every chair of table `id` face it, seen from straight above? Chair front is (-sin rot, cos rot); it must point at the nearest spot on the table.
FACES = """(id) => { const s = hm3d.scene(), t = s.items.find(i => i.id === id), cs = s.items.filter(i => i.group === id && i.kind.startsWith('chair'));
  const ta = (t.rot || 0) * Math.PI / 180, cs0 = Math.cos(ta), sn = Math.sin(ta), round = /round|cocktail/.test(t.kind);
  return cs.length > 0 && cs.every(c => { const a = c.rot * Math.PI / 180, lx = (c.x - t.x) * cs0 + (c.z - t.z) * sn, lz = -(c.x - t.x) * sn + (c.z - t.z) * cs0;
    const qx = round ? 0 : Math.max(-t.w / 2, Math.min(t.w / 2, lx)), qz = round ? 0 : Math.max(-t.d / 2, Math.min(t.d / 2, lz));
    const vx = (qx - lx) * cs0 - (qz - lz) * sn, vz = (qx - lx) * sn + (qz - lz) * cs0; return -Math.sin(a) * vx + Math.cos(a) * vz > 0.97 * Math.hypot(vx, vz); }); }"""
EVEN = """(id) => { const cs = hm3d.scene().items.filter(i => i.group === id && i.kind.startsWith('chair')), g = cs.map((c, k) => Math.hypot(c.x - cs[(k + 1) % cs.length].x, c.z - cs[(k + 1) % cs.length].z)); return Math.max(...g) - Math.min(...g); }"""
# an empty ballroom with one table, so nothing else is in the way
SETUP = """async () => { const S = await import('/3d/scene.js'), s = S.sampleVenue(); s.items = []; s.sets = {}; hm3d.editor.load(s);
  hm3d.run([{ op: 'add_item', kind: 'table_round', x: 9, z: 7, id: 'tb' }, { op: 'add_item', kind: 'table_rect', x: 5, z: 3, id: 'rc' }]); hm3d.editor.hist = []; hm3d.select('tb'); }"""
# one drag, as the arrows do it: move the point, let the editor react, then let go
DRAG = """([x, z]) => { const e = hm3d.editor, o = e.tc.object; o.position.x = x; o.position.z = z; e.tc.dispatchEvent({ type: 'objectChange' }); const live = [o.position.x, o.position.z, e._guides ? e._guides.visible : false]; e.tc.dispatchEvent({ type: 'dragging-changed', value: false }); return live.concat([e._guides ? e._guides.visible : false]); }"""

def main():
    out = sys.argv[1] if len(sys.argv) > 1 else tempfile.mkdtemp(); os.makedirs(out, exist_ok=True)
    chrome = os.environ.get("TEST_CHROME", "")
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=chrome if chrome and os.path.exists(chrome) else None, args=["--use-gl=swiftshader", "--enable-unsafe-swiftshader"])
        errs = []
        pg = b.new_page(viewport={"width": 390, "height": 844}); pg.on("pageerror", lambda e: errs.append(str(e)[:300]))
        pg.goto(BASE); pg.evaluate("localStorage.clear(); indexedDB.deleteDatabase('hm3d')"); pg.reload(); pg.wait_for_function("window.hm3d && hm3d.editor.s", timeout=120000); pg.wait_for_timeout(1500)
        pg.evaluate(SETUP); pg.wait_for_selector("[data-p=snap]"); pg.wait_for_timeout(400)
        pg.click(".tabs [data-tab=sel]")
        ok(pg.is_visible("[data-p=snap]") and pg.is_visible("[data-p=fillGo]") and pg.is_visible("[data-p=patOpen]"), "the Selected tab shows Snap, the chair stepper and Copy in a pattern for a table")
        pg.screenshot(path=os.path.join(out, "placement-selected.png"))

        # ---- snap and line up ----
        flush = lambda: pg.evaluate("(() => { const s = hm3d.scene(), t = s.items.find(i => i.id === 'rc'); return t.x - t.w / 2; })()")
        pg.evaluate("hm3d.select('rc')"); pg.wait_for_timeout(300)
        x, z, g1, g2 = pg.evaluate(DRAG, [1.0, 3.3])
        x0 = flush()
        ok(g1 and not g2 and abs(x0) < 0.02, "dragging a table near the left wall lands it flush with the wall (%.3f m from it) with a guide line while dragging, gone on letting go" % x0)
        pg.evaluate("hm3d.undo()")
        pg.click("[data-p=snap]"); pg.wait_for_timeout(300)
        ok(pg.inner_text("[data-p=snap]") == "Snap: off" and pg.evaluate("localStorage.getItem('hm3d_snap')") == "off", "the Snap switch turns it off and remembers it on this device")
        pg.evaluate("hm3d.select('rc')"); pg.wait_for_timeout(200)
        pg.evaluate(DRAG, [1.0, 3.3]); x1 = flush()
        ok(abs(x1 - 0.085) < 0.02, "with Snap off the table stays where it was dropped (%.3f m from the wall)" % x1)
        # planted mistake: that same flush check must fail when the snap leaves a gap
        ok(not abs(x1) < 0.02, "snap (self-test): a table left a hand's width from the wall fails the flush check")
        pg.evaluate("hm3d.undo()")
        pg.reload(); pg.wait_for_function("window.hm3d && hm3d.editor.s", timeout=120000)
        ok(pg.evaluate("localStorage.getItem('hm3d_snap')") == "off", "the choice is still off after reloading")
        pg.evaluate("localStorage.removeItem('hm3d_snap')"); pg.reload(); pg.wait_for_function("window.hm3d && hm3d.editor.s", timeout=120000); pg.evaluate(SETUP); pg.wait_for_selector("[data-p=snap]")

        # ---- fill a table ----
        pg.click(".tabs [data-tab=sel]")
        pg.click("[data-p=fillInc]"); pg.click("[data-p=fillInc]")
        ok("10 chairs" in pg.inner_text("#body"), "the stepper starts at the table's usual 8 chairs and + adds more (10)")
        pg.click("[data-p=fillGo]"); pg.wait_for_timeout(500)
        n = pg.evaluate("hm3d.scene().items.filter(i => i.group === 'tb' && i.kind.startsWith('chair')).length")
        ok(n == 10 and pg.evaluate(FACES, "tb") and pg.evaluate(EVEN, "tb") < 0.01, "Add chairs puts 10 round the table, evenly, all facing it (checked from above)")
        pg.screenshot(path=os.path.join(out, "placement-fill.png"))
        pg.evaluate("hm3d.undo()"); pg.wait_for_timeout(300)
        ok(pg.evaluate("hm3d.scene().items.filter(i => i.group === 'tb' && i.kind.startsWith('chair')).length") == 0, "filling a table is one undo step")
        pg.evaluate("hm3d.redo()"); pg.wait_for_timeout(300)
        pg.keyboard.press("Control+z"); pg.wait_for_timeout(300)
        a = pg.evaluate("hm3d.scene().items.filter(i => i.group === 'tb').length")
        pg.keyboard.press("Control+Shift+Z"); pg.wait_for_timeout(300)
        c = pg.evaluate("hm3d.scene().items.filter(i => i.group === 'tb').length")
        ok(a == 0 and c == 10, "Ctrl+Z undoes and Ctrl+Shift+Z redoes (%d chairs, then %d)" % (a, c))
        pg.evaluate("hm3d.select('rc')"); pg.click("[data-p=fillGo]"); pg.wait_for_timeout(400)
        ok(pg.evaluate(FACES, "rc") and pg.evaluate("hm3d.scene().items.filter(i => i.group === 'rc').length") == 6, "a rectangular table's chairs sit round its edge, facing it")
        pg.evaluate("hm3d.select('tb')"); pg.wait_for_timeout(200)
        for _ in range(22): pg.click("[data-p=fillInc]")
        before = pg.evaluate("hm3d.scene().items.length"); pg.click("[data-p=fillGo]"); pg.wait_for_timeout(400)
        ok(pg.evaluate("hm3d.scene().items.length") == before and "fit" in pg.inner_text("#toast"), "too many chairs are refused, saying how many fit (%s)" % pg.inner_text("#toast"))
        # planted mistake: chairs turned away from the table must fail the facing check
        pg.evaluate("(() => { const e = hm3d.editor, s = e.s; s.items.filter(i => i.group === 'tb').forEach(c => c.rot = (c.rot + 180) % 360); })()")
        ok(not pg.evaluate(FACES, "tb"), "chairs (self-test): chairs planted facing away fail the facing check")
        pg.evaluate("hm3d.undo(); hm3d.redo()")

        # ---- copy in a pattern ----
        pg.evaluate(SETUP); pg.wait_for_selector("[data-p=patOpen]"); pg.click(".tabs [data-tab=sel]"); pg.click("[data-p=patOpen]")
        pg.fill("#pRows", "1"); pg.fill("#pCols", "3"); pg.click("[data-p=patGo]"); pg.wait_for_selector("#bnKeep", timeout=30000)
        pg.screenshot(path=os.path.join(out, "placement-pattern-preview.png"))
        pg.click("#bnKeep"); pg.wait_for_timeout(500)
        tabs = pg.evaluate("hm3d.scene().items.filter(i => i.kind === 'table_round').length")
        ok(tabs == 3 and pg.evaluate("hm3d.scene().items.every((a, k, all) => all.every((b, j) => j <= k || a.id === b.group || b.id === a.group || a.group === b.group || Math.hypot(a.x - b.x, a.z - b.z) > 0.3))"), "Preview then Keep it makes a row of 3 tables, clear of each other (%d)" % tabs)
        pg.evaluate("hm3d.undo()"); pg.wait_for_timeout(300)
        ok(pg.evaluate("hm3d.scene().items.filter(i => i.kind === 'table_round').length") == 1, "the whole pattern is one undo step")
        pg.evaluate("hm3d.select('tb')"); pg.wait_for_timeout(300)
        pg.click(".tabs [data-tab=sel]"); pg.click("[data-p=patCircle]"); pg.fill("#pCount", "5"); pg.fill("#pRad", "10"); pg.click("[data-p=patGo]"); pg.wait_for_selector("#bnKeep", timeout=30000)
        pg.click("#bnKeep"); pg.wait_for_timeout(400)
        ok(pg.evaluate("hm3d.scene().items.filter(i => i.kind === 'table_round').length") == 6, "around a circle: 5 copies 10 ft from the table")
        pg.evaluate("hm3d.undo()")
        # planted mistake: a row that runs out of the room is refused with a count
        pg.evaluate("hm3d.select('tb')"); pg.wait_for_timeout(300); pg.click(".tabs [data-tab=sel]"); pg.click("[data-p=patGrid]"); pg.fill("#pRows", "1"); pg.fill("#pCols", "14"); pg.fill("#pGap", "2"); pg.click("[data-p=patGo]"); pg.wait_for_timeout(800)
        bad = pg.evaluate("hm3d.preview([{ op: 'pattern_copy', id: 'tb', mode: 'grid', rows: 1, cols: 14, gap: 0.6 }])"); pg.evaluate("hm3d.drop()")
        ok(not bad["ok"] and "would fit" in bad["errors"][0] and not pg.is_visible("#bnKeep"), "pattern (self-test): a row that runs out of the room is refused and nothing is previewed (%s)" % (bad["errors"][0] if not bad["ok"] else "accepted"))

        ok(not pg.evaluate("document.documentElement.scrollWidth > innerWidth"), "no sideways scrolling at phone width")
        ok(not errs, "no page errors" + (": " + "; ".join(errs) if errs else ""))
        b.close()
    print("Placement check: %d problem(s)" % len(fails) if fails else "Placement check: all passed")
    return 1 if fails else 0

if __name__ == "__main__":
    sys.exit(main())
