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
    else if (o.type === "opening") { /* an open doorway: just the gap, nothing in it */ }
    else { const dm = material("wood", "#7a5233", { size: 1 }), fr = material("paint", "#ffffff"), gold = material("gold"); const leaves = o.w > 1.2 ? 2 : 1; for (let k = 0; k < leaves; k++) { const lw = o.w / leaves, cx = a + lw * (k + 0.5); g.add(box(lw - 0.02, o.h - 0.02, 0.05, dm, cx, 0, 0)); [0.25, 0.62].forEach(f => g.add(box(lw - 0.2, o.h * 0.3, 0.06, dm, cx, o.h * f, 0))); g.add(box(0.02, 0.25, 0.08, gold, cx + (k ? -1 : 1) * (lw / 2 - 0.1), 1.0, 0)); } g.add(box(o.w + 0.12, 0.08, t + 0.04, fr, o.at, o.h, 0)); [-1, 1].forEach(sd => g.add(box(0.06, o.h, t + 0.04, fr, o.at + sd * (o.w / 2 + 0.03), 0, 0))); }
    cur = b;
  }
  seg(cur, L, 0, H);
  // Baseboard and crown molding, broken at the doors.
  const trim = material("paint", "#ffffff"); let c0 = 0;
  [...ops.filter(o => o.type === "door" || o.type === "opening"), { at: L + 10, w: 0 }].forEach(o => { const a = Math.min(L, o.at - o.w / 2) - 0.06; if (a - c0 > 0.05) g.add(box(a - c0, 0.14, t + 0.03, trim, (c0 + a) / 2, 0, 0)); c0 = Math.max(c0, o.at + o.w / 2 + 0.06); });
  g.add(box(L, 0.12, t + 0.05, trim, L / 2, H - 0.12, 0));
  const ang = Math.atan2(w.b[1] - w.a[1], w.b[0] - w.a[0]);
  g.position.set(w.a[0], 0, w.a[1]); g.rotation.y = -ang;
  // Which side is outside the room, so the "dollhouse" view can hide walls between the camera and the room.
  const mid = new T.Vector3((w.a[0] + w.b[0]) / 2, 0, (w.a[1] + w.b[1]) / 2);
  const n = new T.Vector3(Math.sin(ang), 0, -Math.cos(ang)); if (n.dot(new T.Vector3(s.room.w / 2, 0, s.room.d / 2).sub(mid)) > 0) n.negate();
  g.userData = { wall: w.id, mid, out: n, knee: w.h < 1.5 }; // a knee wall can't block the view, so the dollhouse never hides it
  return g;
}

// ---------- The editor ----------
export class Editor {
  constructor(root) {
    this.root = root; this.gpu = gpuInfo();
    this.quality = localStorage.getItem("hm3d_quality") || (this.gpu.low ? "low" : "high");
    this.units = localStorage.getItem("hm3d_units") || "ft";
    this.store = new Store(); this.hist = []; this.fut = []; this.sel = null; this.mode = "translate"; this.gestureMode = "object"; this.view = "orbit"; this.preview = null; this.placement = null;
    if (!this.gpu.webgl) { root.innerHTML = '<div class="v3-nogl">This device can’t show 3D. Try a newer browser such as Chrome, Safari or Edge.</div>'; return; }
    this.initGL();
  }

