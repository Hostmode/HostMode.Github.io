// Host Mode 3D venue editor: draws a scene from 3d/scene.js and lets people (or the assistant) change it.
// Three.js (MIT) is vendored in 3d/vendor so the page has no outside service to depend on.
import * as T from "./vendor/three-bundle.min.js";
import * as S from "./scene.js";
import { Store } from "./store.js";

const $ = (q, el = document) => el.querySelector(q);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// ---------- Graphics check: WebGL2 is the renderer; WebGPU is only detected and reported for now ----------
function gpuInfo() {
  const c = document.createElement("canvas"); const gl2 = c.getContext("webgl2"); const gl = gl2 || c.getContext("webgl");
  const mobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
  const mem = navigator.deviceMemory || 8;
  return { webgl2: !!gl2, webgl: !!gl, webgpu: !!navigator.gpu, mobile, low: mobile && mem <= 4 };
}

// ---------- Surfaces drawn in code (no third-party textures to license) ----------
const texCache = {};
function tex(name) {
  if (texCache[name] !== undefined) return texCache[name];
  const N = 256, c = document.createElement("canvas"); c.width = c.height = N; const g = c.getContext("2d");
  const rnd = (a, b) => a + Math.random() * (b - a); let rep = 4;
  if (name === "wood" || name === "oak") {
    g.fillStyle = name === "oak" ? "#c9a274" : "#8d5c37"; g.fillRect(0, 0, N, N);
    for (let y = 0; y < N; y += 32) { g.fillStyle = `rgba(0,0,0,${rnd(0.03, 0.12)})`; g.fillRect(0, y, N, 31); g.fillStyle = "rgba(0,0,0,.25)"; g.fillRect(0, y + 31, N, 1); const off = rnd(0, N); g.fillRect(off, y, 1, 32); }
    for (let i = 0; i < 260; i++) { g.strokeStyle = `rgba(60,30,10,${rnd(0.03, 0.1)})`; g.beginPath(); const y = rnd(0, N); g.moveTo(0, y); g.bezierCurveTo(N / 3, y + rnd(-3, 3), 2 * N / 3, y + rnd(-3, 3), N, y); g.stroke(); }
    rep = 3;
  } else if (name === "parquet") {
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { g.fillStyle = (i + j) % 2 ? "#1f1f24" : "#f2f0ea"; g.fillRect(i * 64, j * 64, 64, 64); }
    rep = 4;
  } else if (name === "tile" || name === "marble") {
    g.fillStyle = name === "marble" ? "#f1efe9" : "#e6e2da"; g.fillRect(0, 0, N, N);
    if (name === "marble") for (let i = 0; i < 14; i++) { g.strokeStyle = `rgba(120,120,130,${rnd(0.08, 0.2)})`; g.lineWidth = rnd(0.5, 2); g.beginPath(); let x = rnd(0, N), y = 0; g.moveTo(x, y); while (y < N) { x += rnd(-12, 12); y += rnd(8, 20); g.lineTo(x, y); } g.stroke(); }
    g.strokeStyle = "rgba(0,0,0,.18)"; g.lineWidth = 2; for (let k = 0; k <= N; k += 128) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k, N); g.moveTo(0, k); g.lineTo(N, k); g.stroke(); }
    rep = 6;
  } else if (name === "carpet" || name === "fabric" || name === "velvet" || name === "concrete" || name === "stone") {
    g.fillStyle = "#ffffff"; g.fillRect(0, 0, N, N);
    const n = name === "concrete" || name === "stone" ? 9000 : 12000, lo = name === "concrete" || name === "stone" ? 170 : 215;
    for (let i = 0; i < n; i++) { const v = rnd(lo, 255) | 0; g.fillStyle = `rgba(${v},${v},${v},0.6)`; g.fillRect(rnd(0, N), rnd(0, N), 1.5, 1.5); }
    if (name === "carpet") { g.strokeStyle = "rgba(0,0,0,.08)"; g.lineWidth = 6; for (let k = -N; k < N * 2; k += 48) { g.beginPath(); g.arc(k, N / 2, 40, 0, Math.PI * 2); g.stroke(); } }
    rep = name === "carpet" ? 8 : 3;
  } else { texCache[name] = null; return null; }
  const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; t.userData.rep = rep;
  return (texCache[name] = t);
}
const GREY_TEX = new Set(["carpet", "fabric", "velvet", "concrete", "stone"]);
const matCache = new Map();
function material(name, color, opts = {}) {
  const M = S.MATERIALS[name] || S.MATERIALS.paint;
  const key = name + "|" + (color || "") + "|" + (opts.repeat || "") + "|" + (opts.emissive || "");
  if (matCache.has(key)) return matCache.get(key);
  const t = tex(name);
  const m = new T.MeshStandardMaterial({ color: new T.Color(color || (t && !GREY_TEX.has(name) ? "#ffffff" : M.color)), roughness: M.rough, metalness: M.metal });
  if (t) { const tt = t.clone(); tt.needsUpdate = true; const r = opts.repeat || t.userData.rep; tt.repeat.set(r, r); m.map = tt; }
  if (M.opacity) { m.transparent = true; m.opacity = M.opacity; m.depthWrite = false; }
  if (opts.emissive) { m.emissive = new T.Color(opts.emissive); m.emissiveIntensity = 1.5; }
  matCache.set(key, m); return m;
}

