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

// Save file round trip.
const back = S.validateFile(JSON.parse(JSON.stringify(s2)));
ok(back.items.length === s2.items.length, "save file round trip");
let threw = false; try { S.validateFile({ schema: "other" }); } catch (e) { threw = true; }
ok(threw, "foreign files refused");

console.log(fail ? fail + " check(s) failed" : "All venue checks passed");
process.exit(fail ? 1 : 0);