  initGL() {
    const cv = $("#v3-canvas", this.root);
    this.r = new T.WebGLRenderer({ canvas: cv, antialias: this.quality !== "low", preserveDrawingBuffer: true, alpha: true, powerPreference: "high-performance" }); // alpha: the Photo view shows the venue photo through the empty parts
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
    this.ray = new T.Raycaster(); this.floorPlane = new T.Plane(new T.Vector3(0, 1, 0), 0); this.walk = { yaw: 0, pitch: 0, keys: {}, pos: new T.Vector3() };
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
  load(scene) { this.cancelPlacement(); this.s = S.validateFile(S.clone(scene)); this.hist = []; this.fut = []; this.select(null); this.build(); this.frame(); this.emit(); }
  // Every change, from a tap or from the assistant, goes through here: validated, one undo step, saved locally.
  run(ops, why) {
    this.cancelPlacement();
    const r = S.apply(this.s, ops);
    if (!r.ok) { this.emit({ errors: r.errors }); return r; }
    this.hist.push(this.s); if (this.hist.length > 100) this.hist.shift(); this.fut = [];
    this.s = r.scene; this.build(); this.store.autosave(this.s); this.emit({ log: r.log, warnings: r.warnings, why });
    return r;
  }
  undo() { this.cancelPlacement(); if (!this.hist.length) return; this.fut.push(this.s); this.s = this.hist.pop(); this.build(); this.store.autosave(this.s); this.emit({ log: ["Undone"] }); }
  redo() { this.cancelPlacement(); if (!this.fut.length) return; this.hist.push(this.s); this.s = this.fut.pop(); this.build(); this.store.autosave(this.s); this.emit({ log: ["Redone"] }); }

  // Preview: show what a batch would do without keeping it. keep() makes it one undo step; drop() throws it away.
  previewOps(ops) {
    const r = S.apply(this.s, ops); if (!r.ok) return r;
    this.preview = { before: this.s, ops, r }; this.s = r.scene; this.build(); this.emit({ preview: r });
    return r;
  }
  keep() { if (!this.preview) return; const { before, ops } = this.preview; this.s = before; this.preview = null; return this.run(ops, "assistant"); }
  drop() { if (!this.preview) return; this.s = this.preview.before; this.preview = null; this.build(); this.emit({ log: ["Preview cancelled"] }); }

  build() {
    this.cancelPlacement();
    const s = this.s, W = this.world; const keepSel = this.sel, keepGrp = this.grp;
    this.tc.detach();
    W.traverse(o => { if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose(); });
    W.clear(); this.objs = new Map();
    const R = s.room;
    const fl = new T.Mesh(new T.PlaneGeometry(R.w, R.d), material(R.floor, R.floorColor, { size: [R.w, R.d] }));
    fl.rotation.x = -Math.PI / 2; fl.position.set(R.w / 2, 0, R.d / 2); fl.receiveShadow = true; fl.userData.floor = true; W.add(fl); this.floorMesh = fl;
    // In the Photo view the real floor shows instead: this see-through floor only darkens where shadows fall
    const sc = new T.Mesh(new T.PlaneGeometry(R.w * 3, R.d * 3), new T.ShadowMaterial({ opacity: 0.3 })); sc.rotation.x = -Math.PI / 2; sc.position.set(R.w / 2, 0.001, R.d / 2); sc.receiveShadow = true; sc.userData.floor = true; sc.visible = false; W.add(sc); this.shadowCatch = sc;
    const ground = new T.Mesh(new T.PlaneGeometry(R.w * 6, R.d * 6), new T.MeshStandardMaterial({ color: "#c9cfdb", roughness: 1 }));
    ground.rotation.x = -Math.PI / 2; ground.position.set(R.w / 2, -0.01, R.d / 2); ground.receiveShadow = true; W.add(ground); this.groundMesh = ground;
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
    this.lightObjs.forEach(b => b.visible = this.showLights !== false && this.view !== "walk" && this.view !== "photo");
    this.photoGrid = null; this.syncPhoto();
    if (keepGrp) {
      const set = keepGrp.set && s.sets && s.sets[keepGrp.set] ? keepGrp.set : null;
      const ids = set ? S.setMembers(s, set) : keepGrp.ids.filter(id => this.objs.has(id));
      if (ids.length) { this.selectGroup(ids, set); return; }
    }
    if (keepSel && this.objs.has(keepSel)) this.select(keepSel); else this.select(null);
  }

  // ---- Cameras ----
  resize() {
    const cv = this.r.domElement, el = cv.parentElement; let w = el.clientWidth, h = el.clientHeight; if (!w || !h) return;
    const P = this.view === "photo" && this.s && this.s.photo;
    if (P) { const a = P.iw / P.ih; if (w / h > a) w = Math.round(h * a); else h = Math.round(w / a);
      const box = { position: "absolute", left: Math.round((el.clientWidth - w) / 2) + "px", top: Math.round((el.clientHeight - h) / 2) + "px", width: w + "px", height: h + "px" };
      Object.assign(cv.style, box); if (this.photoEl) Object.assign(this.photoEl.style, box); }
    else { ["position", "left", "top", "width", "height"].forEach(k => cv.style[k] = ""); }
    this.r.setSize(w, h, false); this.persp.aspect = w / h; this.persp.updateProjectionMatrix(); this.fitOrtho();
  }
  fitOrtho() { const R = this.s ? this.s.room : { w: 20, d: 15, h: 4 }, el = this.r.domElement, a = el.clientWidth / Math.max(1, el.clientHeight); const span = (this.view === "top" ? Math.max(R.w / a, R.d) : Math.max((this.view === "side" ? R.d : R.w) / a, R.h * 1.4)) * 0.6; Object.assign(this.ortho, { left: -span * a, right: span * a, top: span, bottom: -span }); this.ortho.updateProjectionMatrix(); }
  frame() { const R = this.s.room; this.persp.position.set(R.w / 2 + R.w * 0.15, Math.max(R.w, R.d) * 0.9, R.d + R.d * 0.55); this.orbit.target.set(R.w / 2, 0.5, R.d / 2); this.orbit.update(); }
  setView(v) {
    if (v === "photo" && !(this.s.photo && this.photoImg)) v = "orbit";
    const R = this.s.room, was = this.view; this.view = v; this.tc.enabled = v !== "walk";
    this.orbit.enabled = v === "orbit"; this.orbitO.enabled = v === "top" || v === "front" || v === "side";
    if (was === "photo" && v !== "photo") { this.persp.fov = 50; this.persp.updateProjectionMatrix(); this.frame(); }
    if (v === "orbit" || v === "walk" || v === "photo") { this.cam = this.persp; this.tc.camera = this.persp; }
    else {
      this.cam = this.ortho; this.tc.camera = this.ortho; this.fitOrtho();
      const c = [R.w / 2, R.h / 2, R.d / 2];
      if (v === "top") { this.ortho.position.set(R.w / 2, 60, R.d / 2 + 0.001); this.ortho.up.set(0, 0, -1); }
      if (v === "front") { this.ortho.position.set(R.w / 2, R.h / 2, R.d + 60); this.ortho.up.set(0, 1, 0); }
      if (v === "side") { this.ortho.position.set(R.w + 60, R.h / 2, R.d / 2); this.ortho.up.set(0, 1, 0); }
      this.orbitO.object = this.ortho; this.orbitO.target.set(...(v === "top" ? [R.w / 2, 0, R.d / 2] : c)); this.ortho.zoom = 1; this.ortho.updateProjectionMatrix(); this.orbitO.update();
    }
    if (v === "walk") { const p = this.s.views[0]; this.walkTo(p ? p.pos : [R.w / 2, 1.65, R.d - 1], p ? p.target : [R.w / 2, 1.2, R.d / 2]); this.select(null); }
    this.lightObjs && this.lightObjs.forEach(b => b.visible = v !== "walk" && v !== "photo");
    this.syncTransformControls();
    this.resize(); this.syncPhoto();
    this.emit();
  }
  syncTransformControls() {
    if (!this.tc) return;
    const active = this.view !== "walk" && this.gestureMode === "object";
    this.tc.enabled = active;
    this.tc.getHelper().visible = active;
  }
  setGestureMode(mode) {
    if (mode !== "object" && mode !== "view") return;
    this.gestureMode = mode;
    this.syncTransformControls();
    this.emit();
  }
  centerView() {
    if (this.view !== "orbit") this.setView("orbit");
    this.frame();
  }
  focusSelection() {
    const ids = this.grp ? this.grp.all : this.sel ? [this.sel] : [];
    const objects = ids.map(id => this.objs.get(id)).filter(Boolean);
    if (!objects.length) return false;
    if (this.view !== "orbit") this.setView("orbit");
    const bounds = new T.Box3();
    objects.forEach(o => bounds.expandByObject(o));
    const target = bounds.getCenter(new T.Vector3()), shift = target.clone().sub(this.orbit.target);
    this.persp.position.add(shift);
    this.orbit.target.copy(target);
    this.orbit.update();
    return true;
  }

  // Place a library piece by moving its see-through preview, then tapping the room.
  startPlacement(kind) {
    const c = S.CATALOG[kind];
    if (!c || c.top) return false;
    this.cancelPlacement();
    this.gestureMode = "object"; this.mode = "translate";
    if (this.view !== "top") this.setView("top");
    this.select(null);
    const x = this.s.room.w / 2, z = this.s.room.d / 2;
    const item = S.mkItem(kind, x, z, 0, { id: "placement_preview" });
    if (c.ceiling) item.y = this.s.room.h - item.h;
    const ghost = buildItem(item, this.s), mats = [];
    ghost.traverse(o => {
      if (o.isLight) { o.visible = false; return; }
      if (!o.material) return;
      const fade = m => { const copy = m.clone(); copy.transparent = true; copy.opacity = Math.min(copy.opacity, 0.48); copy.depthWrite = false; mats.push(copy); return copy; };
      o.material = Array.isArray(o.material) ? o.material.map(fade) : fade(o.material);
    });
    ghost.userData.placementPreview = true;
    this.world.add(ghost);
    this.placement = { kind, ghost, x, y: item.y || 0, z, mats };
    this.syncTransformControls();
    this.emit();
    return true;
  }
  cancelPlacement() {
    if (!this.placement) return;
    const { ghost, mats } = this.placement;
    if (ghost.parent) ghost.parent.remove(ghost);
    ghost.traverse(o => { if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose(); });
    mats.forEach(m => m.dispose());
    this.placement = null;
  }
  floorPoint(e) {
    const rc = this.r.domElement.getBoundingClientRect();
    const p = new T.Vector2(((e.clientX - rc.left) / rc.width) * 2 - 1, -((e.clientY - rc.top) / rc.height) * 2 + 1);
    this.ray.setFromCamera(p, this.cam);
    return this.ray.ray.intersectPlane(this.floorPlane, new T.Vector3());
  }
  placementPoint(e) {
    if (!this.placement) return;
    const point = this.floorPoint(e);
    if (!point) return;
    const c = S.CATALOG[this.placement.kind], R = this.s.room;
    const x = c.w > R.w ? R.w / 2 : T.MathUtils.clamp(point.x, c.w / 2, R.w - c.w / 2);
    const z = c.d > R.d ? R.d / 2 : T.MathUtils.clamp(point.z, c.d / 2, R.d - c.d / 2);
    this.placement.x = x; this.placement.z = z;
    this.placement.ghost.position.set(x, this.placement.y, z);
  }
  finishPlacement(e) {
    if (!this.placement) return;
    this.placementPoint(e);
    const { kind, x, z } = this.placement, id = S.uid("i_");
    this.cancelPlacement();
    const r = this.run([{ op: "add_item", kind, id, x, z }]);
    if (r.ok) { this.select(id); this.emit({ toast: "Placed. Tap Undo at the top to reverse it." }); }
  }

  // ---- Designing over a venue photo (Stage A) ----
  // The photo sits in an <img> right behind the canvas; the room's own floor, walls and ceiling are hidden, and the camera is
  // put where the photo was taken (S.photoCamera, worked out from the four floor dots). photoBare shows the room as it is;
  // photoAlign shows a grid on the marked floor so the dots can be lined up.
  async loadPhoto() {
    const P = this.s && this.s.photo; if (!P) { this.photoImg = null; this.photoRef = null; return null; }
    if (this.photoRef === P.ref && this.photoImg) return this.photoImg;
    const url = await this.store.loadPhoto(P.ref); this.photoMissing = !url && !!this.s.photo && this.s.photo.ref === P.ref; if (this.photoMissing) this.emit({ photo: true });
    if (!url || !this.s.photo || this.s.photo.ref !== P.ref) return null;
    const img = new Image(); img.src = url; try { await img.decode(); } catch (e) { return null; }
    this.photoImg = img; this.photoRef = P.ref; this.syncPhoto(); this.emit({ photo: true }); return img;
  }
  syncPhoto() {
    const want = this.s && this.s.photo && this.s.photo.ref;
    if (want && this.photoRef !== want && !this.photoLoading) { this.photoImg = null; this.photoLoading = true; this.loadPhoto().finally(() => { this.photoLoading = false; }); }
    if (!want) { this.photoImg = null; this.photoRef = null; }
    if (!want) this.photoMissing = false;
    if (this.view === "photo" && !(want && (this.photoImg || this.photoLoading))) { this.setView("orbit"); return; }
    const on = this.view === "photo" && this.s && this.s.photo && this.photoImg, P = on ? this.s.photo : null;
    if (on && !this.photoEl) { const im = document.createElement("img"); im.className = "v3-photo"; im.alt = ""; im.setAttribute("aria-hidden", "true"); im.style.position = "absolute"; im.style.pointerEvents = "none"; im.style.objectFit = "fill"; this.r.domElement.parentElement.insertBefore(im, this.r.domElement); this.photoEl = im; }
    if (this.photoEl) { this.photoEl.style.display = on ? "block" : "none"; if (on && this.photoEl.src !== this.photoImg.src) this.photoEl.src = this.photoImg.src; if (on) ["left", "top", "width", "height"].forEach(k => this.photoEl.style[k] = this.r.domElement.style[k]); } // same box as the canvas, even the first time
    this.scene3.background = on ? null : new T.Color("#dfe3ec"); this.r.setClearColor(0x000000, on ? 0 : 1);
    this.r.domElement.parentElement.classList.toggle("photo", !!on);
    if (!this.floorMesh) return;
    [this.floorMesh, this.groundMesh].forEach(m => m.visible = !on); this.shadowCatch.visible = !!on;
    this.objs && this.objs.forEach((g, id) => { if (!g.userData.light) g.visible = !(on && this.photoBare); });
    if (this.photoGrid) { this.world.remove(this.photoGrid); this.photoGrid.geometry.dispose(); this.photoGrid = null; }
    if (!on) return;
    const c = S.photoCamera(P); this.photoFit = c; if (!c.ok) return;
    const m = new T.Matrix4().makeBasis(new T.Vector3(...c.x), new T.Vector3(...c.y), new T.Vector3(...c.z));
    this.persp.position.set(...c.pos); this.persp.quaternion.setFromRotationMatrix(m); this.persp.fov = c.fov; this.persp.updateProjectionMatrix();
    if (this.photoAlign) { // a 1 ft (or 1 m) grid over the marked floor: if the dots are right, it lies flat on the real floor
      const W = P.w || 1, D = c.d, step = this.units === "m" ? 1 : S.FT, ox = P.ox || 0, oz = P.oz || 0, pts = [];
      for (let a = 0; a <= W + 1e-6; a += step) pts.push(ox + a, 0.01, oz, ox + a, 0.01, oz + D); pts.push(ox + W, 0.01, oz, ox + W, 0.01, oz + D);
      for (let b = 0; b <= D + 1e-6; b += step) pts.push(ox, 0.01, oz + b, ox + W, 0.01, oz + b); pts.push(ox, 0.01, oz + D, ox + W, 0.01, oz + D);
      const geo = new T.BufferGeometry(); geo.setAttribute("position", new T.Float32BufferAttribute(pts, 3));
      const gl = new T.LineSegments(geo, new T.LineBasicMaterial({ color: "#f6892f", depthTest: false, transparent: true, opacity: 0.85 })); gl.renderOrder = 10; this.world.add(gl); this.photoGrid = gl;
    }
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
    } else if (this.view === "orbit") this.orbit.update(); else if (this.view !== "photo") this.orbitO.update();
    // Dollhouse: in the 3D view, hide walls that stand between the camera and the room.
    const cp = this.cam.position;
    this.walls.forEach(g => { const { mid, out } = g.userData; g.visible = this.view === "walk" || this.view === "top" || cp.clone().sub(mid).dot(out) < 0.2 || (this.view !== "orbit" && false); if (this.view === "front" || this.view === "side") g.visible = cp.clone().sub(mid).dot(out) < 0; });
    this.ceil.visible = this.view === "walk";
    if (this.view === "photo") this.walls.forEach(g => g.visible = false); else this.walls.forEach(g => { if (g.userData.knee) g.visible = true; });
    this.r.render(this.scene3, this.cam);
  }

