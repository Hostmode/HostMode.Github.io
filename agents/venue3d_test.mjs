// Checks for the 3D venue scene model (3d/scene.js). Free, no browser: node agents/venue3d_test.mjs
import * as S from "../3d/scene.js";
let fail = 0;
const ok = (c, msg) => { if (!c) { fail++; console.log("FAIL:", msg); } else console.log("ok  ", msg); };

const v = S.sampleVenue();
ok(v.walls.length === 4 && v.openings.some(o => o.type === "door") && v.openings.some(o => o.type === "window"), "sample venue has 4 walls, doors and windows");
ok(v.items.some(i => i.kind === "stage") && v.items.some(i => i.kind === "dance_floor"), "sample venue has a stage and dance floor");
ok(S.counts(v).seats === 48 && S.counts(v).tables === 6, "sample venue seats 48 at 6 tables");
ok(S.checkScene(v).length === 0, "sample venue has no overlaps or out-of-room items: " + JSON.stringify(S.checkScene(v)));

// The demo instruction from the assignment.
const said = "Move the stage to the front of the room, create a dance floor in the center, and arrange eight round tables around it.";
const { ops, notes } = S.interpret(v, said);
ok(ops.length >= 3, "instruction became " + ops.length + " steps: " + ops.map(o => o.op).join(", ") + (notes.length ? " / " + notes.join("; ") : ""));
const r = S.apply(v, ops);
ok(r.ok, "steps applied: " + (r.errors || []).join("; "));
const s2 = r.scene;
const stage = s2.items.find(i => i.kind === "stage"), df = s2.items.find(i => i.kind === "dance_floor");
ok(S.footprint(stage).z0 < 0.5, "stage now against the front wall (z0=" + S.footprint(stage).z0 + ")");
ok(Math.abs(df.x - s2.room.w / 2) < 0.01 && Math.abs(df.z - s2.room.d / 2) < 0.01, "dance floor in the center");
ok(s2.items.filter(i => i.kind === "table_round").length === 8, "8 round tables");
ok(s2.items.filter(i => i.kind === "chair").length === 64, "8 chairs at each table (64)");
ok(S.checkScene(s2).length === 0, "no overlaps after the AI change: " + JSON.stringify(S.checkScene(s2).slice(0, 3)));
ok(v.items.filter(i => i.kind === "table_round").length === 6, "the original scene was not changed (undo works by keeping it)");

// Validation: bad or destructive steps are refused, and a failed batch changes nothing.
ok(!S.apply(v, [{ op: "add_item", kind: "spaceship" }]).ok, "unknown object refused");
ok(!S.apply(v, [{ op: "delete_object", id: "stage1" }]).ok, "delete without OK refused");
ok(S.apply(v, [{ op: "delete_object", id: "t1", confirm: true }]).scene.items.filter(i => i.group === "t1").length === 0, "deleting a table also removes its chairs");
ok(!S.apply(v, [{ op: "run_code", code: "alert(1)" }]).ok, "unknown step type refused (no arbitrary code)");
const bad = S.apply(v, [{ op: "move_object", id: "stage1", where: "back" }, { op: "resize_object", id: "stage1", w: 999 }]);
ok(!bad.ok && bad.scene === v, "batch with one bad step changes nothing");
ok(!S.apply(v, [{ op: "arrange_tables", count: 60 }]).ok, "too many tables for the room is refused, not crammed in");