// ---------- Building pieces ----------
function box(w, h, d, m, x = 0, y = 0, z = 0) { const o = new T.Mesh(new T.BoxGeometry(w, h, d), m); o.position.set(x, y + h / 2, z); o.castShadow = o.receiveShadow = true; return o; }
function cyl(rt, rb, h, m, x = 0, y = 0, z = 0, seg = 32, open = false) { const o = new T.Mesh(new T.CylinderGeometry(rt, rb, h, seg, 1, open), m); o.position.set(x, y + h / 2, z); o.castShadow = o.receiveShadow = true; return o; }
function ball(r, m, x, y, z) { const o = new T.Mesh(new T.SphereGeometry(r, 16, 12), m); o.position.set(x, y, z); o.castShadow = true; return o; }

function buildItem(it) {
  const g = new T.Group(), W = it.w, D = it.d, H = it.h;
  const main = material(it.mat, it.color, { repeat: 1 });
  const dark = material("metal", "#3a3a40"), white = material("fabric", "#f7f5f0", { repeat: 1 }), wood = material("wood", null, { repeat: 1 });
  switch (it.kind) {
    case "table_round": case "table_round72": case "cake_table":
      g.add(cyl(W / 2, W / 2, H - 0.01, main, 0, 0, 0, 48, true)); g.add(cyl(W / 2, W / 2, 0.02, main, 0, H - 0.02, 0, 48));
      if (it.kind === "cake_table") { const ic = material("fabric", "#fffaf2", { repeat: 1 }); [0.2, 0.15, 0.1].forEach((r, i) => g.add(cyl(r, r, 0.12, ic, 0, H + i * 0.12, 0))); }
      break;
    case "table_rect": case "table_banquet": case "buffet":
      g.add(box(W, H, D, main));
      if (it.kind === "buffet") { const steel = material("metal"); [-W / 3, 0, W / 3].forEach(x => g.add(box(W / 4, 0.08, D * 0.6, steel, x, H, 0))); }
      break;
    case "table_cocktail":
      g.add(cyl(W / 2, W / 2.6, H - 0.01, main, 0, 0, 0, 32, true)); g.add(cyl(W / 2, W / 2, 0.02, main, 0, H - 0.02, 0));
      break;
    case "chair": case "chair_folding": {
      const sh = 0.46, leg = 0.02, m = main;
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => g.add(cyl(leg, leg, sh, m, a * (W / 2 - 0.03), 0, b * (D / 2 - 0.03), 8)));
      g.add(box(W, 0.05, D, it.kind === "chair" ? material("fabric", "#f3ead6", { repeat: 1 }) : m, 0, sh, 0));
      // Back on the -z side, so the chair faces +z (toward the table: see chairsAround).
      [-1, 1].forEach(a => g.add(cyl(leg, leg, H - sh, m, a * (W / 2 - 0.03), sh, -D / 2 + 0.03, 8)));
      for (let k = 0; k < 3; k++) g.add(box(W - 0.06, 0.025, 0.025, m, 0, sh + 0.12 + k * (H - sh - 0.15) / 2, -D / 2 + 0.03));
      break;
    }
    case "sofa": case "lounge_chair":
      g.add(box(W, 0.42, D, main)); g.add(box(W, H - 0.42, 0.2, main, 0, 0.42, -D / 2 + 0.1)); [-1, 1].forEach(a => g.add(box(0.18, 0.2, D, main, a * (W / 2 - 0.09), 0.42, 0)));
      break;
    case "stage":
      g.add(box(W, H - 0.02, D, material("fabric", "#1b1b22", { repeat: 1 }))); g.add(box(W, 0.02, D, main, 0, H - 0.02, 0));
      for (let k = 0; k < 2; k++) g.add(box(1.2, (H / 3) * (k + 1), 0.3, main, W / 2 - 1, 0, D / 2 + 0.6 - k * 0.3));
      break;
    case "dance_floor": {
      const m = material(it.mat, it.color, { repeat: Math.max(1, Math.round(W / 0.61 / 4)) });
      g.add(box(W, H, D, m)); break;
    }
    case "podium": g.add(box(W, H, D, main)); g.add(box(W + 0.05, 0.04, D + 0.05, main, 0, H - 0.04, 0)); break;
    case "bar": case "dj_booth": case "food_station":
      g.add(box(W, H - 0.05, D, main)); g.add(box(W + 0.1, 0.05, D + 0.1, material("marble", null, { repeat: 1 }), 0, H - 0.05, 0));
      if (it.kind === "dj_booth") { g.add(box(0.5, 0.06, 0.35, dark, -0.4, H, 0)); g.add(box(0.5, 0.06, 0.35, dark, 0.4, H, 0)); }
      break;
    case "backdrop": g.add(box(W, H, D, main)); [-1, 1].forEach(a => g.add(box(0.05, H, 0.4, dark, a * W / 2, 0, 0))); break;
    case "screen": g.add(box(W, H - 0.4, 0.04, material("fabric", "#ffffff", { repeat: 1 }), 0, 0.4, 0)); [-1, 1].forEach(a => g.add(cyl(0.03, 0.03, H, dark, a * W / 2, 0, 0, 8))); break;
    case "arch": case "balloon_arch": {
      const r = W / 2, flower = it.kind === "arch";
      const tor = new T.Mesh(new T.TorusGeometry(r, 0.04, 8, 48, Math.PI), main); tor.position.y = H - r; tor.castShadow = true; g.add(tor);
      [-1, 1].forEach(a => g.add(cyl(0.04, 0.04, H - r, main, a * r, 0, 0, 8)));
      const cols = flower ? ["#f1a7bd", "#ffffff", "#9cae8f"] : [it.color || "#f6892f", "#16255a", "#2f8a4c", "#ffffff"];
      for (let k = 0; k <= 24; k++) { const a = (k / 24) * Math.PI; g.add(ball(flower ? 0.1 : 0.16, material("fabric", cols[k % cols.length], { repeat: 1 }), Math.cos(a) * r, H - r + Math.sin(a) * r, 0)); }
      break;
    }
    case "centerpiece": g.add(cyl(0.06, 0.08, 0.25, material("glass"), 0, 0, 0)); g.add(ball(0.13, material("fabric", it.color || "#f1a7bd", { repeat: 1 }), 0, 0.33, 0)); break;
    case "plant": g.add(cyl(W / 3, W / 4, 0.45, main)); g.add(ball(W / 2, material("fabric", "#3f7a4a", { repeat: 1 }), 0, 0.45 + W / 2, 0)); g.add(ball(W / 2.6, material("fabric", "#4d8d58", { repeat: 1 }), 0.1, H - W / 2.6, 0.05)); break;
    case "speaker": g.add(cyl(0.02, 0.02, H - 0.6, dark, 0, 0, 0, 8)); g.add(box(W, 0.6, D, material("metal", "#222226"), 0, H - 0.6, 0)); break;
    case "light_truss": [-1, 1].forEach(a => g.add(box(0.15, H, 0.15, main, a * W / 2, 0, 0))); g.add(box(W + 0.15, 0.2, 0.2, main, 0, H - 0.2, 0)); break;
    case "uplight": g.add(box(W, H, D, dark)); g.add(box(W * 0.8, 0.01, D * 0.8, material("glass", it.color || "#f6c27a", { emissive: it.color || "#f6c27a" }), 0, H, 0)); break;
    case "column": g.add(cyl(W / 2, W / 2, H, main)); break;
    default: g.add(box(W, H, D, main));
  }
  g.position.set(it.x, it.y || 0, it.z); g.rotation.y = -(it.rot || 0) * Math.PI / 180;
  g.userData = { id: it.id, item: true };
  return g;
}

