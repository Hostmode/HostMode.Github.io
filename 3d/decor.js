// Host Mode 3D venue: surfaces and furniture, all drawn in code (no third-party models or textures to license).
// Surfaces get a color map, a bump (normal) map and, where it matters, sheen (fabric) or a clear coat (polished floors).
import * as T from "./vendor/three-bundle.min.js";
import * as S from "./scene.js";

let HI = true; // high quality: bump maps, sheen, clear coat, small decor lights
export function setQuality(hi) { if (hi !== HI) { HI = hi; matCache.clear(); } }
let itemLights = 0; export function resetLights() { itemLights = 0; }

// ---------- Noise and canvases ----------
function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
function valueNoise(N, cells, seed) { // smooth tiling noise, 0..1
  const r = rng(seed), g = []; for (let i = 0; i < cells * cells; i++) g.push(r());
  const out = new Float32Array(N * N), at = (x, y) => g[((y % cells + cells) % cells) * cells + ((x % cells + cells) % cells)], sm = t => t * t * (3 - 2 * t);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const fx = x / N * cells, fy = y / N * cells, ix = Math.floor(fx), iy = Math.floor(fy), tx = sm(fx - ix), ty = sm(fy - iy);
    const a = at(ix, iy), b = at(ix + 1, iy), c = at(ix, iy + 1), d = at(ix + 1, iy + 1);
    out[y * N + x] = (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
  }
  return out;
}
function fbm(N, base, oct, seed) { const out = new Float32Array(N * N); let amp = 0.5, tot = 0; for (let o = 0; o < oct; o++) { const n = valueNoise(N, base << o, seed + o * 31); for (let i = 0; i < out.length; i++) out[i] += n[i] * amp; tot += amp; amp *= 0.5; } for (let i = 0; i < out.length; i++) out[i] /= tot; return out; }
function cv(N) { const c = document.createElement("canvas"); c.width = c.height = N; return [c, c.getContext("2d")]; }
function fromField(N, f, fn) { const [c, g] = cv(N), im = g.createImageData(N, N); for (let i = 0; i < N * N; i++) { const [r, gg, b] = fn(f[i], i); im.data[i * 4] = r; im.data[i * 4 + 1] = gg; im.data[i * 4 + 2] = b; im.data[i * 4 + 3] = 255; } g.putImageData(im, 0, 0); return c; }
function heightField(c) { const N = c.width, d = c.getContext("2d").getImageData(0, 0, N, N).data, h = new Float32Array(N * N); for (let i = 0; i < N * N; i++) h[i] = d[i * 4] / 255; return h; }
function normalFrom(h, N, strength) { // height (0..1) to a tangent-space normal map, wrapping at the edges
  return fromField(N, h, (_, i) => {
    const x = i % N, y = (i / N) | 0, at = (xx, yy) => h[((yy + N) % N) * N + ((xx + N) % N)];
    const dx = (at(x + 1, y) - at(x - 1, y)) * strength, dy = (at(x, y + 1) - at(x, y - 1)) * strength;
    const l = Math.hypot(dx, dy, 1); return [(-dx / l * 0.5 + 0.5) * 255, (dy / l * 0.5 + 0.5) * 255, (1 / l * 0.5 + 0.5) * 255];
  });
}
const hex = c => new T.Color(c);
const mix = (a, b, t) => a + (b - a) * t;

