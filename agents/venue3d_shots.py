"""Before and after pictures for the 3D designer: the same scene and camera angles every time, so changes to shapes,
materials and lighting can be compared side by side.

Run from the repo root with the site served on port 8765:   python3 agents/venue3d_shots.py <out_dir>
It sets up the sample room with a flower wall, a floral arch, centerpieces on every table and dressed chairs, then saves:
  room.png (the whole room), table.png (one table close up), flowers.png (the flower wall and arch), bloom.png (one centerpiece
  very close), chair.png (a chair close up),
and prints what a phone has to draw (triangles and separately drawn parts).
"""
import base64, os, sys
from playwright.sync_api import sync_playwright

BASE = os.environ.get("TEST_BASE", "http://localhost:8765")
SETUP = r"""
() => {
  const e = hm3d.editor, s = e.s, t = s.items.find(i => i.kind.startsWith('table_round'));
  hm3d.run([
    { op: 'dress_object', kind: 'tables', linen: 'floor', linenColor: 'ivory', runner: 'satin', runnerColor: 'champagne', charger: 'gold', napkin: 'blush' },
    { op: 'dress_object', kind: 'chairs', sash: 'blush' },
    { op: 'decorate_tables', kind: 'centerpiece', tables: 'all', palette: 'blush' },
    { op: 'add_item', kind: 'flower_wall', id: 'shot_wall', x: 4, z: 1.2, palette: 'blush' },
    { op: 'add_item', kind: 'arch', id: 'shot_arch', x: 9, z: 2.2, palette: 'garden' }
  ]);
  return { t: [t.x, t.z], h: t.h };
}
"""
VIEWS = {
    "room": None,
    "table": "t => ({ pos: [t.t[0] + 1.6, 1.75, t.t[1] + 1.9], target: [t.t[0], 0.75, t.t[1]] })",
    "flowers": "t => ({ pos: [7, 2.1, 7.2], target: [6.5, 1.3, 1.6] })",
    "bloom": "t => ({ pos: [t.t[0] + 0.42, t.h + 0.5, t.t[1] + 0.42], target: [t.t[0], t.h + 0.14, t.t[1]] })",
    "chair": "t => ({ pos: [t.t[0] + 1.25, 1.15, t.t[1] + 1.55], target: [t.t[0] + 0.4, 0.55, t.t[1] + 0.75] })",
}


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else "venue3d-shots"
    os.makedirs(out, exist_ok=True)
    chrome = os.environ.get("TEST_CHROME", "")
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=chrome if chrome and os.path.exists(chrome) else None, args=["--use-gl=swiftshader", "--enable-unsafe-swiftshader"])
        pg = b.new_page(viewport={"width": 1200, "height": 800})
        errors = []
        pg.on("pageerror", lambda e: errors.append(str(e)[:200]))
        pg.goto(f"{BASE}/venue3d.html?demo=1", wait_until="load")
        pg.evaluate("localStorage.clear()")
        pg.reload(wait_until="load")
        pg.wait_for_timeout(5000)
        info = pg.evaluate(SETUP)
        pg.wait_for_timeout(1500)
        for name, view in VIEWS.items():
            if view:
                pg.evaluate(f"(t => {{ const v = ({view})(t); const e = hm3d.editor; e.select(null); e.persp.position.set(...v.pos); e.orbit.target.set(...v.target); e.orbit.update(); }})", info)
            else:
                pg.evaluate("() => { hm3d.editor.select(null); hm3d.editor.frame(); }")
            pg.wait_for_timeout(1200)
            data = pg.evaluate("() => hm3d.editor.snapshot(1200)")  # the designer's own picture export, the same as Save picture
            open(os.path.join(out, name + ".png"), "wb").write(base64.b64decode(data.split(",", 1)[1]))
        stats = pg.evaluate("() => { let t = 0, m = 0; hm3d.editor.world.traverse(o => { if (o.isMesh && o.visible) { m++; const g = o.geometry; t += Math.round((g.index ? g.index.count : g.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1)); } }); const i = hm3d.editor.r.info.render; return { tris: t, meshes: m, calls: i.calls }; }")
        b.close()
    print(f"Saved room, table, flowers and chair pictures in {out}")
    print(f"The scene: {stats['tris']:,} triangles, {stats['meshes']} separately drawn parts ({stats['calls']} draw calls in the last frame)")
    if errors:
        print("Page errors:", "; ".join(errors))
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
