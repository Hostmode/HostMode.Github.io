// Host Mode 3D venue: the scene model and its validated commands.
// No drawing code here, so it runs (and is tested) in plain Node: node agents/venue3d_test.mjs
// Units: meters inside the scene, angles in degrees. The editor shows feet and inches by default.
// Every change goes through apply(scene, ops): one batch = one undo step. Nothing here runs model-written code.

export const SCHEMA = "hostmode.venue3d", VERSION = 1;
export const FT = 0.3048;

// Dimension sources, so a reconstructed venue never passes guesses off as measurements.
export const DIM_SRC = ["measured", "confirmed", "estimated", "unknown"];

export const MATERIALS = {
  wood:     { label: "Wood",     color: "#8a5a35", rough: 0.55, metal: 0 },
  oak:      { label: "Light oak floor", color: "#c49a6c", rough: 0.45, metal: 0, coat: 0.25 },
  herringbone: { label: "Herringbone floor", color: "#a87a4f", rough: 0.4, metal: 0, coat: 0.35 },
  concrete: { label: "Concrete", color: "#9a9a96", rough: 0.9, metal: 0 },
  polished: { label: "Polished concrete", color: "#a7a7a3", rough: 0.25, metal: 0, coat: 0.6 },
  tile:     { label: "Tile",     color: "#e6e2da", rough: 0.3, metal: 0, coat: 0.3 },
  carpet:   { label: "Carpet, patterned", color: "#5a2f3f", rough: 1, metal: 0 },
  carpet_plain: { label: "Carpet, plain", color: "#5b6478", rough: 1, metal: 0 },
  glass:    { label: "Glass",    color: "#bcd8e6", rough: 0.05, metal: 0, opacity: 0.35 },
  acrylic:  { label: "Clear acrylic", color: "#eef4f7", rough: 0.08, metal: 0, opacity: 0.3 },
  metal:    { label: "Metal",    color: "#b9bcc2", rough: 0.3, metal: 1 },
  gold:     { label: "Gold",     color: "#c9a24a", rough: 0.3, metal: 1 },
  fabric:   { label: "Linen",    color: "#f4f1ea", rough: 0.9, metal: 0, sheen: 0.4 },
  satin:    { label: "Satin",    color: "#f4f1ea", rough: 0.45, metal: 0, sheen: 1 },
  sequin:   { label: "Sequin",   color: "#d9c08a", rough: 0.25, metal: 0.8 },
  velvet:   { label: "Velvet",   color: "#2a1b4d", rough: 1, metal: 0, sheen: 1 },
  paint:    { label: "Paint",    color: "#efe9df", rough: 0.85, metal: 0 },
  plaster:  { label: "Plaster",  color: "#ece5d8", rough: 0.9, metal: 0 },
  stone:    { label: "Stone",    color: "#b5aea3", rough: 0.8, metal: 0 },
  marble:   { label: "Marble",   color: "#f1efe9", rough: 0.15, metal: 0, coat: 0.6 },
  parquet:  { label: "Dance floor", color: "#2a2a2e", rough: 0.12, metal: 0.1, coat: 0.8 }
};

