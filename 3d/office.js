// The agent office in real 3D (admin console → Agents). Built with the 3D venue designer's own engine:
// the building is a venue design (3d/scene.js format), its furniture comes from the designer's library (3d/decor.js),
// and Editor (3d/editor.js) draws it. What's new here is the people: one figure per agent, who walks its route
// with real depth (in front of and behind furniture, no drawing-order tricks).
//
// Two rooms joined by a corridor: the venue (the nightly helpers on GitHub) and the studio (the crew who built the
// 3D designer and Stay & Go in sessions with Roy). Finished crew work is carried down the corridor to Roy's office.
//
// The Agents tab (js/18-support-staff.js) owns the data. It sends {hmOffice:"state", cast, sel, night, prs, tickets,
// budget} with postMessage; a tap on a person here sends back {hmOffice:"pick", k}. Opened on its own, the page
// shows everyone resting.
import * as T from "./vendor/three-bundle.min.js";
import { Editor, S } from "./editor.js";

const W = 22.5, D = 10, H = 3.2, KNEE = 1.1; // the building, in meters; inside walls are cut down to knee height
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---------- The building: one venue design ----------
function officeScene() {
  const s = S.sampleVenue();
  Object.assign(s, { id: "office", name: "Agent office", items: [], openings: [], views: [], lights: [] });
  s.room = { w: W, d: D, h: H, floor: "oak", walls: "plaster", ceiling: "paint", wallColor: "#f6efe2", dimSrc: {} };
  const wall = (id, name, a, b, h = H) => ({ id, name, a, b, h, t: h < H ? 0.12 : 0.2, mat: "paint", color: h < H ? "#e8dcc6" : "#f6efe2" });
  s.walls = [wall("w1", "Back wall", [0, 0], [W, 0]), wall("w2", "Right wall", [W, 0], [W, D]), wall("w3", "Front wall", [W, D], [0, D]), wall("w4", "Left wall", [0, D], [0, 0]),
    wall("wa", "Venue end", [10, 0], [10, D], KNEE), wall("wb", "Studio end", [12.5, 0], [12.5, D], KNEE),
    wall("wc", "Corridor side", [10, 3.5], [12.5, 3.5], KNEE), wall("wd", "Corridor side", [10, 6.5], [12.5, 6.5], KNEE)];
  const op = (id, type, w, at, ow, oh, sill = 0) => ({ id, type, wall: w, at, w: ow, h: oh, sill });
  s.openings = [op("o1", "door", "w4", 5, 1.6, 2.3), op("o2", "door", "w1", 4.8, 1.0, 2.2), op("o3", "window", "w1", 2, 1.4, 1.4, 0.9),
    op("o4", "window", "w1", 17.2, 1.4, 1.4, 0.9), op("o5", "window", "w1", 21.4, 1.0, 1.4, 0.9),
    op("o6", "opening", "wa", 5, 3, 1.05), op("o7", "opening", "wb", 5, 3, 1.05)]; // the corridor's two open doorways
  const it = (kind, x, z, extra = {}) => s.items.push(S.mkItem(kind, x, z, extra.rot || 0, extra));
  const cloth = (c, more = {}) => ({ dress: Object.assign({ linen: "floor", linenColor: c }, more) });
  // the venue: a stage with the HOST MODE screen, two party tables, the bar, the support and tech desks, Roy's door
  it("stage", 8, 1.6, { id: "stage", w: 4, d: 3.2, h: 0.6 });
  it("led_wall", 8, 0.3, { id: "screen", w: 3.2, d: 0.3, h: 2.0, y: 0.6, label: "HOST MODE", color: "#f6892f" });
  it("table_round", 4.4, 4.4, Object.assign({ id: "tbl1", w: 1.3, d: 1.3 }, cloth("#3aa35e")));
  it("table_round", 6.3, 6.5, Object.assign({ id: "tbl2", w: 1.3, d: 1.3 }, cloth("#3aa35e")));
  it("centerpiece", 4.4, 4.4, { id: "cp1", y: 0.76, group: "tbl1", palette: ["#f6892f", "#ffffff", "#f6c343"] });
  it("centerpiece", 6.3, 6.5, { id: "cp2", y: 0.76, group: "tbl2", palette: ["#f6892f", "#ffffff", "#f6c343"] });
  it("bar", 9.1, 7.9, { id: "bar", rot: 90, w: 2.3, d: 0.7, color: "#16255a" });
  it("table_rect", 2.15, 7.65, Object.assign({ id: "techdesk", w: 2.1, d: 0.8 }, cloth("#16255a", { linen: "spandex" })));
  it("table_rect", 4.85, 8.95, Object.assign({ id: "icee", w: 1.7, d: 0.8 }, cloth("#f6efe2", { linen: "spandex" })));
  it("display_shelf", 1.3, 0.3, { id: "backupshelf", w: 1.8, d: 0.4, h: 1.8 });
  it("balloon_column", 0.45, 3.85, { id: "bal1", palette: S.PALETTES.hostmode.slice() }); it("balloon_column", 0.45, 6.15, { id: "bal2", palette: S.PALETTES.hostmode.slice() });
  it("plant", 9.4, 9.4, { id: "plant1" }); it("string_lights", 5, 5, { id: "lights1", w: 9.4, d: 6.5, h: 0.5, y: H - 0.5 });
  // the corridor, and planters in the two spaces beside it
  it("aisle_runner", 11.25, 5, { id: "runner", rot: 90, w: 0.9, d: 2.5, color: "#16255a" });
  it("plant", 11.25, 1.7, { id: "plant2" }); it("plant", 11.25, 8.3, { id: "plant3" });
  // the studio: the 3D modeler's desk (a model chair on it), the researcher's shelves, the checker's high table, a travel corner
  it("rug", 17.5, 5, { id: "rug", w: 9.6, d: 9.6, mat: "carpet_plain", color: "#aebbd9" });
  it("table_rect", 14.9, 0.75, Object.assign({ id: "modeldesk", w: 2.2, d: 0.8 }, cloth("#ffffff", { linen: "spandex" })));
  it("chair", 15.5, 0.7, { id: "model", y: 0.77, w: 0.17, d: 0.18, h: 0.36 });
  it("display_shelf", 19.6, 0.3, { id: "books", w: 2.2, d: 0.4, h: 1.9 });
  it("table_cocktail", 16.6, 5.6, Object.assign({ id: "qadesk" }, cloth("#2f8a4c", { linen: "spandex" })));
  it("table_round", 20.8, 5.9, Object.assign({ id: "travel", w: 1.2, d: 1.2 }, cloth("#f6892f")));
  it("sofa", 14.6, 8.9, { id: "sofa", color: "#16255a" }); it("pedestals", 21.6, 8.9, { id: "peds", palette: S.PALETTES.garden.slice() });
  it("plant", 22.0, 2.2, { id: "plant4" }); it("string_lights", 17.5, 5, { id: "lights2", w: 9.4, d: 6.5, h: 0.5, y: H - 0.5 });
  s.lights = [{ id: "L1", kind: "ambient", intensity: 0.6 }, { id: "L2", kind: "sun", x: 30, y: 18, z: 22, color: "#fff3e0", intensity: 2.4 },
    { id: "L3", kind: "point", x: 5, y: 2.9, z: 5, color: "#ffe0b0", intensity: 5, range: 10 }, { id: "L4", kind: "point", x: 17.5, y: 2.9, z: 5, color: "#e9f0ff", intensity: 5, range: 10 }];
  return s;
}