// Each surface: color canvas, height canvas (for bumps), how many meters one tile covers, bump strength.
const TEX = {};
function surface(name) {
  if (TEX[name] !== undefined) return TEX[name];
  const N = 512, t0 = performance.now(); let col, hgt, span = 2, bump = 2;
  if (name === "oak" || name === "wood") { // planks with staggered joints, per-plank tone and grain
    const dark = name === "wood", r = rng(7), grain = fbm(N, 4, 3, 3), rows = 8, ph = N / rows;
    const [c, g] = cv(N), im = g.createImageData(N, N), hf = new Float32Array(N * N).fill(0.8);
    for (let row = 0; row < rows; row++) {
      let x = Math.floor(-r() * N * 0.6);
      while (x < N) {
        const len = Math.floor(N * (0.35 + r() * 0.45)), tone = r();
        const base = dark ? [92 + tone * 40, 56 + tone * 24, 32 + tone * 14] : [176 + tone * 40, 130 + tone * 30, 86 + tone * 24], ph0 = r() * 50;
        for (let yy = 0; yy < ph; yy++) { const y = row * ph + yy; for (let xx = Math.max(0, x); xx < Math.min(N, x + len); xx++) {
          const i = y * N + xx, gn = grain[i], streak = Math.sin((yy + gn * 22 + ph0) * 0.9) * 0.5 + 0.5, k = 0.86 + streak * 0.1 + gn * 0.08, seam = yy < 2 || xx - x < 2;
          const kk = seam ? k * 0.65 : k; im.data[i * 4] = base[0] * kk; im.data[i * 4 + 1] = base[1] * kk; im.data[i * 4 + 2] = base[2] * kk; im.data[i * 4 + 3] = 255; if (seam) hf[i] = 0.1; else hf[i] = 0.75 + gn * 0.1;
        } }
        x += len;
      }
    }
    g.putImageData(im, 0, 0); col = c; hgt = fromField(N, hf, v => [v * 255, v * 255, v * 255]); span = 1.6; bump = 3;
  } else if (name === "herringbone") {
    const [c, g] = cv(N), [hc, hg] = cv(N), r = rng(11), L = 128, W = 32; hg.fillStyle = "#c8c8c8"; hg.fillRect(0, 0, N, N);
    for (let i = -4; i < 20; i++) for (let j = -4; j < 20; j++) for (const flip of [0, 1]) {
      const tone = r(), x = i * W * 2 + (flip ? W : 0), y = j * W * 2 - i * W * 2 + (flip ? W : 0);
      g.save(); g.translate(x % (N + L), y % (N + L)); g.rotate(flip ? -Math.PI / 4 : Math.PI / 4);
      g.fillStyle = `rgb(${150 + tone * 45 | 0},${108 + tone * 30 | 0},${70 + tone * 22 | 0})`; g.fillRect(0, 0, L, W);
      g.strokeStyle = "rgba(60,30,10,.18)"; for (let k = 4; k < W; k += 5) { g.beginPath(); g.moveTo(0, k); g.lineTo(L, k + (r() - 0.5) * 3); g.stroke(); } g.restore();
      hg.save(); hg.translate(x % (N + L), y % (N + L)); hg.rotate(flip ? -Math.PI / 4 : Math.PI / 4); hg.strokeStyle = "#202020"; hg.lineWidth = 2; hg.strokeRect(0, 0, L, W); hg.restore();
    }
    col = c; hgt = hc; span = 1.4; bump = 3;
  } else if (name === "parquet") { // dance floor: black and white panels with beveled seams
    const [c, g] = cv(N), [hc, hg] = cv(N), n = fbm(N, 8, 3, 5); hg.fillStyle = "#ffffff"; hg.fillRect(0, 0, N, N);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { g.fillStyle = (i + j) % 2 ? "#18181c" : "#f1efe9"; g.fillRect(i * 128, j * 128, 128, 128); }
    const im = g.getImageData(0, 0, N, N); for (let i = 0; i < N * N; i++) { const k = 0.94 + n[i] * 0.08; im.data[i * 4] *= k; im.data[i * 4 + 1] *= k; im.data[i * 4 + 2] *= k; } g.putImageData(im, 0, 0);
    hg.strokeStyle = "#000"; hg.lineWidth = 4; for (let k = 0; k <= N; k += 128) { hg.beginPath(); hg.moveTo(k, 0); hg.lineTo(k, N); hg.moveTo(0, k); hg.lineTo(N, k); hg.stroke(); }
    col = c; hgt = hc; span = 2.44; bump = 2;
  } else if (name === "marble" || name === "tile") {
    const n = fbm(N, 3, 5, name === "marble" ? 21 : 4);
    col = fromField(N, n, v => { const vein = Math.pow(1 - Math.abs(Math.sin(v * 24)), 18); const b = name === "marble" ? 241 - vein * 80 : 228 - v * 14; return [b, b - 1, b - 5]; });
    const [hc, hg] = cv(N); hg.fillStyle = "#e0e0e0"; hg.fillRect(0, 0, N, N);
    if (name === "tile") { const g = col.getContext("2d"); g.strokeStyle = "rgba(90,85,80,.45)"; hg.strokeStyle = "#000"; g.lineWidth = hg.lineWidth = 3; for (let k = 0; k <= N; k += 256) { [g, hg].forEach(x => { x.beginPath(); x.moveTo(k, 0); x.lineTo(k, N); x.moveTo(0, k); x.lineTo(N, k); x.stroke(); }); } }
    hgt = hc; span = name === "tile" ? 1.2 : 2; bump = 2;
  } else if (name === "carpet") { // patterned banquet carpet with a deep pile
    const n = fbm(N, 64, 2, 9), [c, g] = cv(N);
    g.fillStyle = "#ffffff"; g.fillRect(0, 0, N, N); g.strokeStyle = "rgba(0,0,0,.28)"; g.fillStyle = "rgba(0,0,0,.14)"; g.lineWidth = 6;
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { const x = i * N / 2, y = j * N / 2; g.beginPath(); g.ellipse(x, y, 90, 60, 0, 0, Math.PI * 2); g.stroke(); g.beginPath(); for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; g.ellipse(x + Math.cos(a) * 46, y + Math.sin(a) * 46, 14, 8, a, 0, Math.PI * 2); } g.fill(); }
    const im = g.getImageData(0, 0, N, N); for (let i = 0; i < N * N; i++) { const k = 0.88 + n[i] * 0.2; for (let ch = 0; ch < 3; ch++) im.data[i * 4 + ch] *= k; } g.putImageData(im, 0, 0);
    col = c; hgt = fromField(N, n, v => [v * 255, v * 255, v * 255]); span = 2.4; bump = 6;
  } else if (name === "fabric" || name === "satin" || name === "velvet") { // woven threads; satin has a fine twill, velvet a soft pile
    const P = name === "fabric" ? 6 : 4, n = fbm(N, 32, 2, 13);
    const weave = (x, y) => { const u = (x % (P * 2)) < P, v = (y % (P * 2)) < P; const over = u === v; const t = over ? Math.sin((x % P) / P * Math.PI) : Math.sin((y % P) / P * Math.PI); return 0.5 + 0.5 * t * (over ? 1 : 0.8); };
    const h = new Float32Array(N * N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const i = y * N + x; h[i] = name === "velvet" ? n[i] : name === "satin" ? 0.5 + 0.08 * Math.sin((x + y) * 0.8) + n[i] * 0.05 : weave(x, y) * 0.8 + n[i] * 0.2; }
    col = fromField(N, h, v => { const b = 236 + v * 19; return [b, b, b]; });
    hgt = fromField(N, h, v => [v * 255, v * 255, v * 255]); span = name === "fabric" ? 0.25 : 0.4; bump = name === "fabric" ? 4 : 1;
  } else if (name === "sequin") { // rows of tiny discs catching the light
    const [c, g] = cv(N), [hc, hg] = cv(N), r = rng(17); g.fillStyle = "#6b6b6b"; g.fillRect(0, 0, N, N); hg.fillStyle = "#000"; hg.fillRect(0, 0, N, N);
    for (let y = 0; y < N; y += 16) for (let x = (y / 16) % 2 ? 8 : 0; x < N + 16; x += 16) { const b = 170 + r() * 85 | 0; g.fillStyle = `rgb(${b},${b},${b})`; g.beginPath(); g.arc(x, y, 7.5, 0, Math.PI * 2); g.fill(); const gr = hg.createRadialGradient(x, y, 0, x, y, 7.5); gr.addColorStop(0, "#fff"); gr.addColorStop(1, "#333"); hg.fillStyle = gr; hg.beginPath(); hg.arc(x, y, 7.5, 0, Math.PI * 2); hg.fill(); }
    col = c; hgt = hc; span = 0.25; bump = 3;
  } else if (name === "concrete" || name === "polished" || name === "stone" || name === "plaster" || name === "paint") {
    const n = fbm(N, name === "paint" ? 32 : 6, name === "paint" ? 2 : 5, name.length * 7), amt = { concrete: 40, polished: 30, stone: 50, plaster: 18, paint: 6 }[name];
    col = fromField(N, n, v => { const b = 255 - amt + v * amt; return [b, b, b]; });
    hgt = fromField(N, n, v => [v * 255, v * 255, v * 255]); span = name === "paint" ? 0.6 : 2.5; bump = { concrete: 2, polished: 0.6, stone: 4, plaster: 2.5, paint: 0.8 }[name];
  } else { TEX[name] = null; return null; }
  const map = new T.CanvasTexture(col); map.colorSpace = T.SRGBColorSpace; (window.__texT = window.__texT || {})[name] = performance.now() - t0;
  const nrm = new T.CanvasTexture(normalFrom(heightField(hgt), N, bump));
  [map, nrm].forEach(t => { t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 8; });
  return (TEX[name] = { map, nrm, span, tint: !/oak|wood|herringbone|parquet|marble|tile/.test(name) });
}

