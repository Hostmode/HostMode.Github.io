"""The agent office in real 3D (admin console → Agents), checked in a real browser (part of agents/check_all.sh).

In the planner demo it opens the Agents tab's office window (office3d.html, the 3D designer's engine) and checks:
ten people in two rooms with the tab's colors, the tab's news reaching the 3D window, a tap on a person selecting
them in the tab, the crew walking through the corridor, nobody standing inside furniture or a wall, the camera
fitting both rooms on a phone, and no page errors. Pass a folder to keep the screenshots.
Run from the repo root with the site served on port 8765.
"""
import os, sys, tempfile
from playwright.sync_api import sync_playwright

BASE = os.environ.get("TEST_BASE", "http://localhost:8765")
fails = []
def ok(c, what):
    print(("ok   " if c else "FAIL ") + what)
    if not c: fails.append(what)

def main():
    out = sys.argv[1] if len(sys.argv) > 1 else tempfile.mkdtemp(); os.makedirs(out, exist_ok=True)
    chrome = os.environ.get("TEST_CHROME", "")
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=chrome if chrome and os.path.exists(chrome) else None, args=["--use-gl=swiftshader", "--enable-unsafe-swiftshader"])
        pg = b.new_page(viewport={"width": 412, "height": 915}); errs = []; pg.on("pageerror", lambda e: errs.append(str(e)[:300]))
        pg.goto(BASE + "/games.html?pdemo=1#planner"); pg.wait_for_timeout(3000)
        pg.evaluate("""() => { const d = document.createElement('div'); d.id = 'agcheck'; d.style.cssText = 'position:absolute;left:0;top:0;width:100%;z-index:4;background:#fff;padding:8px;box-sizing:border-box'; d.innerHTML = agentsBody(); document.body.appendChild(d); scrollTo(0, 0); floatPlace(); }""")
        pg.wait_for_function("FLOATS.office && FLOATS.office.contentWindow.hmOffice && FLOATS.office.contentWindow.hmOffice.people && FLOATS.office.contentWindow.hmOffice.people.size === 10", timeout=120000)
        pg.wait_for_timeout(2500)
        off = [f for f in pg.frames if f.url.endswith("office3d.html")][0]
        f = off.evaluate("""(() => { const e = hmOffice, ps = [...e.people.values()]; return { n: ps.length, inVenue: ps.filter(p => p.root.position.x < 10).length, studio: ps.filter(p => p.root.position.x > 12.5).map(p => p.k),
          looks: ps.every(p => p.lookKey && p.lookKey.includes('shirt')), states: ps.map(p => p.k + ':' + p.st).join(' ') }; })()""")
        ok(f["n"] == 10, "ten people in the 3D office (%s)" % f["states"])
        sent = pg.evaluate("L.agMsg.cast.map(c => c.k + ':' + c.st).sort().join(' ')"); got = off.evaluate("[...hmOffice.people.values()].map(p => p.k + ':' + p.st).sort().join(' ')")
        ok(sent == got and f["looks"], "the tab's news and colors reached the 3D window")
        # nobody stands inside furniture or a wall at home: a person's spot is clear of every library piece's footprint (rugs, runners and things on tables aside)
        clash = off.evaluate("""(() => { const s = hmOffice.s, bad = []; const HOME = { tester: [4.9, 5.6], tech: [2.1, 6.95], reviewer: [7.3, 8.7], checks: [1.6, 3.7], backup: [3.2, 1.5], research: [19.6, 1.3], modeler: [14.9, 1.75], qa3d: [17.5, 6.6], stay: [20.2, 7.4], planted: [9.1, 7.9] }; /* planted: someone standing in the bar, which this check must catch */
          Object.entries(HOME).forEach(([k, [x, z]]) => s.items.forEach(i => { if (/rug|aisle_runner|string_lights|centerpiece|chair$/.test(i.kind) || i.kind === 'stage') return; const hw = i.w / 2 + 0.15, hd = i.d / 2 + 0.15, a = (i.rot || 0) * Math.PI / 180, c = Math.abs(Math.cos(a)), sn = Math.abs(Math.sin(a)), ex = hw * c + hd * sn, ez = hw * sn + hd * c;
            if (Math.abs(x - i.x) < ex && Math.abs(z - i.z) < ez) bad.push(k + ' in ' + i.kind); })); return bad; })()""")
        caught = "planted in bar" in clash; clash = [c for c in clash if not c.startswith("planted")]
        ok(caught and not clash, "everyone's home spot is clear of furniture (self-test: a planted person in the bar was %s)" % ("caught" if caught else "MISSED") + (": " + ", ".join(clash) if clash else ""))
        # the crew walk the corridor: a finished crew member is seen between the rooms within one walk
        seen = off.evaluate("""() => new Promise(res => { const p = [...hmOffice.people.values()].find(q => q.crew && q.st === 'done'); if (!p) return res('no finished crew'); const t0 = performance.now();
          const look = () => { const x = p.root.position.x; if (x > 10 && x < 12.5) return res(true); if (performance.now() - t0 > 40000) return res(false); setTimeout(look, 100); }; look(); })""")
        ok(seen is True, "a finished crew member walks through the corridor to the venue")
        # the whole building fits on a phone: every person's middle is inside the picture
        inside = off.evaluate("""(() => { const e = hmOffice; e.goRoom('both', true); e.persp.updateMatrixWorld(); return [...e.people.values()].filter(p => { const v = p.root.position.clone(); v.y = 1; v.project(e.persp); return Math.abs(v.x) <= 1 && Math.abs(v.y) <= 1; }).length; })()""")
        ok(inside == 10, "on a phone, Both rooms shows all ten people (%d of 10 in view)" % inside)
        pg.wait_for_timeout(400); pg.screenshot(path=os.path.join(out, "office-phone.png"))
        # tap someone standing still: the tab picks them
        k = off.evaluate("[...hmOffice.people.values()].find(p => !p.crew && p.st !== 'work').k")
        pt = off.evaluate("(k => { const e = hmOffice, p = e.people.get(k), v = p.root.position.clone(); v.y = 1.1; v.project(e.persp); const r = e.r.domElement.getBoundingClientRect(); return [r.left + (v.x + 1) / 2 * r.width, r.top + (1 - v.y) / 2 * r.height]; })", k)
        box = pg.locator("iframe.pl3dfloat").bounding_box(); pg.mouse.click(box["x"] + pt[0], box["y"] + pt[1]); pg.wait_for_timeout(800)
        ok(pg.evaluate("L.agSel") == k, "tapping %s in 3D picks them in the tab (picked %s)" % (k, pg.evaluate("L.agSel")))
        pg.evaluate("() => { document.getElementById('agcheck').innerHTML = agentsBody(); floatPlace(); }"); pg.wait_for_timeout(900)
        ok(off.evaluate("hmOffice.selK") == k and off.evaluate("(k => !!hmOffice.people.get(k).tag)", k), "the chosen person gets their name tag in 3D")
        # leaving the tab hides and pauses the window
        pg.evaluate("() => { document.getElementById('agcheck').remove(); floatPlace(); }"); pg.wait_for_timeout(300)
        ok(pg.evaluate("FLOATS.office.style.display === 'none' && FLOATS.office.contentWindow.HM3D_PAUSED === true"), "away from the Agents tab, the 3D window is hidden and stops drawing")
        ok(not errs, "no page errors" + (": " + "; ".join(errs) if errs else ""))
        b.close()
    print("Office check: %d problem(s)" % len(fails) if fails else "Office check: all passed")
    return 1 if fails else 0

if __name__ == "__main__":
    sys.exit(main())
