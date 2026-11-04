// Host Mode 3D venue editor: draws a scene from 3d/scene.js and lets people (or the assistant) change it.
// Three.js (MIT) is vendored in 3d/vendor so the page has no outside service to depend on.
import * as T from "./vendor/three-bundle.min.js";
import * as S from "./scene.js";
import { Store } from "./store.js";
import { material, buildItem, box, setQuality, resetLights } from "./decor.js";

const $ = (q, el = document) => el.querySelector(q);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// ---------- Graphics check: WebGL2 is the renderer; WebGPU is only detected and reported for now ----------
function gpuInfo() {
  const c = document.createElement("canvas"); const gl2 = c.getContext("webgl2"); const gl = gl2 || c.getContext("webgl");
  const mobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
  const mem = navigator.deviceMemory || 8;
  return { webgl2: !!gl2, webgl: !!gl, webgpu: !!navigator.gpu, mobile, low: mobile && mem <= 4 };
}

// Surfaces, furniture and decor are drawn in decor.js.
// Walls with doors and windows cut out: each wall is split into solid pieces around its openings.
function buildWall(s, w) {
  const g = new T.Group(), L = S.wallLen(w), m = material(s.room.walls || "paint", w.color || s.room.wallColor, { size: [L, w.h] });
  const ops = s.openings.filter(o => o.wall === w.id).sort((a, b) => a.at - b.at);
  let cur = 0; const H = w.h, t = w.t;
  const seg = (x0, x1, y0, y1) => { if (x1 - x0 > 0.005 && y1 - y0 > 0.005) g.add(box(x1 - x0, y1 - y0, t, m, (x0 + x1) / 2, y0, 0)); };
  for (const o of ops) {
    const a = o.at - o.w / 2, b = o.at + o.w / 2; seg(cur, a, 0, H); seg(a, b, o.sill + o.h, H); seg(a, b, 0, o.sill);
    if (o.type === "window") { const gl = new T.Mesh(new T.PlaneGeometry(o.w, o.h), material("glass")); gl.position.set(o.at, o.sill + o.h / 2, 0); gl.userData.glass = true; g.add(gl); g.add(box(o.w, 0.05, t + 0.06, material("paint", "#ffffff"), o.at, o.sill - 0.05, 0)); [o.sill + o.h, o.sill].forEach(y => g.add(box(o.w + 0.1, 0.05, t + 0.04, material("paint", "#ffffff"), o.at, y - 0.025, 0))); [-1, 1].forEach(sd => g.add(box(0.05, o.h, t + 0.04, material("paint", "#ffffff"), o.at + sd * o.w / 2, o.sill, 0))); g.add(box(0.03, o.h, 0.04, material("paint", "#ffffff"), o.at, o.sill, 0)); }
    else { const dm = material("wood", "#7a5233", { size: 1 }), fr = material("paint", "#ffffff"), gold = material("gold"); const leaves = o.w > 1.2 ? 2 : 1; for (let k = 0; k < leaves; k++) { const lw = o.w / leaves, cx = a + lw * (k + 0.5); g.add(box(lw - 0.02, o.h - 0.02, 0.05, dm, cx, 0, 0)); [0.25, 0.62].forEach(f => g.add(box(lw - 0.2, o.h * 0.3, 0.06, dm, cx, o.h * f, 0))); g.add(box(0.02, 0.25, 0.08, gold, cx + (k ? -1 : 1) * (lw / 2 - 0.1), 1.0, 0)); } g.add(box(o.w + 0.12, 0.08, t + 0.04, fr, o.at, o.h, 0)); [-1, 1].forEach(sd => g.add(box(0.06, o.h, t + 0.04, fr, o.at + sd * (o.w / 2 + 0.03), 0, 0))); }
    cur = b;
  }
  seg(cur, L, 0, H);
  // Baseboard and crown molding, broken at the doors.
  const trim = material("paint", "#ffffff"); let c0 = 0;
  [...ops.filter(o => o.type === "door"), { at: L + 10, w: 0 }].forEach(o => { const a = Math.min(L, o.at - o.w / 2) - 0.06; if (a - c0 > 0.05) g.add(box(a - c0, 0.14, t + 0.03, trim, (c0 + a) / 2, 0, 0)); c0 = Math.max(c0, o.at + o.w / 2 + 0.06); });
  g.add(box(L, 0.12, t + 0.05, trim, L / 2, H - 0.12, 0));
  const ang = Math.atan2(w.b[1] - w.a[1], w.b[0] - w.a[0]);
  g.position.set(w.a[0], 0, w.a[1]); g.rotation.y = -ang;
  // Which side is outside the room, so the "dollhouse" view can hide walls between the camera and the room.
  const mid = new T.Vector3((w.a[0] + w.b[0]) / 2, 0, (w.a[1] + w.b[1]) / 2);
  const n = new T.Vector3(Math.sin(ang), 0, -Math.cos(ang)); if (n.dot(new T.Vector3(s.room.w / 2, 0, s.room.d / 2).sub(mid)) > 0) n.negate();
  g.userData = { wall: w.id, mid, out: n };
  return g;
}

