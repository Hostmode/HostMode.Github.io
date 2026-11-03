// Host Mode 3D venue: the scene model and its validated commands.
// No drawing code here, so it runs (and is tested) in plain Node: node agents/venue3d_test.mjs
// Units: meters inside the scene, angles in degrees. The editor shows feet and inches by default.
// Every change goes through apply(scene, ops): one batch = one undo step. Nothing here runs model-written code.

export const SCHEMA = "hostmode.venue3d", VERSION = 1;
export const FT = 0.3048;

// Dimension sources, so a reconstructed venue never passes guesses off as measurements.
export const DIM_SRC = ["measured", "confirmed", "estimated", "unknown"];

export const MATERIALS = {
  wood:     { label: "Wood",     color: "#8a5a35", rough: 0.6, metal: 0 },
  oak:      { label: "Light oak", color: "#c49a6c", rough: 0.55, metal: 0 },
  concrete: { label: "Concrete", color: "#9a9a96", rough: 0.9, metal: 0 },
  tile:     { label: "Tile",     color: "#e6e2da", rough: 0.35, metal: 0 },
  carpet:   { label: "Carpet",   color: "#5a2f3f", rough: 1, metal: 0 },
  glass:    { label: "Glass",    color: "#bcd8e6", rough: 0.05, metal: 0, opacity: 0.35 },
  metal:    { label: "Metal",    color: "#b9bcc2", rough: 0.3, metal: 1 },
  gold:     { label: "Gold",     color: "#c9a24a", rough: 0.3, metal: 1 },
  fabric:   { label: "Fabric",   color: "#f4f1ea", rough: 0.95, metal: 0 },
  paint:    { label: "Paint",    color: "#efe9df", rough: 0.85, metal: 0 },
  stone:    { label: "Stone",    color: "#b5aea3", rough: 0.8, metal: 0 },
  marble:   { label: "Marble",   color: "#f1efe9", rough: 0.2, metal: 0 },
  parquet:  { label: "Dance floor", color: "#2a2a2e", rough: 0.15, metal: 0.2 },
  velvet:   { label: "Velvet",   color: "#2a1b4d", rough: 1, metal: 0 }
};

// The reusable asset library. Sizes are meters (w = across, d = deep, h = tall). All shapes are drawn
// from simple parts in editor.js, so there are no third-party models or textures to license.
export const CATALOG = {
  table_round:   { label: "Round table (60 in)", cat: "Tables", w: 1.52, d: 1.52, h: 0.76, mat: "fabric", seats: 8 },
  table_round72: { label: "Round table (72 in)", cat: "Tables", w: 1.83, d: 1.83, h: 0.76, mat: "fabric", seats: 10 },
  table_rect:    { label: "Rectangular table (6 ft)", cat: "Tables", w: 1.83, d: 0.76, h: 0.76, mat: "fabric", seats: 6 },
  table_banquet: { label: "Banquet table (8 ft)", cat: "Tables", w: 2.44, d: 0.76, h: 0.76, mat: "fabric", seats: 8 },
  table_cocktail:{ label: "Cocktail table", cat: "Tables", w: 0.76, d: 0.76, h: 1.07, mat: "fabric" },
  chair:         { label: "Chiavari chair", cat: "Seating", w: 0.42, d: 0.45, h: 0.9, mat: "gold" },
  chair_folding: { label: "Folding chair", cat: "Seating", w: 0.45, d: 0.48, h: 0.82, mat: "metal" },
  sofa:          { label: "Sofa", cat: "Seating", w: 2.0, d: 0.9, h: 0.85, mat: "velvet" },
  lounge_chair:  { label: "Lounge chair", cat: "Seating", w: 0.85, d: 0.85, h: 0.8, mat: "velvet" },
  stage:         { label: "Stage", cat: "Stage & floor", w: 6.1, d: 3.66, h: 0.6, mat: "wood", floor: true },
  dance_floor:   { label: "Dance floor", cat: "Stage & floor", w: 4.88, d: 4.88, h: 0.03, mat: "parquet", floor: true },
  podium:        { label: "Podium", cat: "Stage & floor", w: 0.6, d: 0.5, h: 1.15, mat: "wood" },
  bar:           { label: "Bar", cat: "Food & drink", w: 2.44, d: 0.7, h: 1.07, mat: "wood" },
  buffet:        { label: "Buffet table", cat: "Food & drink", w: 2.44, d: 0.76, h: 0.76, mat: "fabric" },
  food_station:  { label: "Food station", cat: "Food & drink", w: 1.83, d: 0.9, h: 0.9, mat: "metal" },
  cake_table:    { label: "Cake table", cat: "Food & drink", w: 0.9, d: 0.9, h: 0.76, mat: "fabric" },
  backdrop:      { label: "Backdrop", cat: "Decor", w: 2.44, d: 0.1, h: 2.44, mat: "fabric" },
  arch:          { label: "Floral arch", cat: "Decor", w: 2.1, d: 0.4, h: 2.4, mat: "gold" },
  centerpiece:   { label: "Centerpiece", cat: "Decor", w: 0.3, d: 0.3, h: 0.45, mat: "glass" },
  plant:         { label: "Potted plant", cat: "Decor", w: 0.6, d: 0.6, h: 1.4, mat: "stone" },
  balloon_arch:  { label: "Balloon garland", cat: "Decor", w: 2.4, d: 0.6, h: 2.2, mat: "fabric" },
  speaker:       { label: "Speaker", cat: "Audio & video", w: 0.5, d: 0.45, h: 1.6, mat: "metal" },
  dj_booth:      { label: "DJ booth", cat: "Audio & video", w: 1.8, d: 0.7, h: 1.07, mat: "metal" },
  screen:        { label: "Projector screen", cat: "Audio & video", w: 3.0, d: 0.15, h: 2.3, mat: "fabric" },
  light_truss:   { label: "Light truss", cat: "Lighting", w: 3.0, d: 0.3, h: 2.8, mat: "metal" },
  uplight:       { label: "Uplight", cat: "Lighting", w: 0.25, d: 0.25, h: 0.25, mat: "metal" },
  column:        { label: "Column", cat: "Structure", w: 0.5, d: 0.5, h: 3.6, mat: "stone", structure: true }
};
export const KINDS = Object.keys(CATALOG);
export const LIGHT_KINDS = ["point", "spot", "sun", "ambient"];