// ---------- People ----------
const shared = g => { g.userData.shared = true; return g; }; // reused by every person: the editor never disposes these
const GEO = {
  leg: shared(new T.CylinderGeometry(0.065, 0.055, 0.78, 10).translate(0, -0.39, 0)), shoe: shared(new T.BoxGeometry(0.11, 0.07, 0.2)),
  arm: shared(new T.CylinderGeometry(0.052, 0.045, 0.56, 10).translate(0, -0.28, 0)), hand: shared(new T.SphereGeometry(0.05, 10, 8)),
  torso: shared(new T.CapsuleGeometry(0.17, 0.3, 4, 14)), neck: shared(new T.CylinderGeometry(0.05, 0.05, 0.08, 8)),
  head: shared(new T.SphereGeometry(0.14, 20, 14)), hair: shared(new T.SphereGeometry(0.147, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.55)),
  eye: shared(new T.SphereGeometry(0.018, 8, 6)), ring: shared(new T.CircleGeometry(0.42, 36).rotateX(-Math.PI / 2)), halo: shared(new T.RingGeometry(0.45, 0.52, 40).rotateX(-Math.PI / 2))
};
const MATS = new Map(), mat = (c, o = {}) => { const k = c + JSON.stringify(o); if (!MATS.has(k)) MATS.set(k, new T.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.7 }, o))); return MATS.get(k); };
const RING = { work: "#f6892f", done: "#2f8a4c", fail: "#d62d2d", idle: "#9aa3b8" };
function mesh(g, m, x = 0, y = 0, z = 0) { const o = new T.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; return o; }
function boxM(w, h, d, m, x = 0, y = 0, z = 0) { return mesh(new T.BoxGeometry(w, h, d), m, x, y, z); }
// What each agent carries or wears, so they can be told apart (in the hand = the front arm's hand, at its tip).
function props(k, p) {
  const navy = mat("#16255a"), orange = mat("#f6892f"), green = mat("#2f8a4c"), white = mat("#ffffff"), brown = mat("#c98a4a"), dark = mat("#222226");
  const inHand = o => { o.position.y -= 0.6; p.armF.add(o); };
  if (k === "builder") { const hat = mesh(new T.SphereGeometry(0.16, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2), orange, 0, 1.56, 0); p.head.add(hat); p.head.add(mesh(new T.CylinderGeometry(0.2, 0.2, 0.02, 20), orange, 0, 1.56, 0.02)); inHand(boxM(0.04, 0.25, 0.04, brown)); inHand(boxM(0.12, 0.05, 0.05, mat("#8a94a6"), 0, 0.12, 0)); }
  if (k === "tech") { const set = mesh(new T.TorusGeometry(0.155, 0.015, 6, 20, Math.PI), dark, 0, 1.53, 0); set.rotation.z = 0; set.rotation.y = Math.PI / 2; p.head.add(set); p.head.add(mesh(new T.SphereGeometry(0.04, 8, 6), dark, 0.15, 1.5, 0)); }
  if (k === "reviewer") inHand(boxM(0.2, 0.26, 0.02, brown, 0, 0, 0.05));
  if (k === "tester") inHand(boxM(0.07, 0.13, 0.015, dark, 0, 0, 0.05));
  if (k === "checks") { p.head.add(mesh(new T.CylinderGeometry(0.15, 0.15, 0.07, 18), navy, 0, 1.6, 0)); p.head.add(boxM(0.16, 0.015, 0.1, navy, 0, 1.57, 0.12)); p.body.add(mesh(new T.CircleGeometry(0.04, 12), mat("#f6c343"), 0.08, 1.15, 0.175)); }
  if (k === "backup") { p.carry = boxM(0.42, 0.3, 0.3, brown, 0, 1.0, 0.33); p.body.add(p.carry); }
  if (k === "research") { [-1, 1].forEach(s => p.head.add(mesh(new T.TorusGeometry(0.035, 0.007, 6, 14), dark, s * 0.05, 1.52, 0.135))); inHand(boxM(0.18, 0.02, 0.24, green, 0, 0, 0.06)); }
  if (k === "modeler") { const cube = new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(0.16, 0.16, 0.16)), new T.LineBasicMaterial({ color: "#f6892f" })); cube.position.set(0, -0.62, 0.1); p.armF.add(cube); p.head.add(mesh(new T.SphereGeometry(0.15, 16, 6, 0, Math.PI * 2, 0, Math.PI * 0.35), orange, 0, 1.53, 0)); }
  if (k === "qa3d") { const m = new T.Group(); m.add(mesh(new T.TorusGeometry(0.06, 0.012, 6, 18), navy)); m.add(mesh(new T.CircleGeometry(0.06, 16), mat("#eaf6ff", { transparent: true, opacity: 0.7 }))); m.add(boxM(0.02, 0.14, 0.02, navy, 0, -0.12, 0)); m.position.set(0, -0.52, 0.08); p.armF.add(m); }
  if (k === "stay") { p.root.add(boxM(0.36, 0.5, 0.2, orange, 0.42, 0.3, 0)); p.root.add(boxM(0.02, 0.22, 0.02, navy, 0.42, 0.66, 0)); p.head.add(mesh(new T.CylinderGeometry(0.24, 0.24, 0.02, 20), white, 0, 1.58, 0)); p.head.add(mesh(new T.CylinderGeometry(0.13, 0.15, 0.1, 18), white, 0, 1.63, 0)); }
}
// A floating picture: the thought bubble (state) or the name tag (chosen person). Drawn on a canvas, always facing the camera.
function sprite(draw, w, h, scale) { const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h); const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace;
  const s = new T.Sprite(new T.SpriteMaterial({ map: t, depthTest: false, transparent: true })); s.scale.set(scale * w / h, scale, 1); s.renderOrder = 20; s.userData.keep = true; return s; }