// ---------- The editor ----------
export class Editor {
  constructor(root) {
    this.root = root; this.gpu = gpuInfo();
    this.quality = localStorage.getItem("hm3d_quality") || (this.gpu.low ? "low" : "high");
    this.units = localStorage.getItem("hm3d_units") || "ft";
    this.store = new Store(); this.hist = []; this.fut = []; this.sel = null; this.mode = "translate"; this.view = "orbit"; this.preview = null;
    if (!this.gpu.webgl) { root.innerHTML = '<div class="v3-nogl">This device can’t show 3D. Try a newer browser such as Chrome, Safari or Edge.</div>'; return; }
    this.initGL();
  }

  initGL() {
    const cv = $("#v3-canvas", this.root);
    this.r = new T.WebGLRenderer({ canvas: cv, antialias: this.quality !== "low", preserveDrawingBuffer: true, powerPreference: "high-performance" });
    this.r.outputColorSpace = T.SRGBColorSpace; this.r.toneMapping = T.ACESFilmicToneMapping; this.r.toneMappingExposure = 1.0;
    this.applyQuality();
    this.scene3 = new T.Scene(); this.scene3.background = new T.Color("#dfe3ec");
    // Soft reflections from a simple studio room, so polished floors, satin and glass catch light.
    const pm = new T.PMREMGenerator(this.r); this.scene3.environment = pm.fromScene(new T.RoomEnvironment(), 0.04).texture; this.scene3.environmentIntensity = 0.12;
    this.persp = new T.PerspectiveCamera(50, 1, 0.05, 400);
    this.ortho = new T.OrthographicCamera(-10, 10, 10, -10, 0.05, 400);
    this.cam = this.persp;
    this.orbit = new T.OrbitControls(this.persp, cv); this.orbit.enableDamping = true; this.orbit.maxPolarAngle = Math.PI * 0.495;
    this.orbitO = new T.OrbitControls(this.ortho, cv); this.orbitO.enableRotate = false; this.orbitO.enabled = false; this.orbitO.screenSpacePanning = true;
    this.tc = new T.TransformControls(this.persp, cv); this.tc.setTranslationSnap(S.FT / 2); this.tc.setRotationSnap(T.MathUtils.degToRad(15)); this.tc.setScaleSnap(0.05);
    this.tc.showY = false; this.tc.setSpace("local");
    this.tc.addEventListener("dragging-changed", e => { this.orbit.enabled = !e.value && this.view === "orbit"; this.orbitO.enabled = !e.value && this.view !== "orbit" && this.view !== "walk"; if (!e.value) this.commitDrag(); });
    this.tc.addEventListener("objectChange", () => this.dragLive());
    this.scene3.add(this.tc.getHelper());
    this.world = new T.Group(); this.scene3.add(this.world);
    this.selBox = new T.Box3Helper(new T.Box3(), new T.Color("#f6892f")); this.selBox.visible = false; this.scene3.add(this.selBox);
    this.ray = new T.Raycaster(); this.walk = { yaw: 0, pitch: 0, keys: {}, pos: new T.Vector3() };
    this.bindInput(cv);
    new ResizeObserver(() => this.resize()).observe(cv.parentElement); this.resize();
    // window.HM3D_PAUSED: set by the planner portal while its 3D designer tab is hidden, so the hidden view stops drawing
    const loop = () => { requestAnimationFrame(loop); if (!window.HM3D_PAUSED) this.tick(); }; loop();
  }

  applyQuality() {
    const hi = this.quality === "high";
    this.r.setPixelRatio(Math.min(window.devicePixelRatio || 1, hi ? 2 : 1));
    this.r.shadowMap.enabled = hi; this.r.shadowMap.type = T.PCFShadowMap; setQuality(hi);
    if (this.s) this.build();
  }