// ---------- Materials ----------
const matCache = new Map();
// size: the meters this surface spans, so wood planks and fabric weave stay true to scale on any object.
export function material(name, color, opts = {}) {
  const M = S.MATERIALS[name] || S.MATERIALS.paint, size = opts.size || 1;
  const key = [name, color, size, opts.emissive, opts.side, opts.opacity, HI].join("|");
  if (matCache.has(key)) return matCache.get(key);
  const sf = surface(name), phys = HI && (M.sheen || M.coat || name === "glass" || name === "acrylic");
  const P = { roughness: M.rough, metalness: M.metal };
  const m = phys ? new T.MeshPhysicalMaterial(P) : new T.MeshStandardMaterial(P);
  m.color = hex(color || (sf && !sf.tint ? "#ffffff" : M.color));
  if (sf) {
    const [sx, sy] = Array.isArray(size) ? size : [size, size], rx = Math.max(0.2, sx / sf.span), ry = Math.max(0.2, sy / sf.span);
    m.map = sf.map.clone(); m.map.repeat.set(rx, ry); m.map.needsUpdate = true;
    if (HI) { m.normalMap = sf.nrm.clone(); m.normalMap.repeat.set(rx, ry); m.normalMap.needsUpdate = true; m.normalScale = new T.Vector2(0.8, 0.8); }
  }
  if (phys && M.sheen) { m.sheen = M.sheen; m.sheenRoughness = name === "satin" ? 0.3 : 0.6; m.sheenColor = hex(color || M.color).lerp(new T.Color("#ffffff"), 0.4); }
  if (phys && M.coat) { m.clearcoat = M.coat; m.clearcoatRoughness = 0.08; }
  if (M.opacity || opts.opacity) { m.transparent = true; m.opacity = opts.opacity || M.opacity; m.depthWrite = false; }
  if (phys && (name === "glass" || name === "acrylic")) { m.ior = 1.5; m.specularIntensity = 1; m.roughness = 0.03; }
  if (opts.emissive) { m.emissive = hex(opts.emissive); m.emissiveIntensity = opts.glow || 2; }
  if (M.metal >= 0.5) m.envMapIntensity = 12; // metals are mostly reflection: gold and chrome need it to read as gold and chrome
  if (opts.side) m.side = opts.side;
  matCache.set(key, m); return m;
}
const latex = (c) => { const k = "latex|" + c + HI; if (matCache.has(k)) return matCache.get(k); const chrome = /^#(c9a24a|c0c3c8|d9c08a)$/i.test(c); const m = HI ? new T.MeshPhysicalMaterial({ color: hex(c), roughness: chrome ? 0.15 : 0.4, metalness: chrome ? 0.9 : 0, clearcoat: 0.7, clearcoatRoughness: 0.2 }) : new T.MeshStandardMaterial({ color: hex(c), roughness: 0.4, metalness: chrome ? 0.8 : 0 }); if (chrome) m.envMapIntensity = 12; matCache.set(k, m); return m; };
const flat = (c, o = {}) => { const k = "flat|" + c + JSON.stringify(o) + HI; if (!matCache.has(k)) matCache.set(k, new T.MeshStandardMaterial(Object.assign({ color: hex(c), roughness: 0.8 }, o))); return matCache.get(k); };
const flame = () => flat("#ffcf7a", { emissive: hex("#ffb347"), emissiveIntensity: 3, roughness: 1 });

// ---------- Building blocks ----------
export function box(w, h, d, m, x = 0, y = 0, z = 0) { const o = new T.Mesh(new T.BoxGeometry(w, h, d), m); o.position.set(x, y + h / 2, z); o.castShadow = o.receiveShadow = true; return o; }
function cyl(rt, rb, h, m, x = 0, y = 0, z = 0, seg = 32, open = false) { const o = new T.Mesh(new T.CylinderGeometry(rt, rb, h, seg, 1, open), m); o.position.set(x, y + h / 2, z); o.castShadow = o.receiveShadow = true; return o; }
function ball(r, m, x, y, z, seg = 24) { const o = new T.Mesh(new T.SphereGeometry(r, seg, Math.round(seg * 0.75)), m); o.position.set(x, y, z); o.castShadow = true; return o; }
function mesh(geo, m) { const o = new T.Mesh(geo, m); o.castShadow = o.receiveShadow = true; return o; }
// Many copies of one shape: one draw call. list = [{p:[x,y,z], s:number|[x,y,z], r:[x,y,z]}]
function inst(geo, m, list) {
  const im = new T.InstancedMesh(geo, m, list.length), o = new T.Object3D();
  list.forEach((t, i) => { o.position.set(...t.p); const s = t.s ?? 1; Array.isArray(s) ? o.scale.set(...s) : o.scale.setScalar(s); o.rotation.set(...(t.r || [0, 0, 0])); o.updateMatrix(); im.setMatrixAt(i, o.matrix); });
  im.castShadow = true; im.receiveShadow = true; return im;
}
// The same shape in several colors (balloons, roses): one instanced mesh per color.
function multi(g, geo, matFor, list, colors) { colors.forEach((c, ci) => { const l = list.filter((_, i) => i % colors.length === ci); if (l.length) g.add(inst(geo, matFor(c), l)); }); }
// Cloth that falls in soft folds: a lathe profile with ripples that grow toward the hem.
function drapeLathe(profile, folds, amp, hemY, topY, seg = 120) {
  const geo = new T.LatheGeometry(profile.slice().reverse().map(([r, y]) => new T.Vector2(r, y)), seg), p = geo.attributes.position, v = new T.Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const r = Math.hypot(v.x, v.z); if (r < 1e-4) continue; const t = Math.max(0, Math.min(1, (topY - v.y) / Math.max(0.01, topY - hemY))); const a = Math.atan2(v.z, v.x); const k = 1 + (amp * t * Math.sin(a * folds)) / r; p.setXYZ(i, v.x * k, v.y, v.z * k); }
  geo.computeVertexNormals(); return geo;
}
// A cloth laid over a shape: vertices past the table edge fall straight down (overlays, runners).
function drapeOver(geo, outside, drop) {
  const p = geo.attributes.position, v = new T.Vector3(), e = 1e-3;
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i); const d = outside(v.x, v.z); if (d <= 0) continue;
    // Hang straight down from the edge: move back to the edge (along the outward direction) and drop by the overhang.
    const gx = (outside(v.x + e, v.z) - outside(v.x - e, v.z)) / (2 * e), gz = (outside(v.x, v.z + e) - outside(v.x, v.z - e)) / (2 * e), gl = Math.hypot(gx, gz) || 1;
    const k = Math.min(d, drop), back = d - 0.004;
    p.setXYZ(i, v.x - gx / gl * back, v.y - k, v.z - gz / gl * back);
  }
  geo.computeVertexNormals(); return geo;
}
function catenary(a, b, sag, n) { const pts = []; for (let i = 0; i <= n; i++) { const t = i / n; pts.push(new T.Vector3(mix(a.x, b.x, t), mix(a.y, b.y, t) - sag * Math.sin(Math.PI * t), mix(a.z, b.z, t))); } return pts; }
function tube(pts, r, m) { return mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), pts.length * 2, r, 6, false), m); }
function lightHere(g, color, intensity, range, y = 0) { if (!HI || itemLights >= 8) return; itemLights++; const l = new T.PointLight(color, intensity, range, 1.8); l.position.y = y; g.add(l); }

