"""The asset check for the 3D designer: builds every library piece in a real browser and checks it against its record.

For each piece in 3d/library/assets.js it checks that:
  - the record is complete and valid (contracts.js checkRecord), and every library piece has one, once;
  - the piece builds without an error;
  - it stays within its detail budget (triangles and separately drawn parts), so phones stay quick.
Results go to agent-screens/asset-check.json in the check-result format (contracts.js checkResult); a failure
names who it goes back to (modeling for shape and budget problems, integration for record problems).
It runs a self-test first with planted problems (an over-budget piece, a piece with no record, a bad record) and
fails if the check misses any of them.

Run from the repo root with the site served on port 8765 (check_all.sh does both):  python3 agents/venue3d_asset_check.py
"""
import json, os, sys
from playwright.sync_api import sync_playwright

BASE = os.environ.get("TEST_BASE", "http://localhost:8765")
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "agent-screens")

CHECK = r"""
async ({ plant }) => {
  const S = await import('./3d/scene.js'), D = await import('./3d/decor.js'), A = await import('./3d/library/assets.js'), C = await import('./3d/library/contracts.js');
  const scene = S.sampleVenue(), results = [];
  let records = A.ASSETS.map(r => JSON.parse(JSON.stringify(r)));
  const catalog = Object.assign({}, S.CATALOG);
  if (plant) {
    // three planted problems the check must catch
    records.find(r => r.id === 'flower_wall').budget = { tris: 10, meshes: 1 };          // over budget
    catalog.planted_piece = Object.assign({}, S.CATALOG.table_round, { label: 'Planted piece' }); // no record
    const bad = records.find(r => r.id === 'chair'); delete bad.description;               // bad record
  }
  const seen = new Set();
  for (const id of Object.keys(catalog)) if (!records.some(r => r.id === id)) results.push({ asset: id, version: 0, pass: false, tris: 0, meshes: 0, ms: 0, problems: ['no asset record'], role: 'integration' });
  for (const r of records) {
    const problems = C.checkRecord(r, catalog), c = catalog[r.id];
    if (seen.has(r.id)) problems.push('listed twice'); seen.add(r.id);
    let tris = 0, meshes = 0, ms = 0, role = problems.length ? 'integration' : null;
    if (c && !S.CATALOG[r.id]) { /* planted piece: no maker */ }
    else if (c) {
      try {
        const it = { id: 'check_' + r.id, kind: r.id, x: 5, z: 5, rot: 0, w: c.w, d: c.d, h: c.h, y: 0, mat: c.mat };
        if (c.dress === 'table') it.dress = { linen: 'floor', runner: 'satin', napkin: 'ivory', charger: 'gold' };
        const t0 = performance.now(), g = D.buildItem(it, scene); ms = Math.round(performance.now() - t0);
        g.traverse(o => { if (o.isMesh) { meshes++; const geo = o.geometry, n = geo.index ? geo.index.count / 3 : geo.attributes.position.count / 3; tris += Math.round(n * (o.isInstancedMesh ? o.count : 1)); } });
        if (r.budget && tris > r.budget.tris) { problems.push(`too detailed: ${tris} triangles, budget ${r.budget.tris}`); role = 'modeling'; }
        if (r.budget && meshes > r.budget.meshes) { problems.push(`too many parts: ${meshes}, budget ${r.budget.meshes}`); role = 'modeling'; }
        if (!meshes) { problems.push('draws nothing'); role = 'modeling'; }
      } catch (e) { problems.push('could not be built: ' + e.message); role = 'modeling'; }
    }
    const res = { asset: r.id, version: r.version || 0, pass: !problems.length, tris, meshes, ms, problems, role: problems.length ? role || 'integration' : null };
    const bad = C.checkResult(res); if (bad.length) res.problems.push(...bad.map(b => 'result format: ' + b));
    results.push(res);
  }
  // the whole sample room as a person first sees it: what a phone has to draw
  const room = new (await import('./3d/vendor/three-bundle.min.js')).Group(); scene.items.forEach(it => room.add(D.buildItem(it, scene)));
  let rt = 0, rm = 0; room.traverse(o => { if (o.isMesh) { rm++; const geo = o.geometry; rt += Math.round((geo.index ? geo.index.count : geo.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1)); } });
  return { results, room: { items: scene.items.length, tris: rt, meshes: rm } };
}
"""


def main():
    chrome = os.environ.get("TEST_CHROME", "")
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=chrome if chrome and os.path.exists(chrome) else None, args=["--use-gl=swiftshader", "--enable-unsafe-swiftshader"])
        pg = b.new_page()
        errors = []
        pg.on("pageerror", lambda e: errors.append(str(e)[:200]))
        pg.goto(f"{BASE}/venue3d.html?demo=1", wait_until="load")
        pg.wait_for_timeout(1500)
        planted = pg.evaluate(CHECK, {"plant": True})["results"]
        caught = {r["asset"]: r["problems"] for r in planted if not r["pass"]}
        want = {"flower_wall": "too detailed", "planted_piece": "no asset record", "chair": "description"}
        missed = [k for k, w in want.items() if not any(w in x for x in caught.get(k, []))]
        if missed:
            print("SELF-TEST FAILED: the asset check missed planted problems in", ", ".join(missed))
            return 1
        out = pg.evaluate(CHECK, {"plant": False})
        results, room = out["results"], out["room"]
        b.close()
    os.makedirs(OUT, exist_ok=True)
    json.dump({"room": room, "results": results}, open(os.path.join(OUT, "asset-check.json"), "w"), indent=1)
    fails = [r for r in results if not r["pass"]]
    for r in fails:
        print(f"FAIL {r['asset']} (back to {r['role']}): " + "; ".join(r["problems"]))
    if errors:
        print("Page errors:", "; ".join(errors))
    print(f"Sample room: {room['items']} pieces, {room['tris']:,} triangles, {room['meshes']} separately drawn parts")
    print(f"Asset check: {len(results) - len(fails)} of {len(results)} pieces pass (self-test caught 3 of 3 planted problems)")
    return 1 if fails or errors else 0


if __name__ == "__main__":
    sys.exit(main())