  // ---- Scene life cycle ----
  load(scene) { this.s = S.validateFile(S.clone(scene)); this.hist = []; this.fut = []; this.select(null); this.build(); this.frame(); this.emit(); }
  // Every change, from a tap or from the assistant, goes through here: validated, one undo step, saved locally.
  run(ops, why) {
    const r = S.apply(this.s, ops);
    if (!r.ok) { this.emit({ errors: r.errors }); return r; }
    this.hist.push(this.s); if (this.hist.length > 100) this.hist.shift(); this.fut = [];
    this.s = r.scene; this.build(); this.store.autosave(this.s); this.emit({ log: r.log, warnings: r.warnings, why });
    return r;
  }
  undo() { if (!this.hist.length) return; this.fut.push(this.s); this.s = this.hist.pop(); this.build(); this.store.autosave(this.s); this.emit({ log: ["Undone"] }); }
  redo() { if (!this.fut.length) return; this.hist.push(this.s); this.s = this.fut.pop(); this.build(); this.store.autosave(this.s); this.emit({ log: ["Redone"] }); }

  // Preview: show what a batch would do without keeping it. keep() makes it one undo step; drop() throws it away.
  previewOps(ops) {
    const r = S.apply(this.s, ops); if (!r.ok) return r;
    this.preview = { before: this.s, ops, r }; this.s = r.scene; this.build(); this.emit({ preview: r });
    return r;
  }
  keep() { if (!this.preview) return; const { before, ops } = this.preview; this.s = before; this.preview = null; return this.run(ops, "assistant"); }
  drop() { if (!this.preview) return; this.s = this.preview.before; this.preview = null; this.build(); this.emit({ log: ["Preview cancelled"] }); }

  build() {
    const s = this.s, W = this.world; const keepSel = this.sel, keepGrp = this.grp;
    this.tc.detach();
    W.traverse(o => { if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose(); });
    W.clear(); this.objs = new Map();
    const R = s.room;
    const fl = new T.Mesh(new T.PlaneGeometry(R.w, R.d), material(R.floor, R.floorColor, { size: [R.w, R.d] }));
    fl.rotation.x = -Math.PI / 2; fl.position.set(R.w / 2, 0, R.d / 2); fl.receiveShadow = true; fl.userData.floor = true; W.add(fl);
    const ground = new T.Mesh(new T.PlaneGeometry(R.w * 6, R.d * 6), new T.MeshStandardMaterial({ color: "#c9cfdb", roughness: 1 }));
    ground.rotation.x = -Math.PI / 2; ground.position.set(R.w / 2, -0.01, R.d / 2); ground.receiveShadow = true; W.add(ground);
    const ce = new T.Mesh(new T.PlaneGeometry(R.w, R.d), material(R.ceiling, R.ceilingColor || "#f4f1ea", { size: [R.w, R.d] }));
    ce.rotation.x = Math.PI / 2; ce.position.set(R.w / 2, R.h, R.d / 2); ce.userData.ceiling = true; W.add(ce); this.ceil = ce; // faces down, so it vanishes when seen from above
    this.walls = s.walls.map(w => { const g = buildWall(s, w); W.add(g); return g; });
    resetLights(); s.items.forEach(it => { const g = buildItem(it, s); W.add(g); this.objs.set(it.id, g); });
    this.lightObjs = [];
    s.lights.forEach(L => {
      let l;
      if (L.kind === "ambient") { l = new T.HemisphereLight("#ffffff", "#b9a88f", L.intensity * 2); W.add(l); return; }
      if (L.kind === "sun") { l = new T.DirectionalLight(L.color, L.intensity); l.position.set(L.x, L.y, L.z); l.target.position.set(R.w / 2, 0, R.d / 2); W.add(l.target);
        l.castShadow = true; const c = l.shadow.camera, e = Math.max(R.w, R.d); c.left = -e; c.right = e; c.top = e; c.bottom = -e; c.far = 80; l.shadow.mapSize.set(2048, 2048); l.shadow.bias = -0.0005; }
      if (L.kind === "point") { l = new T.PointLight(L.color, L.intensity, L.range || 10, 1.6); l.position.set(L.x, L.y, L.z); }
      if (L.kind === "spot") { l = new T.SpotLight(L.color, L.intensity, 30, T.MathUtils.degToRad(L.angle || 30), 0.4, 1.4); l.position.set(L.x, L.y, L.z); l.target.position.set(L.tx, L.ty, L.tz); W.add(l.target); l.castShadow = this.quality === "high"; l.shadow.mapSize.set(1024, 1024); }
      W.add(l);
      // A small glowing marker so lights can be seen and tapped.
      const bulb = new T.Mesh(new T.SphereGeometry(0.12, 12, 8), new T.MeshBasicMaterial({ color: L.color })); bulb.position.copy(l.position); bulb.userData = { id: L.id, light: true }; W.add(bulb);
      this.objs.set(L.id, bulb); this.lightObjs.push(bulb);
    });
    this.lightObjs.forEach(b => b.visible = this.showLights !== false && this.view !== "walk");
    if (keepGrp) {
      const set = keepGrp.set && s.sets && s.sets[keepGrp.set] ? keepGrp.set : null;
      const ids = set ? S.setMembers(s, set) : keepGrp.ids.filter(id => this.objs.has(id));
      if (ids.length) { this.selectGroup(ids, set); return; }
    }
    if (keepSel && this.objs.has(keepSel)) this.select(keepSel); else this.select(null);
  }