// ---------- Tables and linens ----------
const leafShape = new T.Shape(); leafShape.moveTo(0, 0); leafShape.quadraticCurveTo(0.45, 0.22, 1, 0); leafShape.quadraticCurveTo(0.45, -0.22, 0, 0);
const ROSE = new T.SphereGeometry(1, 14, 10), BALL = new T.SphereGeometry(1, 20, 14), LEAF = new T.ShapeGeometry(leafShape, 6);
[ROSE, BALL, LEAF].forEach(g => g.userData.shared = true); // reused by every item: never disposed
function roseBall(g, r, cx, cy, cz, colors, count = 90, seed = 3) { // a dome or ball of blooms with greenery peeking through
  const rr = rng(seed), list = [];
  for (let i = 0; i < count; i++) { const u = rr() * 2 - 1, a = rr() * Math.PI * 2, s = Math.sqrt(1 - u * u); list.push({ p: [cx + Math.cos(a) * s * r, cy + u * r, cz + Math.sin(a) * s * r], s: r * (0.18 + rr() * 0.08), r: [rr() * 3, rr() * 3, 0] }); }
  multi(g, ROSE, c => material("velvet", c, { size: 0.2 }), list, colors);
  const leaves = []; for (let i = 0; i < count * 0.6; i++) { const u = rr() * 2 - 1, a = rr() * Math.PI * 2, s = Math.sqrt(1 - u * u); leaves.push({ p: [cx + Math.cos(a) * s * r * 1.05, cy + u * r * 1.05, cz + Math.sin(a) * s * r * 1.05], s: r * 0.32, r: [rr() * 6, rr() * 6, rr() * 6] }); }
  g.add(inst(LEAF, material("velvet", "#4b7a4f", { side: T.DoubleSide, size: 0.2 }), leaves));
}
function placeSettings(it, scene) { // where each guest sits: from the table's own chairs, or evenly around it
  const ch = scene ? scene.items.filter(c => c.group === it.id && c.kind.startsWith("chair")) : [];
  const ang = ch.length ? ch.map(c => Math.atan2(c.x - it.x, c.z - it.z) + (it.rot || 0) * Math.PI / 180) : Array.from({ length: (S.CATALOG[it.kind].seats || 0) }, (_, k) => k / (S.CATALOG[it.kind].seats || 1) * Math.PI * 2);
  return ang;
}
function buildTable(g, it, scene) {
  const W = it.w, D = it.d, H = it.h, d = S.dressOf(it), round = /round|cocktail|cake/.test(it.kind), R = W / 2;
  const linenC = d.linenColor || it.color || "#f7f5f0", lm = material(d.linen === "spandex" ? "satin" : "fabric", linenC, { size: 1 });
  const legs = material("metal", "#3b3b40"), top = material(S.CATALOG[it.kind].bare ? "wood" : "wood", null, { size: W });
  const showLegs = d.linen === "none" || d.linen === "lap";
  if (showLegs) { // the table itself shows: top and legs
    if (round) { g.add(cyl(R, R, 0.035, top, 0, H - 0.035, 0, 48)); g.add(cyl(0.04, 0.04, H - 0.04, legs, 0, 0, 0, 12)); g.add(cyl(R * 0.35, R * 0.4, 0.03, legs, 0, 0, 0, 24)); }
    else { g.add(box(W, 0.04, D, top, 0, H - 0.04, 0)); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => g.add(box(0.06, H - 0.04, 0.06, it.kind === "table_farm" ? top : legs, a * (W / 2 - 0.08), 0, b * (D / 2 - 0.08)))); }
  }
  if (d.linen !== "none") {
    const hem = d.linen === "lap" ? Math.max(0.05, H - 0.38) : 0.004;
    if (round) {
      let prof;
      if (d.linen === "spandex" && it.kind === "table_cocktail") prof = [[0, H + 0.004], [R, H + 0.004], [R * 0.98, H - 0.03], [R * 0.3, H * 0.6], [R * 0.22, H * 0.45], [R * 0.32, H * 0.25], [R * 0.62, 0.004], [0, 0.004]];
      else if (d.linen === "spandex") prof = [[0, H + 0.004], [R + 0.005, H + 0.004], [R + 0.01, H - 0.02], [R + 0.01, 0.004]];
      else prof = [[0, H + 0.004], [R + 0.008, H + 0.004], [R + 0.022, H - 0.02], [R + 0.03, H - 0.06], ...Array.from({ length: 8 }, (_, k) => { const t = (k + 1) / 8; return [R + 0.03 + (d.linen === "lap" ? 0.02 : 0.07) * t * t, mix(H - 0.06, hem, t)]; })];
      const folds = d.linen === "pleated" ? 64 : d.linen === "spandex" ? 0 : Math.round(R * 18);
      g.add(mesh(drapeLathe(prof, folds, d.linen === "pleated" ? 0.006 : 0.014, hem, H - 0.05, 160), lm));
    } else {
      const geo = new T.BoxGeometry(W + 0.05, H - hem, D + 0.05, Math.round(W * 40), 1, Math.round(D * 40)), p = geo.attributes.position, v = new T.Vector3();
      const f = d.linen === "pleated" ? 90 : 30, a = d.linen === "pleated" ? 0.008 : d.linen === "spandex" ? 0 : 0.012;
      for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const t = (H - hem) / 2 - v.y, k = t / (H - hem); if (Math.abs(Math.abs(v.x) - (W + 0.05) / 2) < 1e-3) v.x += Math.sign(v.x) * (a * k * (1 + Math.sin(v.z * f))); if (Math.abs(Math.abs(v.z) - (D + 0.05) / 2) < 1e-3) v.z += Math.sign(v.z) * (a * k * (1 + Math.sin(v.x * f))); p.setXYZ(i, v.x, v.y, v.z); }
      geo.computeVertexNormals(); const o = mesh(geo, lm); o.position.y = hem + (H - hem) / 2; g.add(o);
    }
  }
  if (d.overlay !== "none" && d.overlay) { // a square laid on the diagonal, corners falling over the edge
    const side = round ? W * 1.02 : Math.min(W, D) * 1.25, geo = new T.PlaneGeometry(side, side, 48, 48); geo.rotateX(-Math.PI / 2); if (round) geo.rotateY(Math.PI / 4);
    const out = round ? (x, z) => Math.hypot(x, z) - (R + 0.02) : (x, z) => Math.max(Math.abs(x) - W / 2 - 0.02, Math.abs(z) - D / 2 - 0.02);
    const o = mesh(drapeOver(geo, out, 0.45), material(d.overlay === "sequin" ? "sequin" : "satin", d.overlayColor || "#c9a24a", { side: T.DoubleSide, size: 0.6 })); o.position.y = H + 0.008; g.add(o);
  }
  if (d.runner !== "none" && d.runner) { // a runner across the table, hanging off both ends
    const L = (round ? W : W) + 0.7, geo = new T.PlaneGeometry(L, round ? 0.33 : Math.min(0.36, D * 0.45), 80, 1); geo.rotateX(-Math.PI / 2);
    const edge = round ? R + 0.025 : W / 2 + 0.025, p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), over = Math.abs(x) - edge; if (over > 0) { p.setX(i, Math.sign(x) * (edge + 0.004)); p.setY(i, -over); } }
    geo.computeVertexNormals(); const o = mesh(geo, material(d.runner === "sequin" ? "sequin" : "satin", d.runnerColor || "#c9a24a", { side: T.DoubleSide, size: 0.5 })); o.position.y = H + 0.012; g.add(o);
  }
  if ((d.charger || d.napkin) && !/cocktail|buffet|cake|gift/.test(it.kind)) { // a place setting in front of each chair
    const chg = d.charger && material("gold", d.charger), nap = d.napkin && material("fabric", d.napkin, { size: 0.3 }), plate = material("tile", "#fbfaf7", { size: 0.3 });
    placeSettings(it, scene).forEach(a => {
      const rr = round ? R - 0.2 : null, x = round ? Math.sin(a) * rr : Math.sign(Math.sin(a)) * Math.min(W / 2 - 0.25, Math.abs(Math.sin(a) * W / 2)), z = round ? Math.cos(a) * rr : Math.sign(Math.cos(a)) * (D / 2 - 0.2);
      if (chg) { const c = cyl(0.165, 0.165, 0.008, chg, x, H + 0.012, z, 32); g.add(c); }
      g.add(cyl(0.135, 0.12, 0.012, plate, x, H + 0.02, z, 32));
      if (nap) { const n = box(0.09, 0.02, 0.2, nap, 0, 0, 0); const grp = new T.Group(); grp.add(n); grp.position.set(x, H + 0.032, z); grp.rotation.y = -a + Math.PI / 2; g.add(grp); }
    });
  }
  if (it.kind === "cake_table") { const ic = material("fabric", "#fffaf2", { size: 0.3 }); [0.2, 0.15, 0.1].forEach((r, i) => g.add(cyl(r, r, 0.12, ic, 0, H + i * 0.12, 0))); }
  if (it.kind === "buffet") { const steel = material("metal"); [-W / 3, 0, W / 3].forEach(x => { g.add(box(W / 4, 0.06, D * 0.55, steel, x, H, 0)); g.add(cyl(0.1, 0.1, 0.06, steel, x, H + 0.06, 0, 16)); }); }
  if (it.kind === "gift_table") { const r = rng(5); for (let k = 0; k < 7; k++) { const s = 0.15 + r() * 0.18, c = ["#f1a7bd", "#ffffff", "#c9a24a", "#a9cbe8", "#9cae8f"][k % 5]; g.add(box(s, s * 0.8, s, material("satin", c, { size: 0.4 }), -W / 2 + 0.2 + k * (W - 0.4) / 7, H, (r() - 0.5) * D * 0.4)); } }
}