// The reusable asset library. Sizes are meters (w = across, d = deep, h = tall). Every shape is drawn in code
// in editor.js, so there are no third-party models or textures to license.
// top: sits on a table. ceiling: hangs from the ceiling. floor: a floor layer things stand on.
// dress: which decorating options it takes (see DRESS). palette: takes a set of colors (balloons, flowers).
export const CATALOG = {
  // Tables (take linens)
  table_round:   { label: "Round table (60 in)", cat: "Tables", w: 1.52, d: 1.52, h: 0.76, mat: "fabric", seats: 8, dress: "table" },
  table_round72: { label: "Round table (72 in)", cat: "Tables", w: 1.83, d: 1.83, h: 0.76, mat: "fabric", seats: 10, dress: "table" },
  table_rect:    { label: "Rectangular table (6 ft)", cat: "Tables", w: 1.83, d: 0.76, h: 0.76, mat: "fabric", seats: 6, dress: "table" },
  table_banquet: { label: "Banquet table (8 ft)", cat: "Tables", w: 2.44, d: 0.76, h: 0.76, mat: "fabric", seats: 8, dress: "table" },
  table_farm:    { label: "Farm table (8 ft)", cat: "Tables", w: 2.44, d: 1.02, h: 0.76, mat: "wood", seats: 10, dress: "table", bare: true },
  table_cocktail:{ label: "Cocktail table", cat: "Tables", w: 0.76, d: 0.76, h: 1.07, mat: "fabric", dress: "table" },
  // Seating (takes covers and sashes)
  chair:         { label: "Chiavari chair", cat: "Seating", w: 0.42, d: 0.45, h: 0.9, mat: "gold", dress: "chair" },
  chair_ghost:   { label: "Ghost chair", cat: "Seating", w: 0.45, d: 0.5, h: 0.9, mat: "acrylic", dress: "chair" },
  chair_crossback: { label: "Cross-back chair", cat: "Seating", w: 0.45, d: 0.5, h: 0.9, mat: "wood", dress: "chair" },
  chair_folding: { label: "Folding chair", cat: "Seating", w: 0.45, d: 0.48, h: 0.82, mat: "metal", dress: "chair" },
  // Balloons
  balloon_arch:  { label: "Balloon garland", cat: "Balloons", w: 2.4, d: 0.6, h: 2.2, mat: "fabric", palette: true },
  balloon_full_arch: { label: "Balloon arch", cat: "Balloons", w: 3.0, d: 0.7, h: 3.0, mat: "fabric", palette: true },
  balloon_column:{ label: "Balloon column", cat: "Balloons", w: 0.6, d: 0.6, h: 2.0, mat: "fabric", palette: true },
  balloon_wall:  { label: "Balloon wall", cat: "Balloons", w: 2.4, d: 0.35, h: 2.4, mat: "fabric", palette: true },
  // Backdrops and drapery
  backdrop:      { label: "Backdrop", cat: "Backdrops & drapery", w: 2.44, d: 0.1, h: 2.44, mat: "fabric" },
  pipe_drape:    { label: "Pipe and drape (10 ft)", cat: "Backdrops & drapery", w: 3.05, d: 0.3, h: 2.44, mat: "fabric" },
  flower_wall:   { label: "Flower wall", cat: "Backdrops & drapery", w: 2.4, d: 0.2, h: 2.4, mat: "fabric", palette: true },
  shimmer_wall:  { label: "Shimmer wall", cat: "Backdrops & drapery", w: 2.4, d: 0.15, h: 2.4, mat: "sequin" },
  ceiling_drape: { label: "Ceiling draping", cat: "Backdrops & drapery", w: 8, d: 8, h: 1.0, mat: "fabric", ceiling: true },
  // Centerpieces (sit on a table)
  centerpiece:   { label: "Low floral centerpiece", cat: "Centerpieces", w: 0.35, d: 0.35, h: 0.3, mat: "glass", top: true, palette: true },
  centerpiece_tall: { label: "Tall centerpiece", cat: "Centerpieces", w: 0.45, d: 0.45, h: 0.95, mat: "glass", top: true, palette: true },
  candle_cluster:{ label: "Candle cluster", cat: "Centerpieces", w: 0.35, d: 0.35, h: 0.25, mat: "glass", top: true },
  // Lighting and candles
  uplight:       { label: "Uplight", cat: "Lighting & candles", w: 0.25, d: 0.25, h: 0.25, mat: "metal" },
  string_lights: { label: "String lights", cat: "Lighting & candles", w: 6, d: 0.3, h: 0.6, mat: "metal", ceiling: true },
  chandelier:    { label: "Chandelier", cat: "Lighting & candles", w: 1.0, d: 1.0, h: 1.0, mat: "glass", ceiling: true },
  candle_floor:  { label: "Floor candles", cat: "Lighting & candles", w: 0.45, d: 0.45, h: 0.6, mat: "glass" },
  light_truss:   { label: "Light truss", cat: "Lighting & candles", w: 3.0, d: 0.3, h: 2.8, mat: "metal" },
  // Florals and greenery
  arch:          { label: "Floral arch", cat: "Florals & greenery", w: 2.1, d: 0.4, h: 2.4, mat: "gold", palette: true },
  aisle_flowers: { label: "Aisle flower stand", cat: "Florals & greenery", w: 0.45, d: 0.45, h: 1.0, mat: "gold", palette: true },
  hanging_greenery: { label: "Hanging greenery", cat: "Florals & greenery", w: 3.0, d: 0.5, h: 0.8, mat: "fabric", ceiling: true },
  plant:         { label: "Potted plant", cat: "Florals & greenery", w: 0.6, d: 0.6, h: 1.4, mat: "stone" },
  // Lounge and accents
  sofa:          { label: "Sofa", cat: "Lounge & accents", w: 2.0, d: 0.9, h: 0.85, mat: "velvet" },
  lounge_chair:  { label: "Lounge chair", cat: "Lounge & accents", w: 0.85, d: 0.85, h: 0.8, mat: "velvet" },
  ottoman:       { label: "Ottoman", cat: "Lounge & accents", w: 0.6, d: 0.6, h: 0.45, mat: "velvet" },
  coffee_table:  { label: "Coffee table", cat: "Lounge & accents", w: 1.2, d: 0.6, h: 0.45, mat: "gold" },
  rug:           { label: "Area rug", cat: "Lounge & accents", w: 3.0, d: 2.4, h: 0.015, mat: "carpet", floor: true },
  welcome_sign:  { label: "Welcome sign", cat: "Lounge & accents", w: 0.65, d: 0.5, h: 1.7, mat: "wood" },
  marquee:       { label: "Marquee letters", cat: "Lounge & accents", w: 1.6, d: 0.2, h: 1.2, mat: "paint" },
  gift_table:    { label: "Gift table", cat: "Lounge & accents", w: 1.83, d: 0.76, h: 0.76, mat: "fabric", dress: "table" },
  // Stage, food, audio, structure
  stage:         { label: "Stage", cat: "Stage & floor", w: 6.1, d: 3.66, h: 0.6, mat: "wood", floor: true },
  dance_floor:   { label: "Dance floor", cat: "Stage & floor", w: 4.88, d: 4.88, h: 0.03, mat: "parquet", floor: true },
  podium:        { label: "Podium", cat: "Stage & floor", w: 0.6, d: 0.5, h: 1.15, mat: "wood" },
  bar:           { label: "Bar", cat: "Food & drink", w: 2.44, d: 0.7, h: 1.07, mat: "wood" },
  buffet:        { label: "Buffet table", cat: "Food & drink", w: 2.44, d: 0.76, h: 0.76, mat: "fabric", dress: "table" },
  food_station:  { label: "Food station", cat: "Food & drink", w: 1.83, d: 0.9, h: 0.9, mat: "metal" },
  cake_table:    { label: "Cake table", cat: "Food & drink", w: 0.9, d: 0.9, h: 0.76, mat: "fabric", dress: "table" },
  speaker:       { label: "Speaker", cat: "Audio & video", w: 0.5, d: 0.45, h: 1.6, mat: "metal" },
  dj_booth:      { label: "DJ booth", cat: "Audio & video", w: 1.8, d: 0.7, h: 1.07, mat: "metal" },
  screen:        { label: "Projector screen", cat: "Audio & video", w: 3.0, d: 0.15, h: 2.3, mat: "fabric" },
  column:        { label: "Column", cat: "Structure", w: 0.5, d: 0.5, h: 3.6, mat: "stone", structure: true }
};
export const KINDS = Object.keys(CATALOG);
// The Add tab lists categories in this order: what decorators change most often first.
export const CAT_ORDER = ["Tables", "Seating", "Balloons", "Backdrops & drapery", "Centerpieces", "Lighting & candles", "Florals & greenery", "Lounge & accents", "Stage & floor", "Food & drink", "Audio & video", "Structure"];