  // ---- Tapping and dragging ----
  bindInput(cv) {
    let down = null;
    const stop = e => { e.preventDefault(); e.stopImmediatePropagation(); };
    cv.addEventListener("pointerdown", e => {
      down = { x: e.clientX, y: e.clientY, t: Date.now() };
      if (this.placement) {
        this.placementPointer = { id: e.pointerId };
        this.placementPoint(e);
        cv.setPointerCapture(e.pointerId); stop(e); return;
      }
      if (e.isPrimary === false || this.view === "walk" || this.view === "photo" || this.picking || this.gestureMode !== "object" || this.mode !== "translate" || !(this.sel || this.grp)) return;
      const rc = cv.getBoundingClientRect(), p = new T.Vector2(((e.clientX - rc.left) / rc.width) * 2 - 1, -((e.clientY - rc.top) / rc.height) * 2 + 1);
      this.ray.setFromCamera(p, this.cam);
      const helper = this.tc.getHelper(), handles = this.ray.intersectObject(helper, true).filter(h => {
        for (let o = h.object; o && o !== helper; o = o.parent) if (!o.visible) return false;
        return h;
      });
      const selected = new Set(this.grp ? this.grp.all : [this.sel, ...this.s.items.filter(i => i.group === this.sel).map(i => i.id)]);
      let selectedHit = null;
      for (const h of this.ray.intersectObjects(this.world.children, true)) {
        if (!h.object.visible || h.object.userData.thru) continue;
        let o = h.object; while (o && !o.userData.id && o !== this.world) o = o.parent;
        if (o && selected.has(o.userData.id)) selectedHit = { id: o.userData.id, distance: h.distance };
        if (o) break;
        if (h.object.userData.floor) break;
      }
      if (!selectedHit || (handles.length && handles[0].distance < selectedHit.distance - 0.02)) return;
      const point = this.floorPoint(e);
      if (!point) return;
      const ids = this.grp ? this.grp.all : [this.sel, ...this.s.items.filter(i => i.group === this.sel).map(i => i.id)];
      const objs = ids.map(id => this.objs.get(id)).filter(Boolean);
      const items = ids.map(id => this.itemOf(id)).filter(i => i && i.w != null && i.d != null);
      this.directDrag = {
        id: this.sel, grouped: !!this.grp, pointerId: e.pointerId, x: point.x, z: point.z, startX: e.clientX, startY: e.clientY, moved: false,
        objs: objs.map(o => ({ o, x: o.position.x, z: o.position.z })),
        bounds: items.length ? {
          minX: Math.min(...items.map(i => i.x - i.w / 2)), maxX: Math.max(...items.map(i => i.x + i.w / 2)),
          minZ: Math.min(...items.map(i => i.z - i.d / 2)), maxZ: Math.max(...items.map(i => i.z + i.d / 2))
        } : null,
        target: this.grp ? this.grpTarget() : null
      };
      down = null; cv.setPointerCapture(e.pointerId); stop(e);
    }, true);
    cv.addEventListener("pointermove", e => {
      if (this.placementPointer && this.placementPointer.id === e.pointerId) { this.placementPoint(e); stop(e); return; }
      const d = this.directDrag;
      if (!d || d.pointerId !== e.pointerId) return;
      if (Math.hypot(e.clientX - d.startX, e.clientY - d.startY) > 4) d.moved = true;
      if (!d.moved) { stop(e); return; }
      const point = this.floorPoint(e); if (!point) { stop(e); return; }
      let dx = point.x - d.x, dz = point.z - d.z;
      if (d.bounds) {
        const R = this.s.room, b = d.bounds;
        dx = T.MathUtils.clamp(dx, -b.minX, R.w - b.maxX);
        dz = T.MathUtils.clamp(dz, -b.minZ, R.d - b.maxZ);
      }
      d.objs.forEach(x => { x.o.position.x = x.x + dx; x.o.position.z = x.z + dz; });
      if (this.grp) this.grpBox(); else if (this.sel && this.objs.has(this.sel)) this.selBox.box.setFromObject(this.objs.get(this.sel));
      stop(e);
    }, true);
    cv.addEventListener("pointerup", e => {
      if (this.placementPointer && this.placementPointer.id === e.pointerId) {
        this.placementPointer = null; this.finishPlacement(e); down = null; stop(e); return;
      }
      if (this.directDrag && this.directDrag.pointerId === e.pointerId) { this.finishDirectDrag(true); down = null; stop(e); }
    }, true);
    cv.addEventListener("pointercancel", e => {
      if (this.placementPointer && this.placementPointer.id === e.pointerId) { this.placementPointer = null; down = null; stop(e); return; }
      if (this.directDrag && this.directDrag.pointerId === e.pointerId) { this.finishDirectDrag(false); down = null; stop(e); }
    }, true);
    cv.addEventListener("pointerdown", e => { down = { x: e.clientX, y: e.clientY, t: Date.now() }; if (this.view === "walk") { this.walkDrag = { x: e.clientX, y: e.clientY }; cv.setPointerCapture(e.pointerId); } });
    cv.addEventListener("pointermove", e => { if (this.walkDrag) { this.walk.yaw += (e.clientX - this.walkDrag.x) * 0.005; this.walk.pitch = T.MathUtils.clamp(this.walk.pitch - (e.clientY - this.walkDrag.y) * 0.004, -1.2, 1.2); this.walkDrag = { x: e.clientX, y: e.clientY }; } });
    cv.addEventListener("pointerup", e => {
      this.walkDrag = null;
      if (!down || this.tc.dragging || this.view === "walk") { down = null; return; }
      if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return; // that was a camera drag, not a tap
      down = null;
      this.pick(e);
    });
    const map = { KeyW: "f", ArrowUp: "f", KeyS: "b", ArrowDown: "b", KeyA: "l", KeyD: "r", ArrowLeft: "tl", ArrowRight: "tr" };
    window.addEventListener("keydown", e => {
      if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
      if (this.view === "walk" && map[e.code]) { this.walk.keys[map[e.code]] = true; e.preventDefault(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === "z") { e.preventDefault(); e.shiftKey ? this.redo() : this.undo(); }
      if (e.key === "Escape") { if (this.placement) this.cancelPlacement(); else this.select(null); this.emit(); }
      if (e.key === "g") this.setMode("translate"); if (e.key === "r") this.setMode("rotate"); if (e.key === "s" && !e.ctrlKey) this.setMode("scale");
    });
    window.addEventListener("keyup", e => { if (map[e.code]) this.walk.keys[map[e.code]] = false; });
  }
  finishDirectDrag(commit) {
    const d = this.directDrag; if (!d) return;
    this.directDrag = null;
    if (!commit) { this.build(); return; }
    if (!d.moved) return;
    const first = d.objs[0], dx = first ? first.o.position.x - first.x : 0, dz = first ? first.o.position.z - first.z : 0;
    if (Math.abs(dx) < 1e-3 && Math.abs(dz) < 1e-3) return;
    const op = d.grouped ? Object.assign({ op: "move_set", dx, dz }, d.target) : { op: "move_object", id: d.id, dx, dz };
    const r = this.run([op], "drag");
    if (r.ok) this.emit({ toast: "Moved. Tap Undo at the top to reverse it." });
    else this.build();
  }
  pick(e) {
    const rc = this.r.domElement.getBoundingClientRect();
    const p = new T.Vector2(((e.clientX - rc.left) / rc.width) * 2 - 1, -((e.clientY - rc.top) / rc.height) * 2 + 1);
    this.ray.setFromCamera(p, this.cam);
    const hits = this.ray.intersectObjects(this.world.children, true).filter(h => h.object.visible);
    for (const h of hits) { if (h.object.userData.thru) continue; /* tent roofs, fog, sparks and light beams: tap what's behind them */ let o = h.object; while (o && !o.userData.id && o !== this.world) o = o.parent; if (o && o.userData.id) { this.tapped(o.userData.id); return; } if (h.object.userData.floor) break; }
    if (!this.picking) this.select(null);
  }
  // In "pick several" mode a tap adds or drops a thing. Otherwise tapping a piece of a set selects the whole set,
  // and tapping a piece of the set that's already selected picks just that piece.
  tapped(id) {
    const root = S.rootOf(this.s, id);
    if (this.placeTop) {
      if (root && S.CATALOG[root.kind].dress === "table") { const kind = this.placeTop; this.placeTop = null; const nid = S.uid("i_"), r = this.run([{ op: "add_item", kind, on: root.id, id: nid }]); if (r.ok) this.select(nid); }
      else this.emit({ toast: "Tap a table to put it on" });
      return;
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
    this.syncTransformControls();
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
    this.syncTransformControls();
    this.emit();
  }
  setMode(m) { this.mode = m; this.gestureMode = "object"; if (this.grp) this.selectGroup(this.grp.ids, this.grp.set); else if (this.sel) this.select(this.sel); this.syncTransformControls(); this.emit(); }
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
  // Small pictures of library pieces for the Add tab: each piece alone in soft studio light, drawn on this same canvas
  // between frames (then the room is drawn again before the screen updates, so nothing flickers). Returns JPEG data URLs.
  thumbs(kinds, px = 160) {
    if (!this.r) return [];
    if (!this.thumbSc) {
      const sc = new T.Scene(); sc.background = new T.Color("#cdd2dc"); sc.environment = this.scene3.environment; sc.environmentIntensity = 0.45; // a cool grey, so white linens and clear chairs still show
      sc.add(new T.HemisphereLight("#ffffff", "#bfb6a8", 1.05)); const d = new T.DirectionalLight("#ffffff", 2.0); d.position.set(3, 5, 4); sc.add(d);
      this.thumbSc = sc; this.thumbCam = new T.PerspectiveCamera(32, 1, 0.01, 100);
    }
    const el = this.r.domElement, old = [el.clientWidth, el.clientHeight], pr = this.r.getPixelRatio(), out = [], cam = this.thumbCam, dir = new T.Vector3(0.62, 0.45, 0.85).normalize();
    this.r.setPixelRatio(1); this.r.setSize(px, px, false);
    try {
      for (const k of kinds) {
        const g = buildItem(S.mkItem(k, 0, 0, 0, { id: "thumb_" + k }), null), lights = []; g.traverse(o => { if (o.isLight) lights.push(o); }); lights.forEach(l => l.parent.remove(l));
        this.thumbSc.add(g); const b = new T.Box3().setFromObject(g), c = b.getCenter(new T.Vector3()), r = Math.max(0.05, b.getSize(new T.Vector3()).length() / 2), dist = r / Math.sin(T.MathUtils.degToRad(16));
        cam.position.copy(c).addScaledVector(dir, dist); cam.lookAt(c); cam.near = dist / 50; cam.far = dist * 4; cam.updateProjectionMatrix();
        this.r.render(this.thumbSc, cam); out.push(el.toDataURL("image/jpeg", 0.82));
        this.thumbSc.remove(g); g.traverse(o => { if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose(); });
      }
    } finally { this.r.setPixelRatio(pr); this.r.setSize(old[0], old[1], false); this.resize(); this.tick(); }
    return out;
  }
  snapshot(w = 1600) { const el = this.r.domElement, h = Math.round(w * el.clientHeight / el.clientWidth); const old = [el.clientWidth, el.clientHeight]; this.r.setSize(w, h, false); this.persp.aspect = w / h; this.persp.updateProjectionMatrix(); this.selBox.visible = false; const th = this.tc.getHelper().visible; this.tc.getHelper().visible = false; this.tick(); let url = el.toDataURL("image/png");
    if (this.view === "photo" && this.photoImg) { const c = document.createElement("canvas"); c.width = el.width; c.height = el.height; const x = c.getContext("2d"); x.drawImage(this.photoImg, 0, 0, c.width, c.height); x.drawImage(el, 0, 0); url = c.toDataURL("image/jpeg", 0.92); } this.tc.getHelper().visible = th; this.r.setSize(old[0], old[1], false); this.resize(); this.select(this.sel); return url; }
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
