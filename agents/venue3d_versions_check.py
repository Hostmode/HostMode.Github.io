"""Named versions in the 3D designer's Save & share tab, checked in a real browser at phone size (part of agents/check_all.sh).

Names the current design "Option A", saves 22 more automatic versions and checks the name is still there (the limit is 20
automatic ones), names and renames an earlier one, opens a named version (one undo step back), removes a name, and checks
a name with HTML in it is shown as plain text. Pass --selftest to prove the check catches planted mistakes.
Run from the repo root with the site served on port 8765. Pass a folder to keep the screenshots.
"""
import os, sys, tempfile
from playwright.sync_api import sync_playwright

BASE = os.environ.get("TEST_BASE", "http://localhost:8765") + "/venue3d.html?demo=1"
fails = []
def ok(c, what):
    print(("ok   " if c else "FAIL ") + what)
    if not c: fails.append(what)

def run(pg, out, selftest):
    errs = []; pg.on("pageerror", lambda e: errs.append(str(e)[:300]))
    pg.goto(BASE); pg.evaluate("localStorage.clear()"); pg.reload(); pg.wait_for_function("window.hm3d && hm3d.editor.s", timeout=120000); pg.wait_for_timeout(1500)
    pg.click(".tabs button[data-tab=file]")
    pg.click("[data-vname=cur]"); pg.fill("#vName", "Option A"); pg.click("[data-vsave=cur]")
    pg.wait_for_function("document.querySelector('#body').innerText.includes('Option A')", timeout=20000)
    ok(pg.evaluate("(() => { const t = document.querySelector('#body').textContent; return t.indexOf('Named versions') >= 0 && t.indexOf('Named versions') < t.indexOf('Option A') && t.indexOf('Option A') < t.indexOf('Earlier versions'); })()"), "Name this version on the current design: it shows under Named versions, above Earlier versions")
    pg.screenshot(path=os.path.join(out, "versions-named.png"))
    # 22 automatic versions: the limit is 20, a named one must survive
    pg.evaluate("""async () => { for (let i = 0; i < 22; i++) { hm3d.run([{ op: 'add_item', kind: 'chair_throne', id: 'c' + i, x: 2 + i * 0.1, z: 2 }]); await hm3d.save(); await new Promise(r => setTimeout(r, 3)); } }""")
    pg.click(".tabs button[data-tab=file]"); pg.wait_for_timeout(200)
    st = pg.evaluate("(() => { const r = hm3d.editor.store.revisions(hm3d.scene().id); return { total: r.length, named: r.filter(x => x.name).length, auto: r.filter(x => !x.name).length }; })()")
    if selftest:  # the planted mistake: the saved names are lost
        pg.evaluate("Object.keys(localStorage).filter(k => k.startsWith('hm3d_r_')).forEach(k => { const v = JSON.parse(localStorage[k]); v.forEach(r => delete r.name); localStorage[k] = JSON.stringify(v); })")
        st = pg.evaluate("(() => { const r = hm3d.editor.store.revisions(hm3d.scene().id); return { total: r.length, named: r.filter(x => x.name).length, auto: r.filter(x => !x.name).length }; })()")
    keep = st["named"] == 1 and st["auto"] == 20
    ok(keep, "after 22 more saves the named version is still there and only 20 automatic ones are kept (%s)" % st)
    # name an earlier automatic version, then rename it
    pg.click("[data-vname]:not([data-vname=cur]) >> nth=-1"); pg.fill("#vName", "Option B"); pg.click("[data-vsave]")
    pg.wait_for_function("document.querySelector('#body').innerText.includes('Option B')", timeout=20000)
    ok(pg.evaluate("hm3d.editor.store.revisions(hm3d.scene().id).filter(x => x.name).length") == 2, "any earlier version can be named")
    pg.click("[data-vname]:has-text('Rename') >> nth=0"); pg.fill("#vName", "Final"); pg.click("[data-vsave]"); pg.wait_for_timeout(200)
    names = pg.evaluate("hm3d.editor.store.revisions(hm3d.scene().id).filter(x => x.name).map(x => x.name).sort()")
    ok(names == ["Final", "Option A"], "Rename changes the name (%s)" % names)
    # open the named version: one undo step back to where we were
    before = pg.evaluate("hm3d.scene().items.length")
    pg.locator("button:has-text('Open')").filter(has_not_text="Open a").first.click(); pg.wait_for_timeout(500)
    after = pg.evaluate("hm3d.scene().items.length")
    ok(after != before, "Open on a named version loads it (%d objects instead of %d)" % (after, before))
    pg.evaluate("hm3d.undo()"); pg.wait_for_timeout(300)
    ok(pg.evaluate("hm3d.scene().items.length") == before, "one Undo goes back to where you were")
    # remove a name
    pg.click(".tabs button[data-tab=file]")
    pg.click("[data-vunname] >> nth=0"); pg.wait_for_timeout(200)
    ok(pg.evaluate("hm3d.editor.store.revisions(hm3d.scene().id).filter(x => x.name).length") == 1, "Remove name makes it an ordinary version again")
    # a name with HTML is plain text
    pg.click("[data-vname=cur]"); pg.fill("#vName", "<img src=x onerror=window.__x=1>"); pg.click("[data-vsave=cur]"); pg.wait_for_timeout(400)
    ok(pg.evaluate("!window.__x && !document.querySelector('#body img[src=x]')"), "a name with HTML in it is shown as text, never run")
    pg.set_viewport_size({"width": 390, "height": 844}); pg.wait_for_timeout(200)
    pg.screenshot(path=os.path.join(out, "versions-phone.png"))
    ok(not pg.evaluate("document.documentElement.scrollWidth > innerWidth"), "no sideways scrolling at phone width")
    ok(not errs, "no page errors" + (": " + "; ".join(errs) if errs else ""))

def main():
    selftest = "--selftest" in sys.argv
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    out = args[0] if args else tempfile.mkdtemp(); os.makedirs(out, exist_ok=True)
    chrome = os.environ.get("TEST_CHROME", "")
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=chrome if chrome and os.path.exists(chrome) else None, args=["--use-gl=swiftshader", "--enable-unsafe-swiftshader"])
        pg = b.new_page(viewport={"width": 390, "height": 844}); run(pg, out, selftest); b.close()
    print("Versions check: %d problem(s)" % len(fails) if fails else "Versions check: all passed")
    return 1 if fails else 0

if __name__ == "__main__":
    sys.exit(main())