// Decorating options. Tables take linens; chairs take covers and sashes. A color of null means none.
export const DRESS = {
  table: {
    linen: { label: "Tablecloth", opts: { floor: "Floor length", lap: "Lap length", spandex: "Fitted spandex", pleated: "Pleated skirt", none: "No cloth" } },
    linenColor: { label: "Cloth color", color: true },
    overlay: { label: "Overlay", opts: { none: "None", square: "Square overlay", sequin: "Sequin overlay" } },
    overlayColor: { label: "Overlay color", color: true },
    runner: { label: "Runner", opts: { none: "None", satin: "Satin", sequin: "Sequin" } },
    runnerColor: { label: "Runner color", color: true },
    charger: { label: "Charger plates", color: true, none: true },
    napkin: { label: "Napkins", color: true, none: true }
  },
  chair: {
    cover: { label: "Chair cover", opts: { none: "None", banquet: "Banquet cover", spandex: "Fitted spandex" } },
    coverColor: { label: "Cover color", color: true },
    sash: { label: "Sash", color: true, none: true }
  }
};
const DEF_DRESS = { table: { linen: "floor", overlay: "none", runner: "none" }, chair: { cover: "none" } };
export function dressOf(it) { const k = (CATALOG[it.kind] || {}).dress; if (!k) return null; const d = Object.assign({}, DEF_DRESS[k], it.dress || {}); if (k === "table" && CATALOG[it.kind].bare && !(it.dress && it.dress.linen)) d.linen = "none"; return d; }
export const PALETTES = { blush: ["#efc7c2", "#ffffff", "#c9a24a"], garden: ["#f1a7bd", "#ffffff", "#9cae8f", "#e8d6b3"], navy: ["#16255a", "#ffffff", "#c0c3c8"], hostmode: ["#16255a", "#f6892f", "#2f8a4c", "#ffffff"], classic: ["#ffffff", "#f3ead6", "#c9a24a"], jewel: ["#3b1d5e", "#1d6b47", "#6d1a2e", "#c9a24a"], rainbow: ["#e74c3c", "#f39c12", "#f2c94c", "#2f8a4c", "#2f6fd1", "#6b3fa0"] };
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
    room: { w: W, d: D, h: H, floor: "oak", walls: "plaster", ceiling: "paint", wallColor: "#efe6d8", dimSrc: { w: "confirmed", d: "confirmed", h: "estimated" } },
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
// Things on a table or hanging from the ceiling don't bump into furniture on the floor.
export const offFloor = it => !!((CATALOG[it.kind] || {}).top || (CATALOG[it.kind] || {}).ceiling);

export function collisions(scene, it) {
  if (offFloor(it)) return [];
  if (isFloorLayer(it)) {
    return scene.items.filter(o => o.id !== it.id && isFloorLayer(o) && overlap(footprint(o), footprint(it), 0.05)).map(o => o.id);
  }
  const f = footprint(it);
  return scene.items.filter(o => o.id !== it.id && !isFloorLayer(o) && !offFloor(o) && o.group !== it.id && it.group !== o.id &&
    !(it.group && it.group === o.group) && overlap(footprint(o), f, 0.02)).map(o => o.id);
}

export function inRoom(scene, it) {
  const f = footprint(it), R = scene.room;
  return f.x0 >= -0.01 && f.z0 >= -0.01 && f.x1 <= R.w + 0.01 && f.z1 <= R.d + 0.01 && (it.y || 0) + it.h <= R.h + 0.01;
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
  dress_object: "id or kind ('tables'|'chairs'|a kind), linen, linenColor, overlay, overlayColor, runner, runnerColor, charger, napkin, cover, coverColor, sash, palette",
  decorate_tables: "kind (a centerpiece), tables ('all' or ids), palette",
  swap_style: "from ('chairs' or a chair kind), to (chair kind)",
  save_view:    "name, pos, target",
  group_objects:   "ids (2 or more), name: makes a set that moves, turns, copies and deletes together",
  ungroup_objects: "set",
  rename_set:   "set, name",
  move_set:     "set (or ids), dx/dz, or x/z for the set's center",
  rotate_set:   "set (or ids), by (degrees, around the set's center)",
  duplicate_set:"set (or ids), dx, dz",
  delete_set:   "set (or ids), confirm: true"
};