const r2 = n => Math.round(n * 1000) / 1000;
const isNum = n => typeof n === "number" && isFinite(n);
export const uid = (p) => p + Math.random().toString(36).slice(2, 8);
export const clone = o => JSON.parse(JSON.stringify(o));

// Kelvin to a hex color, so planners can ask for "warm" (2700 K) or "daylight" (5600 K).
export function kelvinHex(k) {
  const t = Math.max(1000, Math.min(12000, k)) / 100;
  let r, g, b;
  r = t <= 66 ? 255 : 329.698727446 * Math.pow(t - 60, -0.1332047592);
  g = t <= 66 ? 99.4708025861 * Math.log(t) - 161.1195681661 : 288.1221695283 * Math.pow(t - 60, -0.0755148492);
  b = t >= 66 ? 255 : t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  const c = v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return "#" + c(r) + c(g) + c(b);
}

export const COLORS = {
  white: "#f7f5f0", ivory: "#f3ead6", black: "#1b1b1f", navy: "#16255a", orange: "#f6892f", green: "#2f8a4c",
  gold: "#c9a24a", silver: "#c0c3c8", red: "#b3263a", burgundy: "#6d1a2e", pink: "#f1a7bd", blush: "#efc7c2",
  purple: "#6b3fa0", "dark purple": "#3b1d5e", lavender: "#b9a6dc", blue: "#2f6fd1", "light blue": "#a9cbe8",
  teal: "#1f8a8a", sage: "#9cae8f", "emerald": "#1d6b47", yellow: "#f2c94c", champagne: "#e8d6b3",
  grey: "#8d8f94", gray: "#8d8f94", brown: "#6b4426", cream: "#efe6d2", rose: "#d67b8a"
};

// ---------- A new venue ----------
export function sampleVenue() {
  const W = 18.3, D = 13.7, H = 4.3; // about 60 x 45 ft with 14 ft ceilings
  const s = {
    schema: SCHEMA, version: VERSION, id: uid("v_"), name: "Sample ballroom", units: "ft",
    created: Date.now(), updated: Date.now(),
    room: { w: W, d: D, h: H, floor: "oak", walls: "paint", ceiling: "paint", wallColor: "#efe6d8", dimSrc: { w: "confirmed", d: "confirmed", h: "estimated" } },
    walls: [], openings: [], items: [], lights: [], views: []
  };
  // Four walls, corners going round the room. The front wall (z = 0) is where a stage goes by default.
  const c = [[0, 0], [W, 0], [W, D], [0, D]];
  ["Front wall", "Right wall", "Back wall", "Left wall"].forEach((name, i) =>
    s.walls.push({ id: "w" + (i + 1), name, a: c[i], b: c[(i + 1) % 4], h: H, t: 0.2, mat: "paint", color: "#efe6d8" }));
  s.openings.push({ id: "o1", type: "door", wall: "w3", at: W / 2, w: 1.83, h: 2.44, sill: 0, name: "Main doors" });
  s.openings.push({ id: "o2", type: "door", wall: "w2", at: 2.5, w: 0.91, h: 2.13, sill: 0, name: "Service door" });
  [3, 6.85, 10.7].forEach((at, i) => s.openings.push({ id: "o" + (3 + i), type: "window", wall: "w4", at, w: 1.5, h: 2.0, sill: 0.9 }));
  [4, 9.15, 14.3].forEach((at, i) => s.openings.push({ id: "o" + (6 + i), type: "window", wall: "w3", at: at === 9.15 ? 13.5 : at, w: 1.5, h: 2.0, sill: 0.9 }));
  s.items.push(mkItem("stage", W / 2, 1.83 + 0.2, 0, { id: "stage1" }));
  s.items.push(mkItem("dance_floor", W / 2, D / 2 + 0.3, 0, { id: "dance1" }));
  // Six round tables with eight chairs each, two rows either side of the dance floor.
  [[3.4, 5.3], [3.4, 9.2], [14.9, 5.3], [14.9, 9.2], [6.2, 11.8], [12.1, 11.8]].forEach(([x, z], i) => {
    const t = mkItem("table_round", x, z, 0, { id: "t" + (i + 1), color: "#f7f5f0", label: "Table " + (i + 1) });
    s.items.push(t); s.items.push(...chairsAround(t, 8));
  });
  s.items.push(mkItem("bar", W - 1.2, D - 3.2, -90, { id: "bar1" }));
  s.lights.push({ id: "L0", kind: "ambient", color: "#ffffff", intensity: 0.35, name: "Room fill" });
  s.lights.push({ id: "L1", kind: "sun", x: -6, y: 9, z: 4, color: kelvinHex(5600), intensity: 1.2, name: "Daylight" });
  [[W / 4, D / 3], [3 * W / 4, D / 3], [W / 4, 2 * D / 3], [3 * W / 4, 2 * D / 3]].forEach(([x, z], i) =>
    s.lights.push({ id: "L" + (2 + i), kind: "point", x, y: H - 0.3, z, color: kelvinHex(3000), intensity: 6, range: 12, name: "Chandelier " + (i + 1) }));
  s.lights.push({ id: "L6", kind: "spot", x: W / 2, y: H - 0.2, z: 5, tx: W / 2, ty: 0.6, tz: 1.8, color: kelvinHex(4200), intensity: 30, angle: 35, name: "Stage wash" });
  s.views = [
    { id: "vw1", name: "From the doors", pos: [W / 2, 1.65, D - 0.8], target: [W / 2, 1.2, 2] },
    { id: "vw2", name: "From the stage", pos: [W / 2, 2.2, 2], target: [W / 2, 0.8, D - 2] }
  ];
  return s;
}