// ---------- Chairs and chair dressing ----------
function buildChair(g, it) {
  const W = it.w, D = it.d, H = it.h, sh = 0.46, m = material(it.mat, it.color, { size: 0.5 }), d = S.dressOf(it);
  const back = -D / 2 + 0.03;
  if (d.cover === "none" || !d.cover) {
    if (it.kind === "chair_ghost") { // clear acrylic, rounded back
      const ac = material("acrylic", it.color); g.add(box(W, 0.03, D, ac, 0, sh, 0));
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => g.add(box(0.035, sh, 0.035, ac, a * (W / 2 - 0.03), 0, b * (D / 2 - 0.03))));
      const bk = mesh(new T.CylinderGeometry(W / 2, W / 2, H - sh - 0.05, 24, 1, true, -Math.PI / 2 - 1.1, 2.2), ac); bk.position.set(0, sh + (H - sh) / 2, back + W / 2 - 0.02); g.add(bk);
    } else if (it.kind === "chair_crossback") { // wood with an X back
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => g.add(box(0.04, b < 0 ? H : sh, 0.04, m, a * (W / 2 - 0.03), 0, b * (D / 2 - 0.03))));
      g.add(box(W, 0.05, D, material("fabric", "#efe6d2", { size: 0.5 }), 0, sh, 0)); g.add(box(W - 0.04, 0.05, 0.03, m, 0, H - 0.06, back));
      [-1, 1].forEach(s => { const x = box(0.03, Math.hypot(W - 0.08, H - sh - 0.12), 0.02, m, 0, 0, 0); x.position.set(0, sh + (H - sh - 0.06) / 2, back); x.rotation.z = s * Math.atan2(W - 0.08, H - sh - 0.12); g.add(x); });
    } else { // Chiavari (spindle back, slim legs) and folding chairs
      const leg = 0.018;
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => g.add(cyl(leg, leg * 0.8, sh, m, a * (W / 2 - 0.03), 0, b * (D / 2 - 0.03), 10)));
      g.add(box(W, 0.06, D, it.kind === "chair" ? material("fabric", "#f3ead6", { size: 0.5 }) : m, 0, sh, 0));
      [-1, 1].forEach(a => g.add(cyl(leg, leg, H - sh, m, a * (W / 2 - 0.03), sh, back, 10)));
      if (it.kind === "chair") { for (let k = 0; k < 3; k++) g.add(box(W - 0.06, 0.02, 0.02, m, 0, sh + 0.1 + k * (H - sh - 0.12) / 2, back)); for (let k = 1; k < 5; k++) g.add(cyl(0.008, 0.008, H - sh - 0.1, m, -W / 2 + 0.03 + k * (W - 0.06) / 5, sh + 0.05, back, 6)); }
      else g.add(box(W - 0.04, 0.18, 0.025, m, 0, H - 0.22, back));
    }
  } else { // a cover over the whole chair: banquet covers flare to the floor, spandex hugs the frame
    const cm = material(d.cover === "spandex" ? "satin" : "fabric", d.coverColor || "#f7f5f0", { size: 0.6 }), sp = d.cover === "spandex";
    const skirt = new T.BoxGeometry(W + 0.04, sh + 0.04, D + 0.04, 8, 2, 8), p = skirt.attributes.position;
    for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y < 0) { const f = sp ? 0.88 : 1.12; p.setX(i, p.getX(i) * f); p.setZ(i, p.getZ(i) * f); } }
    skirt.computeVertexNormals(); const s = mesh(skirt, cm); s.position.y = (sh + 0.04) / 2; g.add(s);
    const bk = box(W + (sp ? 0.02 : 0.05), H - sh, sp ? 0.06 : 0.09, cm, 0, sh, back); g.add(bk);
    const cap = mesh(new T.CylinderGeometry(sp ? 0.03 : 0.045, sp ? 0.03 : 0.045, W + (sp ? 0.02 : 0.05), 12), cm); cap.rotation.z = Math.PI / 2; cap.position.set(0, H, back); g.add(cap);
  }
  if (d.sash) { // a satin band round the back, tied in a bow behind the chair
    const sm = material("satin", d.sash, { size: 0.3 }), y = sh + (H - sh) * 0.45, t = 0.012;
    g.add(box(W + 0.07, 0.09, t, sm, 0, y, back + 0.05)); g.add(box(W + 0.07, 0.09, t, sm, 0, y, back - 0.05));
    [-1, 1].forEach(a => { g.add(box(t, 0.09, 0.11, sm, a * (W / 2 + 0.035), y, back)); const loop = ball(0.05, sm, a * 0.055, y + 0.045, back - 0.07, 12); loop.scale.set(1.2, 0.7, 0.35); g.add(loop); const tail = box(0.05, 0.26, t, sm, a * 0.03, y - 0.25, back - 0.07); tail.rotation.z = a * 0.15; g.add(tail); });
  }
}