  // ---- Cameras ----
  resize() {
    const el = this.r.domElement.parentElement, w = el.clientWidth, h = el.clientHeight; if (!w || !h) return;
    this.r.setSize(w, h, false); this.persp.aspect = w / h; this.persp.updateProjectionMatrix(); this.fitOrtho();
  }
  fitOrtho() { const R = this.s ? this.s.room : { w: 20, d: 15, h: 4 }, el = this.r.domElement, a = el.clientWidth / Math.max(1, el.clientHeight); const span = (this.view === "top" ? Math.max(R.w / a, R.d) : Math.max((this.view === "side" ? R.d : R.w) / a, R.h * 1.4)) * 0.6; Object.assign(this.ortho, { left: -span * a, right: span * a, top: span, bottom: -span }); this.ortho.updateProjectionMatrix(); }
  frame() { const R = this.s.room; this.persp.position.set(R.w / 2 + R.w * 0.15, Math.max(R.w, R.d) * 0.9, R.d + R.d * 0.55); this.orbit.target.set(R.w / 2, 0.5, R.d / 2); this.orbit.update(); }
  setView(v) {
    const R = this.s.room; this.view = v; this.tc.enabled = v !== "walk";
    this.orbit.enabled = v === "orbit"; this.orbitO.enabled = v === "top" || v === "front" || v === "side";
    if (v === "orbit" || v === "walk") { this.cam = this.persp; this.tc.camera = this.persp; }
    else {
      this.cam = this.ortho; this.tc.camera = this.ortho; this.fitOrtho();
      const c = [R.w / 2, R.h / 2, R.d / 2];
      if (v === "top") { this.ortho.position.set(R.w / 2, 60, R.d / 2 + 0.001); this.ortho.up.set(0, 0, -1); }
      if (v === "front") { this.ortho.position.set(R.w / 2, R.h / 2, R.d + 60); this.ortho.up.set(0, 1, 0); }
      if (v === "side") { this.ortho.position.set(R.w + 60, R.h / 2, R.d / 2); this.ortho.up.set(0, 1, 0); }
      this.orbitO.object = this.ortho; this.orbitO.target.set(...(v === "top" ? [R.w / 2, 0, R.d / 2] : c)); this.ortho.zoom = 1; this.ortho.updateProjectionMatrix(); this.orbitO.update();
    }
    if (v === "walk") { const p = this.s.views[0]; this.walkTo(p ? p.pos : [R.w / 2, 1.65, R.d - 1], p ? p.target : [R.w / 2, 1.2, R.d / 2]); this.select(null); }
    this.lightObjs && this.lightObjs.forEach(b => b.visible = v !== "walk");
    this.emit();
  }
  walkTo(pos, target) {
    this.walk.pos.set(...pos); this.walk.pos.y = 1.65;
    const d = new T.Vector3(...target).sub(this.walk.pos); this.walk.yaw = Math.atan2(-d.x, -d.z); this.walk.pitch = Math.atan2(d.y, Math.hypot(d.x, d.z));
  }
  goView(id) {
    const v = this.s.views.find(x => x.id === id); if (!v) return;
    if (this.view === "walk") return this.walkTo(v.pos, v.target);
    this.setView("orbit"); this.persp.position.set(...v.pos); this.orbit.target.set(...v.target); this.orbit.update();
  }
  currentView() {
    if (this.view === "walk") { const p = this.walk.pos, f = this.walkDir(); return { pos: [p.x, p.y, p.z], target: [p.x + f.x * 3, p.y + f.y * 3, p.z + f.z * 3] }; }
    const p = this.persp.position, t = this.orbit.target; return { pos: [p.x, p.y, p.z], target: [t.x, t.y, t.z] };
  }
  walkDir() { const { yaw, pitch } = this.walk; return new T.Vector3(-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch)); }

  tick() {
    if (!this.s) return;
    const now = performance.now(), dt = Math.min(0.1, (now - (this.lastT || now)) / 1000); this.lastT = now;
    if (this.view === "walk") {
      const k = this.walk.keys, sp = 1.4 * dt, f = this.walkDir(); f.y = 0; f.normalize(); const rt = new T.Vector3(-f.z, 0, f.x);
      if (k.f) this.walk.pos.addScaledVector(f, sp); if (k.b) this.walk.pos.addScaledVector(f, -sp);
      if (k.l) this.walk.pos.addScaledVector(rt, -sp); if (k.r) this.walk.pos.addScaledVector(rt, sp);
      if (k.tl) this.walk.yaw += 1.6 * dt; if (k.tr) this.walk.yaw -= 1.6 * dt;
      const R = this.s.room; this.walk.pos.x = T.MathUtils.clamp(this.walk.pos.x, 0.3, R.w - 0.3); this.walk.pos.z = T.MathUtils.clamp(this.walk.pos.z, 0.3, R.d - 0.3);
      this.persp.position.copy(this.walk.pos); this.persp.lookAt(this.walk.pos.clone().add(this.walkDir()));
    } else if (this.view === "orbit") this.orbit.update(); else this.orbitO.update();
    // Dollhouse: in the 3D view, hide walls that stand between the camera and the room.
    const cp = this.cam.position;
    this.walls.forEach(g => { const { mid, out } = g.userData; g.visible = this.view === "walk" || this.view === "top" || cp.clone().sub(mid).dot(out) < 0.2 || (this.view !== "orbit" && false); if (this.view === "front" || this.view === "side") g.visible = cp.clone().sub(mid).dot(out) < 0; });
    this.ceil.visible = this.view === "walk";
    this.r.render(this.scene3, this.cam);
  }

  // ---- Tapping and dragging ----
  bindInput(cv) {
    let down = null;
    cv.addEventListener("pointerdown", e => { down = { x: e.clientX, y: e.clientY, t: Date.now() }; if (this.view === "walk") { this.walkDrag = { x: e.clientX, y: e.clientY }; cv.setPointerCapture(e.pointerId); } });
    cv.addEventListener("pointermove", e => { if (this.walkDrag) { this.walk.yaw += (e.clientX - this.walkDrag.x) * 0.005; this.walk.pitch = T.MathUtils.clamp(this.walk.pitch - (e.clientY - this.walkDrag.y) * 0.004, -1.2, 1.2); this.walkDrag = { x: e.clientX, y: e.clientY }; } });
    cv.addEventListener("pointerup", e => {
      this.walkDrag = null;
      if (!down || this.tc.dragging || this.view === "walk") return;
      if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return; // that was a camera drag, not a tap
      this.pick(e);
    });
    const map = { KeyW: "f", ArrowUp: "f", KeyS: "b", ArrowDown: "b", KeyA: "l", KeyD: "r", ArrowLeft: "tl", ArrowRight: "tr" };
    window.addEventListener("keydown", e => {
      if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
      if (this.view === "walk" && map[e.code]) { this.walk.keys[map[e.code]] = true; e.preventDefault(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === "z") { e.preventDefault(); e.shiftKey ? this.redo() : this.undo(); }
      if (e.key === "Escape") this.select(null);
      if (e.key === "g") this.setMode("translate"); if (e.key === "r") this.setMode("rotate"); if (e.key === "s" && !e.ctrlKey) this.setMode("scale");
    });
    window.addEventListener("keyup", e => { if (map[e.code]) this.walk.keys[map[e.code]] = false; });
  }
  pick(e) {
    const rc = this.r.domElement.getBoundingClientRect();
    const p = new T.Vector2(((e.clientX - rc.left) / rc.width) * 2 - 1, -((e.clientY - rc.top) / rc.height) * 2 + 1);
    this.ray.setFromCamera(p, this.cam);
    const hits = this.ray.intersectObjects(this.world.children, true).filter(h => h.object.visible);
    for (const h of hits) { let o = h.object; while (o && !o.userData.id && o !== this.world) o = o.parent; if (o && o.userData.id) { this.tapped(o.userData.id); return; } if (h.object.userData.floor) break; }
    if (!this.picking) this.select(null);
  }
  // In "pick several" mode a tap adds or drops a thing. Otherwise tapping a piece of a set selects the whole set,
  // and tapping a piece of the set that's already selected picks just that piece.
  tapped(id) {
    const root = S.rootOf(this.s, id);
    // placing a centerpiece or candles: the next tap on a table puts it there
    if (this.placeOnTable) {
      if (!root || S.CATALOG[root.kind].dress !== "table") { this.emit({ hint: "Tap a table to put it on" }); return; }
      const kind = this.placeOnTable, nid = S.uid("i_"); this.placeOnTable = null;
      const r = this.run([{ op: "add_item", kind, on: root.id, id: nid }]); if (r.ok) this.select(nid); return;
    }
    if (this.picking) { if (!root) return; const ids = new Set(this.pickIds || []); ids.has(root.id) ? ids.delete(root.id) : ids.add(root.id); this.pickIds = [...ids]; this.selectGroup(this.pickIds, null); return; }
    if (root && root.set && !(this.grp && this.grp.set === root.set)) { this.selectGroup(S.setMembers(this.s, root.set), root.set); return; }
    this.select(id);
  }
  // Several things selected at once: grp = {ids (main pieces), set (its id, or null for a loose pick), all (with attached chairs and decor)}.
  // The arrows move a stand-in point at their center; on release the change is one move_set / rotate_set step.
  selectGroup(ids, set) {
    this.sel = null; this.tc.detach();
    if (!ids || !ids.length) { this.grp = null; this.selBox.visible = false; this.emit(); return; }
    const all = S.setClosure(this.s, ids), its = all.map(id => this.itemOf(id)).filter(Boolean), [cx, cz] = S.setCenter(its);
    this.grp = { ids: [...ids], set: set || null, all };
    if (!this.pivot) this.pivot = new T.Object3D();
    this.world.add(this.pivot); this.pivot.position.set(cx, 0, cz); this.pivot.rotation.set(0, 0, 0); this.pivot.scale.set(1, 1, 1);
    this.grpBase = { x: cx, z: cz, objs: all.map(id => { const o = this.objs.get(id); return o && { o, x: o.position.x, z: o.position.z, ry: o.rotation.y }; }).filter(Boolean) };
    if (this.view !== "walk" && !this.picking) {
      const m = this.mode === "scale" ? "translate" : this.mode; this.tc.attach(this.pivot); this.tc.setMode(m);
      this.tc.showY = m === "rotate"; this.tc.showX = this.tc.showZ = m !== "rotate";
    }
    this.grpBox(); this.emit();
  }
  grpBox() { const b = new T.Box3(); (this.grpBase ? this.grpBase.objs : []).forEach(x => b.expandByObject(x.o)); this.selBox.box.copy(b); this.selBox.visible = !b.isEmpty(); }
  setPicking(on) {
    this.picking = !!on;
    if (on) {
      const r = this.sel && S.rootOf(this.s, this.sel);
      this.pickIds = this.grp && !this.grp.set ? this.grp.ids.slice() : r ? [r.id] : [];
      if (this.pickIds.length) this.selectGroup(this.pickIds, null); else { this.tc.detach(); this.sel = null; this.grp = null; this.selBox.visible = false; }
    } else if (this.grp) this.selectGroup(this.grp.ids, this.grp.set);
    this.emit();
  }
  grpTarget() { return this.grp ? (this.grp.set ? { set: this.grp.set } : { ids: this.grp.ids.slice() }) : null; }
  select(id) {
    this.grp = null; if (!id) this.picking = false;
    this.sel = id; const o = id && this.objs.get(id);
    if (o && this.view !== "walk") {
      this.tc.attach(o); this.tc.setMode(o.userData.light ? "translate" : this.mode); this.tc.showY = !!o.userData.light;
      this.tc.showX = this.tc.showZ = !(this.tc.mode === "rotate"); if (this.tc.mode === "rotate") { this.tc.showY = true; this.tc.showX = this.tc.showZ = false; }
      if (this.tc.mode === "scale") { this.tc.showX = this.tc.showZ = true; this.tc.showY = !(this.itemOf(id) || {}).kind?.match(/dance_floor/); }
      this.selBox.box.setFromObject(o); this.selBox.visible = true;
    } else { this.tc.detach(); this.selBox.visible = false; }
    this.emit();
  }
  setMode(m) { this.mode = m; if (this.grp) this.selectGroup(this.grp.ids, this.grp.set); else if (this.sel) this.select(this.sel); this.emit(); }
  itemOf(id) { return this.s.items.find(i => i.id === id) || this.s.lights.find(l => l.id === id); }
  dragLive() {
    const o = this.tc.object; if (!o) return;
    if (o === this.pivot && this.grpBase) {
      // move and turn every piece with the stand-in, the same way move_set and rotate_set will
      const b = this.grpBase, dx = o.position.x - b.x, dz = o.position.z - b.z, phi = o.rotation.y, da = -phi;
      b.objs.forEach(x => { const rx = x.x - b.x, rz = x.z - b.z; x.o.position.x = b.x + dx + rx * Math.cos(da) + rz * Math.sin(da); x.o.position.z = b.z + dz - rx * Math.sin(da) + rz * Math.cos(da); x.o.rotation.y = x.ry + phi; });
      this.grpBox(); return;
    }
    this.selBox.box.setFromObject(o);
  }
  commitDrag() {
    const o = this.tc.object; if (!o) return;
    if (o === this.pivot && this.grp) {
      const b = this.grpBase, t = this.grpTarget(), ops = [], dx = o.position.x - b.x, dz = o.position.z - b.z, by = -T.MathUtils.radToDeg(o.rotation.y);
      if (Math.abs(by) > 0.5) ops.push(Object.assign({ op: "rotate_set", by }, t));
      if (Math.abs(dx) > 1e-3 || Math.abs(dz) > 1e-3) ops.push(Object.assign({ op: "move_set", dx, dz }, t));
      if (ops.length) { const r = this.run(ops, "drag"); if (!r.ok) this.build(); }
      return;
    } const it = this.itemOf(o.userData.id); if (!it) return;
    const ops = [];
    if (o.userData.light) ops.push({ op: "move_object", id: it.id, x: o.position.x, z: o.position.z, y: o.position.y });
    else {
      if (Math.abs(o.position.x - it.x) > 1e-3 || Math.abs(o.position.z - it.z) > 1e-3) ops.push({ op: "move_object", id: it.id, x: o.position.x, z: o.position.z });
      const rot = -T.MathUtils.radToDeg(o.rotation.y); if (Math.abs(((rot - it.rot) % 360 + 540) % 360 - 180) > 0.5) ops.push({ op: "rotate_object", id: it.id, rot });
      const sc = o.scale; if (Math.abs(sc.x - 1) > 1e-3 || Math.abs(sc.y - 1) > 1e-3 || Math.abs(sc.z - 1) > 1e-3) ops.push({ op: "resize_object", id: it.id, w: Math.max(0.1, it.w * sc.x), h: Math.max(0.02, it.h * sc.y), d: Math.max(0.1, it.d * sc.z) });
    }
    if (ops.length) { const r = this.run(ops, "drag"); if (!r.ok) this.build(); }
  }

  // ---- Pictures and files ----
  snapshot(w = 1600) { const el = this.r.domElement, h = Math.round(w * el.clientHeight / el.clientWidth); const old = [el.clientWidth, el.clientHeight]; this.r.setSize(w, h, false); this.persp.aspect = w / h; this.persp.updateProjectionMatrix(); this.selBox.visible = false; const th = this.tc.getHelper().visible; this.tc.getHelper().visible = false; this.tick(); const url = el.toDataURL("image/png"); this.tc.getHelper().visible = th; this.r.setSize(old[0], old[1], false); this.resize(); this.select(this.sel); return url; }
  exportGLB() {
    return new Promise((ok, no) => {
      const g = this.world.clone(true); g.traverse(o => { if (o.isLight || (o.userData && o.userData.light)) o.visible = false; });
      new T.GLTFExporter().parse(g, buf => ok(new Blob([buf], { type: "model/gltf-binary" })), no, { binary: true, onlyVisible: true });
    });
  }

  // UI hooks
  on(fn) { this.listeners = (this.listeners || []).concat(fn); }
  emit(info = {}) { (this.listeners || []).forEach(f => f(info)); }
}

export { S, esc };