export function mkItem(kind, x, z, rot = 0, extra = {}) {
  const c = CATALOG[kind];
  return Object.assign({ id: uid("i_"), kind, x: r2(x), z: r2(z), y: 0, rot: r2(rot), w: c.w, d: c.d, h: c.h, mat: c.mat, color: null }, extra);
}

export function chairsAround(t, n, kind = "chair") {
  const out = [], rad = Math.max(t.w, t.d) / 2 + 0.32;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2;
    // The chair's back faces away from the table: rot points its front (+z) at the table center.
    const x = t.x + Math.sin(a) * rad, z = t.z + Math.cos(a) * rad;
    out.push(mkItem(kind, x, z, (a * 180 / Math.PI) + 180, { group: t.id }));
  }
  return out;
}

// ---------- Geometry helpers ----------
export function footprint(it) {
  // Rotated rectangle's axis-aligned box: good enough for "does this bump into that" at event-planning scale.
  const a = it.rot * Math.PI / 180, c = Math.abs(Math.cos(a)), s = Math.abs(Math.sin(a));
  const hw = (it.w * c + it.d * s) / 2, hd = (it.w * s + it.d * c) / 2;
  return { x0: it.x - hw, x1: it.x + hw, z0: it.z - hd, z1: it.z + hd };
}
const overlap = (A, B, pad = 0) => A.x0 < B.x1 - pad && A.x1 > B.x0 + pad && A.z0 < B.z1 - pad && A.z1 > B.z0 + pad;

// Which items sit on the floor layer (stage, dance floor) vs stand on it. Things can stand on floors and stages.
const isFloorLayer = it => !!(CATALOG[it.kind] || {}).floor;

export function collisions(scene, it) {
  if (isFloorLayer(it)) {
    return scene.items.filter(o => o.id !== it.id && isFloorLayer(o) && overlap(footprint(o), footprint(it), 0.05)).map(o => o.id);
  }
  const f = footprint(it);
  return scene.items.filter(o => o.id !== it.id && !isFloorLayer(o) && o.group !== it.id && it.group !== o.id &&
    !(it.group && it.group === o.group) && overlap(footprint(o), f, 0.02)).map(o => o.id);
}

export function inRoom(scene, it) {
  const f = footprint(it), R = scene.room;
  return f.x0 >= -0.01 && f.z0 >= -0.01 && f.x1 <= R.w + 0.01 && f.z1 <= R.d + 0.01 && it.h <= R.h;
}

export function wallLen(w) { return Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]); }

// Named places in the room, for "front", "left", "center"... Front = the stage wall (z = 0) unless a stage says otherwise.
export function place(scene, where) {
  const R = scene.room, m = 1.2;
  const map = {
    center: [R.w / 2, R.d / 2], middle: [R.w / 2, R.d / 2],
    front: [R.w / 2, m], back: [R.w / 2, R.d - m], rear: [R.w / 2, R.d - m],
    left: [m, R.d / 2], right: [R.w - m, R.d / 2],
    "front left": [m, m], "front right": [R.w - m, m], "back left": [m, R.d - m], "back right": [R.w - m, R.d - m]
  };
  return map[where] || null;
}

// ---------- Commands ----------
// Each op: { op: "add_item", ...args }. apply() checks every op, applies them to a copy, and only returns
// the new scene if every op passed. Destructive ops need confirm: true (the editor asks the person first).
export const OPS = {
  set_room:     "w, d, h (meters), floor/walls/ceiling material, wallColor, dimSrc",
  add_wall:     "a [x,z], b [x,z], h, t",
  add_opening:  "type door|window, wall id, at (meters from wall start), w, h, sill",
  add_item:     "kind, x, z, rot, w/d/h optional, color, mat, label",
  move_object:  "id, x and/or z (absolute) or dx/dz, or where (center|front|back|left|right...)",
  rotate_object:"id, rot (absolute degrees) or by (relative)",
  resize_object:"id, w/d/h (meters) or scale",
  duplicate_object: "id, dx, dz",
  delete_object:"id or kind, confirm: true",
  change_material: "id or kind or 'floor'|'walls'|'ceiling', mat, color",
  add_light:    "kind point|spot|sun|ambient, x,y,z, color or kelvin, intensity",
  modify_lighting: "id or 'all' or near (item id), intensity, color, kelvin, scale",
  arrange_tables: "kind, count, chairs, around (item id) or rows, spacing",
  save_view:    "name, pos, target"
};

export function apply(scene, ops, opts = {}) {
  if (!Array.isArray(ops)) ops = [ops];
  const s = clone(scene), log = [], errors = [];
  for (const o of ops) {
    if (!o || typeof o.op !== "string" || !OPS[o.op]) { errors.push("I don't know the step " + JSON.stringify(o && o.op)); continue; }
    try {
      const r = RUN[o.op](s, o, opts);
      if (r && r.error) errors.push(r.error); else if (r) log.push(r);
    } catch (e) { errors.push(o.op + ": " + e.message); }
  }
  if (errors.length && !opts.partial) return { ok: false, errors, log, scene };
  s.updated = Date.now();
  const warnings = checkScene(s);
  return { ok: true, scene: s, log, errors, warnings };
}