// Walls with doors and windows cut out: each wall is split into solid pieces around its openings.
function buildWall(s, w) {
  const g = new T.Group(), L = S.wallLen(w), m = material("paint", w.color || s.room.wallColor, { repeat: 1 });
  const ops = s.openings.filter(o => o.wall === w.id).sort((a, b) => a.at - b.at);
  let cur = 0; const H = w.h, t = w.t;
  const seg = (x0, x1, y0, y1) => { if (x1 - x0 > 0.005 && y1 - y0 > 0.005) g.add(box(x1 - x0, y1 - y0, t, m, (x0 + x1) / 2, y0, 0)); };
  for (const o of ops) {
    const a = o.at - o.w / 2, b = o.at + o.w / 2; seg(cur, a, 0, H); seg(a, b, o.sill + o.h, H); seg(a, b, 0, o.sill);
    if (o.type === "window") { const gl = new T.Mesh(new T.PlaneGeometry(o.w, o.h), material("glass")); gl.position.set(o.at, o.sill + o.h / 2, 0); gl.userData.glass = true; g.add(gl); g.add(box(o.w, 0.05, t + 0.06, material("paint", "#ffffff", { repeat: 1 }), o.at, o.sill - 0.05, 0)); }
    else { const dm = material("wood", "#5a3a24", { repeat: 1 }); const leaves = o.w > 1.2 ? 2 : 1; for (let k = 0; k < leaves; k++) { const lw = o.w / leaves; g.add(box(lw - 0.02, o.h - 0.02, 0.05, dm, a + lw * (k + 0.5), 0, 0)); } }
    cur = b;
  }
  seg(cur, L, 0, H);
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
    const loop = () => { requestAnimationFrame(loop); this.tick(); }; loop();
  }

  applyQuality() {
    const hi = this.quality === "high";
    this.r.setPixelRatio(Math.min(window.devicePixelRatio || 1, hi ? 2 : 1));
    this.r.shadowMap.enabled = hi; this.r.shadowMap.type = T.PCFSoftShadowMap;
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
    const s = this.s, W = this.world; const keepSel = this.sel;
    this.tc.detach();
    W.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    W.clear(); this.objs = new Map();
    const R = s.room;
    const fl = new T.Mesh(new T.PlaneGeometry(R.w, R.d), material(R.floor, R.floorColor, { repeat: Math.max(2, Math.round(R.w / 2)) }));
    fl.rotation.x = -Math.PI / 2; fl.position.set(R.w / 2, 0, R.d / 2); fl.receiveShadow = true; fl.userData.floor = true; W.add(fl);
    const ground = new T.Mesh(new T.PlaneGeometry(R.w * 6, R.d * 6), new T.MeshStandardMaterial({ color: "#c9cfdb", roughness: 1 }));
    ground.rotation.x = -Math.PI / 2; ground.position.set(R.w / 2, -0.01, R.d / 2); ground.receiveShadow = true; W.add(ground);
    const ce = new T.Mesh(new T.PlaneGeometry(R.w, R.d), material(R.ceiling, R.ceilingColor || "#f4f1ea", { repeat: 1 }));
    ce.rotation.x = Math.PI / 2; ce.position.set(R.w / 2, R.h, R.d / 2); ce.userData.ceiling = true; W.add(ce); this.ceil = ce; // faces down, so it vanishes when seen from above
    this.walls = s.walls.map(w => { const g = buildWall(s, w); W.add(g); return g; });
    s.items.forEach(it => { const g = buildItem(it); W.add(g); this.objs.set(it.id, g); });
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
    for (const h of hits) { let o = h.object; while (o && !o.userData.id && o !== this.world) o = o.parent; if (o && o.userData.id) { this.select(o.userData.id); return; } if (h.object.userData.floor) break; }
    this.select(null);
  }
  select(id) {
    this.sel = id; const o = id && this.objs.get(id);
    if (o && this.view !== "walk") {
      this.tc.attach(o); this.tc.setMode(o.userData.light ? "translate" : this.mode); this.tc.showY = !!o.userData.light;
      this.tc.showX = this.tc.showZ = !(this.tc.mode === "rotate"); if (this.tc.mode === "rotate") { this.tc.showY = true; this.tc.showX = this.tc.showZ = false; }
      if (this.tc.mode === "scale") { this.tc.showX = this.tc.showZ = true; this.tc.showY = !(this.itemOf(id) || {}).kind?.match(/dance_floor/); }
      this.selBox.box.setFromObject(o); this.selBox.visible = true;
    } else { this.tc.detach(); this.selBox.visible = false; }
    this.emit();
  }
  setMode(m) { this.mode = m; if (this.sel) this.select(this.sel); this.emit(); }
  itemOf(id) { return this.s.items.find(i => i.id === id) || this.s.lights.find(l => l.id === id); }
  dragLive() { const o = this.tc.object; if (o) { this.selBox.box.setFromObject(o); } }
  commitDrag() {
    const o = this.tc.object; if (!o) return; const it = this.itemOf(o.userData.id); if (!it) return;
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