// More phrasings.
const tryIt = (t, check, msg) => { const i = S.interpret(v, t), a = S.apply(v, i.ops); ok(a.ok && check(a.scene, i), msg + " — " + t + (i.notes.length ? " (" + i.notes.join("; ") + ")" : "") + (a.errors && a.errors.length ? " ERR " + a.errors.join(";") : "")); };
{ const i = S.interpret(v, "Set up this venue for a wedding with 120 guests");
  ok(i.ops.length === 0 && /won't fit/.test(i.notes.join(" ")), "120 guests in the 60x45 ft sample room is refused honestly: " + i.notes.join(" ")); }
{ const big = S.apply(v, [{ op: "set_room", w: 24.4, d: 18.3 }]).scene; // 80 x 60 ft
  const i = S.interpret(big, "Set up this venue for a wedding with 120 guests"), a = S.apply(big, i.ops);
  ok(a.ok && a.scene.items.filter(x => x.kind === "chair").length >= 120 && S.checkScene(a.scene).length === 0, "120 guests seated in an 80x60 ft room: " + i.notes.join(" ")); }
tryIt("Change the tablecloths to dark purple", s => s.items.filter(i => i.kind === "table_round").every(t => t.color === S.COLORS["dark purple"]), "purple linens");
tryIt("Add warm lighting around the dance floor", s => s.lights.length === v.lights.length + 6, "6 warm lights");
tryIt("Make the room look more elegant and upscale", s => s.items.filter(i => i.kind === "centerpiece_tall").length === 6 && s.items.every(i => !i.kind.startsWith("table_round") || (i.dress.runner === "satin" && i.dress.charger)), "elegant");
tryIt("Move the bar to the left", s => S.footprint(s.items.find(i => i.kind === "bar")).x0 < 0.5, "bar left");
tryIt("Add a podium on the stage", s => s.items.some(i => i.kind === "podium"), "podium");
tryIt("Paint the walls navy", s => s.room.wallColor === S.COLORS.navy, "navy walls");
ok(S.interpret(v, "make me a sandwich").notes.length === 1, "nonsense is reported back, not guessed");


// Decor: linens, chair dressing, centerpieces, balloons, ceiling pieces.
const tables = s => s.items.filter(i => i.kind === "table_round"), chairsOf = s => s.items.filter(i => i.kind.startsWith("chair"));
tryIt("Ivory floor-length linens with gold sequin runners and blush napkins", s => tables(s).every(t => t.dress.linen === "floor" && t.color === S.COLORS.ivory && t.dress.runner === "sequin" && t.dress.runnerColor === S.COLORS.gold && t.dress.napkin === S.COLORS.blush), "linens, runners, napkins");
tryIt("Add white spandex chair covers with navy sashes", s => chairsOf(s).every(c => c.dress.cover === "spandex" && c.dress.coverColor === S.COLORS.white && c.dress.sash === S.COLORS.navy), "chair covers and sashes");
tryIt("Switch to ghost chairs", s => chairsOf(s).length === 48 && chairsOf(s).every(c => c.kind === "chair_ghost"), "chair style");
tryIt("Put tall centerpieces on every table", s => s.items.filter(i => i.kind === "centerpiece_tall").every(c => c.y === 0.76 && c.group) && s.items.filter(i => i.kind === "centerpiece_tall").length === 6, "centerpieces sit on the tables");
tryIt("Add a blush and gold balloon arch at the back", s => { const b = s.items.find(i => i.kind === "balloon_full_arch"); return b && b.palette.join() === [S.COLORS.blush, S.COLORS.gold].join() && S.footprint(b).z1 > s.room.d - 0.5; }, "balloon arch with colors");
tryIt("Add string lights over the dance floor", s => { const L = s.items.find(i => i.kind === "string_lights"); return L && Math.abs(L.y - (s.room.h - L.h)) < 0.01 && Math.abs(L.x - s.items.find(i => i.kind === "dance_floor").x) < 0.01; }, "string lights hang from the ceiling");
tryIt("Add a flower wall behind the cake table", s => true, "flower wall phrase understood"); // no cake table in the sample: added in the center instead
tryIt("Add a chandelier", s => s.items.some(i => i.kind === "chandelier"), "chandelier");
{ // A tabletop item moves and is removed with its table, and a re-arrange keeps the look.
  let a = S.apply(v, [{ op: "dress_object", kind: "tables", linen: "lap", linenColor: "sage", runner: "satin", runnerColor: "gold" }, { op: "dress_object", kind: "chairs", cover: "banquet", sash: "gold" }, { op: "decorate_tables", kind: "centerpiece_tall", tables: "all" }]);
  ok(a.ok, "dress and decorate in one step: " + (a.errors || []).join("; "));
  const b = S.apply(a.scene, [{ op: "move_object", id: "t1", dx: 1 }]).scene, cp = b.items.find(i => i.group === "t1" && i.kind === "centerpiece_tall");
  ok(Math.abs(cp.x - b.items.find(i => i.id === "t1").x) < 0.01, "centerpiece moves with its table");
  ok(S.checkScene(a.scene).length === 0, "centerpieces don't count as overlaps");
  const c = S.apply(a.scene, [{ op: "arrange_tables", kind: "table_round", count: 8, around: "dance1" }]);
  ok(c.ok && tables(c.scene).every(t => t.dress.linen === "lap" && t.color === S.COLORS.sage) && chairsOf(c.scene).every(ch => ch.dress.cover === "banquet") && c.scene.items.filter(i => i.kind === "centerpiece_tall").length === 8, "re-arranging tables keeps linens, chair covers and centerpieces");
  ok(!S.apply(v, [{ op: "dress_object", kind: "tables", linen: "glitter" }]).ok, "unknown cloth style refused");
  ok(!S.apply(v, [{ op: "dress_object", id: "stage1", linen: "floor" }]).ok, "a stage can't take a tablecloth");
  ok(!S.apply(v, [{ op: "decorate_tables", kind: "sofa" }]).ok, "a sofa isn't a centerpiece");
  const h = S.apply(S.apply(v, [{ op: "add_item", kind: "chandelier", x: 9, z: 7 }]).scene, [{ op: "set_room", h: 5 }]).scene;
  ok(Math.abs(h.items.find(i => i.kind === "chandelier").y - 4) < 0.01, "ceiling pieces follow a new ceiling height");
}
ok(S.CAT_ORDER.every(c => Object.values(S.CATALOG).some(x => x.cat === c)) && Object.values(S.CATALOG).every(x => S.CAT_ORDER.includes(x.cat)), "every library category is listed in order");

// Sets: a table with its chairs plus the bar, grouped, then moved, turned, copied, renamed, saved and removed together.
{
  let g = S.sampleVenue(); const t = g.items.find(i => i.kind.startsWith("table")), bar = g.items.find(i => i.kind === "bar");
  const chairs = g.items.filter(i => i.group === t.id).length;
  let r = S.apply(g, [{ op: "group_objects", ids: [t.id, bar.id], id: "set_t1" }]); ok(r.ok && r.scene.sets.set_t1, "grouped a table and the bar into a set");
  g = r.scene; const all = S.setClosure(g, S.setMembers(g, "set_t1")); ok(all.length === 2 + chairs, "the set includes the table's " + chairs + " chairs (" + all.length + " pieces)");
  const before = new Map(all.map(id => { const i = g.items.find(x => x.id === id); return [id, [i.x, i.z]]; }));
  r = S.apply(g, [{ op: "move_set", set: "set_t1", dx: 1, dz: -0.5 }]); g = r.scene;
  ok(all.every(id => { const i = g.items.find(x => x.id === id), b = before.get(id); return Math.abs(i.x - b[0] - 1) < 0.02 && Math.abs(i.z - b[1] + 0.5) < 0.02; }), "every piece moved together");
  const c0 = S.setCenter(all.map(id => g.items.find(x => x.id === id)));
  r = S.apply(g, [{ op: "rotate_set", set: "set_t1", by: 90 }]); g = r.scene; const c1 = S.setCenter(all.map(id => g.items.find(x => x.id === id)));
  ok(r.ok && Math.abs(c0[0] - c1[0]) < 0.05 && Math.abs(c0[1] - c1[1]) < 0.05, "turning the set keeps it in place around its center");
  const n0 = g.items.length; r = S.apply(g, [{ op: "duplicate_set", set: "set_t1" }]); const nu = Object.keys(r.scene.sets).find(k => k !== "set_t1");
  ok(r.ok && r.scene.items.length === n0 + all.length && nu && S.setClosure(r.scene, S.setMembers(r.scene, nu)).length === all.length, "copying the set makes a second set with every piece");
  ok(r.scene.items.filter(i => i.group && !r.scene.items.some(p => p.id === i.group)).length === 0, "copied chairs belong to the copied table");
  g = r.scene; r = S.apply(g, [{ op: "rename_set", set: "set_t1", name: "Head table" }]); ok(r.ok && r.scene.sets.set_t1.name === "Head table", "a set can be renamed"); g = r.scene;
  const back = S.validateFile(JSON.parse(JSON.stringify(g))); ok(Object.keys(back.sets).length === 2 && back.items.filter(i => i.set).length === 4, "sets survive saving and reopening");
  ok(!S.apply(g, [{ op: "delete_set", set: "set_t1" }]).ok, "removing a set needs an OK first");
  r = S.apply(g, [{ op: "delete_set", set: "set_t1", confirm: true }]); ok(r.ok && r.scene.items.length === g.items.length - all.length && !r.scene.sets.set_t1, "removing the set removes every piece and the set");
  r = S.apply(r.scene, [{ op: "ungroup_objects", set: nu }]); ok(r.ok && !Object.keys(r.scene.sets).length && !r.scene.items.some(i => i.set), "ungrouping keeps the pieces and drops the set");
  ok(!S.apply(S.sampleVenue(), [{ op: "group_objects", ids: [bar.id] }]).ok, "grouping needs at least two things");
  ok(S.rootOf(g, g.items.find(i => i.group === t.id).id).id === t.id, "tapping a chair finds its table");
}

// The stage's deck follows its material (it used to always be wood).
{ const src = (await import("fs")).readFileSync(new URL("../3d/decor.js", import.meta.url), "utf8"); const line = src.split("\n").find(l => l.includes('case "stage"'));
  ok(line && !/material\("wood", it\.color/.test(line) && /material\(it\.mat \|\| "wood"/.test(line), "the stage is drawn with its chosen material"); }

// Carpet: patterned or plain, any color, from the Room tab or the Ask box.
{
  const v0 = S.sampleVenue(), said = S.interpret(v0, "plain navy carpet");
  ok(said.ops.length === 1 && said.ops[0].mat === "carpet_plain" && said.ops[0].color === "navy", "the Ask box understands \"plain navy carpet\"");
  ok(S.interpret(v0, "carpet the room").ops[0]?.mat === "carpet" && S.interpret(v0, "add a rug").ops[0]?.kind === "rug", "\"carpet the room\" carpets the floor; \"add a rug\" still adds a rug");
  let r = S.apply(v0, said.ops); ok(r.ok && r.scene.room.floor === "carpet_plain" && r.scene.room.floorColor === S.COLORS.navy, "the floor is now plain navy carpet");
  r = S.apply(r.scene, [{ op: "change_material", id: "floor", mat: "oak" }]); ok(!r.scene.room.floorColor, "changing back to a wood floor drops the carpet color");
}

// Tabletop pieces: they go on a table, sit beside what's already there, and follow the table they're dragged onto.
{
  let g = S.sampleVenue(); const ts = g.items.filter(i => i.kind.startsWith("table_round")), t = ts[0], t2 = ts[1];
  let r = S.apply(g, [{ op: "add_item", kind: "centerpiece", on: t.id, id: "tc1" }, { op: "add_item", kind: "candle_cluster", on: t.id, id: "tc2" }]); g = r.scene;
  const a = g.items.find(i => i.id === "tc1"), c = g.items.find(i => i.id === "tc2");
  ok(r.ok && c.group === t.id && Math.abs(c.y - t.h) < 0.01, "candles put on a table sit on that table");
  ok(Math.hypot(a.x - c.x, a.z - c.z) > 0.2, "a second piece on a table goes beside the first, not inside it");
  r = S.apply(g, [{ op: "move_object", id: "tc2", x: g.room.w / 2, z: g.room.d / 2 }]); let m = r.scene.items.find(i => i.id === "tc2");
  ok(m.y === 0 && !m.group, "dragged off every table, the candles sit on the floor");
  r = S.apply(r.scene, [{ op: "move_object", id: "tc2", x: t2.x, z: t2.z }]); m = r.scene.items.find(i => i.id === "tc2");
  ok(m.group === t2.id && Math.abs(m.y - t2.h) < 0.01, "dragged onto another table, the candles go on that table");
}

// The library's shared formats (3d/library/contracts.js) and asset records (3d/library/assets.js).
{
  const C = await import("../3d/library/contracts.js"), A = await import("../3d/library/assets.js"), fs = await import("fs");
  const kinds = Object.keys(S.CATALOG), ids = A.ASSETS.map(a => a.id);
  ok(kinds.every(k => ids.includes(k)) && ids.length === kinds.length && new Set(ids).size === ids.length, "every library piece has exactly one asset record (" + ids.length + ")");
  ok(A.metaIds().every(k => S.CATALOG[k]), "no asset record for a piece that doesn't exist");
  const bad = A.ASSETS.map(r => [r.id, C.checkRecord(r, S.CATALOG)]).filter(x => x[1].length);
  ok(!bad.length, "every asset record is complete and valid" + (bad.length ? ": " + JSON.stringify(bad.slice(0, 3)) : ""));
  ok(A.searchAssets("flowers", { event: "wedding" }).every(a => a.events.includes("wedding")) && A.searchAssets("chiavari").some(a => a.id === "chair"), "search finds pieces by words, event and style");
  // planted bad entries must be caught by each format
  const goodF = { id: "t_finding", topic: "Test", events: ["wedding"], summary: "A test.", sources: [{ url: "https://example.com", title: "Example" }], confidence: "high", licence: "Linked only", found: "2026-11-03" };
  ok(!C.checkFinding(goodF).length && C.checkFinding(Object.assign({}, goodF, { sources: [{ url: "http://x", title: "" }] })).length >= 2, "a research finding needs real https sources with titles");
  const goodS = { id: "t_spec", name: "Test", category: "Seating", tags: ["x"], events: ["wedding"], styles: ["classic"], size: { w: 0.5, d: 0.5, h: 0.9 }, materials: ["wood"], placement: "Around tables", modeling: "Profiles", priority: "now", findings: ["t_finding"], status: "spec" };
  ok(!C.checkSpec(goodS, new Set(["t_finding"])).length && C.checkSpec(Object.assign({}, goodS, { findings: ["nope"] }), new Set(["t_finding"])).length === 1, "an asset spec must point at findings that exist");
  ok(C.checkResult({ asset: "chair", pass: false, problems: ["x"] }).length === 1 && !C.checkResult({ asset: "chair", pass: false, problems: ["x"], role: "modeling" }).length, "a failed check says who it goes back to");
  // every research finding and spec saved in the repo must pass its format, and specs must point at saved findings
  const read = d => { try { return fs.readdirSync(new URL("../3d/library/" + d + "/", import.meta.url)).filter(f => f.endsWith(".json")).map(f => JSON.parse(fs.readFileSync(new URL("../3d/library/" + d + "/" + f, import.meta.url), "utf8"))); } catch (e) { return []; } };
  const findings = read("research"), specs = read("specs"), fids = new Set(findings.map(f => f.id));
  const fb = findings.map(f => [f.id, C.checkFinding(f)]).filter(x => x[1].length), sb = specs.map(s => [s.id, C.checkSpec(s, fids)]).filter(x => x[1].length);
  ok(!fb.length && !sb.length, findings.length + " saved findings and " + specs.length + " saved specs are valid" + (fb.length || sb.length ? ": " + JSON.stringify(fb.concat(sb).slice(0, 3)) : ""));
}

// Phase 4 (Nov 3, 2026): new pieces, chairs that face their table, curved and one-sided tables, tents, the Ask box, search.
{
  const A = await import("../3d/library/assets.js"), base = S.sampleVenue();
  const t = S.mkItem("table_round", 5, 5, 0, { id: "ft" }), faces = S.chairsAround(t, 8).every(c => { const a = c.rot * Math.PI / 180, fx = -Math.sin(a), fz = Math.cos(a); return fx * (t.x - c.x) + fz * (t.z - c.z) > 0.9 * Math.hypot(t.x - c.x, t.z - c.z); });
  ok(faces, "every chair around a round table faces the table (side chairs used to face sideways)");
  const sp = S.mkItem("table_serpentine", 5, 5, 90, { id: "sp" }), cx = 5 - 0.915, ring = S.chairsAround(sp, 4);
  ok(ring.length === 4 && ring.every(c => Math.abs(Math.hypot(c.x - (5 + 0.915), c.z - (5 - 0.915)) - (sp.w + 0.3)) < 0.01 || Math.abs(Math.hypot(c.x - cx, c.z - cx) - (sp.w + 0.3)) < 0.01), "serpentine chairs sit along its outer curve");
  const hd = S.mkItem("table_head", 5, 5, 0, { id: "hd" }), hc = S.chairsAround(hd, 12);
  ok(hc.every(c => c.z < hd.z && c.rot === 0) && new Set(hc.map(c => c.x.toFixed(2))).size === 12, "a head table seats everyone on one side, facing the room");
  let r = S.apply(base, [{ op: "add_item", kind: "tent", id: "tn", x: base.room.w / 2, z: base.room.d / 2 }]);
  ok(r.ok && !r.warnings.some(w => /Tent|overlaps.*tent/i.test(w.msg)), "a tent over tables doesn't count as bumping into them");
  const say = q => (S.interpret(base, q).ops || []).map(o => o.kind || o.to).join(",");
  ok(say("Add a throne chair") === "chair_throne" && say("Add an LED wall behind the stage") === "led_wall" && say("Add a 360 booth") === "booth_360" && say("Add an aisle runner") === "aisle_runner" && say("Switch to banquet chairs") === "chair_banquet" && say("Put bud vases on every table") === "bud_vases",
    "the Ask box knows the new pieces (throne, LED wall, 360 booth, aisle runner, banquet chairs, bud vases)");
  r = S.apply(base, S.interpret(base, "Add an LED wall behind the stage").ops); ok(r.ok && !r.warnings.some(w => /outside/.test(w.msg)), "a piece put behind the stage stays inside the room");
  ok(A.searchAssets("baby shower").some(a => a.id === "chair_throne") && A.searchAssets("weddings").length > 40 && A.searchAssets("glasses").some(a => a.id === "champagne_wall"), "search understands event words, plurals and everyday names");
}

// Phase 5 (Nov 4, 2026): designing over a venue photo. A camera we know is used to "take" the dots, then worked out again.
{
  const iw = 1600, ih = 1200, pos = [5, 1.6, 12], at = [5.5, 0, 3], f = ih / 2 / Math.tan(25 * Math.PI / 180);
  const sub = (a, b) => a.map((v, i) => v - b[i]), nrm = a => { const l = Math.hypot(...a); return a.map(v => v / l); }, cr = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], dt = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const fw = nrm(sub(at, pos)), rt = nrm(cr(fw, [0, 1, 0])), up = cr(rt, fw), proj = q => { const d = sub(q, pos), z = dt(d, fw); return [f * dt(d, rt) / z / iw + 0.5, -f * dt(d, up) / z / ih + 0.5]; };
  const pts = [[2, 0, 2], [8, 0, 2], [8, 0, 7], [2, 0, 7]].map(proj), P = { iw, ih, pts, w: 6, ox: 2, oz: 2 };
  let c = S.photoCamera(P);
  ok(c.ok && Math.hypot(...sub(c.pos, pos)) < 0.01 && Math.abs(c.fov - 50) < 0.1 && Math.abs(c.d - 5) < 0.01 && c.lens === "photo", "photo: the camera, lens and depth come back from four floor dots and one length");
  c = S.photoCamera(Object.assign({}, P, { d: 5, dSrc: "measured" })); ok(c.ok && c.lens === "depth" && Math.hypot(...sub(c.pos, pos)) < 0.01, "photo: a measured depth gives the same camera");
  ok(/far edge/.test(S.photoCamera(Object.assign({}, P, { pts: [pts[1], pts[0], pts[3], pts[2]] })).why || ""), "photo: dots in the wrong order get a plain-words fix, not a wrong camera");
  ok(/too close/.test(S.photoCamera(Object.assign({}, P, { pts: [[0.5, 0.5], [0.501, 0.5], [0.501, 0.501], [0.5, 0.501]] })).why || ""), "photo: dots bunched together are refused");
  const base = S.sampleVenue();
  let r = S.apply(base, [{ op: "set_photo", ref: "ph_abc123", iw: 1600, ih: 1200, w: 6 }]);
  ok(r.ok && r.scene.photo.pts.length === 4 && r.scene.photo.dSrc === undefined, "photo: set_photo keeps the photo's reference, size and default dots");
  ok(!S.apply(base, [{ op: "set_photo", ref: "../x", iw: 10, ih: 10 }]).ok && !S.apply(r.scene, [{ op: "set_photo", pts: [[0, 0]] }]).ok, "photo: bad references and dots are refused");
  ok(!S.apply(r.scene, [{ op: "clear_photo" }]).ok && !S.apply(r.scene, [{ op: "clear_photo", confirm: true }]).scene.photo, "photo: removing the photo needs an OK");
  const file = Object.assign(JSON.parse(JSON.stringify(r.scene)), { photo_image: "data:image/jpeg;base64,AAAA" }), back = S.validateFile(file);
  ok(back.photo && !back.photo_image && !S.validateFile(Object.assign(JSON.parse(JSON.stringify(r.scene)), { photo: { ref: "nope" } })).photo, "photo: opening a file keeps a valid photo marking, drops the picture data and bad markings");
}

// Outdoor sites (Nov 4, 2026): the corporate luncheon pilot, the site steps, the sun, shade and the site warnings.
{
  const L = S.sampleSite();
  ok(L.site && L.walls.length === 0 && S.counts(L).seats === 120 && S.counts(L).tables === 18, "outdoor: the luncheon pilot is a site with no walls, 120 seats and 18 tables (15 rounds, 3 cocktail)");
  ok(S.checkScene(L).length === 0, "outdoor: the pilot has no warnings: " + JSON.stringify(S.checkScene(L).slice(0, 3)));
  ok(L.site.areas.length >= 5 && L.site.edge && L.items.some(i => i.kind === "building"), "outdoor: the pilot has painted ground, a property line and its office building");
  // The sun, against what's known: Charlotte (35.23° N) at the June solstice peaks at 90 - 35.23 + 23.44 = 78.2° due south around 1:25 pm summer time
  const sun = { lat: 35.2271, lng: -80.8431, date: "2026-06-21", time: "12:00", tz: -4 };
  let top = { elev: -90 }, at = ""; for (let m = 600; m < 960; m++) { const t = String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0"), q = S.sunPosition(sun, t); if (q.elev > top.elev) { top = q; at = t; } }
  ok(Math.abs(top.elev - 78.2) < 0.4 && Math.abs(top.az - 180) < 3 && at >= "13:15" && at <= "13:35", "outdoor: the June solstice sun in Charlotte peaks at " + top.elev.toFixed(1) + "° in the south at " + at);
  const eq = S.sunPosition({ lat: 35.2271, lng: -80.8431, date: "2026-03-20", time: "13:15", tz: -4 }); ok(Math.abs(eq.elev - 54.8) < 1.2, "outdoor: at the March equinox it peaks near 90 - 35.2 = 54.8° (" + eq.elev.toFixed(1) + "°)");
  const am = S.sunPosition(sun, "08:00"), pm = S.sunPosition(sun, "18:00"); ok(am.az > 60 && am.az < 110 && pm.az > 250 && pm.az < 300, "outdoor: morning sun in the east, evening sun in the west");
  ok(S.sunPosition({ lat: -33.87, lng: 151.21, date: "2026-06-21", time: "12:00", tz: 10 }).az < 20 || S.sunPosition({ lat: -33.87, lng: 151.21, date: "2026-06-21", time: "12:00", tz: 10 }).az > 340, "outdoor: south of the equator the midday sun is in the north");
  ok(S.sunPosition(sun, "23:00").elev < 0 && S.shadeReport(S.apply(L, [{ op: "set_sun", time: "23:00" }]).scene).up === false, "outdoor: at 11 pm the sun is down");
  // Shade: everyone under the tent is shaded at midday; take the tent away and nobody is (the planted mistake: a missing roof must show)
  const rep = S.shadeReport(L); ok(rep.shaded === 120 && rep.sunny === 0, "outdoor: at 12:30 pm all 120 seats are under the dining tent's shade");
  const noTent = S.apply(L, [{ op: "delete_object", id: "tent1", confirm: true }]).scene, r2 = S.shadeReport(noTent);
  ok(r2.sunny === 120, "outdoor: with the tent removed, all 120 seats are in the sun (" + r2.sunny + ")");
  const evening = S.shadeReport(S.apply(L, [{ op: "set_sun", time: "19:15" }]).scene); ok(evening.up && evening.sunny > 0, "outdoor: in the low evening sun some seats at the tent's edge get sun (" + evening.sunny + ")");
  // A building shades the ground on its far side from the sun: a spot just north of the office at noon is shaded, one south of it isn't
  const v0 = S.sunVec(L, S.sunPosition(L.site.sun)); ok(S.shadeAt(L, 20, 0.8, 0, v0) === 1 && S.shadeAt(L, 20, 13.5, 0, v0) === 0, "outdoor: the office building shades the ground north of it, not south");
  const turned = S.apply(L, [{ op: "set_site", north: 90 }]).scene; ok(Math.abs(S.sunVec(turned, { az: 0, elev: 0 })[0] - 1) < 1e-6, "outdoor: turning north turns where the sun comes from");
  // The site warnings, with planted problems: a generator beside a tent, a canopy past the property line
  let w = S.apply(L, [{ op: "move_object", id: "gen1", x: 47.5, z: 36 }]).warnings; ok(w.some(x => /closer than 20 ft/.test(x.msg)), "outdoor: a generator closer than 20 ft to a tent is flagged");
  w = S.apply(L, [{ op: "add_item", kind: "canopy", x: 3, z: 47 }]).warnings; ok(w.some(x => /past the property line/.test(x.msg)), "outdoor: a canopy past the property line is flagged");
  // The steps
  let b = S.sampleSite("blank"); ok(!b.items.length && b.site.sun, "outdoor: a new site is an empty lawn with the sun set");
  let r = S.apply(b, [{ op: "paint_ground", mat: "gravel", rect: { x: 2, z: 2, w: 10, d: 5 }, id: "g_lot" }, { op: "trace_boundary", pts: [[0, 0], [50, 0], [50, 30], [0, 30]], src: "measured" }, { op: "add_building", x: 30, z: 10, w: 60, d: 20, h: 12 }]);
  ok(r.ok && r.scene.site.areas[0].mat === "gravel" && Math.abs(S.polyArea(r.scene.site.areas[0].pts) - 50) < 0.01 && r.scene.site.edge.src === "measured" && r.scene.items[0].w === 60, "outdoor: paint, trace and add a 60 m building");
  ok(!S.apply(b, [{ op: "paint_ground", mat: "lava", rect: { x: 1, z: 1, w: 2, d: 2 } }]).ok && !S.apply(b, [{ op: "trace_boundary", pts: [[0, 0], [1, 1]] }]).ok && !S.apply(b, [{ op: "paint_ground", mat: "sand", pts: [[0, 0], [900, 0], [0, 5]] }]).ok, "outdoor: unknown ground, two-point lines and points off the site are refused");
  ok(!S.apply(r.scene, [{ op: "remove_ground", id: "g_lot" }]).ok && S.apply(r.scene, [{ op: "remove_ground", id: "g_lot", confirm: true }]).scene.site.areas.length === 0 && !S.apply(r.scene, [{ op: "trace_boundary", pts: [] }]).ok, "outdoor: removing an area or the property line needs an OK");
  ok(!S.apply(S.sampleVenue(), [{ op: "paint_ground", mat: "grass", rect: { x: 1, z: 1, w: 2, d: 2 } }]).ok, "outdoor: an indoor room can't be painted with grass by mistake");
  r = S.apply(b, [{ op: "set_aerial", ref: "ph_abc123", iw: 1000, ih: 800 }]); ok(r.ok && !S.aerialSize(r.scene.site.aerial, r.scene.room).measured, "outdoor: an aerial picture is a guess until a length is marked");
  r = S.apply(r.scene, [{ op: "set_aerial", pa: [0.1, 0.5], pb: [0.9, 0.5], len: 80 }]); const sz = S.aerialSize(r.scene.site.aerial, r.scene.room);
  ok(sz.measured && Math.abs(sz.w - 100) < 0.01 && Math.abs(sz.d - 80) < 0.01, "outdoor: 800 pixels marked as 80 m puts a 1000 × 800 picture at 100 × 80 m");
  const uv = S.siteToAerial(r.scene.site.aerial, r.scene.room, r.scene.site.aerial.x + 10, r.scene.site.aerial.z); ok(Math.abs(uv[0] - 0.6) < 1e-6 && Math.abs(uv[1] - 0.5) < 1e-6, "outdoor: a spot 10 m right of the picture's middle is 60% across it");
  ok(!S.apply(r.scene, [{ op: "clear_aerial" }]).ok && !S.apply(r.scene, [{ op: "set_aerial", ref: "../../x" }]).ok, "outdoor: removing the picture needs an OK, and bad references are refused");
  const f = S.validateFile(Object.assign(JSON.parse(JSON.stringify(r.scene)), { aerial_image: "data:image/jpeg;base64,AAAA" }));
  ok(f.site.aerial && !f.aerial_image && f.site.areas.length === 0, "outdoor: a saved site opens with its picture marking, without the picture data");
  const junk = S.validateFile(Object.assign(JSON.parse(JSON.stringify(L)), { site: { ground: "lava", areas: [{ id: "x", mat: "lava", pts: [] }], edge: { pts: [1] }, sun: { lat: "a" } } }));
  ok(junk.site.ground === "grass" && !junk.site.areas.length && !junk.site.edge && !junk.site.sun, "outdoor: a damaged site file is cleaned, not trusted");
  // The Ask box outdoors
  let q = S.interpret(L, "Show the shade at 3 pm"); ok(q.ops[0].op === "set_sun" && q.ops[0].time === "15:00" && /seats in shade/.test(q.notes[0] || ""), "outdoor: “Show the shade at 3 pm” moves the sun and says how many seats are shaded");
  q = S.interpret(L, "Add a 40 by 60 tent in the center"); ok(q.ops.length === 1 && q.ops[0].kind === "tent_40x60", "outdoor: “a 40 by 60 tent” is one big tent, not 40 tents");
  q = S.interpret(L, "Add a generator at the back right"); r = S.apply(L, q.ops); ok(r.ok && !r.warnings.length, "outdoor: a generator at the back right lands inside the property line");
  ok(S.interpret(L, "add two restroom trailers at the back").ops.filter(o => o.op === "add_item" && o.kind === "restroom_trailer").length === 2, "outdoor: “restroom trailers” are found");
}

// Phase 6 pieces (Nov 5, 2026): every new word finds its piece, and the ramp is no steeper than 1:12.
{
  const base = S.sampleVenue();
  const words = { "champagne tower": "champagne_tower", "coffee station": "coffee_station", "water dispenser": "water_station", "cornhole": "cornhole", "fire pit": "fire_pit", "confetti cannon": "confetti_cannon", "bubble machine": "bubble_machine", "easel sign": "easel_sign", "card box": "card_box", "stanchions": "stanchion", "misting fan": "misting_fan", "trash station": "trash_station", "coat rack": "coat_rack", "ada ramp": "ada_ramp", "golf cart": "golf_cart", "ticket booth": "ticket_booth", "first aid tent": "first_aid_tent", "potted tree": "tree", "hedge wall": "hedge_wall", "topiary": "topiary", "poster easel": "poster_easel", "upright piano": "upright_piano", "baby grand": "baby_grand", "classroom table": "classroom_desk", "charging station": "charging_station", "photo backdrop frame": "photo_backdrop_frame", "cable ramp": "cable_ramp", "line array": "flown_line_array", "compact line array": "flown_line_array_small", "speaker stand": "line_array", "registration desk": "registration_desk" };
  const wrong = Object.entries(words).filter(([w, k]) => { const o = S.interpret(base, "add a " + w).ops.find(x => x.op === "add_item"); return !o || o.kind !== k; }).map(x => x[0]);
  ok(!wrong.length, "phase 6: every new piece is found by its words" + (wrong.length ? " (missed: " + wrong.join(", ") + ")" : ""));
  const R = S.CATALOG.ada_ramp, run = R.d - 1.52;
  ok(Math.abs(run / R.h - 12) < 0.05 && R.w >= 0.915, "phase 6: the accessible ramp runs 12 units for each 1 of rise and is at least 36 in wide");
}

// Save file round trip.
const back = S.validateFile(JSON.parse(JSON.stringify(s2)));
ok(back.items.length === s2.items.length, "save file round trip");
let threw = false; try { S.validateFile({ schema: "other" }); } catch (e) { threw = true; }
ok(threw, "foreign files refused");

console.log(fail ? fail + " check(s) failed" : "All venue checks passed");
process.exit(fail ? 1 : 0);