// ---------- Everything else ----------
const palOf = (it, def) => (it.palette && it.palette.length ? it.palette : def);
export function buildItem(it, scene) {
  const g = new T.Group(), W = it.w, D = it.d, H = it.h, C = S.CATALOG[it.kind] || {};
  const main = material(it.mat, it.color, { size: Math.max(W, D) }), dark = material("metal", "#2e2e33"), gold = material("gold"), white = material("fabric", "#f7f5f0", { size: 0.5 });
  const flowers = palOf(it, it.color ? [it.color, "#ffffff", "#efc7c2"] : ["#ffffff", "#efc7c2", "#f1a7bd", "#f3ead6"]);
  const balloons = palOf(it, [it.color || "#efc7c2", "#ffffff", "#c9a24a"]);
  switch (it.kind) {
    case "table_round": case "table_round72": case "table_rect": case "table_banquet": case "table_farm": case "table_cocktail": case "buffet": case "cake_table": case "gift_table": buildTable(g, it, scene); break;
    case "chair": case "chair_ghost": case "chair_crossback": case "chair_folding": buildChair(g, it); break;
    case "sofa": case "lounge_chair": {
      const v = material("velvet", it.color || null, { size: 1 }); g.add(box(W, 0.2, D, v, 0, 0.12, 0)); g.add(box(W - 0.1, 0.14, D - 0.2, v, 0, 0.32, 0.08));
      g.add(box(W, H - 0.32, 0.18, v, 0, 0.32, -D / 2 + 0.09)); [-1, 1].forEach(a => g.add(box(0.16, 0.26, D, v, a * (W / 2 - 0.08), 0.32, 0)));
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => g.add(cyl(0.02, 0.015, 0.12, gold, a * (W / 2 - 0.08), 0, b * (D / 2 - 0.08), 8))); break;
    }
    case "ottoman": { const v = material("velvet", it.color || null, { size: 0.6 }); g.add(cyl(W / 2, W / 2, H - 0.05, v, 0, 0.05, 0, 32)); for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; g.add(ball(0.012, gold, Math.cos(a) * W / 4, H, Math.sin(a) * W / 4, 8)); } g.add(cyl(W / 2 - 0.03, W / 2 - 0.03, 0.05, gold, 0, 0, 0, 24)); break; }
    case "coffee_table": g.add(box(W, 0.02, D, material("glass"), 0, H - 0.02, 0)); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => g.add(box(0.025, H - 0.02, 0.025, main, a * (W / 2 - 0.02), 0, b * (D / 2 - 0.02)))); g.add(box(W, 0.02, 0.02, main, 0, H - 0.04, D / 2 - 0.02)); g.add(box(W, 0.02, 0.02, main, 0, H - 0.04, -D / 2 + 0.02)); break;
    case "stage": g.add(box(W, H - 0.025, D, material("velvet", "#1b1b22", { size: 2 }))); /* the deck and steps use the stage's chosen material (wood unless changed) */ g.add(box(W, 0.025, D, material(it.mat || "wood", it.color, { size: W }), 0, H - 0.025, 0)); for (let k = 0; k < 2; k++) g.add(box(1.2, (H / 3) * (k + 1), 0.3, material(it.mat || "wood", it.color, { size: 1.2 }), W / 2 - 1, 0, D / 2 + 0.6 - k * 0.3)); break;
    case "dance_floor": g.add(box(W, H, D, material(it.mat, it.color, { size: W }))); g.add(box(W + 0.06, H * 0.7, 0.03, gold, 0, 0, D / 2 + 0.015)); g.add(box(W + 0.06, H * 0.7, 0.03, gold, 0, 0, -D / 2 - 0.015)); g.add(box(0.03, H * 0.7, D, gold, W / 2 + 0.015, 0, 0)); g.add(box(0.03, H * 0.7, D, gold, -W / 2 - 0.015, 0, 0)); break;
    case "rug": { const m = material(it.mat, it.color, { size: Math.max(W, D) }); g.add(box(W, H, D, m)); const b = material("velvet", "#c9a24a", { size: 0.5 }); [[W, 0.08, 0, D / 2 - 0.04], [W, 0.08, 0, -D / 2 + 0.04]].forEach(([w, d, x, z]) => g.add(box(w, H + 0.002, d, b, x, 0, z))); [[W / 2 - 0.04], [-W / 2 + 0.04]].forEach(([x]) => g.add(box(0.08, H + 0.002, D, b, x, 0, 0))); break; }
    case "podium": g.add(box(W, H, D, main)); g.add(box(W + 0.05, 0.04, D + 0.05, main, 0, H - 0.04, 0)); break;
    case "bar": case "dj_booth": case "food_station": {
      g.add(box(W, H - 0.05, D, main)); g.add(box(W + 0.1, 0.05, D + 0.1, material("marble", null, { size: W }), 0, H - 0.05, 0));
      if (it.kind === "bar") { g.add(box(W - 0.1, 0.06, 0.02, gold, 0, 0.12, D / 2 + 0.005)); for (let k = 0; k < 6; k++) g.add(cyl(0.035, 0.035, 0.3, material("glass", ["#3d6b3f", "#6d1a2e", "#c9a24a"][k % 3]), -W / 2 + 0.3 + k * 0.35, H, -D / 4, 12)); }
      if (it.kind === "dj_booth") { g.add(box(0.5, 0.06, 0.35, dark, -0.4, H, 0)); g.add(box(0.5, 0.06, 0.35, dark, 0.4, H, 0)); g.add(box(W, 0.06, 0.02, flat("#2f6fd1", { emissive: hex("#2f6fd1"), emissiveIntensity: 2 }), 0, 0.15, D / 2 + 0.01)); }
      break;
    }
    case "backdrop": g.add(box(W, H, D, main)); [-1, 1].forEach(a => g.add(box(0.05, H, 0.4, dark, a * W / 2, 0, 0))); break;
    case "pipe_drape": { // uprights, a crossbar, and a curtain hanging in deep folds
      [-1, 1].forEach(a => { g.add(cyl(0.025, 0.025, H, material("metal"), a * W / 2, 0, 0, 10)); g.add(box(0.45, 0.012, 0.45, dark, a * W / 2, 0, 0)); }); g.add(cyl(0.02, 0.02, W, material("metal"), 0, H - 0.02, 0, 8).rotateZ(Math.PI / 2));
      const geo = new T.PlaneGeometry(W - 0.04, H - 0.06, Math.round(W * 50), 4), p = geo.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 22) * 0.05 + Math.sin(p.getX(i) * 7.3) * 0.02);
      geo.computeVertexNormals(); const c = mesh(geo, material("satin", it.color || "#f7f5f0", { side: T.DoubleSide, size: 1 })); c.position.y = (H - 0.06) / 2 + 0.01; g.add(c); break;
    }
    case "flower_wall": {
      g.add(box(W, H, 0.06, material("velvet", "#3f6b44", { size: 1 }), 0, 0, 0)); const r = rng(29), list = [];
      for (let k = 0; k < Math.round(W * H * 110); k++) list.push({ p: [(r() - 0.5) * (W - 0.08), 0.04 + r() * (H - 0.08), 0.05 + r() * 0.03], s: [0.05 + r() * 0.03, 0.05 + r() * 0.03, 0.035], r: [0, 0, r() * 3] });
      multi(g, ROSE, c => material("velvet", c, { size: 0.2 }), list, flowers);
      const lv = []; for (let k = 0; k < W * H * 60; k++) lv.push({ p: [(r() - 0.5) * W, r() * H, 0.04], s: 0.09, r: [r() * 0.6, r() * 0.6, r() * 6] }); g.add(inst(LEAF, material("velvet", "#4b7a4f", { side: T.DoubleSide, size: 0.2 }), lv)); break;
    }
    case "shimmer_wall": {
      [-1, 1].forEach(a => g.add(box(0.04, H, 0.12, dark, a * W / 2, 0, 0))); g.add(box(W, 0.04, 0.12, dark, 0, H - 0.04, 0)); const r = rng(31), list = [], sq = 0.075;
      for (let x = -W / 2 + sq / 2; x < W / 2; x += sq) for (let y = sq / 2; y < H - 0.04; y += sq) list.push({ p: [x, y, 0.01], s: sq * 0.96, r: [(r() - 0.5) * 0.6, (r() - 0.5) * 0.9, 0] });
      const m = HI ? new T.MeshPhysicalMaterial({ color: hex(it.color || "#d9c08a"), metalness: 1, roughness: 0.15, side: T.DoubleSide }) : new T.MeshStandardMaterial({ color: hex(it.color || "#d9c08a"), metalness: 0.9, roughness: 0.2, side: T.DoubleSide }); m.envMapIntensity = 12;
      g.add(inst(new T.PlaneGeometry(1, 1), m, list)); break;
    }
    case "ceiling_drape": { // swags of sheer fabric from the middle of the ceiling out to the edges
      const m = material("satin", it.color || "#ffffff", { side: T.DoubleSide, opacity: 0.88, size: 1 }), n = 12;
      for (let k = 0; k < n; k++) {
        const a = k / n * Math.PI * 2, ex = Math.cos(a), ez = Math.sin(a), len = Math.min(W / 2 / Math.max(Math.abs(ex), 1e-3), D / 2 / Math.max(Math.abs(ez), 1e-3)), seg = 40;
        const geo = new T.PlaneGeometry(1, 1, seg, 1), p = geo.attributes.position;
        for (let i = 0; i < p.count; i++) { const t = p.getX(i) + 0.5, side = p.getY(i), wdt = mix(0.15, Math.PI * 2 * len / n * 0.55, t); p.setXYZ(i, t * len, H - 0.02 - H * 0.85 * Math.sin(Math.PI * Math.min(1, t * 1.02)) * (0.4 + 0.6 * (1 - Math.abs(side) * 0.4)), side * wdt); }
        geo.computeVertexNormals(); const o = mesh(geo, m); o.rotation.y = -a; o.castShadow = false; g.add(o);
      }
      g.add(cyl(0.25, 0.3, 0.12, gold, 0, H - 0.12, 0, 24)); break;
    }
    case "balloon_arch": case "balloon_full_arch": { // clustered balloons of mixed sizes following the arch
      const r = rng(it.kind.length + 41), full = it.kind === "balloon_full_arch", R = W / 2, list = [], N = full ? 260 : 150;
      for (let k = 0; k < N; k++) { const t = full ? r() : 0.15 + r() * 0.62, a = Math.PI * (1 - t), lift = full ? 0 : 0.25, s = (full ? 0.13 : 0.11) + r() * 0.11 * (r() < 0.2 ? 1.8 : 1);
        const spread = full ? 0.28 : 0.22; list.push({ p: [Math.cos(a) * R + (r() - 0.5) * spread, Math.max(s, H - R - lift + Math.sin(a) * R + (r() - 0.5) * spread), (r() - 0.5) * D * 0.7], s: [s, s * 1.08, s] }); }
      if (full) [-1, 1].forEach(sg => { for (let y = 0.15; y < H - R; y += 0.24) for (let k = 0; k < 4; k++) list.push({ p: [sg * R + (r() - 0.5) * 0.25, y, (r() - 0.5) * D * 0.6], s: 0.16 + r() * 0.06 }); });
      multi(g, BALL, latex, list, balloons);
      if (!full) [-1, 1].forEach(a => g.add(cyl(0.015, 0.015, H - R, dark, a * R, 0, 0, 6)));
      break;
    }
    case "balloon_column": { const r = rng(43), list = []; for (let y = 0.25, k = 0; y < H - 0.3; y += 0.2, k++) for (let q = 0; q < 4; q++) { const a = q / 4 * Math.PI * 2 + k * 0.4; list.push({ p: [Math.cos(a) * 0.16, y, Math.sin(a) * 0.16], s: 0.14 }); }
      multi(g, BALL, latex, list, balloons); g.add(mesh(new T.SphereGeometry(0.28, 24, 18), latex(balloons[0])).translateY(H - 0.28)); g.add(box(W * 0.8, 0.05, W * 0.8, material("gold"), 0, 0, 0)); break; }
    case "balloon_wall": { const r = rng(47), list = [], s = 0.12; for (let y = s, row = 0; y < H; y += s * 1.7, row++) for (let x = -W / 2 + s + (row % 2) * s * 0.95; x < W / 2 - s * 0.5; x += s * 1.9) list.push({ p: [x + (r() - 0.5) * 0.02, y, (r() - 0.5) * 0.04], s: [s, s * 1.08, s * 0.95] });
      multi(g, BALL, latex, list.sort(() => r() - 0.5), balloons); g.add(box(W, H, 0.03, white, 0, 0, -D / 2 + 0.05)); break; }
    case "arch": { // gold hoop with blooms gathered on one side
      const tor = mesh(new T.TorusGeometry(W / 2, 0.03, 10, 64, Math.PI), gold); tor.position.y = H - W / 2; g.add(tor); [-1, 1].forEach(a => g.add(cyl(0.03, 0.03, H - W / 2, gold, a * W / 2, 0, 0, 10)));
      roseBall(g, 0.32, -W / 2 * 0.72, H - W / 2 + W / 2 * 0.7, 0, flowers, 70, 5); roseBall(g, 0.22, -W / 2, H - W / 2 - 0.1, 0, flowers, 40, 6); roseBall(g, 0.25, W / 2 * 0.2, H - 0.02, 0, flowers, 40, 8); roseBall(g, 0.3, W / 2, 0.3, 0, flowers, 50, 9); break;
    }
    case "aisle_flowers": g.add(cyl(0.025, 0.035, H - 0.22, gold, 0, 0, 0, 12)); g.add(cyl(0.15, 0.15, 0.02, gold, 0, 0, 0, 24)); roseBall(g, 0.2, 0, H - 0.18, 0, flowers, 60, 12); break;
    case "hanging_greenery": { const r = rng(53), pts = catenary(new T.Vector3(-W / 2, H, 0), new T.Vector3(W / 2, H, 0), H * 0.7, 40), lv = [];
      pts.forEach(p0 => { for (let k = 0; k < 8; k++) lv.push({ p: [p0.x + (r() - 0.5) * 0.1, p0.y + (r() - 0.5) * 0.12, p0.z + (r() - 0.5) * D * 0.4], s: 0.13 + r() * 0.06, r: [r() * 6, r() * 6, r() * 6] }); });
      g.add(inst(LEAF, material("velvet", "#4b7a4f", { side: T.DoubleSide, size: 0.2 }), lv)); g.add(tube(pts, 0.008, flat("#3a5a3c"))); if (it.palette) roseBall(g, 0.12, 0, H - H * 0.7, 0, flowers, 20, 7); break; }
    case "centerpiece": g.add(cyl(0.1, 0.07, 0.08, material("gold"), 0, 0, 0, 24)); roseBall(g, 0.16, 0, 0.12, 0, flowers, 55, 14); break;
    case "centerpiece_tall": { const vase = new T.LatheGeometry([[0.07, 0], [0.04, 0.05], [0.022, 0.2], [0.02, 0.5], [0.04, 0.62], [0.1, 0.66]].map(([x, y]) => new T.Vector2(x, y)), 32); g.add(mesh(vase, material(it.mat === "gold" ? "gold" : "glass")));
      roseBall(g, 0.2, 0, H - 0.18, 0, flowers, 80, 15); const r = rng(16), lv = []; for (let k = 0; k < 16; k++) { const a = r() * Math.PI * 2; lv.push({ p: [Math.cos(a) * 0.2, H - 0.32 - r() * 0.18, Math.sin(a) * 0.2], s: 0.1, r: [1.2, a, 0] }); } g.add(inst(LEAF, material("velvet", "#4b7a4f", { side: T.DoubleSide, size: 0.2 }), lv)); break; }
    case "candle_cluster": [[0, 0, 0.2], [0.11, 0.04, 0.12], [-0.1, 0.06, 0.15], [0.03, -0.11, 0.09], [-0.06, -0.09, 0.07]].forEach(([x, z, h]) => { g.add(cyl(0.035, 0.035, h, material("fabric", "#fbf6ea", { size: 0.2 }), x, 0, z, 16)); g.add(cyl(0.045, 0.045, h + 0.03, material("glass"), x, 0, z, 16, true)); g.add(mesh(new T.ConeGeometry(0.008, 0.03, 8), flame()).translateX(x).translateY(h + 0.015).translateZ(z)); }); lightHere(g, "#ffb76b", 0.6, 1.5, 0.3); break;
    case "candle_floor": [[0, 0, 0.6], [0.14, 0.08, 0.42], [-0.12, 0.1, 0.32]].forEach(([x, z, h]) => { g.add(cyl(0.05, 0.05, h - 0.05, material("fabric", "#fbf6ea", { size: 0.3 }), x, 0, z, 20)); g.add(cyl(0.075, 0.075, h, material("glass"), x, 0, z, 20, true)); g.add(mesh(new T.ConeGeometry(0.012, 0.045, 8), flame()).translateX(x).translateY(h - 0.025).translateZ(z)); }); lightHere(g, "#ffb76b", 1.2, 3, 0.6); break;
    case "uplight": g.add(box(W, H, D, dark)); g.add(box(W * 0.8, 0.01, D * 0.8, flat(it.color || "#f6c27a", { emissive: hex(it.color || "#f6c27a"), emissiveIntensity: 3 }), 0, H, 0)); if (HI && itemLights < 8) { itemLights++; const l = new T.SpotLight(it.color || "#f6c27a", 8, 6, 0.5, 0.6, 1.5); l.position.y = H; const tg = new T.Object3D(); tg.position.set(0, 4, -0.6); g.add(tg); l.target = tg; g.add(l); } break;
    case "string_lights": { // strands of warm bulbs draped across the space
      const strands = Math.max(1, Math.round(D / 1.1)), bulbs = [], wire = flat("#1b1b1f");
      for (let s2 = 0; s2 < strands; s2++) { const z = strands === 1 ? 0 : -D / 2 + (s2 + 0.5) * D / strands, pts = catenary(new T.Vector3(-W / 2, H, z), new T.Vector3(W / 2, H, z), Math.min(0.6, H * 0.8), 60);
        g.add(tube(pts, 0.004, wire)); for (let k = 2; k < pts.length - 1; k += 3) bulbs.push({ p: [pts[k].x, pts[k].y - 0.04, pts[k].z], s: 0.03 }); }
      g.add(inst(BALL, flat("#ffe2a8", { emissive: hex("#ffc067"), emissiveIntensity: 2.5 }), bulbs)); lightHere(g, "#ffc067", 2.5, Math.max(W, D) * 0.7, H * 0.4); break;
    }
    case "chandelier": { // tiers of gold rings with hanging crystals and candle bulbs
      g.add(cyl(0.008, 0.008, 0.4, gold, 0, H - 0.4, 0, 6)); const r = rng(61), cr = [], bl = [];
      [[0.45, H - 0.55], [0.32, H - 0.72], [0.18, H - 0.86]].forEach(([rad, y]) => { const ring = mesh(new T.TorusGeometry(rad, 0.012, 8, 48), gold); ring.rotation.x = Math.PI / 2; ring.position.y = y; g.add(ring); const n = Math.round(rad * 40); for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2; cr.push({ p: [Math.cos(a) * rad, y - 0.06 - r() * 0.04, Math.sin(a) * rad], s: [0.012, 0.035, 0.012] }); if (k % 3 === 0) bl.push({ p: [Math.cos(a) * rad, y + 0.06, Math.sin(a) * rad], s: [0.015, 0.025, 0.015] }); } });
      g.add(inst(BALL, material("acrylic", "#ffffff"), cr)); g.add(inst(BALL, flat("#fff1cf", { emissive: hex("#ffcf7a"), emissiveIntensity: 3 }), bl)); g.add(ball(0.06, gold, 0, H - 0.95, 0, 12)); lightHere(g, "#ffd89a", 4, 9, H - 0.6); break;
    }
    case "plant": g.add(cyl(W / 3, W / 4, 0.45, main)); roseBall(g, W / 2, 0, 0.45 + W / 2, 0, ["#3f7a4a", "#4d8d58", "#356b40"], 60, 22); roseBall(g, W / 2.6, 0.1, H - W / 2.6, 0.05, ["#4d8d58", "#3f7a4a"], 40, 23); break;
    case "welcome_sign": { // an easel holding a board; it says the label, or "Welcome"
      [[-0.22, 0.05], [0.22, 0.05], [0, -0.25]].forEach(([x, z]) => { const l = box(0.03, H, 0.03, main, 0, 0, 0); l.position.set(x * 0.9, H / 2, z * 0.6); l.rotation.x = z < 0 ? -0.18 : 0.12; g.add(l); });
      const [c, x2] = cv(512); x2.fillStyle = "#fbf9f4"; x2.fillRect(0, 0, 512, 512); x2.strokeStyle = "#c9a24a"; x2.lineWidth = 10; x2.strokeRect(24, 24, 464, 464); x2.fillStyle = "#16255a"; x2.textAlign = "center"; x2.font = "italic 92px Georgia, serif"; x2.fillText("Welcome", 256, 240); x2.font = "38px Georgia, serif"; x2.fillText((it.label || "to the celebration").slice(0, 22), 256, 320);
      const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; const board = mesh(new T.BoxGeometry(0.6, 0.8, 0.02), [flat("#e8e3d8"), flat("#e8e3d8"), flat("#e8e3d8"), flat("#e8e3d8"), new T.MeshStandardMaterial({ map: t, roughness: 0.7 }), flat("#e8e3d8")]); board.position.set(0, H - 0.55, 0.13); board.rotation.x = -0.12; g.add(board); break;
    }
    case "marquee": { // light-up letters: LOVE (or the label's first 4 letters), built from bulb-lit blocks
      const F = { L: ["1000", "1000", "1000", "1000", "1111"], O: ["0110", "1001", "1001", "1001", "0110"], V: ["1001", "1001", "1001", "0110", "0110"], E: ["1111", "1000", "1110", "1000", "1111"], A: ["0110", "1001", "1111", "1001", "1001"], B: ["1110", "1001", "1110", "1001", "1110"], Y: ["1001", "1001", "0110", "0100", "0100"], "1": ["0100", "1100", "0100", "0100", "1110"], M: ["1001", "1111", "1111", "1001", "1001"], R: ["1110", "1001", "1110", "1010", "1001"], S: ["0111", "1000", "0110", "0001", "1110"], H: ["1001", "1001", "1111", "1001", "1001"], I: ["111", "010", "010", "010", "111"], "&": ["0100", "1010", "0100", "1011", "0110"] };
      const word = ((it.label || "LOVE").toUpperCase().replace(/[^A-Z1&]/g, "").slice(0, 4) || "LOVE").split(""), cell = Math.min(H / 5, W / (word.length * 4.6)), blocks = [], bulbs = [];
      let x0 = -(word.length * 4.6 - 0.6) * cell / 2;
      word.forEach(ch => { const f = F[ch] || F.O; f.forEach((row, ry) => row.split("").forEach((b, rx) => { if (b === "1") { const x = x0 + rx * cell + cell / 2, y = H - ry * cell - cell / 2; blocks.push({ p: [x, y, 0], s: [cell * 0.98, cell * 0.98, D] }); bulbs.push({ p: [x, y, D / 2 + 0.01], s: cell * 0.16 }); } })); x0 += (f[0].length + 0.6) * cell; });
      g.add(inst(new T.BoxGeometry(1, 1, 1), material("paint", it.color || "#f7f5f0", { size: 0.3 }), blocks)); g.add(inst(BALL, flat("#fff1cf", { emissive: hex("#ffcf7a"), emissiveIntensity: 3 }), bulbs)); break;
    }
    case "speaker": g.add(cyl(0.02, 0.02, H - 0.6, dark, 0, 0, 0, 8)); g.add(box(W, 0.6, D, material("metal", "#222226"), 0, H - 0.6, 0)); break;
    case "screen": g.add(box(W, H - 0.4, 0.04, material("fabric", "#ffffff", { size: 1 }), 0, 0.4, 0)); [-1, 1].forEach(a => g.add(cyl(0.03, 0.03, H, dark, a * W / 2, 0, 0, 8))); break;
    case "light_truss": [-1, 1].forEach(a => g.add(box(0.15, H, 0.15, main, a * W / 2, 0, 0))); g.add(box(W + 0.15, 0.2, 0.2, main, 0, H - 0.2, 0)); break;
    case "column": g.add(cyl(W / 2, W / 2, H, main, 0, 0, 0, 32)); g.add(box(W + 0.1, 0.12, W + 0.1, main, 0, 0, 0)); g.add(box(W + 0.1, 0.12, W + 0.1, main, 0, H - 0.12, 0)); break;
    default: g.add(box(W, H, D, main));
  }
  if (C.ceiling) g.traverse(o => { if (o.isMesh) o.castShadow = false; }); // hanging decor doesn't darken the whole floor
  g.position.set(it.x, it.y || 0, it.z); g.rotation.y = -(it.rot || 0) * Math.PI / 180;
  g.userData = { id: it.id, item: true };
  return g;
}