function bubble(st, k) {
  return sprite((x, w, h) => { x.fillStyle = "#fff"; x.strokeStyle = st === "fail" ? "#d62d2d" : "#16255a"; x.lineWidth = 6; x.beginPath(); x.ellipse(w / 2, h / 2 - 6, w / 2 - 6, h / 2 - 14, 0, 0, Math.PI * 2); x.fill(); x.stroke();
    x.beginPath(); x.arc(w / 2 - 18, h - 8, 6, 0, Math.PI * 2); x.fill(); x.stroke(); x.lineCap = "round"; x.lineJoin = "round";
    if (st === "done") { x.strokeStyle = "#2f8a4c"; x.lineWidth = 11; x.beginPath(); x.moveTo(w / 2 - 22, h / 2 - 6); x.lineTo(w / 2 - 6, h / 2 + 10); x.lineTo(w / 2 + 24, h / 2 - 22); x.stroke(); }
    else if (st === "fail") { x.strokeStyle = "#555"; x.lineWidth = 6; x.beginPath(); x.moveTo(w / 2 - 12, h / 2 + 20); x.lineTo(w / 2 - 12, h / 2 - 30); x.stroke(); x.fillStyle = "#d62d2d"; x.beginPath(); x.moveTo(w / 2 - 12, h / 2 - 30); x.lineTo(w / 2 + 24, h / 2 - 30); x.lineTo(w / 2 + 14, h / 2 - 18); x.lineTo(w / 2 + 24, h / 2 - 6); x.lineTo(w / 2 - 12, h / 2 - 6); x.fill(); }
    else if (st === "work") { x.fillStyle = "#f6892f"; [-26, 0, 26].forEach(d => { x.beginPath(); x.arc(w / 2 + d, h / 2 - 6, 9, 0, Math.PI * 2); x.fill(); }); }
    else { x.fillStyle = "#16255a"; x.font = "800 40px sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("z z", w / 2, h / 2 - 6); }
  }, 128, 112, 0.42);
}
const textW = (t, font) => { const x = document.createElement("canvas").getContext("2d"); x.font = font; return x.measureText(t).width; };
function nameTag(text) { return sprite((x, w, h) => { x.fillStyle = "#16255a"; x.beginPath(); x.roundRect(2, 2, w - 4, h - 4, h / 2 - 2); x.fill(); x.fillStyle = "#fff"; x.font = "700 30px sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(text, w / 2, h / 2 + 1); },
  Math.max(120, Math.ceil(textW(text, "700 30px sans-serif") + 44)), 52, 0.26); } // as wide as its words, so a sign is never cut off
function person(c) {
  const L = c.look || { shirt: "#16255a", skin: "#e0ac7e", hair: "#2a1a10" }, shirt = mat(L.shirt), skin = mat(L.skin), hair = mat(L.hair), pants = mat(c.k === "checks" ? "#0b1022" : "#22305e"), shoe = mat("#222226");
  const root = new T.Group(), fig = new T.Group(); root.add(fig); root.userData = { id: "ag:" + c.k };
  const legL = new T.Group(), legR = new T.Group(); legL.position.set(-0.09, 0.82, 0); legR.position.set(0.09, 0.82, 0);
  [legL, legR].forEach(l => { l.add(mesh(GEO.leg, pants)); l.add(mesh(GEO.shoe, shoe, 0, -0.8, 0.04)); fig.add(l); });
  const body = new T.Group(); fig.add(body); body.add(mesh(GEO.torso, shirt, 0, 1.08, 0)); body.add(mesh(GEO.neck, skin, 0, 1.37, 0));
  const head = new T.Group(); body.add(head); head.add(mesh(GEO.head, skin, 0, 1.5, 0)); const hr = mesh(GEO.hair, hair, 0, 1.52, -0.01); hr.rotation.x = -0.25; head.add(hr);
  [-1, 1].forEach(s => head.add(mesh(GEO.eye, mat("#16255a"), s * 0.05, 1.52, 0.13)));
  const armB = new T.Group(), armF = new T.Group(); armB.position.set(-0.23, 1.3, 0); armF.position.set(0.23, 1.3, 0);
  [armB, armF].forEach(a => { a.add(mesh(GEO.arm, shirt)); a.add(mesh(GEO.hand, skin, 0, -0.6, 0)); body.add(a); });
  const ring = new T.Mesh(GEO.ring, new T.MeshBasicMaterial({ color: RING[c.st] || RING.idle, transparent: true, opacity: 0.5, depthWrite: false })); ring.position.y = 0.012; ring.renderOrder = 1; root.add(ring);
  const halo = new T.Mesh(GEO.halo, new T.MeshBasicMaterial({ color: "#ffffff", depthWrite: false })); halo.position.y = 0.014; halo.visible = false; root.add(halo);
  const p = { k: c.k, root, fig, legL, legR, armB, armF, body, head, ring, halo, st: null, sel: false };
  props(c.k, p); return p;
}

// Where each agent stands (x, z in meters; y lifts onto the stage) and the route it walks.
// Working nightly helpers walk their route; finished crew carry their work down the corridor to Roy's door and back.
const HOME = { tester: [4.9, 5.6], tech: [2.1, 6.95], builder: [8, 1.9, 0.6], reviewer: [7.3, 8.7], checks: [1.6, 3.7], backup: [3.2, 1.5],
  research: [19.6, 1.3], modeler: [14.9, 1.75], qa3d: [17.5, 6.6], stay: [20.2, 7.4] };
const TO_ROY = [[12.9, 5], [10, 5], [7.2, 4.6], [5.7, 3.4], [5.4, 1.4]]; // through the corridor to Roy's office door
const ROUTE = {
  tester: [[5.6, 5.2], [7.3, 4.6], [7.4, 7.5], [5.4, 7.3]], builder: [[6.8, 1.3], [9.3, 2.5], [7.2, 2.6]],
  reviewer: [[7.4, 7.4], [10, 5], [13.4, 5], [14.6, 6.2], [13.4, 5], [10, 5], [7.4, 7.4]], // reads changes in both rooms
  checks: [[1.3, 5], [2.7, 5.1], [2.4, 3.4]], backup: [[4.3, 2.1], [2.3, 1.2]],
  research: [[18.6, 2.6], ...TO_ROY], modeler: TO_ROY, qa3d: [[16.4, 7.5], ...TO_ROY], stay: [[17.8, 7.8], ...TO_ROY]
};
const CREW = new Set(["research", "modeler", "qa3d", "stay"]);
// A walk = there and back along the route, with a pause at the far end and at home.
function walkPlan(k) {
  const h = HOME[k], pts = [[h[0], h[1]], ...(ROUTE[k] || [])], crew = CREW.has(k), back = crew ? pts.slice(0, -1).reverse() : [[h[0], h[1]]];
  const legs = [], all = crew ? pts.concat(back) : pts.concat(back); let t = 0;
  for (let i = 1; i < all.length; i++) { const a = all[i - 1], b = all[i], d = Math.hypot(b[0] - a[0], b[1] - a[1]), dur = d / 0.85; legs.push({ a, b, t0: t, t1: t + dur }); t += dur; if (crew && i === pts.length - 1) t += 2.5; if (!crew) t += 0.8; }
  return { legs, cycle: t + (crew ? 7 : 1.5) };
}

class Office extends Editor {
  constructor(root) { super(root); if (!this.r) return; this.showLights = false; this.people = new Map(); this.cast = []; this.data = {}; this.t0 = performance.now(); this.fly = null; this.orbit.addEventListener("start", () => { this.moved = true; }); this.ray.params.Line.threshold = 0.02; /* lines (the modeler's wire cube, string lights) would otherwise catch taps from a meter away */ this.load(officeScene()); this.view = "orbit"; this.orbit.maxDistance = 40; this.orbit.minDistance = 4; }
  frame() { this.goRoom("both", true); }
  resize() { super.resize(); if (this.people && !this.fly && this.room && !this.moved) this.goRoom(this.room, true); } // refit until someone turns the view themselves
  // camera spots for the room buttons
  goRoom(room, now) {
    const P = { both: [[W / 2 + 6, 15.5, D + 13], [W / 2, 0.6, D / 2 + 0.4]], venue: [[5 + 5, 8.5, D + 6.5], [5, 0.6, 5]], studio: [[17.5 + 5, 8.5, D + 6.5], [17.5, 0.6, 5]] }[room];
    if (!P) return; this.room = room;
    // step back on a tall, narrow screen (a phone held upright) so the whole room or building still fits across
    const a = this.persp.aspect || 1.5, k = Math.min(3, Math.max(1, (room === "both" ? 1.75 : 1.25) / a)), tg = new T.Vector3(...P[1]), at = new T.Vector3(...P[0]).sub(tg).multiplyScalar(k).add(tg);
    if (now || reduce) { this.persp.position.copy(at); this.orbit.target.copy(tg); this.orbit.update(); return; }
    this.fly = { p0: this.persp.position.clone(), t0: this.orbit.target.clone(), p1: at, t1: tg, s: performance.now() };
  }
  lookAt(k) { const p = this.people.get(k); if (!p) return; const pos = p.root.position, off = this.persp.position.clone().sub(this.orbit.target).setLength(7.5);
    this.fly = { p0: this.persp.position.clone(), t0: this.orbit.target.clone(), p1: pos.clone().add(new T.Vector3(0, 1, 0)).add(off), t1: pos.clone().add(new T.Vector3(0, 1, 0)), s: performance.now() }; }
  build() { super.build(); if (this.people) { this.people.forEach(p => this.world.add(p.root)); this.buildProps(); } }
  // things that show the tab's numbers: boxes waiting at Roy's door, the budget gauge on the bar, Icee's lamp, desk screens
  buildProps() {
    if (this.propG) this.world.remove(this.propG); const g = this.propG = new T.Group(); this.world.add(g); const d = this.data;
    const sign = (text, x, y, z, w, ry = 0) => { const s = nameTag(text); s.material.depthTest = true; s.position.set(x, y, z); s.scale.multiplyScalar(w); g.add(s); };
    sign("ROY", 4.8, 2.45, 0.5, 1.3); sign("THE VENUE", 2.6, 2.6, 0.5, 1.6); sign("THE STUDIO", 14.9, 2.5, 0.5, 1.6); // out from the wall: a sign turns to face you, so too close and the wall cuts it
    const n = Math.min(8, d.prs || 0), boxMat = [mat("#c98a4a"), mat("#d9a466")]; for (let i = 0; i < n; i++) g.add(boxM(0.42, 0.32, 0.42, boxMat[i % 2], 4.15 + (i % 2) * 0.48, 0.16 + Math.floor(i / 2) * 0.33, 0.55));
    const pct = Math.max(0, Math.min(100, d.budget || 0)), gx = 9.1, gz = 7.9; g.add(boxM(0.18, 0.5, 0.18, mat("#eaf6ff", { transparent: true, opacity: 0.6 }), gx, 1.35, gz)); g.add(boxM(0.14, Math.max(0.02, 0.46 * pct / 100), 0.14, mat(pct > 85 ? "#d62d2d" : pct > 60 ? "#f6892f" : "#2f8a4c"), gx, 1.12 + 0.23 * pct / 100, gz));
    const lampOn = (d.tickets || 0) > 0; g.add(mesh(new T.CylinderGeometry(0.01, 0.01, 0.4, 6), mat("#16255a"), 5.4, 0.98, 8.85)); g.add(mesh(new T.SphereGeometry(0.09, 14, 10), mat(lampOn ? "#f6892f" : "#9aa3b8", lampOn ? { emissive: "#f6892f", emissiveIntensity: 1.6 } : {}), 5.4, 1.22, 8.85));
    if (lampOn) { const l = new T.PointLight("#ffb060", 2.2, 3, 1.6); l.position.set(5.4, 1.4, 8.85); g.add(l); }
    const screen = (x, z, c) => { g.add(boxM(0.5, 0.32, 0.03, mat("#222226"), x, 1.0, z)); g.add(mesh(new T.PlaneGeometry(0.44, 0.27), mat(c, { emissive: c, emissiveIntensity: 1.1 }), x, 1.0, z + 0.017)); };
    screen(2.15, 7.4, "#8fd0ff"); screen(14.4, 0.6, "#ffd7b0"); g.add(boxM(0.36, 0.02, 0.26, mat("#222226"), 16.6, 1.08, 5.6));
    const globe = mesh(new T.SphereGeometry(0.2, 22, 16), mat("#5aa9e6"), 20.8, 1.02, 5.9); g.add(globe); g.add(mesh(new T.TorusGeometry(0.22, 0.01, 6, 24, Math.PI), mat("#c9a24a"), 20.8, 1.02, 5.9)); g.add(boxM(0.5, 0.36, 0.25, mat("#f6892f"), 21.6, 0.18, 7.3)); g.add(boxM(0.4, 0.3, 0.22, mat("#16255a"), 21.6, 0.51, 7.3));
  }
  // the Agents tab's news: who's here, what they're doing, who's chosen
  setState(m) {
    const before = JSON.stringify([this.data.prs, this.data.tickets, this.data.budget]);
    this.data = { prs: m.prs, tickets: m.tickets, budget: m.budget }; this.cast = m.cast || [];
    this.cast.forEach(c => { if (!HOME[c.k]) return; let p = this.people.get(c.k); const lk = JSON.stringify(c.look || null);
      if (p && p.lookKey !== lk) { this.world.remove(p.root); this.people.delete(c.k); p = null; } // new colors: draw the person again
      if (!p) { p = person(c); p.plan = walkPlan(c.k); p.offset = (c.k.length * 3.7) % 9; p.lookKey = lk; this.people.set(c.k, p); this.world.add(p.root); this.selK = undefined; }
      if (p.st !== c.st) { p.st = c.st; p.ring.material.color.set(RING[c.st] || RING.idle); if (p.bub) p.root.remove(p.bub); p.bub = bubble(c.st, c.k); p.bub.position.y = 2.15; p.root.add(p.bub); }
      p.label = c.l; p.crew = CREW.has(c.k); });
    if (m.sel !== this.selK) { this.selK = m.sel; this.people.forEach(p => { p.halo.visible = p.k === m.sel; p.ring.material.opacity = p.k === m.sel ? 0.75 : 0.5; if (p.tag) { p.root.remove(p.tag); p.tag = null; } if (p.k === m.sel) { p.tag = nameTag(p.label || p.k); p.tag.position.y = 2.55; p.root.add(p.tag); } }); if (m.look) this.lookAt(m.sel); }
    const nt = !!m.night; if (nt !== this.night) { this.night = nt; this.scene3.background = new T.Color(nt ? "#0e1838" : "#dfe3ec"); this.scene3.environmentIntensity = nt ? 0.06 : 0.12; }
    if (JSON.stringify([this.data.prs, this.data.tickets, this.data.budget]) !== before) this.buildProps();
  }
  tapped(id) { if (String(id).startsWith("ag:")) { const k = id.slice(3); parent !== window && parent.postMessage({ hmOffice: "pick", k }, location.origin); this.setState({ cast: this.cast, sel: k, ...this.data, night: this.night, look: true }); } }
  select() { } // furniture can't be selected or moved here
  // each frame: walk, swing legs and arms, then the editor draws
  tick() {
    if (this.people && this.s) {
      const now = performance.now(), t = (now - this.t0) / 1000;
      this.people.forEach(p => {
        const h = HOME[p.k], walking = !reduce && ((p.crew && p.st === "done") || (!p.crew && p.st === "work" && p.k !== "tech")), y = h[2] || 0;
        let x = h[0], z = h[1], dir = null, moving = false;
        if (walking) { const tt = (t + p.offset) % p.plan.cycle, leg = p.plan.legs.find(l => tt >= l.t0 && tt < l.t1);
          if (leg) { const f = (tt - leg.t0) / (leg.t1 - leg.t0); x = leg.a[0] + (leg.b[0] - leg.a[0]) * f; z = leg.a[1] + (leg.b[1] - leg.a[1]) * f; dir = Math.atan2(leg.b[0] - leg.a[0], leg.b[1] - leg.a[1]); moving = true; }
          else { const last = p.plan.legs.filter(l => l.t1 <= tt).pop(); if (last) { x = last.b[0]; z = last.b[1]; } } }
        p.root.position.set(x, y, z); if (dir != null) p.fig.rotation.y = dir; else if (!walking) p.fig.rotation.y = 0;
        const sw = moving ? Math.sin(t * 7.5) * 0.5 : 0; p.legL.rotation.x = sw; p.legR.rotation.x = -sw; p.armB.rotation.x = -sw * 0.7;
        p.armF.rotation.x = reduce ? 0 : p.st === "work" && !moving ? -0.9 + Math.sin(t * 9) * 0.15 : (p.st === "done" && !p.crew) || p.st === "fail" ? -2.7 + Math.sin(t * 3) * 0.2 : p.carry ? -1.1 : -sw * 0.7;
        if (p.k === "backup") p.armB.rotation.x = -1.1;
        if (p.bub) p.bub.position.y = 2.15 + (reduce ? 0 : Math.sin(t * 2 + p.offset) * 0.04);
      });
      if (this.fly) { const k = Math.min(1, (now - this.fly.s) / 450), e = k * (2 - k); this.persp.position.lerpVectors(this.fly.p0, this.fly.p1, e); this.orbit.target.lerpVectors(this.fly.t0, this.fly.t1, e); if (k >= 1) this.fly = null; }
    }
    super.tick();
  }
}

const ed = new Office(document.body);
window.hmOffice = ed; // for checks
document.querySelectorAll("[data-room]").forEach(b => b.onclick = () => { ed.moved = false; ed.goRoom(b.dataset.room); });
addEventListener("message", e => { if (e.origin === location.origin && e.data && e.data.hmOffice === "state" && ed.r) ed.setState(e.data); });
if (ed.r) {
  // opened on its own (not inside the Agents tab): everyone shows, resting
  const k = ["tester", "tech", "builder", "reviewer", "checks", "backup", "research", "modeler", "qa3d", "stay"];
  if (parent === window) setTimeout(() => { if (!ed.cast.length) ed.setState({ cast: k.map(x => ({ k: x, l: x, st: "idle" })), prs: 0, tickets: 0, budget: 0 }); }, 1500);
  if (parent !== window) parent.postMessage({ hmOffice: "ready" }, location.origin);
}