// ---------- Sets: several things grouped to act as one (a table with its chairs and decor, a lounge corner) ----------
// An item in a set has it.set = the set's id, and s.sets = {id: {name}}. Things attached to a member
// (it.group = the member's id, like chairs around a table and centerpieces on it) always come along.
export function setMembers(s, id) { return s.items.filter(i => i.set === id).map(i => i.id); }
export function setClosure(s, ids) {
  const out = new Set(ids); let grew = true;
  while (grew) { grew = false; s.items.forEach(i => { if (i.group && out.has(i.group) && !out.has(i.id)) { out.add(i.id); grew = true; } }); }
  return [...out];
}
// The item a tap should treat as "the thing": climb from a chair or centerpiece to the table it belongs to.
export function rootOf(s, id) { let it = s.items.find(i => i.id === id), n = 0; while (it && it.group && n++ < 5) { const p = s.items.find(i => i.id === it.group); if (!p) break; it = p; } return it; }
function setTargets(s, o) {
  const ids = o.set ? setMembers(s, o.set) : Array.isArray(o.ids) ? o.ids : null;
  if (!ids || !ids.length) throw new Error(o.set ? "there's no set called " + o.set : "needs a set or ids");
  ids.forEach(id => { if (!s.items.some(i => i.id === id)) throw new Error("there's no object called " + id); });
  return setClosure(s, ids).map(id => s.items.find(i => i.id === id));
}
export function setCenter(items) { return [r2(items.reduce((a, i) => a + i.x, 0) / items.length), r2(items.reduce((a, i) => a + i.z, 0) / items.length)]; }
function setName(s, its) {
  const base = its.some(i => i.kind.startsWith("table")) ? "Table set" : "Set", used = new Set(Object.values(s.sets || {}).map(x => x.name));
  let n = 1, nm = base; while (used.has(nm)) nm = base + " " + (++n); return nm;
}
function cleanSets(s) {
  s.sets = s.sets && typeof s.sets === "object" ? s.sets : {};
  const used = new Set(s.items.map(i => i.set).filter(Boolean));
  Object.keys(s.sets).forEach(k => { if (!used.has(k)) delete s.sets[k]; });
  used.forEach(k => { if (!s.sets[k]) s.sets[k] = { name: "Set" }; });
}

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
  cleanSets(s);
  s.updated = Date.now();
  const warnings = checkScene(s);
  return { ok: true, scene: s, log, errors, warnings };
}