function need(o, k) { if (o[k] == null) throw new Error("needs " + k); return o[k]; }
function num(v, lo, hi, what) { if (!isNum(v) || v < lo || v > hi) throw new Error(what + " must be between " + lo + " and " + hi); return r2(v); }
function findIt(s, id) { const it = s.items.find(i => i.id === id) || s.lights.find(l => l.id === id); if (!it) throw new Error("there's no object called " + id); return it; }
const label = it => it.label || (CATALOG[it.kind] ? CATALOG[it.kind].label : it.name || it.kind);
function checkColor(c) { if (c == null) return null; const v = COLORS[String(c).toLowerCase()] || c; if (!/^#[0-9a-f]{6}$/i.test(v)) throw new Error("unknown color " + c); return v; }
function moveGroup(s, it, dx, dz) { s.items.forEach(o => { if (o.group === it.id) { o.x = r2(o.x + dx); o.z = r2(o.z + dz); } }); }

const RUN = {
  set_room(s, o) {
    const R = s.room;
    ["w", "d", "h"].forEach(k => { if (o[k] != null) R[k] = num(o[k], 2, 200, "room " + k); });
    ["floor", "walls", "ceiling"].forEach(k => { if (o[k] != null) { if (!MATERIALS[o[k]]) throw new Error("unknown material " + o[k]); R[k] = o[k]; } });
    if (o.wallColor) R.wallColor = checkColor(o.wallColor);
    if (o.dimSrc) Object.entries(o.dimSrc).forEach(([k, v]) => { if (!DIM_SRC.includes(v)) throw new Error("dimension source must be " + DIM_SRC.join("/")); R.dimSrc[k] = v; });
    if (o.w != null || o.d != null) {
      const W = R.w, D = R.d, c = [[0, 0], [W, 0], [W, D], [0, D]];
      s.walls.slice(0, 4).forEach((w, i) => { w.a = c[i]; w.b = c[(i + 1) % 4]; });
    }
    if (o.h != null) s.walls.forEach(w => w.h = R.h);
    return "Room set to " + fmtLen(R.w) + " by " + fmtLen(R.d) + ", " + fmtLen(R.h) + " high";
  },
  add_wall(s, o) {
    const a = need(o, "a"), b = need(o, "b");
    const w = { id: o.id || uid("w_"), name: o.name || "Wall", a: a.map(r2), b: b.map(r2), h: num(o.h ?? s.room.h, 0.3, 30, "wall height"), t: num(o.t ?? 0.15, 0.05, 2, "wall thickness"), mat: "paint", color: s.room.wallColor };
    if (wallLen(w) < 0.2) throw new Error("that wall is too short");
    s.walls.push(w); return "Added " + w.name.toLowerCase() + " (" + fmtLen(wallLen(w)) + ")";
  },
  add_opening(s, o) {
    const type = need(o, "type"); if (!["door", "window"].includes(type)) throw new Error("opening must be door or window");
    const w = s.walls.find(x => x.id === need(o, "wall")); if (!w) throw new Error("no wall " + o.wall);
    const op = { id: o.id || uid("o_"), type, wall: w.id, at: r2(o.at ?? wallLen(w) / 2), w: num(o.w ?? (type === "door" ? 0.91 : 1.2), 0.3, 10, "width"), h: num(o.h ?? (type === "door" ? 2.13 : 1.5), 0.3, 10, "height"), sill: r2(o.sill ?? (type === "door" ? 0 : 0.9)) };
    if (op.at - op.w / 2 < 0 || op.at + op.w / 2 > wallLen(w)) throw new Error("that " + type + " doesn't fit on " + w.name);
    if (op.sill + op.h > w.h) throw new Error("that " + type + " is taller than the wall");
    s.openings.push(op); return "Added a " + type + " on the " + w.name.toLowerCase();
  },
  add_item(s, o) {
    const kind = need(o, "kind"); if (!CATALOG[kind]) throw new Error("the library has no " + kind);
    let x = o.x, z = o.z;
    if (o.where) { const p = place(s, o.where); if (!p) throw new Error("I don't know where " + o.where + " is"); [x, z] = p; }
    const it = mkItem(kind, num(x ?? s.room.w / 2, -1, s.room.w + 1, "x"), num(z ?? s.room.d / 2, -1, s.room.d + 1, "z"), o.rot || 0, { id: o.id || uid("i_") });
    ["w", "d", "h"].forEach(k => { if (o[k] != null) it[k] = num(o[k], 0.05, 40, k); });
    if (o.color) it.color = checkColor(o.color);
    if (o.mat) { if (!MATERIALS[o.mat]) throw new Error("unknown material " + o.mat); it.mat = o.mat; }
    if (o.label) it.label = String(o.label).slice(0, 40);
    if (o.group) it.group = o.group;
    if (o.where) snapInside(s, it, o.where);
    s.items.push(it);
    if (o.chairs) s.items.push(...chairsAround(it, Math.min(+o.chairs, 14), o.chairKind || "chair"));
    return "Added " + label(it).toLowerCase() + (o.chairs ? " with " + o.chairs + " chairs" : "");
  },
  move_object(s, o) {
    const it = findIt(s, need(o, "id")); let x = it.x, z = it.z;
    if (o.where) { const p = place(s, o.where); if (!p) throw new Error("I don't know where " + o.where + " is"); [x, z] = p; }
    if (o.x != null) x = o.x; if (o.z != null) z = o.z;
    if (o.dx != null) x += o.dx; if (o.dz != null) z += o.dz;
    if (o.y != null && it.kind !== undefined) it.y = num(o.y, 0, 30, "height off the floor");
    const dx = x - it.x, dz = z - it.z; it.x = r2(x); it.z = r2(z);
    if (o.where && it.w) snapInside(s, it, o.where);
    if (it.w) moveGroup(s, it, it.x - (it.x - dx), it.z - (it.z - dz));
    if (it.kind && LIGHT_KINDS.includes(it.kind)) { if (o.y != null) it.y = o.y; }
    return "Moved " + label(it).toLowerCase() + (o.where ? " to the " + o.where : "");
  },
  rotate_object(s, o) {
    const it = findIt(s, need(o, "id")); const old = it.rot || 0;
    it.rot = r2(((o.rot != null ? o.rot : old + (o.by || 0)) % 360 + 360) % 360);
    const da = (it.rot - old) * Math.PI / 180;
    s.items.forEach(c => { if (c.group === it.id) { const rx = c.x - it.x, rz = c.z - it.z; c.x = r2(it.x + rx * Math.cos(da) + rz * Math.sin(da)); c.z = r2(it.z - rx * Math.sin(da) + rz * Math.cos(da)); c.rot = r2(c.rot + (it.rot - old)); } });
    return "Turned " + label(it).toLowerCase() + " to " + Math.round(it.rot) + "°";
  },
  resize_object(s, o) {
    const it = findIt(s, need(o, "id")); if (!it.w) throw new Error("that can't be resized");
    if (o.scale != null) { const k = num(o.scale, 0.1, 10, "scale"); it.w = r2(it.w * k); it.d = r2(it.d * k); if (!isFloorLayer(it)) it.h = r2(it.h * k); }
    ["w", "d", "h"].forEach(k => { if (o[k] != null) it[k] = num(o[k], 0.05, 40, k); });
    return "Resized " + label(it).toLowerCase() + " to " + fmtLen(it.w) + " × " + fmtLen(it.d);
  },
  duplicate_object(s, o) {
    const it = findIt(s, need(o, "id")); if (!it.w) throw new Error("only furniture can be copied this way");
    const n = clone(it); n.id = uid("i_"); n.x = r2(it.x + (o.dx ?? it.w + 0.5)); n.z = r2(it.z + (o.dz ?? 0)); delete n.group;
    s.items.push(n);
    s.items.filter(c => c.group === it.id).forEach(c => { const k = clone(c); k.id = uid("i_"); k.group = n.id; k.x = r2(c.x + n.x - it.x); k.z = r2(c.z + n.z - it.z); s.items.push(k); });
    return "Copied " + label(it).toLowerCase();
  },
  delete_object(s, o) {
    if (!o.confirm) return { error: "Deleting needs your OK first" };
    const ids = o.id ? [o.id] : s.items.filter(i => i.kind === o.kind).map(i => i.id);
    if (!ids.length) throw new Error("nothing to delete");
    const gone = new Set(ids); s.items.forEach(c => { if (gone.has(c.group)) gone.add(c.id); });
    const n = s.items.length + s.lights.length;
    s.items = s.items.filter(i => !gone.has(i.id)); s.lights = s.lights.filter(l => !gone.has(l.id));
    return "Removed " + (n - s.items.length - s.lights.length) + " object" + (n - s.items.length - s.lights.length === 1 ? "" : "s");
  },
  change_material(s, o) {
    const mat = o.mat; if (mat && !MATERIALS[mat]) throw new Error("unknown material " + mat);
    const color = checkColor(o.color);
    if (["floor", "walls", "ceiling"].includes(o.id || o.target)) {
      const k = o.id || o.target; if (mat) s.room[k] = mat;
      if (color && k === "walls") { s.room.wallColor = color; s.walls.forEach(w => w.color = color); }
      if (color && k !== "walls") s.room[k + "Color"] = color;
      return "Changed the " + k;
    }
    const list = o.id ? [findIt(s, o.id)] : s.items.filter(i => i.kind === o.kind || (o.kind === "tables" && i.kind.startsWith("table")) || (o.kind === "chairs" && i.kind.startsWith("chair")));
    if (!list.length) throw new Error("nothing matched");
    list.forEach(it => { if (mat) it.mat = mat; if (color) it.color = color; });
    return "Changed " + list.length + " " + (list.length === 1 ? label(list[0]).toLowerCase() : "objects");
  },
  add_light(s, o) {
    const kind = need(o, "kind"); if (!LIGHT_KINDS.includes(kind)) throw new Error("light must be " + LIGHT_KINDS.join("/"));
    const L = { id: o.id || uid("L_"), kind, x: r2(o.x ?? s.room.w / 2), y: r2(o.y ?? s.room.h - 0.3), z: r2(o.z ?? s.room.d / 2),
      color: o.kelvin ? kelvinHex(o.kelvin) : (checkColor(o.color) || "#ffffff"), intensity: num(o.intensity ?? (kind === "spot" ? 20 : kind === "point" ? 4 : 1), 0, 500, "brightness"),
      range: o.range || 8, angle: o.angle || 30, name: o.name || ({ point: "Light", spot: "Spotlight", sun: "Sun", ambient: "Fill" })[kind] };
    if (kind === "spot") { L.tx = o.tx ?? L.x; L.ty = o.ty ?? 0; L.tz = o.tz ?? L.z; }
    if (o.kelvin) L.kelvin = o.kelvin;
    s.lights.push(L); return "Added " + L.name.toLowerCase();
  },
  modify_lighting(s, o) {
    let list = o.id === "all" || !o.id ? s.lights.slice() : [findIt(s, o.id)];
    if (o.kind) list = list.filter(l => l.kind === o.kind);
    if (!list.length) throw new Error("no lights matched");
    list.forEach(L => {
      if (o.intensity != null) L.intensity = num(o.intensity, 0, 500, "brightness");
      if (o.scale != null) L.intensity = r2(L.intensity * num(o.scale, 0, 10, "scale"));
      if (o.kelvin) { L.kelvin = num(o.kelvin, 1000, 12000, "color temperature"); L.color = kelvinHex(L.kelvin); }
      if (o.color) L.color = checkColor(o.color);
    });
    return "Adjusted " + list.length + " light" + (list.length === 1 ? "" : "s");
  },
  arrange_tables(s, o) {
    const kind = o.kind || "table_round", count = Math.round(num(o.count, 1, 60, "number of tables")), chairs = o.chairs == null ? (CATALOG[kind].seats || 0) : Math.round(num(o.chairs, 0, 14, "chairs"));
    if (!CATALOG[kind] || !kind.startsWith("table")) throw new Error("arrange_tables needs a table kind");
    if (o.replace !== false) { // Clear existing tables of that kind and their chairs, as one step the person can undo.
      const same = k => k === kind || (kind.startsWith("table_round") && k.startsWith("table_round"));
      const old = new Set(s.items.filter(i => same(i.kind)).map(i => i.id));
      s.items = s.items.filter(i => !old.has(i.id) && !old.has(i.group));
    }
    const c = CATALOG[kind], R = s.room;
    // A table with its chairs takes about this much floor; keep an aisle between neighbors so people can walk.
    const foot = (c.seats || chairs ? Math.max(c.w, c.d) + 1.1 : Math.max(c.w, c.d) + 0.3), aisle = o.spacing ?? 0.6, edge = 0.3;
    const center = o.around ? findIt(s, o.around) : null;
    const cx = center ? center.x : R.w / 2, cz = center ? center.z : R.d / 2;
    // Candidate spots on a fine grid, nearest to the center first, so tables gather around it
    // (or fill the room evenly from the middle when nothing is named).
    // Tables go on an even lattice (rows the way a banquet captain sets them). Try several lattice offsets and
    // keep whichever fits the most tables, then use the spots nearest the center.
    const pitch = foot + aisle, boxAt = (x, z) => ({ x0: x - foot / 2, x1: x + foot / 2, z0: z - foot / 2, z1: z + foot / 2 });
    const free = (x, z) => { const b = boxAt(x, z); return b.x0 >= edge && b.z0 >= edge && b.x1 <= R.w - edge && b.z1 <= R.d - edge && !s.items.some(i => overlap(footprint(i), b, -edge)); };
    let spots = [];
    for (let ox = 0; ox < pitch; ox += 0.25) for (let oz = 0; oz < pitch; oz += 0.25) {
      const got = [];
      for (let x = ox + foot / 2; x <= R.w; x += pitch) for (let z = oz + foot / 2; z <= R.d; z += pitch) if (free(x, z)) got.push([x, z]);
      if (got.length > spots.length || (got.length === spots.length && got.length >= count)) {
        got.sort((p, q) => Math.hypot(p[0] - cx, p[1] - cz) - Math.hypot(q[0] - cx, q[1] - cz));
        const score = g => g.slice(0, count).reduce((a, p) => a + Math.hypot(p[0] - cx, p[1] - cz), 0);
        if (got.length > spots.length || score(got) < score(spots)) spots = got;
      }
    }
    const placed = [];
    let made = 0;
    for (const [x, z] of spots) {
      if (made >= count) break;
      const box = boxAt(x, z);
      if (placed.some(b => overlap(b, box, -aisle + 0.01))) continue;
      const t = mkItem(kind, x, z, 0, { label: "Table " + (made + 1) });
      if (o.color) t.color = checkColor(o.color);
      s.items.push(t); if (chairs) s.items.push(...chairsAround(t, chairs)); placed.push(box); made++;
    }
    if (made < count) return { error: "Only " + made + " of " + count + " tables fit with space to walk between them. Try fewer tables, smaller tables, or a bigger room." };
    return "Arranged " + made + " " + c.label.toLowerCase().replace(/ \(.*\)/, "") + "s" + (chairs ? " with " + chairs + " chairs each" : "") + (center ? " around the " + label(center).toLowerCase() : "");
  },
  save_view(s, o) { s.views.push({ id: uid("vw_"), name: String(need(o, "name")).slice(0, 40), pos: need(o, "pos").map(r2), target: need(o, "target").map(r2) }); return "Saved the view " + o.name; }
};

// Keep an item inside the room when it's sent to a named spot (a stage sent "front" sits against the front wall).
function snapInside(s, it, where) {
  const f = footprint(it), R = s.room, m = 0.25;
  if (/front/.test(where)) it.z = r2(it.z - f.z0 + m);
  if (/back|rear/.test(where)) it.z = r2(it.z + (R.d - m - f.z1));
  if (/left/.test(where)) it.x = r2(it.x - f.x0 + m);
  if (/right/.test(where)) it.x = r2(it.x + (R.w - m - f.x1));
  if (it.kind === "stage" && /front|back/.test(where)) it.rot = /back/.test(where) ? 180 : 0;
}

// Problems worth showing after a change: things outside the room or bumping into each other.
export function checkScene(s) {
  const w = [];
  s.items.forEach(it => {
    if (!inRoom(s, it)) w.push({ id: it.id, msg: label(it) + " is outside the room" });
  });
  const seen = new Set();
  s.items.forEach(it => {
    if (it.group) return;
    collisions(s, it).forEach(o => { const k = [it.id, o].sort().join("|"); if (!seen.has(k)) { seen.add(k); w.push({ id: it.id, msg: label(it) + " overlaps " + label(s.items.find(i => i.id === o)) }); } });
  });
  return w;
}

// Load a file someone saved or exported, refusing anything that isn't a Host Mode venue.
export function validateFile(obj) {
  if (!obj || obj.schema !== SCHEMA) throw new Error("This isn't a Host Mode venue file");
  if (obj.version > VERSION) throw new Error("This venue was saved by a newer version of Host Mode");
  if (!obj.room || !Array.isArray(obj.items) || !Array.isArray(obj.walls)) throw new Error("This venue file is missing parts");
  obj.items = obj.items.filter(i => CATALOG[i.kind] && isNum(i.x) && isNum(i.z));
  obj.lights = (obj.lights || []).filter(l => LIGHT_KINDS.includes(l.kind));
  obj.openings = obj.openings || []; obj.views = obj.views || [];
  return obj;
}

export function counts(s) {
  const c = {}; s.items.forEach(i => c[i.kind] = (c[i.kind] || 0) + 1);
  const seats = s.items.filter(i => i.kind.startsWith("chair")).length;
  return { by: c, seats, tables: s.items.filter(i => i.kind.startsWith("table")).length };
}

export function fmtLen(m, units = "ft") {
  if (units === "m") return (Math.round(m * 100) / 100) + " m";
  const inches = Math.round(m / FT * 12); const f = Math.floor(inches / 12), i = inches % 12;
  return i ? f + "′ " + i + "″" : f + "′";
}

// ---------- Plain-language instructions (free, works offline) ----------
// Turns common requests into the same validated ops an AI model would send. Anything it can't read is
// reported back instead of guessed. A model (Claude) can send ops JSON directly through the same apply().
const NUMS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, fifteen: 15, twenty: 20 };
const KIND_WORDS = [
  [/round tables?|guest tables?|tables?(?! cloth)/, "table_round"], [/banquet tables?|long tables?/, "table_banquet"], [/cocktail tables?|high ?tops?/, "table_cocktail"],
  [/buffet( tables?)?/, "buffet"], [/stage/, "stage"], [/dance ?floor/, "dance_floor"], [/\bbar\b/, "bar"], [/podium|lectern/, "podium"],
  [/dj( booth)?/, "dj_booth"], [/backdrop/, "backdrop"], [/arch/, "arch"], [/cake table/, "cake_table"], [/sofa|couch/, "sofa"], [/lounge/, "lounge_chair"],
  [/speakers?/, "speaker"], [/screen|projector/, "screen"], [/plants?/, "plant"], [/food station/, "food_station"], [/chairs?/, "chair"]
];
const WHERE = /(front left|front right|back left|back right|front|back|rear|left|right|center|centre|middle)/;

export function interpret(scene, text) {
  const ops = [], notes = [];
  const parts = String(text).toLowerCase().replace(/centre/g, "center").split(/\s*(?:,\s*(?:and\s+)?|;|\band then\b|\bthen\b|\.\s+|\band\s+(?=(?:add|move|put|place|create|arrange|make|change|set|turn|remove|delete|dim|brighten)\b))\s*/).filter(Boolean);
  const n = t => { const m = t.match(/\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty)\b/); return m ? (NUMS[m[1]] || +m[1]) : null; };
  const kindOf = t => { for (const [re, k] of KIND_WORDS) if (re.test(t)) return k; return null; };
  const find = k => scene.items.find(i => i.kind === k);
  let pendingCenter = null;

  for (let p of parts) {
    p = p.trim();
    const where = (p.match(WHERE) || [])[1] === "middle" ? "center" : (p.match(WHERE) || [])[1];
    // "set up this venue for a wedding with 120 guests"
    let m = p.match(/(\d+)\s*(?:guests|people)/);
    if (m && /set ?up|seat|for a|wedding|party|reception|shower|gala/.test(p)) {
      const guests = +m[1], df = find("dance_floor");
      // Try 60-inch rounds of 8 first, then 72-inch rounds of 10, and say so if neither fits.
      const tries = [["table_round", 8], ["table_round72", 10]];
      let chosen = null;
      for (const [kind, seats] of tries) {
        const op = { op: "arrange_tables", kind, count: Math.ceil(guests / seats), chairs: seats, around: df ? df.id : undefined };
        if (apply(scene, [...ops, op]).ok) { chosen = op; break; }
      }
      if (chosen) { ops.push(chosen); notes.push(chosen.count + " tables of " + chosen.chairs + " for " + guests + " guests"); }
      else notes.push(guests + " guests won't fit at round tables with walking space in this room as it's set up now. Try moving the bar or making the dance floor smaller.");
      continue;
    }
    // "arrange eight round tables (with 8 chairs) around it / around the dance floor"
    if (/arrange|set out|lay out|add|place|put/.test(p) && /tables?/.test(p) && n(p) && !/buffet|cake/.test(p)) {
      const counts = p.match(/\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty)\b/g) || [];
      const count = NUMS[counts[0]] || +counts[0];
      const ch = p.match(/(\d+|eight|ten|six|four|twelve)\s+chairs/); const chairs = ch ? (NUMS[ch[1]] || +ch[1]) : undefined;
      const kind = /banquet|long/.test(p) ? "table_banquet" : /cocktail|high/.test(p) ? "table_cocktail" : /72|large|big/.test(p) ? "table_round72" : "table_round";
      let around;
      if (/around|surround/.test(p)) { const tgt = /stage/.test(p) ? "stage" : "dance_floor"; around = pendingCenter && /\bit\b/.test(p) ? pendingCenter : (find(tgt) || {}).id || pendingCenter; }
      ops.push({ op: "arrange_tables", kind, count, chairs, around }); continue;
    }
    // "move the stage to the front of the room"
    m = p.match(/^(?:move|put|place|shift|slide)\s+(?:the\s+)?(.+?)\s+(?:to|on|at|against|over to)\s+(?:the\s+)?(.+)$/);
    if (m) {
      const k = kindOf(m[1]), w2 = (m[2].match(WHERE) || [])[1];
      if (!k) { notes.push("I couldn't tell what to move in “" + p + "”"); continue; }
      const list = scene.items.filter(i => i.kind === k || (k === "table_round" && i.kind.startsWith("table") && !/buffet/.test(m[1])));
      if (!list.length) { ops.push({ op: "add_item", kind: k, where: w2 || "center" }); notes.push("there wasn't a " + CATALOG[k].label.toLowerCase() + ", so I'll add one"); continue; }
      if (!w2) { notes.push("I couldn't tell where to move the " + CATALOG[k].label.toLowerCase()); continue; }
      if (list.length > 1 && k === "buffet") list.forEach((it, i) => ops.push({ op: "move_object", id: it.id, where: w2, dz: i * (it.w + 0.4) }));
      else ops.push({ op: "move_object", id: list[0].id, where: w2 });
      if (k === "dance_floor" || k === "stage") pendingCenter = list[0].id;
      continue;
    }
    // "add / create / place a stage at the front", "add a dance floor in the center"
    m = p.match(/^(?:add|create|place|put|set up|build|make)\s+(?:a|an|the|another|one|two|three|four|\d+)?\s*(.+?)(?:\s+(?:at|in|on|to|by|along)\s+(?:the\s+)?(.+))?$/);
    if (m && kindOf(m[1]) && !/light|lighting|look|feel/.test(p)) {
      const k = kindOf(m[1]); const count = Math.min(n(p) || 1, 20); const w2 = (String(m[2] || "").match(WHERE) || [])[1] || where;
      const existing = find(k);
      if (existing && (k === "stage" || k === "dance_floor") && count === 1) { ops.push({ op: "move_object", id: existing.id, where: w2 || "center" }); pendingCenter = existing.id; notes.push("there's already a " + CATALOG[k].label.toLowerCase() + ", so I moved it"); continue; }
      for (let i = 0; i < count; i++) { const id = uid("i_"); ops.push({ op: "add_item", kind: k, where: w2 || "center", id, ...(i ? { } : {}) }); if (i) ops.push({ op: "move_object", id, dx: (i % 2 ? 1 : -1) * Math.ceil(i / 2) * (CATALOG[k].w + 0.4) }); if (k === "stage" || k === "dance_floor") pendingCenter = id; }
      continue;
    }
    // "change the tablecloths to dark purple", "make the chairs gold", "paint the walls navy"
    m = p.match(/(?:change|make|turn|paint|color|colour|switch)\s+(?:the\s+|all\s+(?:the\s+)?)?(.+?)\s+(?:to\s+|into\s+)?((?:dark|light)?\s*[a-z]+)$/);
    if (m && (COLORS[m[2].trim()] || MATERIALS[m[2].trim()])) {
      const what = m[1], val = m[2].trim(), isColor = !!COLORS[val];
      const target = /wall/.test(what) ? { id: "walls" } : /floor(?! dance)/.test(what) && !/dance/.test(what) ? { id: "floor" } : /ceiling/.test(what) ? { id: "ceiling" }
        : /cloth|linen|table/.test(what) ? { kind: "tables" } : /chair/.test(what) ? { kind: "chairs" } : kindOf(what) ? { kind: kindOf(what) } : null;
      if (!target) { notes.push("I couldn't tell what to change in “" + p + "”"); continue; }
      ops.push(Object.assign({ op: "change_material" }, target, isColor ? { color: val } : { mat: val })); continue;
    }
    // Lighting: "add warm lighting around the dance floor", "dim the lights", "make it brighter"
    if (/light|lighting|uplight/.test(p)) {
      const kelvin = /warm|cozy|romantic|candle/.test(p) ? 2700 : /cool|daylight|bright white/.test(p) ? 5600 : null;
      if (/add|around|put|place/.test(p)) {
        const tgt = /stage/.test(p) ? find("stage") : find("dance_floor") || find("stage");
        const f = tgt ? footprint(tgt) : { x0: 2, x1: scene.room.w - 2, z0: 2, z1: scene.room.d - 2 };
        const pts = [[f.x0, f.z0], [f.x1, f.z0], [f.x1, f.z1], [f.x0, f.z1], [(f.x0 + f.x1) / 2, f.z0], [(f.x0 + f.x1) / 2, f.z1]];
        pts.forEach(([x, z], i) => ops.push({ op: "add_light", kind: "point", x, y: 2.6, z, kelvin: kelvin || 3000, intensity: 3, range: 6, name: "Warm light " + (i + 1) }));
        continue;
      }
      if (/dim|darker|lower|softer/.test(p)) { ops.push({ op: "modify_lighting", id: "all", scale: 0.6, kelvin: kelvin || undefined }); continue; }
      if (/bright|lighter|more light/.test(p)) { ops.push({ op: "modify_lighting", id: "all", scale: 1.5 }); continue; }
      if (kelvin) { ops.push({ op: "modify_lighting", id: "all", kelvin }); continue; }
    }
    // "make the room look more elegant / upscale"
    if (/elegant|upscale|luxur|classy|fancy|formal/.test(p)) {
      ops.push({ op: "change_material", kind: "tables", color: "ivory" }, { op: "change_material", kind: "chairs", mat: "gold", color: "gold" });
      ops.push({ op: "modify_lighting", id: "all", kelvin: 2700, scale: 0.85 });
      scene.items.filter(i => i.kind.startsWith("table_round")).forEach(t => ops.push({ op: "add_item", kind: "centerpiece", x: t.x, z: t.z, group: t.id }));
      notes.push("ivory linens, gold chairs, warmer and softer light, and a centerpiece on each round table"); continue;
    }
    // "remove the bar" / "delete the podium" — needs the person's OK in the editor
    m = p.match(/^(?:remove|delete|take out|get rid of)\s+(?:the\s+|all\s+(?:the\s+)?)?(.+)$/);
    if (m && kindOf(m[1])) { ops.push({ op: "delete_object", kind: kindOf(m[1]), confirm: false }); notes.push("deleting needs your OK"); continue; }
    if (/rotate|turn/.test(p) && kindOf(p)) { const it = find(kindOf(p)); const deg = (p.match(/(-?\d+)\s*(?:°|deg)/) || [])[1]; if (it) { ops.push({ op: "rotate_object", id: it.id, by: deg ? +deg : 90 }); continue; } }
    notes.push("I didn't understand “" + p + "”");
  }
  return { ops, notes };
}
