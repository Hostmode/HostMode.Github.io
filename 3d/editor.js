// Host Mode 3D venue editor: draws a scene from 3d/scene.js and lets people (or the assistant) change it.
// Three.js (MIT) is vendored in 3d/vendor so the page has no outside service to depend on.
import * as T from "./vendor/three-bundle.min.js";
import * as S from "./scene.js";
import { Store } from "./store.js";
import { material, buildItem, box, setQuality, resetLights } from "./decor.js";

const $ = (q, el = document) => el.querySelector(q);
const MOODS = { // time-of-day looks: exposure, reflections (env), sun and sky strength, sky/fog colour, indoor backdrop
  day: { zen: "#5d93d6", exp: 1, env: 1, sun: 1, sky: 1, sky2: "#bcd6ee", room: "#dfe3ec" },
  golden: { zen: "#7f9fc9", exp: 1.05, env: 0.9, sun: 0.8, sky: 0.7, sunColor: "#ffb361", sky2: "#f2c9a0", room: "#e8d6c4" },
  overcast: { zen: "#aab3c0", exp: 1.1, env: 1.3, sun: 0.15, sky: 1.5, sunColor: "#dfe6ee", sky2: "#c3c9d2", room: "#d4d8df" },
  evening: { zen: "#2f3466", exp: 0.9, env: 0.6, sun: 0.25, sky: 0.45, sunColor: "#ff9a6b", sky2: "#6c6f9a", room: "#5d6285" },
  night: { zen: "#05081a", exp: 0.8, env: 0.3, sun: 0.03, sky: 0.18, sunColor: "#8fa4ff", sky2: "#141a35", room: "#161b30" }
};
// Outdoor sky: a gradient dome from the horizon colour up to a deeper zenith, with a glow where the sun is. No addon needed.
function makeSky() {
  const m = new T.ShaderMaterial({
    side: T.BackSide, depthWrite: false, fog: false,
    uniforms: { hor: { value: new T.Color() }, zen: { value: new T.Color() }, sunDir: { value: new T.Vector3(0, 1, 0) }, sunCol: { value: new T.Color() }, glow: { value: 1 } },
    vertexShader: "varying vec3 vP; void main(){ vP = position; vec4 p = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * p; }",
    fragmentShader: "uniform vec3 hor, zen, sunDir, sunCol; uniform float glow; varying vec3 vP;\nvoid main(){ vec3 d = normalize(vP); float h = clamp(d.y, 0.0, 1.0); vec3 c = mix(hor, zen, pow(h, 0.4)); float s = max(dot(d, sunDir), 0.0); c += sunCol * glow * (pow(s, 900.0) * 6.0 + pow(s, 24.0) * 0.35 + pow(s, 4.0) * 0.06); gl_FragColor = vec4(c, 1.0);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}"
  });
  const sky = new T.Mesh(new T.SphereGeometry(1, 32, 16), m); sky.scale.setScalar(350); sky.frustumCulled = false; sky.renderOrder = -1; sky.userData = { thru: true, sky: true };
  return sky;
}
const SKY = "#bcd6ee"; // outdoor sites: a pale blue sky that fades the far lawn
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
    this.store = new Store(); this.hist = []; this.fut = []; this.sel = null; this.mode = "translate"; this.view = "orbit"; this.preview = null;
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
    this.ray = new T.Raycaster(); this.walk = { yaw: 0, pitch: 0, keys: {}, pos: new T.Vector3() };
    this.bindInput(cv);
    new ResizeObserver(() => this.resize()).observe(cv.parentElement); this.resize();
    // window.HM3D_PAUSED: set by the planner portal while its 3D designer tab is hidden, so the hidden view stops drawing
    const loop = () => { requestAnimationFrame(loop); if (!window.HM3D_PAUSED) this.tick(); }; loop();
  }

  applyQuality() {
    const hi = this.quality === "high";
    this.r.setPixelRatio(Math.min(window.devicePixelRatio || 1, hi ? 2 : 1));
    this.r.shadowMap.enabled = hi; this.r.shadowMap.type = T.PCFSoftShadowMap; setQuality(hi);
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
    const R = s.room, out = !!s.site;
    const fl = new T.Mesh(new T.PlaneGeometry(R.w, R.d), material(R.floor, R.floorColor, { size: [R.w, R.d] }));
    fl.rotation.x = -Math.PI / 2; fl.position.set(R.w / 2, 0, R.d / 2); fl.receiveShadow = true; fl.userData.floor = true; W.add(fl); this.floorMesh = fl;
    // In the Photo view the real floor shows instead: this see-through floor only darkens where shadows fall
    const sc = new T.Mesh(new T.PlaneGeometry(R.w * 3, R.d * 3), new T.ShadowMaterial({ opacity: 0.3 })); sc.rotation.x = -Math.PI / 2; sc.position.set(R.w / 2, 0.001, R.d / 2); sc.receiveShadow = true; sc.userData.floor = true; sc.visible = false; W.add(sc); this.shadowCatch = sc;
    // Outdoors the lawn (or the site's ground) carries on past the site, a shade darker; indoors it's a plain grey surround.
    const ground = new T.Mesh(new T.PlaneGeometry(R.w * 6, R.d * 6), out ? material(s.site.ground, S.MATERIALS[s.site.ground].color === "#6a9a45" ? "#5c8a3c" : null, { size: [R.w * 6, R.d * 6] }) : new T.MeshStandardMaterial({ color: "#c9cfdb", roughness: 1 }));
    ground.rotation.x = -Math.PI / 2; ground.position.set(R.w / 2, -0.01, R.d / 2); ground.receiveShadow = true; W.add(ground); this.groundMesh = ground;
    const ce = new T.Mesh(new T.PlaneGeometry(R.w, R.d), material(R.ceiling, R.ceilingColor || "#f4f1ea", { size: [R.w, R.d] }));
    ce.rotation.x = Math.PI / 2; ce.position.set(R.w / 2, R.h, R.d / 2); ce.userData.ceiling = true; ce.userData.none = out; W.add(ce); this.ceil = ce; // faces down, so it vanishes when seen from above; outdoors there's none
    this.scene3.fog = out ? new T.Fog(SKY, Math.max(R.w, R.d) * 2.2, Math.max(R.w, R.d) * 6) : null;
    if (out) this.buildSite();
    this.walls = s.walls.map(w => { const g = buildWall(s, w); W.add(g); return g; });
    resetLights(); s.items.forEach(it => { const g = buildItem(it, s); W.add(g); this.objs.set(it.id, g); });
    this.lightObjs = []; this.sunL = this.hemiL = null;
    s.lights.forEach(L => {
      let l;
      if (L.kind === "ambient") { l = out ? new T.HemisphereLight("#d6e8ff", "#6f7f4f", L.intensity * 2) : new T.HemisphereLight("#ffffff", "#b9a88f", L.intensity * 2); l.userData.base = L.intensity * 2; this.hemiL = l; W.add(l); return; }
      if (L.kind === "sun") { l = new T.DirectionalLight(L.color, L.intensity); l.position.set(L.x, L.y, L.z); l.target.position.set(R.w / 2, 0, R.d / 2); W.add(l.target);
        // outdoors the shadow box just covers the site, seen from where the sun is (set_sun keeps the light there)
        l.castShadow = true; const c = l.shadow.camera, e = out ? Math.hypot(R.w, R.d) / 2 + 4 : Math.max(R.w, R.d); c.left = -e; c.right = e; c.top = e; c.bottom = -e; c.far = out ? 140 : 80; l.shadow.mapSize.set(2048, 2048); l.shadow.bias = -0.0005; if (out) l.shadow.normalBias = 0.03; l.userData.base = L.intensity; l.userData.color = L.color; this.sunL = l;
        if (out) { W.add(l); return; } } // the sun has no marker to tap: it's moved from the Site tab
      if (L.kind === "point") { l = new T.PointLight(L.color, L.intensity, L.range || 10, 1.6); l.position.set(L.x, L.y, L.z); }
      if (L.kind === "spot") { l = new T.SpotLight(L.color, L.intensity, 30, T.MathUtils.degToRad(L.angle || 30), 0.4, 1.4); l.position.set(L.x, L.y, L.z); l.target.position.set(L.tx, L.ty, L.tz); W.add(l.target); l.castShadow = this.quality === "high"; l.shadow.mapSize.set(1024, 1024); }
      W.add(l);
      // A small glowing marker so lights can be seen and tapped.
      const bulb = new T.Mesh(new T.SphereGeometry(0.12, 12, 8), new T.MeshBasicMaterial({ color: L.color })); bulb.position.copy(l.position); bulb.userData = { id: L.id, light: true }; W.add(bulb);
      this.objs.set(L.id, bulb); this.lightObjs.push(bulb);
    });
    this.lightObjs.forEach(b => b.visible = this.showLights !== false && this.view !== "walk" && this.view !== "photo");
    this.photoGrid = null; this.syncPhoto(); this.drawTrace(); this.drawSunMarks(); this.applyMood();
    if (keepGrp) {
      const set = keepGrp.set && s.sets && s.sets[keepGrp.set] ? keepGrp.set : null;
      const ids = set ? S.setMembers(s, set) : keepGrp.ids.filter(id => this.objs.has(id));
      if (ids.length) { this.selectGroup(ids, set); return; }
    }
    if (keepSel && this.objs.has(keepSel)) this.select(keepSel); else this.select(null);
  }

  // ---- Outdoor sites: painted ground, the property line, the aerial picture ----
  buildSite() {
    const s = this.s, S0 = s.site, W = this.world, A = S0.aerial, R = s.room;
    if (A && this.aerialTex && this.aerialRef === A.ref) {
      const sz = S.aerialSize(A, R), m = new T.MeshStandardMaterial({ map: this.aerialTex, roughness: 1, transparent: (A.opacity ?? 1) < 1, opacity: A.opacity ?? 1 });
      const o = new T.Mesh(new T.PlaneGeometry(sz.w, sz.d), m); o.rotation.x = -Math.PI / 2; o.rotation.z = -(A.rot || 0) * Math.PI / 180; o.position.set(A.x, 0.003, A.z); o.receiveShadow = true; o.userData.floor = true; W.add(o);
    } else if (A && this.aerialRef !== A.ref && !this.aerialLoading) this.loadAerial();
    S0.areas.forEach((a, i) => {
      const geo = new T.ShapeGeometry(new T.Shape(a.pts.map(([x, z]) => new T.Vector2(x, -z))));
      const o = new T.Mesh(geo, material(a.mat, null, { size: 1, side: T.DoubleSide, opacity: A ? 0.55 : undefined })); o.rotation.x = -Math.PI / 2; o.position.y = 0.006 + i * 0.003; o.receiveShadow = true; o.userData.floor = true; W.add(o);
    });
    if (S0.edge) { // the property line: an orange dashed line with a stake at each corner
      const P = S0.edge.pts, pts = [...P, P[0]].map(([x, z]) => new T.Vector3(x, 0.08, z)), ln = new T.Line(new T.BufferGeometry().setFromPoints(pts), new T.LineDashedMaterial({ color: "#f6892f", dashSize: 1.2, gapSize: 0.7 }));
      ln.computeLineDistances(); W.add(ln); const stake = material("paint", "#f6892f");
      P.forEach(([x, z]) => { const c = new T.Mesh(new T.CylinderGeometry(0.06, 0.06, 0.9, 8), stake); c.position.set(x, 0.45, z); c.castShadow = true; W.add(c); });
    }
  }
  async loadAerial() {
    const A = this.s.site && this.s.site.aerial; if (!A) return; this.aerialLoading = true;
    try { const url = await this.store.loadPhoto(A.ref); this.aerialMissing = !url; if (url) { const img = new Image(); img.src = url; await img.decode(); const t = new T.Texture(img); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8; t.needsUpdate = true; if (this.aerialTex) this.aerialTex.dispose(); this.aerialTex = t; } this.aerialRef = A.ref; }
    catch (e) { this.aerialMissing = true; this.aerialRef = A.ref; }
    this.aerialLoading = false; if (this.s.site && this.s.site.aerial && this.s.site.aerial.ref === this.aerialRef) { this.build(); this.emit({ aerial: true }); }
  }
  // The points being traced, drawn over everything: dots and the line joining them (closed for a shape, open for two marks).
  setTrace(pts, closed = true) { this.tracePts = pts; this.traceClosed = closed; this.drawTrace(); }
  drawTrace() {
    if (this.traceG) { this.scene3.remove(this.traceG); this.traceG.traverse(o => o.geometry && o.geometry.dispose()); this.traceG = null; }
    const P = this.tracePts; if (!P || !P.length) return;
    const g = new T.Group(), dot = new T.MeshBasicMaterial({ color: "#f6892f", depthTest: false }), r = Math.max(0.25, Math.max(this.s.room.w, this.s.room.d) / 120);
    P.forEach(([x, z], i) => { const m = new T.Mesh(new T.CylinderGeometry(r, r, 0.05, 16), i ? dot : new T.MeshBasicMaterial({ color: "#16255a", depthTest: false })); m.position.set(x, 0.12, z); m.renderOrder = 20; g.add(m); });
    if (P.length > 1) { const pts = (this.traceClosed && P.length > 2 ? [...P, P[0]] : P).map(([x, z]) => new T.Vector3(x, 0.12, z)); const l = new T.Line(new T.BufferGeometry().setFromPoints(pts), new T.LineBasicMaterial({ color: "#f6892f", depthTest: false })); l.renderOrder = 20; g.add(l); }
    this.scene3.add(g); this.traceG = g;
  }
  // Small orange discs over the seats that are in the sun, so shade can be checked even in Fast mode (no shadows drawn).
  setSunMarks(on) { this.sunMarksOn = !!on; this.drawSunMarks(); }
  drawSunMarks() {
    if (this.sunG) { this.world.remove(this.sunG); this.sunG = null; }
    if (!this.sunMarksOn || !this.s.site) return; const r = S.shadeReport(this.s); if (!r || !r.up) return;
    const sunny = r.seatShade.filter(([, v]) => v < 1).map(([id, v]) => [this.s.items.find(i => i.id === id), v]); if (!sunny.length) return;
    const geo = new T.CylinderGeometry(0.16, 0.16, 0.02, 12), mat = new T.MeshBasicMaterial({ color: "#f6892f" }), im = new T.InstancedMesh(geo, mat, sunny.length), M = new T.Matrix4();
    sunny.forEach(([c, v], i) => { M.makeScale(v ? 0.6 : 1, 1, v ? 0.6 : 1); M.setPosition(c.x, 1.3, c.z); im.setMatrixAt(i, M); }); im.userData.thru = true; this.world.add(im); this.sunG = im;
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
  fitOrtho() { const R = this.s ? this.s.room : { w: 20, d: 15, h: 4 }, el = this.r.domElement, a = el.clientWidth / Math.max(1, el.clientHeight), hh = this.s && this.s.site ? 8 : R.h; const span = (this.view === "top" ? Math.max(R.w / a, R.d) : Math.max((this.view === "side" ? R.d : R.w) / a, hh * 1.4)) * 0.6; Object.assign(this.ortho, { left: -span * a, right: span * a, top: span, bottom: -span }); this.ortho.updateProjectionMatrix(); }
  // Look only (not saved in the design): time of day. Changes exposure, sky, fog, reflections and how strong the sun and sky light are.
  setMood(name) { this.mood = MOODS[name] ? name : "day"; this.applyMood(); }
  applyMood() {
    const m = MOODS[this.mood || "day"], out = !!(this.s && this.s.site);
    this.r.toneMappingExposure = m.exp; this.scene3.environmentIntensity = 0.12 * m.env;
    if (this.sunL) { this.sunL.intensity = this.sunL.userData.base * m.sun; this.sunL.color.set(m.sunColor || this.sunL.userData.color); }
    if (this.hemiL) { this.hemiL.intensity = this.hemiL.userData.base * m.sky; }
    if (this.view !== "photo") this.scene3.background = new T.Color(out ? m.sky2 : m.room);
    if (this.scene3.fog) this.scene3.fog.color.set(m.sky2);
    this.updateSky(m);
  }
  updateSky(m) {
    const show = !!(this.s && this.s.site) && this.view !== "photo";
    if (!show) { if (this.sky) this.sky.visible = false; return; }
    if (!this.sky) { this.sky = makeSky(); this.scene3.add(this.sky); }
    const u = this.sky.material.uniforms, R = this.s.room, L = this.sunL;
    this.sky.visible = true; u.hor.value.set(m.sky2); u.zen.value.set(m.zen); u.sunCol.value.set(m.sunColor || "#fff4d8"); u.glow.value = Math.min(1, m.sun * 1.2);
    if (L) u.sunDir.value.set(L.position.x - R.w / 2, L.position.y, L.position.z - R.d / 2).normalize();
  }
  // Camera presets for presentation pictures. Each sets the lens (field of view) and framing for that kind of shot.
  camPreset(id) {
    const R = this.s.room, c = new T.Vector3(R.w / 2, 0.5, R.d / 2), big = Math.max(R.w, R.d); let fov = 50, pos, tgt = c.clone();
    const stage = this.s.items.find(i => /stage/.test(i.kind)), pick = this.sel && this.objs.get(this.sel);
    if (id === "wide") { fov = 28; pos = [R.w * 0.5 + big * 0.9, big * 0.55, R.d + big * 1.1]; }
    else if (id === "eye") { fov = 62; pos = [R.w / 2, 1.65, R.d - 1]; tgt.set(R.w / 2, 1.4, R.d * 0.2); }
    else if (id === "over") { fov = 40; pos = [R.w / 2 + 0.01, big * 1.5, R.d / 2 + R.d * 0.35]; }
    else if (id === "stage") { fov = 38; const f = stage || { x: R.w / 2, z: R.d * 0.15 }; tgt.set(f.x, 1.2, f.z); pos = [f.x, 1.7, Math.min(R.d - 0.5, f.z + 8)]; }
    else { fov = 35; if (pick) { const b = new T.Box3().setFromObject(pick); b.getCenter(tgt); const r = Math.max(0.6, b.getSize(new T.Vector3()).length()); pos = [tgt.x + r * 0.9, tgt.y + r * 0.5, tgt.z + r * 1.1]; } else pos = [R.w / 2 + 1.6, 1.5, R.d / 2 + 2.2]; }
    this.setView("orbit"); this.persp.fov = fov; this.persp.updateProjectionMatrix(); this.persp.position.set(...pos); this.orbit.target.copy(tgt); this.orbit.update();
  }
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
    this.resize(); this.syncPhoto();
    this.emit();
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
    { const mm = MOODS[this.mood || "day"]; this.scene3.background = on ? null : new T.Color(this.s && this.s.site ? mm.sky2 : mm.room); } this.r.setClearColor(0x000000, on ? 0 : 1);
    this.r.domElement.parentElement.classList.toggle("photo", !!on); this.updateSky(MOODS[this.mood || "day"]);
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
    this.setView("orbit"); this.persp.fov = v.fov || 50; this.persp.updateProjectionMatrix(); this.persp.position.set(...v.pos); this.orbit.target.set(...v.target); this.orbit.update();
  }
  currentView() {
    if (this.view === "walk") { const p = this.walk.pos, f = this.walkDir(); return { pos: [p.x, p.y, p.z], target: [p.x + f.x * 3, p.y + f.y * 3, p.z + f.z * 3] }; }
    const p = this.persp.position, t = this.orbit.target; return { pos: [p.x, p.y, p.z], target: [t.x, t.y, t.z], fov: this.persp.fov };
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
    this.ceil.visible = this.view === "walk" && !this.ceil.userData.none;
    if (this.view === "photo") this.walls.forEach(g => g.visible = false); else this.walls.forEach(g => { if (g.userData.knee) g.visible = true; });
    if (this.sky && this.sky.visible) this.sky.position.copy(this.cam.position);
    if (this._post) this._post.render(); else this.r.render(this.scene3, this.cam);
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
    // Tracing (the property line, a ground area, marks on the aerial picture): a tap gives a spot on the ground, not a piece
    if (this.groundTap) { const hit = this.ray.ray.intersectPlane(new T.Plane(new T.Vector3(0, 1, 0), 0), new T.Vector3()); if (hit) this.groundTap([+hit.x.toFixed(2), +hit.z.toFixed(2)]); return; }
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
  // Still picture with ambient occlusion; slow, so never used while editing. Falls back to the plain picture if it can't run.
  async presentation(w = 1920) {
    if (this.view === "photo") return this.snapshot(w);
    const el = this.r.domElement, h = Math.round(w * el.clientHeight / el.clientWidth);
    try { this._post = await (await import("./post.js")).makePost(this.r, this.scene3, this.cam, w, h); } catch (e) { console.warn("presentation render unavailable", e); this._post = null; return this.snapshot(w); }
    try { return this.snapshot(w); } finally { this._post.dispose(); this._post = null; this.tick(); }
  }
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