function need(o, k) { if (o[k] == null) throw new Error("needs " + k); return o[k]; }
function num(v, lo, hi, what) { if (!isNum(v) || v < lo || v > hi) throw new Error(what + " must be between " + lo + " and " + hi); return r2(v); }
function findIt(s, id) { const it = s.items.find(i => i.id === id) || s.lights.find(l => l.id === id); if (!it) throw new Error("there's no object called " + id); return it; }
const label = it => it.label || (CATALOG[it.kind] ? CATALOG[it.kind].label : it.name || it.kind);
function checkColor(c) { if (c == null) return null; const v = COLORS[String(c).toLowerCase()] || c; if (!/^#[0-9a-f]{6}$/i.test(v)) throw new Error("unknown color " + c); return v; }
function checkPalette(p) { if (typeof p === "string") { if (!PALETTES[p]) throw new Error("unknown color set " + p); return PALETTES[p].slice(); } if (!Array.isArray(p) || !p.length || p.length > 6) throw new Error("a color set needs 1 to 6 colors"); return p.map(checkColor); }
function moveGroup(s, it, dx, dz) { s.items.forEach(o => { if (o.group === it.id) { o.x = r2(o.x + dx); o.z = r2(o.z + dz); } }); }

const RUN = {
  group_objects(s, o) {
    const ids = Array.isArray(o.ids) ? [...new Set(o.ids)] : [];
    ids.forEach(id => { if (!s.items.some(i => i.id === id)) throw new Error("there's no object called " + id); });
    // only the main pieces get the set mark; chairs and decor on a picked table come along anyway
    const pick = new Set(ids), top = ids.filter(id => { const it = s.items.find(i => i.id === id); return !(it.group && pick.has(it.group)); });
    if (setClosure(s, top).length < 2) throw new Error("pick at least two things to group");
    s.sets = s.sets || {}; const id = o.id && /^set_[a-z0-9]{1,12}$/.test(o.id) ? o.id : uid("set_"), its = top.map(t => s.items.find(i => i.id === t));
    const name = String(o.name || setName(s, its)).trim().slice(0, 40) || "Set";
    its.forEach(i => { i.set = id; }); s.sets[id] = { name };
    return "Grouped " + setClosure(s, top).length + " things as “" + name + "”";
  },
  rename_set(s, o) {
    const id = need(o, "set"); if (!s.sets || !s.sets[id]) throw new Error("there's no set called " + id);
    s.sets[id].name = String(need(o, "name")).trim().slice(0, 40) || "Set"; return "Named the set “" + s.sets[id].name + "”";
  },
  ungroup_objects(s, o) {
    const id = need(o, "set"), its = s.items.filter(i => i.set === id); if (!its.length) throw new Error("there's no set called " + id);
    const name = (s.sets && s.sets[id] || {}).name || "the set"; its.forEach(i => { delete i.set; }); if (s.sets) delete s.sets[id];
    return "Took apart " + name;
  },
  move_set(s, o) {
    const its = setTargets(s, o), [cx, cz] = setCenter(its);
    let dx = o.dx || 0, dz = o.dz || 0; if (o.x != null) dx = o.x - cx; if (o.z != null) dz = o.z - cz;
    if (!isNum(dx) || !isNum(dz)) throw new Error("dx and dz must be numbers");
    its.forEach(i => { i.x = r2(i.x + dx); i.z = r2(i.z + dz); });
    return "Moved " + (o.set && s.sets && s.sets[o.set] ? s.sets[o.set].name : its.length + " things");
  },
  rotate_set(s, o) {
    const its = setTargets(s, o), [cx, cz] = setCenter(its), by = +need(o, "by"); if (!isNum(by)) throw new Error("by must be a number");
    const da = by * Math.PI / 180;
    its.forEach(i => { const rx = i.x - cx, rz = i.z - cz; i.x = r2(cx + rx * Math.cos(da) + rz * Math.sin(da)); i.z = r2(cz - rx * Math.sin(da) + rz * Math.cos(da)); i.rot = r2((((i.rot || 0) + by) % 360 + 360) % 360); });
    return "Turned " + (o.set && s.sets && s.sets[o.set] ? s.sets[o.set].name : its.length + " things") + " " + Math.round(by) + "°";
  },
  duplicate_set(s, o) {
    const its = setTargets(s, o);
    const minX = Math.min(...its.map(i => i.x - (i.w || 0) / 2)), maxX = Math.max(...its.map(i => i.x + (i.w || 0) / 2));
    const dx = o.dx ?? r2(maxX - minX + 0.5), dz = o.dz ?? 0, map = new Map(its.map(i => [i.id, uid("i_")]));
    const newSet = o.set ? uid("set_") : null;
    its.forEach(i => { const n = clone(i); n.id = map.get(i.id); n.x = r2(i.x + dx); n.z = r2(i.z + dz);
      if (n.group) { if (map.has(n.group)) n.group = map.get(n.group); else delete n.group; }
      if (n.set) { if (newSet && n.set === o.set) n.set = newSet; else delete n.set; }
      s.items.push(n); });
    if (newSet) { s.sets = s.sets || {}; const nm = (s.sets[o.set] || {}).name || "Set"; s.sets[newSet] = { name: setName(s, [{ kind: nm.startsWith("Table") ? "table" : "x" }]) }; }
    return "Copied " + its.length + " things";
  },
  delete_set(s, o) {
    if (!o.confirm) return { error: "Deleting needs your OK first" };
    const gone = new Set(setTargets(s, o).map(i => i.id)); const n = gone.size;
    s.items = s.items.filter(i => !gone.has(i.id));
    return "Removed " + n + " object" + (n === 1 ? "" : "s");
  },
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
    if (o.h != null) { s.walls.forEach(w => w.h = R.h); s.items.forEach(i => { if ((CATALOG[i.kind] || {}).ceiling) i.y = r2(R.h - i.h); }); }
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
    if (o.palette) it.palette = checkPalette(o.palette);
    if (o.where) snapInside(s, it, o.where);
    const C = CATALOG[kind];
    if (C.top) { // land on the table it's put on, or the one under it
      const t = o.on ? s.items.find(i => i.id === o.on) : s.items.find(i => CATALOG[i.kind].dress === "table" && (() => { const f = footprint(i); return it.x > f.x0 && it.x < f.x1 && it.z > f.z0 && it.z < f.z1; })());
      if (o.on && !t) throw new Error("there's no table called " + o.on);
      if (t) { it.y = t.h; it.group = t.id; if (o.on) { it.x = t.x; it.z = t.z; } }
    }
    if (C.ceiling) it.y = r2(s.room.h - it.h);
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
      const k = o.id || o.target; if (mat) { s.room[k] = mat; if (!color && k !== "walls") delete s.room[k + "Color"]; }
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
    // New tables keep the look of the ones they replace: linens, chair style, covers, sashes, centerpieces.
    const oldT = s.items.find(i => i.kind.startsWith("table_round") && kind.startsWith("table_round") || i.kind === kind);
    const look = oldT ? { dress: oldT.dress, color: oldT.color, chair: s.items.find(i => i.group === oldT.id && i.kind.startsWith("chair")), tops: s.items.filter(i => i.group === oldT.id && CATALOG[i.kind].top) } : null;
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
      if (look) { if (look.dress) t.dress = clone(look.dress); if (look.color) t.color = look.color; }
      if (o.color) t.color = checkColor(o.color);
      s.items.push(t);
      if (chairs) { const lc = look && look.chair; const cs = chairsAround(t, chairs, lc ? lc.kind : "chair"); if (lc) cs.forEach(c => { if (lc.dress) c.dress = clone(lc.dress); c.mat = lc.mat; if (lc.color) c.color = lc.color; }); s.items.push(...cs); }
      if (look) look.tops.forEach(tp => s.items.push(Object.assign(clone(tp), { id: uid("i_"), x: t.x + (tp.x - oldT.x), z: t.z + (tp.z - oldT.z), group: t.id })));
      placed.push(box); made++;
    }
    if (made < count) return { error: "Only " + made + " of " + count + " tables fit with space to walk between them. Try fewer tables, smaller tables, or a bigger room." };
    return "Arranged " + made + " " + c.label.toLowerCase().replace(/ \(.*\)/, "") + "s" + (chairs ? " with " + chairs + " chairs each" : "") + (center ? " around the " + label(center).toLowerCase() : "");
  },
  dress_object(s, o) {
    const list = o.id ? [findIt(s, o.id)] : s.items.filter(i => { const c = CATALOG[i.kind]; return o.kind === "tables" ? c.dress === "table" && !/buffet|cake|gift/.test(i.kind) : o.kind === "chairs" ? c.dress === "chair" : i.kind === o.kind; });
    if (!list.length) throw new Error("nothing to decorate");
    let n = 0;
    list.forEach(it => {
      const C = CATALOG[it.kind], spec = DRESS[C.dress];
      if (o.palette) { if (!C.palette) throw new Error(label(it) + " doesn't take a color set"); it.palette = checkPalette(o.palette); n++; }
      if (!spec) { if (!o.palette) throw new Error(label(it) + " doesn't take linens or covers"); return; }
      const d = Object.assign({}, it.dress || {});
      for (const [k, def] of Object.entries(spec)) {
        if (!(k in o)) continue;
        const v = o[k];
        if (def.opts) { if (!def.opts[v]) throw new Error(def.label.toLowerCase() + " must be one of: " + Object.values(def.opts).join(", ")); d[k] = v; }
        else d[k] = (v == null || v === "none") && def.none ? null : checkColor(v);
      }
      // Asking for a cover or sash color turns the cover on; a cloth color keeps the current cloth.
      if (o.coverColor && !o.cover && (!d.cover || d.cover === "none")) d.cover = "spandex";
      if (o.overlayColor && !o.overlay && (!d.overlay || d.overlay === "none")) d.overlay = "square";
      if (o.runnerColor && !o.runner && (!d.runner || d.runner === "none")) d.runner = "satin";
      if (o.linenColor) it.color = d.linenColor;
      it.dress = d; n++;
    });
    return "Decorated " + n + " " + (n === 1 ? label(list[0]).toLowerCase() : list[0].kind.startsWith("chair") ? "chairs" : "tables");
  },
  swap_style(s, o) {
    const to = need(o, "to"); if (!CATALOG[to] || CATALOG[to].dress !== "chair") throw new Error("pick a chair style");
    const list = s.items.filter(i => o.from === "chairs" ? CATALOG[i.kind].dress === "chair" : i.kind === o.from);
    if (!list.length) throw new Error("there are no chairs to swap");
    list.forEach(c => { const C = CATALOG[to]; c.kind = to; c.w = C.w; c.d = C.d; c.h = C.h; c.mat = C.mat; c.color = null; });
    return "Switched " + list.length + " chairs to " + CATALOG[to].label.toLowerCase() + "s";
  },
  decorate_tables(s, o) {
    const kind = need(o, "kind"); if (!CATALOG[kind] || !CATALOG[kind].top) throw new Error(kind + " doesn't go on a table");
    const tables = s.items.filter(i => CATALOG[i.kind].dress === "table" && /^table_(round|rect|banquet|farm)/.test(i.kind) && (o.tables === "all" || !o.tables || o.tables.includes(i.id)));
    if (!tables.length) throw new Error("there are no guest tables");
    // One centerpiece per table: swap out whatever centerpiece is already there.
    const gone = new Set(s.items.filter(i => CATALOG[i.kind].top && tables.some(t => t.id === i.group)).map(i => i.id));
    s.items = s.items.filter(i => !gone.has(i.id));
    tables.forEach(t => { const it = mkItem(kind, t.x, t.z, 0, { y: t.h, group: t.id }); if (o.palette) it.palette = checkPalette(o.palette); s.items.push(it); });
    return "Put a " + CATALOG[kind].label.toLowerCase() + " on " + tables.length + " table" + (tables.length === 1 ? "" : "s");
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
  obj.sets = obj.sets && typeof obj.sets === "object" && !Array.isArray(obj.sets) ? obj.sets : {};
  obj.items.forEach(i => { if (i.set != null && (typeof i.set !== "string" || !obj.sets[i.set])) delete i.set; });
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
  [/balloon (?:wall|backdrop)/, "balloon_wall"], [/balloon columns?|balloon towers?/, "balloon_column"], [/balloon garland|organic balloon/, "balloon_arch"], [/balloon arch|balloons?/, "balloon_full_arch"],
  [/flower wall|floral wall/, "flower_wall"], [/shimmer|sequin wall/, "shimmer_wall"], [/pipe (?:and|&) drape|drapes? panel/, "pipe_drape"], [/ceiling (?:drap|swag)|draping/, "ceiling_drape"],
  [/string lights?|bistro lights?|fairy lights?/, "string_lights"], [/chandeliers?/, "chandelier"], [/uplights?/, "uplight"], [/floor candles?|pillar candles?/, "candle_floor"],
  [/aisle (?:flowers?|stand|arrangement)|flower stands?/, "aisle_flowers"], [/hanging greenery|greenery garland|greenery/, "hanging_greenery"], [/floral arch|wedding arch|ceremony arch/, "arch"],
  [/\brugs?\b/, "rug"], [/welcome sign|sign/, "welcome_sign"], [/marquee/, "marquee"], [/ottomans?/, "ottoman"], [/coffee table/, "coffee_table"], [/gift table/, "gift_table"], [/farm(?:house)? tables?/, "table_farm"],
  [/tall centerpieces?/, "centerpiece_tall"], [/candle (?:cluster|centerpieces?)|votives?/, "candle_cluster"], [/centerpieces?/, "centerpiece"],
  [/ghost chairs?/, "chair_ghost"], [/cross-?back chairs?/, "chair_crossback"], [/folding chairs?/, "chair_folding"],
  [/round tables?|guest tables?|tables?(?! cloth)/, "table_round"], [/banquet tables?|long tables?/, "table_banquet"], [/cocktail tables?|high ?tops?/, "table_cocktail"],
  [/buffet( tables?)?/, "buffet"], [/stage/, "stage"], [/dance ?floor/, "dance_floor"], [/\bbar\b/, "bar"], [/podium|lectern/, "podium"],
  [/dj( booth)?/, "dj_booth"], [/backdrop/, "backdrop"], [/arch/, "arch"], [/cake table/, "cake_table"], [/sofa|couch/, "sofa"], [/lounge/, "lounge_chair"],
  [/speakers?/, "speaker"], [/screen|projector/, "screen"], [/plants?/, "plant"], [/food station/, "food_station"], [/chairs?/, "chair"]
];
// Colors named in a sentence, in the order they appear ("navy and gold" -> navy, gold).
function colorsIn(t) {
  const names = Object.keys(COLORS).sort((a, b) => b.length - a.length), found = [];
  let rest = " " + t + " ";
  for (const n of names) { const re = new RegExp("[^a-z]" + n + "(?=[^a-z])", "g"); let m; while ((m = re.exec(rest))) { found.push([m.index, n]); rest = rest.slice(0, m.index + 1) + "#".repeat(n.length) + rest.slice(m.index + 1 + n.length); } }
  return found.sort((a, b) => a[0] - b[0]).map(f => f[1]);
}
const DECOR_WORD = /linen|tablecloth|table ?cloth|cloths|runners?|overlays?|chargers?|napkins?|sash(?:es)?|chair covers?|covers?\b|spandex|pleated|floor[- ]length|lap[- ]length/;
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
    const cols = colorsIn(p);
    // Carpet: "carpet the room", "navy carpet", "plain gray carpet", "change the floor to carpet" (a rug is a piece, not the floor)
    if (/carpet/.test(p) && !/\brugs?\b/.test(p) && !/^(remove|delete|take)/.test(p)) {
      ops.push(Object.assign({ op: "change_material", id: "floor", mat: /plain|solid|plush/.test(p) ? "carpet_plain" : "carpet" }, cols.length ? { color: cols[0] } : {})); continue;
    }
    // Linens and chair dressing: "ivory floor-length linens with gold runners", "blush sashes on the chairs"
    if (DECOR_WORD.test(p) && !/^(remove|delete|take off|take away)/.test(p)) {
      const tOp = { op: "dress_object", kind: "tables" }, cOp = { op: "dress_object", kind: "chairs" };
      for (const sub of p.split(/\s+(?:with|and|plus|&)\s+/)) {
        const c = colorsIn(sub)[0];
        if (/chair covers?|covers?\b.*chairs?|chairs?.*covers?\b|\bcovers?\b/.test(sub) && !/table/.test(sub)) { cOp.cover = /spandex|fitted|stretch/.test(sub) ? "spandex" : "banquet"; if (c) cOp.coverColor = c; }
        else if (/sash/.test(sub)) cOp.sash = c || "gold";
        else if (/runner/.test(sub)) { tOp.runner = /sequin|sparkl|glitter/.test(sub) ? "sequin" : "satin"; tOp.runnerColor = c || "gold"; }
        else if (/overlay/.test(sub)) { tOp.overlay = /sequin|sparkl|glitter/.test(sub) ? "sequin" : "square"; tOp.overlayColor = c || "gold"; }
        else if (/charger/.test(sub)) tOp.charger = c || "gold";
        else if (/napkin/.test(sub)) tOp.napkin = c || "white";
        else if (/linen|cloth|spandex|pleated|length/.test(sub)) {
          if (/floor[- ]?length|full[- ]?length|to the floor/.test(sub)) tOp.linen = "floor"; else if (/lap|cocktail[- ]length|short/.test(sub)) tOp.linen = "lap"; else if (/spandex|fitted|stretch/.test(sub)) tOp.linen = "spandex"; else if (/pleat/.test(sub)) tOp.linen = "pleated"; else if (/no (?:table)?cloth|bare/.test(sub)) tOp.linen = "none";
          if (c) tOp.linenColor = c;
        }
      }
      if (Object.keys(tOp).length > 2) ops.push(tOp);
      if (Object.keys(cOp).length > 2) ops.push(cOp);
      if (ops.length) continue;
    }
    // Chair style: "switch to ghost chairs", "use cross-back chairs"
    const sw = p.match(/(ghost|cross-?back|chiavari|folding) chairs?/);
    if (sw && /switch|use|change|swap|make|replace|chiavari|instead/.test(p)) {
      ops.push({ op: "swap_style", from: "chairs", to: { ghost: "chair_ghost", chiavari: "chair", folding: "chair_folding" }[sw[1]] || "chair_crossback" }); continue;
    }
    // Centerpieces on every table: "put tall centerpieces on every table", "add candles to each table"
    if (/centerpiece|candles?|votive|flowers?|floral/.test(p) && /(each|every|all|the) (?:guest )?tables?|tables/.test(p) && !/floor candle|flower wall|floral wall/.test(p)) {
      const kind = /tall/.test(p) ? "centerpiece_tall" : /candle|votive/.test(p) && !/flower|floral/.test(p) ? "candle_cluster" : "centerpiece";
      ops.push(Object.assign({ op: "decorate_tables", kind, tables: "all" }, cols.length ? { palette: cols } : {})); continue;
    }
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
    if (m && kindOf(m[1]) && (!/light|lighting|look|feel/.test(p) || /string_lights|chandelier|uplight/.test(kindOf(m[1])))) {
      const k = kindOf(m[1]); const count = Math.min(n(p) || 1, 20); const w2 = (String(m[2] || "").match(WHERE) || [])[1] || where;
      const C = CATALOG[k], extra = C.palette && cols.length ? { palette: cols } : C.palette && /hostmode|host mode/.test(p) ? { palette: "hostmode" } : {};
      if (!C.palette && cols.length && !C.dress) extra.color = cols[0];
      // "over the dance floor", "above the stage", "by the bar", "next to the cake table"
      const near = p.match(/(?:over|above|on|by|next to|beside|behind|around)\s+(?:the\s+)?(dance ?floor|stage|bar|cake table|buffet|sofa|dj booth)/);
      const anchor = near && find(kindOf(near[1]));
      if (anchor) {
        const f = footprint(anchor), C2 = CATALOG[k];
        let x = anchor.x, z = anchor.z;
        if (!C2.ceiling && !/over|above|on/.test(near[0])) { z = /behind/.test(near[0]) ? f.z0 - C2.d / 2 - 0.2 : f.z1 + C2.d / 2 + 0.3; if (z > scene.room.d - C2.d) z = f.z0 - C2.d / 2 - 0.3; }
        for (let i = 0; i < count; i++) { const id = uid("i_"); ops.push(Object.assign({ op: "add_item", kind: k, id, x: x + (count > 1 ? (i - (count - 1) / 2) * ((C2.ceiling ? (f.x1 - f.x0) : C2.w + 0.4) / Math.max(1, count - (C2.ceiling ? 0 : 1)) ) : 0), z }, extra)); }
        continue;
      }
      const existing = find(k);
      if (existing && (k === "stage" || k === "dance_floor") && count === 1) { ops.push({ op: "move_object", id: existing.id, where: w2 || "center" }); pendingCenter = existing.id; notes.push("there's already a " + CATALOG[k].label.toLowerCase() + ", so I moved it"); continue; }
      for (let i = 0; i < count; i++) { const id = uid("i_"); ops.push(Object.assign({ op: "add_item", kind: k, where: w2 || "center", id }, extra)); if (i) ops.push({ op: "move_object", id, dx: (i % 2 ? 1 : -1) * Math.ceil(i / 2) * (CATALOG[k].w + 0.4) }); if (k === "stage" || k === "dance_floor") pendingCenter = id; }
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
    if (/elegant|upscale|luxur|classy|fancy|formal|romantic|look like a wedding|wedding (?:look|style|feel)/.test(p)) {
      ops.push({ op: "dress_object", kind: "tables", linen: "floor", linenColor: "ivory", runner: "satin", runnerColor: "champagne", charger: "gold", napkin: "ivory" });
      if (scene.items.some(i => CATALOG[i.kind].dress === "chair")) ops.push({ op: "change_material", kind: "chairs", mat: "gold", color: "gold" }, { op: "dress_object", kind: "chairs", sash: "champagne" });
      ops.push({ op: "modify_lighting", id: "all", kelvin: 2700, scale: 0.85 });
      if (scene.items.some(i => /^table_(round|rect|banquet|farm)/.test(i.kind))) ops.push({ op: "decorate_tables", kind: "centerpiece_tall", tables: "all", palette: "classic" });
      notes.push("ivory floor-length linens, champagne runners and sashes, gold chargers, tall centerpieces, and warmer, softer light"); continue;
    }
    // "remove the bar" / "delete the podium" — needs the person's OK in the editor
    m = p.match(/^(?:remove|delete|take out|get rid of)\s+(?:the\s+|all\s+(?:the\s+)?)?(.+)$/);
    if (m && kindOf(m[1])) { ops.push({ op: "delete_object", kind: kindOf(m[1]), confirm: false }); notes.push("deleting needs your OK"); continue; }
    if (/rotate|turn/.test(p) && kindOf(p)) { const it = find(kindOf(p)); const deg = (p.match(/(-?\d+)\s*(?:°|deg)/) || [])[1]; if (it) { ops.push({ op: "rotate_object", id: it.id, by: deg ? +deg : 90 }); continue; } }
    notes.push("I didn't understand “" + p + "”");
  }
  return { ops, notes };
}
