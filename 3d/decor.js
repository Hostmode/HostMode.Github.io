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
  } else if (name === "carpet_plain") { // plain plush carpet: no pattern, a soft even pile
    const n = fbm(N, 96, 2, 17), fine = fbm(N, 220, 1, 23), h = new Float32Array(N * N);
    for (let i = 0; i < N * N; i++) h[i] = n[i] * 0.6 + fine[i] * 0.4;
    col = fromField(N, h, v => { const b = 226 + v * 26; return [b, b, b]; }); hgt = fromField(N, h, v => [v * 255, v * 255, v * 255]); span = 1.2; bump = 5;
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
  } else if (["grass", "dirt", "sand", "mulch", "gravel", "asphalt"].includes(name)) { // outdoor ground: speckled or mottled, tinted by its color
    const [base, oct, seed, amt, bp, sp] = { grass: [64, 3, 31, 70, 4, 4], dirt: [8, 5, 37, 50, 3, 3], sand: [16, 4, 41, 30, 1.5, 3], mulch: [32, 4, 43, 80, 5, 1.5], gravel: [128, 2, 47, 90, 4, 1], asphalt: [128, 2, 53, 36, 1.2, 2.5] }[name];
    const n = fbm(N, base, oct, seed), big = fbm(N, 2, 3, seed + 1), h = new Float32Array(N * N);
    for (let i = 0; i < N * N; i++) h[i] = n[i] * 0.72 + big[i] * 0.28;
    col = fromField(N, h, v => { const b = 255 - amt + v * amt; return [b, b, b]; }); hgt = fromField(N, n, v => [v * 255, v * 255, v * 255]); span = sp; bump = bp;
  } else if (name === "pavers") { // running-bond pavers, 30 by 15 cm, with sunken joints
    const [c, g] = cv(N), [hc, hg] = cv(N), r = rng(29), bw = 128, bh = 64; g.fillStyle = "#8c8c8c"; g.fillRect(0, 0, N, N); hg.fillStyle = "#000"; hg.fillRect(0, 0, N, N);
    for (let y = 0, row = 0; y < N; y += bh, row++) for (let x = -(row % 2) * bw / 2; x < N; x += bw) { const t = 196 + r() * 59 | 0; g.fillStyle = `rgb(${t},${t},${t})`; g.fillRect(x + 3, y + 3, bw - 6, bh - 6); hg.fillStyle = "#d8d8d8"; hg.fillRect(x + 4, y + 4, bw - 8, bh - 8); }
    col = c; hgt = hc; span = 1.2; bump = 3;
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
  const key = [name, color, size, opts.emissive, opts.side, opts.opacity, opts.vc, HI].join("|");
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
  if (phys && (name === "glass" || name === "acrylic")) { m.ior = 1.5; m.specularIntensity = 1; m.roughness = 0.03; } // real glass (transmission) was tried Nov 3, 2026: it doubled the time to draw a frame, so glass stays see-through instead
  if (opts.emissive) { m.emissive = hex(opts.emissive); m.emissiveIntensity = opts.glow || 2; }
  if (M.metal >= 0.5) m.envMapIntensity = 12; // metals are mostly reflection: gold and chrome need it to read as gold and chrome
  if (opts.side) m.side = opts.side;
  if (opts.vc) m.vertexColors = true;
  matCache.set(key, m); return m;
}
const latex = (c) => { const k = "latex|" + c + HI; if (matCache.has(k)) return matCache.get(k); const chrome = /^#(c9a24a|c0c3c8|d9c08a)$/i.test(c); const m = HI ? new T.MeshPhysicalMaterial({ color: hex(c), roughness: chrome ? 0.15 : 0.4, metalness: chrome ? 0.9 : 0, clearcoat: 0.7, clearcoatRoughness: 0.2 }) : new T.MeshStandardMaterial({ color: hex(c), roughness: 0.4, metalness: chrome ? 0.8 : 0 }); if (chrome) m.envMapIntensity = 12; matCache.set(k, m); return m; };
const flat = (c, o = {}) => { const k = "flat|" + c + JSON.stringify(o) + HI; if (!matCache.has(k)) matCache.set(k, new T.MeshStandardMaterial(Object.assign({ color: hex(c), roughness: 0.8 }, o))); return matCache.get(k); };
const flame = () => flat("#ffcf7a", { emissive: hex("#ffb347"), emissiveIntensity: 3, roughness: 1 });

// ---------- Building blocks ----------
export function box(w, h, d, m, x = 0, y = 0, z = 0) { const o = new T.Mesh(new T.BoxGeometry(w, h, d), m); o.position.set(x, y + h / 2, z); o.castShadow = o.receiveShadow = true; return o; }
const RBOX = new Map();
function roundedGeo(w, h, d, r, seg = 2) {
  const k = [w, h, d, r, seg].map(v => +v.toFixed(3)).join(","); if (RBOX.has(k)) return RBOX.get(k);
  r = Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3);
  const g = new T.BoxGeometry(w, h, d, seg * 2, seg * 2, seg * 2), p = g.attributes.position, v = new T.Vector3(), c = new T.Vector3(), ix = w / 2 - r, iy = h / 2 - r, iz = d / 2 - r;
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); c.set(Math.max(-ix, Math.min(ix, v.x)), Math.max(-iy, Math.min(iy, v.y)), Math.max(-iz, Math.min(iz, v.z))); const n = v.sub(c); if (n.lengthSq() > 1e-12) n.setLength(r); p.setXYZ(i, c.x + n.x, c.y + n.y, c.z + n.z); }
  g.computeVertexNormals(); g.userData.shared = true; RBOX.set(k, g); return g;
}
export function rbox(w, h, d, r, m, x = 0, y = 0, z = 0) { const o = new T.Mesh(roundedGeo(w, h, d, r), m); o.position.set(x, y + h / 2, z); o.castShadow = o.receiveShadow = true; return o; }
function cyl(rt, rb, h, m, x = 0, y = 0, z = 0, seg = 32, open = false) { const o = new T.Mesh(new T.CylinderGeometry(rt, rb, h, seg, 1, open), m); o.position.set(x, y + h / 2, z); o.castShadow = o.receiveShadow = true; return o; }
function ball(r, m, x, y, z, seg = 24) { const o = new T.Mesh(new T.SphereGeometry(r, seg, Math.round(seg * 0.75)), m); o.position.set(x, y, z); o.castShadow = true; return o; }
function mesh(geo, m) { const o = new T.Mesh(geo, m); o.castShadow = o.receiveShadow = true; return o; }
// Many copies of one shape: one draw call. list = [{p:[x,y,z], s:number|[x,y,z], r:[x,y,z]}]
function inst(geo, m, list) {
  const im = new T.InstancedMesh(geo, m, list.length), o = new T.Object3D();
  list.forEach((t, i) => { o.position.set(...t.p); const s = t.s ?? 1; Array.isArray(s) ? o.scale.set(...s) : o.scale.setScalar(s); if (t.q) o.quaternion.copy(t.q); else o.rotation.set(...(t.r || [0, 0, 0])); o.updateMatrix(); im.setMatrixAt(i, o.matrix); });
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
// ---------- Flowers: real petals ----------
// Each species is built ONCE from petals (cupped, curled at the tip, a little uneven, darker toward the heart) and then
// repeated with instancing, so a centerpiece of 55 blooms is one draw per color. "lite" blooms (fewer petals, coarser) are
// for walls with hundreds of flowers. A bloom is about 1 unit across, faces +Y, and is scaled where it's used.
function petalGeo(w, l, cup, curl, ruffle, nu, nv, seed) {
  const r = rng(seed), pos = [], sh = [], idx = [], jit = 1 + (r() - 0.5) * 0.18;
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
    const u = i / nu - 0.5, v = j / nv, hw = w / 2 * jit * Math.pow(Math.sin(Math.PI * (0.06 + v * 0.9)), 0.55);
    pos.push(u * 2 * hw, v * l, cup * hw * (u * u * 4) - curl * l * v * v + ruffle * Math.sin(u * 13 + seed) * v * v); sh.push(0.55 + 0.45 * v);
  }
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
  return { pos, sh, idx };
}
const SPECIES = {
  // [petals, width, length, lean from upright (degrees), cup, tip curl, ruffle, distance from the heart]
  rose:   [[4, 0.36, 0.42, 6, 0.9, 0, 0, 0.02], [5, 0.56, 0.56, 24, 0.75, 0.1, 0, 0.05], [5, 0.7, 0.66, 46, 0.55, 0.22, 0.01, 0.08], [6, 0.78, 0.7, 70, 0.35, 0.35, 0.02, 0.1]],
  peony:  [[6, 0.32, 0.36, 10, 0.85, 0, 0.04, 0.02], [7, 0.46, 0.52, 28, 0.7, 0.06, 0.05, 0.05], [8, 0.6, 0.62, 50, 0.5, 0.14, 0.08, 0.08], [9, 0.72, 0.7, 76, 0.32, 0.26, 0.1, 0.11]],
  garden: [[5, 0.4, 0.38, 14, 0.8, 0, 0.02, 0.03], [6, 0.6, 0.55, 40, 0.55, 0.15, 0.03, 0.07], [7, 0.78, 0.66, 66, 0.35, 0.3, 0.04, 0.1], [7, 0.86, 0.68, 84, 0.2, 0.4, 0.05, 0.12]],
  lite:   [[3, 0.42, 0.42, 10, 0.85, 0, 0, 0.02], [5, 0.66, 0.6, 38, 0.6, 0.15, 0, 0.06], [5, 0.8, 0.68, 68, 0.35, 0.32, 0, 0.1]]
};
const BLOOMS = {};
function bloomGeo(kind) {
  if (BLOOMS[kind]) return BLOOMS[kind];
  const L = SPECIES[kind] || SPECIES.rose, lite = kind === "lite", pos = [], col = [], idx = [], e = new T.Euler(), q = new T.Quaternion(), v = new T.Vector3();
  let seed = 1;
  L.forEach(([n, w, l, lean, cup, curl, ruf, r0], li) => {
    const off = li * 0.7 + 0.35;
    for (let k = 0; k < n; k++) {
      const P = petalGeo(w, l, cup, curl, ruf, lite ? 2 : 3, 3, seed++), az = (k / n) * Math.PI * 2 + off + Math.sin(seed * 7.1) * 0.12;
      const lt = (lean + Math.sin(seed * 3.3) * 5) * Math.PI / 180; e.set(-lt, az, 0, "YXZ"); q.setFromEuler(e);
      const base = pos.length / 3, depth = 0.7 + 0.3 * (li / Math.max(1, L.length - 1));
      for (let i = 0; i < P.pos.length; i += 3) { v.set(P.pos[i], P.pos[i + 1], P.pos[i + 2] - r0).applyQuaternion(q); pos.push(v.x, v.y, v.z); const c = P.sh[i / 3] * depth; col.push(c, c, c); }
      P.idx.forEach(x => idx.push(base + x));
    }
  });
  const g = new T.BufferGeometry(); g.setAttribute("position", new T.Float32BufferAttribute(pos, 3)); g.setAttribute("color", new T.Float32BufferAttribute(col, 3)); g.setIndex(idx);
  g.computeVertexNormals(); g.computeBoundingSphere(); g.userData.shared = true; return (BLOOMS[kind] = g);
}
// A curved leaf with a fold down its middle, pointing along +X like the old flat leaf.
const LEAF = (() => { const P = petalGeo(0.36, 1, -0.5, 0.18, 0, 2, 4, 99), g = new T.BufferGeometry(); g.setAttribute("position", new T.Float32BufferAttribute(P.pos, 3)); g.setIndex(P.idx); g.rotateZ(-Math.PI / 2); g.computeVertexNormals(); return g; })();
const SHRUB = new T.SphereGeometry(1, 14, 10), BALL = new T.SphereGeometry(1, 20, 14), PUFF = new T.SphereGeometry(1, 12, 8), DOT = new T.SphereGeometry(1, 8, 6); // DOT: buttons, sparks, candies
[SHRUB, BALL, PUFF, DOT, LEAF].forEach(g => g.userData.shared = true); // reused by every item: never disposed
const petalMat = c => material("velvet", c, { size: 0.2, side: T.DoubleSide, vc: true });
const UP = new T.Vector3(0, 1, 0);
const facing = (n, spin) => new T.Quaternion().setFromUnitVectors(UP, n).multiply(new T.Quaternion().setFromAxisAngle(UP, spin));
// a dome or ball of blooms (rose, peony and garden rose mixed) with greenery peeking through; foliage = leafy balls for plants
function roseBall(g, r, cx, cy, cz, colors, count = 90, seed = 3, foliage = false) {
  const rr = rng(seed), list = [];
  for (let i = 0; i < count; i++) { const u = rr() * 2 - 1, a = rr() * Math.PI * 2, s = Math.sqrt(1 - u * u), n = new T.Vector3(Math.cos(a) * s, u, Math.sin(a) * s);
    list.push({ p: [cx + n.x * r, cy + n.y * r, cz + n.z * r], s: r * (foliage ? 0.2 + rr() * 0.09 : 0.3 + rr() * 0.12), q: facing(n, rr() * 6.3), r: [rr() * 3, rr() * 3, 0] }); }
  if (foliage) multi(g, SHRUB, c => material("velvet", c, { size: 0.2 }), list, colors);
  else { const pend = g.userData.blooms = g.userData.blooms || new Map();
    list.forEach((t, i) => { const k = ["rose", "peony", "garden"][i % 3] + "|" + colors[Math.floor(i / 3) % colors.length]; if (!pend.has(k)) pend.set(k, []); pend.get(k).push(t); }); }
  const leaves = []; for (let i = 0; i < count * 0.6; i++) { const u = rr() * 2 - 1, a = rr() * Math.PI * 2, s = Math.sqrt(1 - u * u); leaves.push({ p: [cx + Math.cos(a) * s * r * 1.05, cy + u * r * 1.05, cz + Math.sin(a) * s * r * 1.05], s: r * 0.32, r: [rr() * 6, rr() * 6, rr() * 6] }); }
  g.add(inst(LEAF, material("velvet", "#4b7a4f", { side: T.DoubleSide, size: 0.2 }), leaves));
}
// Where each guest sits, in the table's own frame: in front of each of its chairs, or spread out when it has none.
// Returns [{x, z, a}], a = the direction from the table's middle (for turning the napkin).
function placeSettings(it, scene) {
  const C = S.CATALOG[it.kind], W = it.w, D = it.d, R = W / 2, round = /round|cocktail|cake/.test(it.kind), n = C.seats || 0;
  const ch = scene ? scene.items.filter(c => c.group === it.id && c.kind.startsWith("chair")) : [];
  const th = (it.rot || 0) * Math.PI / 180, cs = Math.cos(th), sn = Math.sin(th);
  let loc = ch.map(c => { const dx = c.x - it.x, dz = c.z - it.z; return [dx * cs + dz * sn, -dx * sn + dz * cs]; });
  if (!loc.length) {
    if (round) loc = Array.from({ length: n }, (_, k) => { const a = k / n * Math.PI * 2; return [Math.sin(a) * W, Math.cos(a) * W]; });
    else if (C.oneSide) loc = Array.from({ length: n }, (_, k) => [-W / 2 + (k + 0.5) * W / n, -D]);
    else { const per = Math.ceil(n / 2); loc = Array.from({ length: n }, (_, k) => { const top = k < per, j = top ? k : k - per, m = top ? per : n - per; return [-W / 2 + (j + 0.5) * W / m, top ? D : -D]; }); }
  }
  const clamp = (v, lim) => Math.max(-lim, Math.min(lim, v));
  return loc.map(([x, z]) => {
    const a = Math.atan2(x, z);
    if (round) return { x: Math.sin(a) * (R - 0.2), z: Math.cos(a) * (R - 0.2), a };
    if (Math.abs(x) > W / 2 && W > 0.6) return { x: Math.sign(x) * (W / 2 - 0.2), z: clamp(z, D / 2 - 0.2), a: Math.sign(x) * Math.PI / 2 };
    return { x: clamp(x, W / 2 - 0.2), z: Math.sign(z || -1) * (D / 2 - 0.2), a: z >= 0 ? 0 : Math.PI };
  });
}
function buildTable(g, it, scene) {
  const W = it.w, D = it.d, H = it.h, d = S.dressOf(it), round = /round|cocktail|cake/.test(it.kind), R = W / 2;
  const linenC = d.linenColor || it.color || "#f7f5f0", lm = material(d.linen === "spandex" ? "satin" : "fabric", linenC, { size: 1 });
  const legs = material("metal", "#3b3b40"), top = material(S.CATALOG[it.kind].bare ? "wood" : "wood", null, { size: W });
  if (it.kind === "table_serpentine") return buildSerpentine(g, it, d, linenC, top, legs);
  const showLegs = d.linen === "none" || d.linen === "lap";
  if (showLegs) { // the table itself shows: top and legs
    if (round) { g.add(cyl(R, R, 0.035, top, 0, H - 0.035, 0, 48)); g.add(cyl(R - 0.01, R, 0.008, legs, 0, H - 0.043, 0, 48)); g.add(cyl(0.04, 0.04, H - 0.04, legs, 0, 0, 0, 12)); g.add(cyl(R * 0.35, R * 0.4, 0.03, legs, 0, 0, 0, 24)); }
    else { g.add(rbox(W, 0.04, D, 0.012, top, 0, H - 0.04, 0)); g.add(box(W - 0.2, 0.06, 0.03, legs, 0, H - 0.1, D / 2 - 0.08)); g.add(box(W - 0.2, 0.06, 0.03, legs, 0, H - 0.1, -D / 2 + 0.08)); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => g.add(rbox(0.06, H - 0.04, 0.06, 0.012, it.kind === "table_farm" ? top : legs, a * (W / 2 - 0.08), 0, b * (D / 2 - 0.08)))); }
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
      const geo = new T.BoxGeometry(W + 0.05, H - hem, D + 0.05, Math.round(W * (W > 3 ? 24 : 40)), 1, Math.round(D * 40)), p = geo.attributes.position, v = new T.Vector3();
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
  if ((d.charger || d.napkin) && !/cocktail|buffet|cake|gift|dessert|welcome/.test(it.kind)) { // a place setting in front of each chair
    const chg = d.charger && material("gold", d.charger), nap = d.napkin && material("fabric", d.napkin, { size: 0.3 }), plate = material("tile", "#fbfaf7", { size: 0.3 });
    placeSettings(it, scene).forEach(({ x, z, a }) => {
      if (chg) { const c = cyl(0.165, 0.165, 0.008, chg, x, H + 0.012, z, 32); g.add(c); }
      g.add(cyl(0.135, 0.12, 0.012, plate, x, H + 0.02, z, 32));
      if (nap) { const n = box(0.09, 0.02, 0.2, nap, 0, 0, 0); const grp = new T.Group(); grp.add(n); grp.position.set(x, H + 0.032, z); grp.rotation.y = -a + Math.PI / 2; g.add(grp); }
    });
  }
  if (it.kind === "cake_table") { const ic = material("fabric", "#fffaf2", { size: 0.3 }); [0.2, 0.15, 0.1].forEach((r, i) => g.add(cyl(r, r, 0.12, ic, 0, H + i * 0.12, 0))); }
  if (it.kind === "buffet") { const steel = material("metal"); [-W / 3, 0, W / 3].forEach(x => { g.add(box(W / 4, 0.06, D * 0.55, steel, x, H, 0)); g.add(cyl(0.1, 0.1, 0.06, steel, x, H + 0.06, 0, 16)); }); }
  if (it.kind === "dessert_table") { // a tiered cake on a stand, two cake stands of cupcakes, candy jars
    const ic = material("fabric", "#fffaf2", { size: 0.3 }), st = material("gold"), cz = -D * 0.12, r = rng(9), cups = [], tops = [];
    g.add(cyl(0.05, 0.09, 0.1, st, 0, H, cz, 24)); g.add(cyl(0.2, 0.2, 0.012, st, 0, H + 0.1, cz, 32));
    [0.17, 0.13, 0.09].forEach((rr, i) => g.add(cyl(rr, rr, 0.13, ic, 0, H + 0.112 + i * 0.13, cz, 32)));
    [-1, 1].forEach(sd => { const x = sd * W * 0.3;
      g.add(cyl(0.02, 0.05, 0.1, st, x, H, 0, 16)); g.add(cyl(0.16, 0.16, 0.01, st, x, H + 0.1, 0, 32)); g.add(cyl(0.012, 0.012, 0.16, st, x, H + 0.11, 0, 8)); g.add(cyl(0.11, 0.11, 0.01, st, x, H + 0.27, 0, 32));
      [[6, 0.11, H + 0.11], [4, 0.06, H + 0.28]].forEach(([n, rad, y]) => { for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2 + sd; cups.push({ p: [x + Math.cos(a) * rad, y, Math.sin(a) * rad], s: 1 }); tops.push({ p: [x + Math.cos(a) * rad, y + 0.045, Math.sin(a) * rad], s: [0.028, 0.022, 0.028] }); } });
    });
    const cup = new T.CylinderGeometry(0.026, 0.018, 0.04, 12); cup.translate(0, 0.02, 0); cup.userData.keep = true;
    g.add(inst(cup, material("paint", "#f3ead6"), cups)); multi(g, DOT, c => material("velvet", c, { size: 0.1 }), tops, ["#f1a7bd", "#ffffff", "#c9a24a"]);
    [-1, 1].forEach(sd => { const x = sd * W * 0.44, z = D * 0.15; g.add(cyl(0.06, 0.06, 0.2, material("glass"), x, H, z, 20, true)); g.add(cyl(0.065, 0.065, 0.02, st, x, H + 0.2, z, 20)); const cand = []; for (let k = 0; k < 18; k++) cand.push({ p: [x + (r() - 0.5) * 0.08, H + 0.02 + r() * 0.14, z + (r() - 0.5) * 0.08], s: 0.018 }); multi(g, DOT, latex, cand, ["#f1a7bd", "#a9cbe8", "#ffffff"]); });
  }
  if (it.kind === "welcome_table") { // a framed sign, an open guest book with a pen, two photo frames and a little bouquet
    const st = material("gold"), sign = new T.Group(); sign.position.set(-W * 0.25, H, -D * 0.15); sign.rotation.x = -0.18; g.add(sign);
    sign.add(box(0.42, 0.56, 0.025, st, 0, 0.02, 0)); const face = new T.Mesh(new T.PlaneGeometry(0.37, 0.51), new T.MeshStandardMaterial({ map: signTex("Welcome", (it.label || "to our celebration").slice(0, 26), 370, 510), roughness: 0.7 })); face.position.set(0, 0.3, 0.014); sign.add(face);
    g.add(stick(new T.Vector3(-W * 0.25, H, -D * 0.15 - 0.02), new T.Vector3(-W * 0.25, H + 0.15, -D * 0.15 - 0.16), 0.008, st));
    const pg = material("paint", "#fbf9f4", { size: 0.2 }), cov = material("velvet", "#16255a", { size: 0.2 });
    [-1, 1].forEach(sd => { const pgs = box(0.16, 0.02, 0.22, pg, 0, 0, 0), c = box(0.165, 0.008, 0.225, cov, 0, -0.008, 0), b = new T.Group(); b.add(c, pgs); b.position.set(W * 0.05 + sd * 0.083, H + 0.008, D * 0.1); b.rotation.z = sd * 0.06; g.add(b); });
    g.add(stick(new T.Vector3(W * 0.17, H + 0.04, D * 0.02), new T.Vector3(W * 0.17 + 0.12, H + 0.04, D * 0.12), 0.005, st));
    [[W * 0.3, -D * 0.2, 0.18, 0.24], [W * 0.4, D * 0.05, 0.14, 0.18]].forEach(([x, z, w, h]) => { const f = new T.Group(); f.position.set(x, H, z); f.rotation.set(-0.12, -0.3, 0); f.add(box(w, h, 0.02, st, 0, 0, 0)); f.add(box(w - 0.03, h - 0.03, 0.022, material("paint", "#d8d2c6"), 0, 0.015, 0)); g.add(f); });
    g.add(cyl(0.06, 0.045, 0.07, st, -W * 0.42, H, D * 0.12, 20)); roseBall(g, 0.09, -W * 0.42, H + 0.12, D * 0.12, palOf(it, ["#ffffff", "#efc7c2", "#f3ead6"]), 22, 31);
  }
  if (it.kind === "gift_table") { const r = rng(5); for (let k = 0; k < 7; k++) { const s = 0.15 + r() * 0.18, c = ["#f1a7bd", "#ffffff", "#c9a24a", "#a9cbe8", "#9cae8f"][k % 5]; g.add(box(s, s * 0.8, s, material("satin", c, { size: 0.4 }), -W / 2 + 0.2 + k * (W - 0.4) / 7, H, (r() - 0.5) * D * 0.4)); } }
}

// A serpentine is a quarter of a ring 30 in deep. Its ring's middle is the corner at (-W/2, -D/2), so four turned
// by 90° each make a circle. The cloth is a ring top, curved skirts that fall in folds, and flat ends.
function buildSerpentine(g, it, d, linenC, top, legs) {
  const W = it.w, H = it.h, cx = -W / 2, cz = -it.d / 2, Ro = W, Ri = W - 0.76, Q = Math.PI / 2;
  const showLegs = d.linen === "none" || d.linen === "lap", hem = d.linen === "lap" ? Math.max(0.05, H - 0.38) : 0.004;
  const ringTop = (r0, r1, m, y) => { const geo = new T.RingGeometry(r0, r1, 40, 1, -Q, Q); geo.rotateX(-Math.PI / 2); const o = mesh(geo, m); o.position.set(cx, y, cz); g.add(o); };
  if (showLegs) { ringTop(Ri, Ro, top, H); [0.12, Q / 2, Q - 0.12].forEach(ph => [Ri + 0.12, Ro - 0.12].forEach(r => g.add(box(0.05, H - 0.02, 0.05, legs, cx + Math.cos(ph) * r, 0, cz + Math.sin(ph) * r)))); }
  if (d.linen === "none") return;
  const m = material(d.linen === "spandex" ? "satin" : "fabric", linenC, { size: 1, side: T.DoubleSide }), folds = d.linen === "pleated" ? 70 : d.linen === "spandex" ? 0 : 24, amp = d.linen === "pleated" ? 0.006 : 0.012;
  ringTop(Ri - 0.02, Ro + 0.02, m, H + 0.004);
  [Ro + 0.02, Ri - 0.02].forEach((r, k) => { // the outer and inner skirts
    const geo = new T.CylinderGeometry(r, r, H - hem, 90, 4, true, 0, Q), p = geo.attributes.position, v = new T.Vector3();
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const t = ((H - hem) / 2 - v.y) / (H - hem), a = Math.atan2(v.x, v.z), f = 1 + (amp * t * (1 + Math.sin(a * folds * (k ? 0.6 : 1)))) / r * (k ? -1 : 1); p.setXYZ(i, v.x * f, v.y, v.z * f); }
    geo.computeVertexNormals(); const o = mesh(geo, m); o.position.set(cx, hem + (H - hem) / 2, cz); g.add(o);
  });
  g.add(box(Ro - Ri + 0.04, H - hem, 0.01, m, cx + (Ri + Ro) / 2, hem, cz)); g.add(box(0.01, H - hem, Ro - Ri + 0.04, m, cx, hem, cz + (Ri + Ro) / 2));
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
    } else if (it.kind === "chair") { // Chiavari: slim tapered legs with stretchers, a padded seat on a frame, a back that leans slightly
      const leg = 0.017, lx = W / 2 - 0.03, lz = D / 2 - 0.03;
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => g.add(cyl(leg * 0.75, leg, sh - 0.03, m, a * lx, 0, b * lz, 10)));
      [0.16, 0.3].forEach(y => { [-1, 1].forEach(a => { const st = cyl(0.007, 0.007, D - 0.06, m, 0, 0, 0, 6); st.rotation.x = Math.PI / 2; st.position.set(a * lx, y, 0); g.add(st); }); });
      { const st = cyl(0.007, 0.007, W - 0.06, m, 0, 0, 0, 6); st.rotation.z = Math.PI / 2; st.position.set(0, 0.16, lz); g.add(st); }
      g.add(rbox(W, 0.035, D, 0.012, m, 0, sh - 0.035, 0));
      g.add(rbox(W - 0.03, 0.055, D - 0.03, 0.025, material("fabric", "#f3ead6", { size: 0.5 }), 0, sh, 0.005));
      const bk = new T.Group(); bk.position.set(0, sh, back); bk.rotation.x = -0.09; g.add(bk); const bh = H - sh;
      [-1, 1].forEach(a => bk.add(cyl(leg * 0.9, leg, bh, m, a * lx, 0, 0, 10)));
      [0.12, bh * 0.55, bh - 0.04].forEach((y, k) => bk.add(rbox(W - 0.05, k === 2 ? 0.035 : 0.022, 0.024, 0.009, m, 0, y - 0.011, 0)));
      for (let k = 1; k < 5; k++) bk.add(cyl(0.007, 0.009, bh - 0.17, m, -lx + k * (2 * lx) / 5, 0.13, 0, 6));
    } else if (it.kind === "chair_banquet") { // stackable banquet chair: a tube frame, a padded seat, a padded back that leans a little
      const fr = material(it.mat || "metal", null, { size: 0.5 }), fab = material("fabric", it.color || "#30333d", { size: 0.5 }), lx = W / 2 - 0.025, lz = D / 2 - 0.04;
      [[-1, 1], [1, 1]].forEach(([a, b]) => g.add(cyl(0.011, 0.012, sh - 0.04, fr, a * lx, 0, b * lz, 8)));
      g.add(rbox(W, 0.075, D - 0.06, 0.03, fab, 0, sh - 0.045, 0.01));
      const bk = new T.Group(); bk.position.set(0, 0, back + 0.01); bk.rotation.x = -0.12; g.add(bk);
      [-1, 1].forEach(a => bk.add(cyl(0.011, 0.012, H, fr, a * lx, 0, 0, 8)));
      bk.add(rbox(W - 0.01, H - sh - 0.06, 0.05, 0.025, fab, 0, sh + 0.04, 0));
      [0.12, sh - 0.06].forEach(y => { const st = cyl(0.008, 0.008, W - 0.05, fr, 0, 0, 0, 6); st.rotation.z = Math.PI / 2; st.position.set(0, y, lz); g.add(st); });
    } else { // folding chairs
      const leg = 0.018;
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => g.add(cyl(leg, leg * 0.8, sh, m, a * (W / 2 - 0.03), 0, b * (D / 2 - 0.03), 10)));
      g.add(rbox(W, 0.05, D, 0.015, m, 0, sh, 0));
      [-1, 1].forEach(a => g.add(cyl(leg, leg, H - sh, m, a * (W / 2 - 0.03), sh, back, 10)));
      g.add(rbox(W - 0.04, 0.18, 0.025, 0.01, m, 0, H - 0.22, back));
    }
  } else { // a cover over the whole chair: banquet covers flare to the floor, spandex hugs the frame
    const cm = material(d.cover === "spandex" ? "satin" : "fabric", d.coverColor || "#f7f5f0", { size: 0.6 }), sp = d.cover === "spandex";
    const skirt = new T.BoxGeometry(W + 0.04, sh + 0.04, D + 0.04, 8, 2, 8), p = skirt.attributes.position;
    for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y < 0) { const f = sp ? 0.88 : 1.12; p.setX(i, p.getX(i) * f); p.setZ(i, p.getZ(i) * f); } }
    skirt.computeVertexNormals(); const s = mesh(skirt, cm); s.position.y = (sh + 0.04) / 2; g.add(s);
    const bk = box(W + (sp ? 0.02 : 0.05), H - sh, sp ? 0.06 : 0.09, cm, 0, sh, back); g.add(bk);
    const cap = mesh(new T.CylinderGeometry(sp ? 0.03 : 0.045, sp ? 0.03 : 0.045, W + (sp ? 0.02 : 0.05), 12), cm); cap.rotation.z = Math.PI / 2; cap.position.set(0, H, back); g.add(cap);
  }
  if (d.sash) { // a satin ribbon wrapped round the back, tied in a bow behind the chair, two tails falling with a little wave
    const sm = material("satin", d.sash, { size: 0.3, side: T.DoubleSide }), y = (H - sh) * 0.45, sg = new T.Group();
    sg.position.set(0, sh, back); if (d.cover === "none" || !d.cover) sg.rotation.x = it.kind === "chair" ? -0.09 : it.kind === "chair_banquet" ? -0.12 : 0; g.add(sg);
    const hw = W / 2 + 0.03, hd = 0.05, band = [];
    for (let k = 0; k <= 48; k++) { const a = k / 48 * Math.PI * 2, c = Math.cos(a), s2 = Math.sin(a); band.push([Math.sign(c) * Math.pow(Math.abs(c), 0.35) * hw, Math.sign(s2) * Math.pow(Math.abs(s2), 0.35) * hd]); }
    sg.add(mesh(ribbon(band.map(([x, z]) => [x, y, z]), [0, 1, 0], 0.085, 0.006), sm));
    const kz = -hd - 0.012;
    [-1, 1].forEach(a => { // the two loops of the bow, and a tail under each
      const lp = []; for (let k = 0; k <= 24; k++) { const t = k / 24 * Math.PI * 2; lp.push([a * (0.012 + 0.05 * (1 - Math.cos(t)) / 2 * 1.9), y + 0.03 * Math.sin(t), kz - 0.004 * Math.sin(t)]); }
      sg.add(mesh(ribbon(lp, [0, 0, 1], 0.03, 0.004), sm));
      const tl = []; for (let k = 0; k <= 12; k++) { const v = k / 12; tl.push([a * (0.01 + v * 0.06), y - 0.01 - v * 0.27, kz - 0.006 + Math.sin(v * 7) * 0.008]); }
      sg.add(mesh(ribbon(tl, [1, 0, 0], 0.045, 0), sm));
    });
    sg.add(rbox(0.032, 0.03, 0.02, 0.008, sm, 0, y - 0.015, kz));
  }
}
// A strip of ribbon along a path: pts = [[x,y,z]...], across = the direction its width runs, bulge = a soft round across its width.
function ribbon(pts, across, width, bulge) {
  const pos = [], idx = [], A = new T.Vector3(...across).normalize(), n = pts.length;
  pts.forEach((p, i) => { for (let j = 0; j <= 2; j++) { const u = j / 2 - 0.5, b = bulge * (1 - 4 * u * u); const q = pts[Math.min(n - 1, i + 1)], r0 = pts[Math.max(0, i - 1)], out = new T.Vector3(q[0] - r0[0], q[1] - r0[1], q[2] - r0[2]).cross(A).normalize(); pos.push(p[0] + A.x * u * width + out.x * b, p[1] + A.y * u * width + out.y * b, p[2] + A.z * u * width + out.z * b); } });
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < 2; j++) { const a = i * 3 + j, b2 = a + 1, c = a + 3, dd = c + 1; idx.push(a, c, b2, b2, c, dd); }
  const g = new T.BufferGeometry(); g.setAttribute("position", new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}

// ---------- Helpers for signs, single blooms and sticks ----------
// A sign face: a canvas with a title and a smaller line, any proportions. Cached by its words.
const SIGNS = new Map();
function signTex(title, sub, w = 512, h = 512, o = {}) {
  const k = [title, sub, w, h, JSON.stringify(o)].join("|"); if (SIGNS.has(k)) return SIGNS.get(k);
  const c = document.createElement("canvas"); c.width = w; c.height = h; const x = c.getContext("2d");
  x.fillStyle = o.bg || "#fbf9f4"; x.fillRect(0, 0, w, h); if (o.border !== false) { x.strokeStyle = o.line || "#c9a24a"; x.lineWidth = Math.max(4, w / 50); x.strokeRect(w * 0.05, h * 0.05, w * 0.9, h * 0.9); }
  x.fillStyle = o.ink || "#16255a"; x.textAlign = "center"; x.textBaseline = "middle";
  const fit = (t, size, y, style) => { let f = size; do { x.font = style + " " + f + "px Georgia, serif"; f -= 2; } while (x.measureText(t).width > w * 0.84 && f > 8); x.fillText(t, w / 2, y); };
  fit(title, Math.round(h * (sub ? 0.22 : 0.3)), h * (sub ? 0.43 : 0.5), "italic"); if (sub) fit(sub, Math.round(h * 0.09), h * 0.66, "");
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; SIGNS.set(k, t); return t;
}
// One bloom at a spot, facing n: queued with the piece's other blooms so they're drawn together.
function bloomAt(g, sp, color, p, s, n = UP, spin = 0) { const pend = g.userData.blooms = g.userData.blooms || new Map(), k = sp + "|" + color; if (!pend.has(k)) pend.set(k, []); pend.get(k).push({ p, s, q: facing(n.clone().normalize(), spin) }); }
// A rod from a to b (branches, stems, frames).
function stick(a, b, r, m, seg = 6, r2 = r) { const d = new T.Vector3().subVectors(b, a), o = mesh(new T.CylinderGeometry(r2, r, d.length(), seg, 1), m); o.position.copy(a).addScaledVector(d, 0.5); o.quaternion.setFromUnitVectors(UP, d.clone().normalize()); return o; }
// A beam of light you can see: a faint cone that taps pass through. dir = where it points, from the lamp.
function beam(g, from, dir, len, r0, r1, color) {
  const k = "beam|" + color; if (!matCache.has(k)) matCache.set(k, new T.MeshBasicMaterial({ color: hex(color), transparent: true, opacity: 0.07, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide }));
  const o = new T.Mesh(new T.CylinderGeometry(r0, r1, len, 24, 1, true), matCache.get(k)); const d = dir.clone().normalize();
  o.position.copy(from).addScaledVector(d, len / 2); o.quaternion.setFromUnitVectors(new T.Vector3(0, -1, 0), d); o.userData.keep = o.userData.thru = true; o.castShadow = false; g.add(o);
}
const lathe = (pts, seg = 24) => new T.LatheGeometry(pts.map(([x, y]) => new T.Vector2(x, y)), seg);
const glow = c => flat(c, { emissive: hex(c), emissiveIntensity: 2.5 });

// Frame tents and pop-up canopies, any size: legs about every 10 ft round the edge (a canopy has four, with braces), a valance,
// and a hip roof you can see through (a pyramid when square). Outdoors the roof casts real shade.
// The roof is stretched fabric: each of its six panels is cut into small triangles and pulled down a little in the middle (the sag
// between frame and ridge), pinned at every edge. Seams run eave to ridge, 1.2 m apart (the width of one cloth panel).
function hipRoof(W, D, rise) {
  const r = Math.abs(D - W) / 2, alongZ = D >= W, A = [-W / 2, 0, -D / 2], B = [W / 2, 0, -D / 2], C = [W / 2, 0, D / 2], E = [-W / 2, 0, D / 2];
  const P = alongZ ? [0, rise, -r] : [-r, rise, 0], Q = alongZ ? [0, rise, r] : [r, rise, 0], tri = [];
  if (alongZ) tri.push(A, B, P, C, E, Q, B, C, Q, B, Q, P, E, A, P, E, P, Q); else tri.push(E, A, P, B, C, Q, A, B, Q, A, Q, P, C, E, P, C, P, Q);
  const n = 8, sag = Math.min(0.14, 0.012 * Math.max(W, D)), pos = [], uv = [], lerp3 = (a, b, c, u, v) => [a[0] + (b[0] - a[0]) * u + (c[0] - a[0]) * v, a[1] + (b[1] - a[1]) * u + (c[1] - a[1]) * v, a[2] + (b[2] - a[2]) * u + (c[2] - a[2]) * v];
  for (let t = 0; t < tri.length; t += 3) {
    const a = tri[t], b = tri[t + 1], c = tri[t + 2];
    if (Math.hypot((b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]), (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]), (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) < 1e-6) continue; // a square roof has two zero-area faces: sagging them would hang cloth below the hips
    const nx = Math.abs((b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1])), nz = Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])), useZ = nx > nz;
    const vert = (i, j) => { const u = i / n, v = j / n, q = lerp3(a, b, c, u, v), w0 = 1 - u - v, bub = 27 * w0 * u * v; q[1] -= sag * Math.min(1, bub) * (rise > 0.05 ? 1 : 0); pos.push(...q); uv.push((useZ ? q[2] : q[0]) / 1.2, (q[1] + (useZ ? q[0] : q[2])) / 1.2); };
    for (let i = 0; i < n; i++) for (let j = 0; j < n - i; j++) {
      vert(i, j); vert(i + 1, j); vert(i, j + 1);
      if (j < n - i - 1) { vert(i + 1, j); vert(i + 1, j + 1); vert(i, j + 1); }
    }
  }
  const g = new T.BufferGeometry(); g.setAttribute("position", new T.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2)); g.computeVertexNormals(); return g;
}
// One tile of roof cloth: the weave with a seam down its left edge (a darker fold with a row of stitches either side).
let ROOF_TEX = null;
function roofTexture() {
  if (ROOF_TEX) return ROOF_TEX;
  const N = 512, c = document.createElement("canvas"); c.width = c.height = N; const x = c.getContext("2d"), wv = material("fabric", "#ffffff", { size: 1 }).map;
  x.fillStyle = "#f4f4f4"; x.fillRect(0, 0, N, N);
  if (wv && wv.image) { x.globalAlpha = 0.6; for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) x.drawImage(wv.image, a * N / 2, b * N / 2, N / 2, N / 2); x.globalAlpha = 1; }
  const g = x.createLinearGradient(0, 0, 14, 0); g.addColorStop(0, "rgba(60,55,50,0.38)"); g.addColorStop(1, "rgba(60,55,50,0)"); x.fillStyle = g; x.fillRect(0, 0, 14, N);
  x.fillStyle = "rgba(70,65,60,0.55)"; x.fillRect(0, 0, 2, N); x.fillStyle = "rgba(90,85,80,0.5)";
  for (let y = 0; y < N; y += 12) { x.fillRect(7, y, 2, 6); x.fillRect(N - 9, y, 2, 6); }
  ROOF_TEX = new T.CanvasTexture(c); ROOF_TEX.colorSpace = T.SRGBColorSpace; ROOF_TEX.wrapS = ROOF_TEX.wrapT = T.RepeatWrapping; ROOF_TEX.anisotropy = 8; return ROOF_TEX;
}
function buildTent(g, it, scene) {
  const W = it.w, D = it.d, H = it.h, C = S.CATALOG[it.kind], eave = C.eave * Math.min(1, H / C.h), pole = material("metal", "#d8d8dc"), cloth = material("fabric", it.color || "#ffffff", { side: T.DoubleSide, size: 2 });
  const step = it.kind === "canopy" ? 99 : 3.05, nx = Math.max(1, Math.round(W / step)), nz = Math.max(1, Math.round(D / step)), r = it.kind === "canopy" ? 0.025 : 0.04;
  for (let i = 0; i <= nx; i++) for (let j = 0; j <= nz; j++) if (i === 0 || j === 0 || i === nx || j === nz) g.add(cyl(r, r, eave, pole, -W / 2 + i * W / nx, 0, -D / 2 + j * D / nz, 8));
  // hardware: a square base plate with bolts at every foot, and a collar where each pole meets the roof frame
  const plate = material("metal", "#9a9ea6"), bolt = material("metal", "#c9ccd2"), pw = it.kind === "canopy" ? 0.12 : 0.2;
  for (let i = 0; i <= nx; i++) for (let j = 0; j <= nz; j++) if (i === 0 || j === 0 || i === nx || j === nz) {
    const px = -W / 2 + i * W / nx, pz = -D / 2 + j * D / nz; g.add(box(pw, 0.012, pw, plate, px, 0, pz));
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([a, b]) => g.add(cyl(0.01, 0.01, 0.012, bolt, px + a * pw * 0.38, 0.012, pz + b * pw * 0.38, 6)));
    g.add(cyl(r * 1.7, r * 1.7, 0.1, plate, px, eave - 0.12, pz, 10));
    g.add(cyl(r * 1.35, r * 1.35, 0.16, plate, px, 0.012, pz, 10)); // the sleeve where the pole drops into its foot
    g.add(cyl(r * 0.6, r * 1.2, 0.05, bolt, px, eave, pz, 10)); // cap on the pole top
    const sh = contactShadow(pw * 3.2, pw * 3.2, true); sh.position.set(px, 0.003, pz); sh.userData.thru = true; g.add(sh);
  }
  // eave beams: the frame the roof is pinned to, running pole to pole just inside the valance
  const bm = material("metal", "#cfd2d8");
  [[W, 0, -D / 2 + 0.04, 0], [W, 0, D / 2 - 0.04, 0], [D, 0, 0, 1]].forEach(([len, , , rot], k) => { if (k === 2) { [-1, 1].forEach(sx => { const o = box(0.05, 0.07, D - 0.08, bm, sx * (W / 2 - 0.04), eave - 0.09, 0); g.add(o); }); } else { const o = box(W - 0.08, 0.07, 0.05, bm, 0, eave - 0.09, k === 0 ? -D / 2 + 0.04 : D / 2 - 0.04); g.add(o); } });
  const vh = it.kind === "canopy" ? 0.2 : 0.3, hemM = material("fabric", "#e4e0d8", { size: 0.5 });
  [[W, vh, 0.02, 0, -D / 2], [W, vh, 0.02, 0, D / 2], [0.02, vh, D, -W / 2, 0], [0.02, vh, D, W / 2, 0]].forEach(([w, h, d, x, z]) => { g.add(box(w, h, d, cloth, x, eave - vh, z)); g.add(box(w + (d > w ? 0 : 0.014), 0.03, d + (w > d ? 0 : 0.014) + 0.012, hemM, x, eave - vh, z)); });
  if (it.kind === "canopy") [[-1, -1, 1, -1], [1, -1, 1, 1], [1, 1, -1, 1], [-1, 1, -1, -1]].forEach(([a, b, c2, d2]) => g.add(stick(new T.Vector3(a * W / 2, eave - 0.05, b * D / 2), new T.Vector3((a + c2) * W / 4, eave - 0.45, (b + d2) * D / 4), 0.012, pole, 5)));
  const out = !!(scene && scene.site), k = "tentroof|" + (it.color || "") + HI + out; if (!matCache.has(k)) { const rm = new T.MeshStandardMaterial({ color: hex(it.color || "#f7f5f0"), roughness: 0.9, transparent: true, opacity: out ? 0.8 : 0.72, depthWrite: false, side: T.DoubleSide }); rm.map = roofTexture(); rm.roughness = 0.82; matCache.set(k, rm); }
  const roof = mesh(hipRoof(W, D, H - eave), matCache.get(k)); roof.position.y = eave; roof.castShadow = out; roof.receiveShadow = false; roof.userData.keep = roof.userData.thru = true; g.add(roof);
  const rr = Math.abs(D - W) / 2, top = D >= W ? [[0, -rr], [0, rr]] : [[-rr, 0], [rr, 0]];
  [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([a, b]) => { const t = (D >= W ? b : a) > 0 ? 1 : 0; g.add(stick(new T.Vector3(a * W / 2, eave, b * D / 2), new T.Vector3(top[t][0], H, top[t][1]), 0.025, pole, 6)); });
  if (rr > 0.1) g.add(stick(new T.Vector3(top[0][0], H, top[0][1]), new T.Vector3(top[1][0], H, top[1][1]), 0.03, pole, 6));
}

// ---------- Everything else ----------
const palOf = (it, def) => (it.palette && it.palette.length ? it.palette : def);
// Parts of one piece that share a material are joined into one mesh, so a phone draws a chair in 2 or 3 goes instead of 14.
// Instanced parts (flowers, balloons), lights and anything marked userData.keep stay as they are. The look doesn't change.
function mergeParts(g) {
  g.updateMatrixWorld(true);
  const by = new Map();
  g.traverse(o => { if (o.isMesh && !o.isInstancedMesh && !o.userData.keep && o.geometry && o.geometry.attributes.position) { const k = o.material.uuid + "|" + o.castShadow + "|" + o.receiveShadow + "|" + (o.renderOrder || 0) + "|" + !!o.userData.thru; if (!by.has(k)) by.set(k, []); by.get(k).push(o); } });
  by.forEach(list => {
    if (list.length < 2) return;
    const names = ["position", "normal", "uv"].filter(n => list.every(m => m.geometry.attributes[n])), arrays = names.map(() => []);
    list.forEach(m => {
      const ge = (m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone()); ge.applyMatrix4(m.matrixWorld);
      names.forEach((n, i) => { const a = ge.attributes[n]; for (let j = 0; j < a.count * a.itemSize; j++) arrays[i].push(a.array[j]); });
      ge.dispose(); m.parent.remove(m); if (!m.geometry.userData.shared) m.geometry.dispose();
    });
    const geo = new T.BufferGeometry(); names.forEach((n, i) => geo.setAttribute(n, new T.Float32BufferAttribute(arrays[i], n === "uv" ? 2 : 3)));
    if (!names.includes("normal")) geo.computeVertexNormals();
    geo.computeBoundingSphere(); const one = new T.Mesh(geo, list[0].material); one.castShadow = list[0].castShadow; one.receiveShadow = list[0].receiveShadow; one.renderOrder = list[0].renderOrder || 0; if (list[0].userData.thru) one.userData.thru = true; g.add(one);
  });
}
let SHADOW_TEX = null;
function contactShadow(w, d, round) {
  if (!SHADOW_TEX) { const N = 128, c = document.createElement("canvas"); c.width = c.height = N; const x = c.getContext("2d"), gr = x.createRadialGradient(N / 2, N / 2, 0, N / 2, N / 2, N / 2);
    gr.addColorStop(0, "rgba(0,0,0,0.55)"); gr.addColorStop(0.55, "rgba(0,0,0,0.3)"); gr.addColorStop(1, "rgba(0,0,0,0)"); x.fillStyle = gr; x.fillRect(0, 0, N, N); SHADOW_TEX = new T.CanvasTexture(c); }
  const k = "contact|" + HI; if (!matCache.has(k)) matCache.set(k, new T.MeshBasicMaterial({ map: SHADOW_TEX, transparent: true, depthWrite: false, opacity: HI ? 0.75 : 0.6, color: "#000000" }));
  const o = new T.Mesh(SHADOW_PLANE, matCache.get(k)); o.rotation.x = -Math.PI / 2; o.position.y = 0.003; o.scale.set(w * (round ? 1.25 : 1.2), d * (round ? 1.25 : 1.2), 1); o.renderOrder = -1; o.userData.contact = true; return o;
}
const SHADOW_PLANE = new T.PlaneGeometry(1, 1); SHADOW_PLANE.userData.shared = true;
export function buildItem(it, scene) {
  const g = new T.Group(), W = it.w, D = it.d, H = it.h, C = S.CATALOG[it.kind] || {};
  const main = material(it.mat, it.color, { size: Math.max(W, D) }), dark = material("metal", "#2e2e33"), gold = material("gold"), white = material("fabric", "#f7f5f0", { size: 0.5 });
  const flowers = palOf(it, it.color ? [it.color, "#ffffff", "#efc7c2"] : ["#ffffff", "#efc7c2", "#f1a7bd", "#f3ead6"]);
  const balloons = palOf(it, [it.color || "#efc7c2", "#ffffff", "#c9a24a"]);
  switch (it.kind) {
    case "table_round": case "table_round72": case "table_rect": case "table_banquet": case "table_farm": case "table_cocktail": case "buffet": case "cake_table": case "gift_table":
    case "table_serpentine": case "table_sweetheart": case "table_head": case "dessert_table": case "welcome_table": buildTable(g, it, scene); break;
    case "chair": case "chair_ghost": case "chair_crossback": case "chair_folding": case "chair_banquet": buildChair(g, it); break;
    case "sofa": case "lounge_chair": {
      const v = material("velvet", it.color || null, { size: 1 }); g.add(rbox(W, 0.2, D, 0.04, v, 0, 0.12, 0)); g.add(rbox(W - 0.1, 0.14, D - 0.2, 0.06, v, 0, 0.3, 0.08));
      g.add(rbox(W, H - 0.32, 0.18, 0.06, v, 0, 0.32, -D / 2 + 0.09)); [-1, 1].forEach(a => g.add(rbox(0.16, 0.26, D, 0.06, v, a * (W / 2 - 0.08), 0.32, 0)));
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => g.add(cyl(0.02, 0.015, 0.12, gold, a * (W / 2 - 0.08), 0, b * (D / 2 - 0.08), 8))); break;
    }
    case "ottoman": { const v = material("velvet", it.color || null, { size: 0.6 }); g.add(cyl(W / 2, W / 2, H - 0.05, v, 0, 0.05, 0, 32)); for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; g.add(ball(0.012, gold, Math.cos(a) * W / 4, H, Math.sin(a) * W / 4, 8)); } g.add(cyl(W / 2 - 0.03, W / 2 - 0.03, 0.05, gold, 0, 0, 0, 24)); break; }
    case "coffee_table": g.add(box(W, 0.02, D, material("glass"), 0, H - 0.02, 0)); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => g.add(box(0.025, H - 0.02, 0.025, main, a * (W / 2 - 0.02), 0, b * (D / 2 - 0.02)))); g.add(box(W, 0.02, 0.02, main, 0, H - 0.04, D / 2 - 0.02)); g.add(box(W, 0.02, 0.02, main, 0, H - 0.04, -D / 2 + 0.02)); break;
    case "stage": g.add(box(W, H - 0.025, D, material("velvet", "#1b1b22", { size: 2 }))); /* the deck and steps use the stage's chosen material (wood unless changed) */ g.add(box(W, 0.025, D, material(it.mat || "wood", it.color, { size: W }), 0, H - 0.025, 0)); for (let k = 0; k < 2; k++) g.add(box(1.2, (H / 3) * (k + 1), 0.3, material(it.mat || "wood", it.color, { size: 1.2 }), W / 2 - 1, 0, D / 2 + 0.6 - k * 0.3)); break;
    case "dance_floor": g.add(box(W, H, D, material(it.mat, it.color, { size: W }))); g.add(box(W + 0.06, H * 0.7, 0.03, gold, 0, 0, D / 2 + 0.015)); g.add(box(W + 0.06, H * 0.7, 0.03, gold, 0, 0, -D / 2 - 0.015)); g.add(box(0.03, H * 0.7, D, gold, W / 2 + 0.015, 0, 0)); g.add(box(0.03, H * 0.7, D, gold, -W / 2 - 0.015, 0, 0)); break;
    case "rug": { const m = material(it.mat, it.color, { size: Math.max(W, D) }); g.add(box(W, H, D, m)); const b = material("velvet", "#c9a24a", { size: 0.5 }); [[W, 0.08, 0, D / 2 - 0.04], [W, 0.08, 0, -D / 2 + 0.04]].forEach(([w, d, x, z]) => g.add(box(w, H + 0.002, d, b, x, 0, z))); [[W / 2 - 0.04], [-W / 2 + 0.04]].forEach(([x]) => g.add(box(0.08, H + 0.002, D, b, x, 0, 0))); break; }
    case "podium": g.add(box(W, H, D, main)); g.add(box(W + 0.05, 0.04, D + 0.05, main, 0, H - 0.04, 0)); break;
    case "bar": case "dj_booth": case "food_station": {
      g.add(rbox(W, H - 0.05, D, 0.02, main)); g.add(rbox(W + 0.1, 0.05, D + 0.1, 0.02, material("marble", null, { size: W }), 0, H - 0.05, 0));
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
      const out = new T.Vector3(0, 0, 1);
      for (let k = 0; k < Math.round(W * H * 110); k++) { const n = out.clone().add(new T.Vector3((r() - 0.5) * 0.5, (r() - 0.5) * 0.5, 0)).normalize(); list.push({ p: [(r() - 0.5) * (W - 0.08), 0.04 + r() * (H - 0.08), 0.03 + r() * 0.02], s: 0.1 + r() * 0.045, q: facing(n, r() * 6.3) }); }
      multi(g, bloomGeo("lite"), petalMat, list, flowers);
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
    case "plant": g.add(cyl(W / 3, W / 4, 0.45, main)); roseBall(g, W / 2, 0, 0.45 + W / 2, 0, ["#3f7a4a", "#4d8d58", "#356b40"], 60, 22, true); roseBall(g, W / 2.6, 0.1, H - W / 2.6, 0.05, ["#4d8d58", "#3f7a4a"], 40, 23, true); break;
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
    case "chair_throne": { // a tall arched back with a velvet panel and buttons, padded arms, a deep seat, turned legs
      // gold on big flat carved faces reflects mostly dark room, so the throne uses a gilded finish (less mirror, more color)
      const gk = "gilt|" + HI; if (!matCache.has(gk)) { const m = new T.MeshStandardMaterial({ color: hex("#c9a24a"), metalness: 0.55, roughness: 0.32 }); m.envMapIntensity = 4; matCache.set(gk, m); }
      const fr = (it.mat || "gold") === "gold" ? matCache.get(gk) : material(it.mat, null, { size: 0.8 }), vel = material("velvet", it.color || "#f3ead6", { size: 0.6 }), sh = 0.5, bz = -D / 2 + 0.06, bh = H - sh - 0.16;
      const arch = (w, h, crest) => { const sp = new T.Shape(); sp.moveTo(-w / 2, 0); sp.lineTo(-w / 2, h * 0.72); sp.bezierCurveTo(-w / 2, h * 0.95, -w * 0.12, h * 0.9, 0, h + crest); sp.bezierCurveTo(w * 0.12, h * 0.9, w / 2, h * 0.95, w / 2, h * 0.72); sp.lineTo(w / 2, 0); sp.lineTo(-w / 2, 0); return sp; };
      const ext = (sp, dep, bev) => new T.ExtrudeGeometry(sp, { depth: dep, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 1, curveSegments: 10 });
      const o1 = mesh(ext(arch(W - 0.1, bh, 0.16), 0.06, 0.02), fr); o1.position.set(0, sh, bz - 0.03); g.add(o1);
      const o2 = mesh(ext(arch(W - 0.3, bh - 0.12, 0.08), 0.03, 0.025), vel); o2.position.set(0, sh + 0.06, bz + 0.03); g.add(o2);
      const btn = []; for (let r = 0; r < 5; r++) for (let c = 0; c < (r % 2 ? 3 : 4); c++) btn.push({ p: [(c - ((r % 2 ? 3 : 4) - 1) / 2) * 0.13, sh + 0.2 + r * (bh - 0.4) / 5, bz + 0.09], s: 0.014 });
      g.add(inst(DOT, fr, btn)); g.add(ball(0.045, fr, 0, H - 0.02, bz, 14));
      g.add(rbox(W - 0.16, 0.14, D - 0.14, 0.06, vel, 0, sh - 0.12, 0.04)); g.add(rbox(W - 0.08, 0.07, D - 0.08, 0.025, fr, 0, sh - 0.17, 0.02));
      [-1, 1].forEach(a => { const x = a * (W / 2 - 0.05); g.add(rbox(0.09, 0.3, D - 0.18, 0.035, fr, x, sh - 0.12, 0.02)); g.add(rbox(0.11, 0.06, D - 0.12, 0.03, vel, x, sh + 0.18, 0.03)); g.add(cyl(0.035, 0.03, 0.12, fr, x, sh + 0.06, D / 2 - 0.12, 12)); });
      const leg = lathe([[0.001, 0], [0.04, 0.0], [0.03, 0.05], [0.045, 0.12], [0.028, 0.22], [0.04, sh - 0.17]], 14);
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => { const l = mesh(leg, fr); l.position.set(a * (W / 2 - 0.1), 0, b * (D / 2 - 0.1)); g.add(l); }); break;
    }
    case "bench": { g.add(rbox(W, 0.05, D, 0.012, main, 0, H - 0.05, 0)); [-1, 1].forEach(a => { g.add(rbox(0.06, H - 0.05, D - 0.06, 0.012, main, a * (W / 2 - 0.3), 0, 0)); }); g.add(rbox(W - 0.6, 0.06, 0.04, 0.012, main, 0, 0.12, 0)); break; }
    case "champagne_wall": { // a framed wall with slotted shelves, a flute of champagne in every slot, a sign on top
      const fr = main, rows = 8, cols = 6, top = H - 0.32, y0 = 0.36, gap = (top - y0) / rows;
      [-1, 1].forEach(a => g.add(rbox(0.07, H, D, 0.01, fr, a * (W / 2 - 0.035), 0, 0))); g.add(rbox(W, 0.08, D, 0.01, fr, 0, 0, 0));
      g.add(box(W - 0.14, top - 0.08, 0.02, material(it.mat || "wood", it.color, { size: 1 }), 0, 0.08, -D / 2 + 0.03));
      const head = mesh(new T.BoxGeometry(W, 0.32, D), [fr, fr, fr, fr, new T.MeshStandardMaterial({ map: signTex(it.label || "Sip & Celebrate", "", 610, 160, { bg: "#16255a", ink: "#f3ead6", line: "#c9a24a" }), roughness: 0.6 }), fr]); head.position.set(0, top + 0.16, 0); head.castShadow = true; g.add(head);
      const fl = [], liq = [];
      for (let r = 0; r < rows; r++) { const y = y0 + r * gap; g.add(box(W - 0.14, 0.025, D - 0.04, fr, 0, y, 0.01)); for (let c = 0; c < cols; c++) { const x = -W / 2 + 0.12 + c * (W - 0.24) / (cols - 1); fl.push({ p: [x, y - 0.1, 0.03], s: 1 }); liq.push({ p: [x, y + 0.05, 0.03], s: 1 }); } }
      const flute = lathe([[0.028, 0], [0.003, 0.006], [0.0025, 0.11], [0.018, 0.125], [0.024, 0.2], [0.023, 0.25]], 14); flute.userData.keep = true;
      const wine = new T.CylinderGeometry(0.02, 0.014, 0.08, 12); wine.translate(0, 0.04, 0); wine.userData.keep = true;
      g.add(inst(flute, material("glass"), fl)); g.add(inst(wine, flat("#e8c766", { roughness: 0.2, metalness: 0, transparent: true, opacity: 0.85 }), liq)); break;
    }
    case "entrance_arch": { // a square gold frame, a sheer swag across the top, side panels gathered at the posts, flowers in the corners
      const fr = material(it.mat || "gold", it.mat === "gold" ? null : it.color), sat = material("satin", it.mat === "gold" ? it.color || "#ffffff" : "#ffffff", { side: T.DoubleSide, opacity: 0.85, size: 1 });
      [-1, 1].forEach(a => { g.add(cyl(0.03, 0.03, H, fr, a * W / 2, 0, 0, 10)); g.add(box(0.4, 0.02, 0.4, fr, a * W / 2, 0, 0)); }); g.add(stick(new T.Vector3(-W / 2, H, 0), new T.Vector3(W / 2, H, 0), 0.03, fr, 10));
      const sw = new T.PlaneGeometry(W, 1, 48, 6), p = sw.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), v = 0.5 - p.getY(i), t = x / W + 0.5, sag = 0.12 + 0.5 * Math.sin(Math.PI * t); p.setXYZ(i, x, H - v * sag, 0.04 + Math.sin(x * 18) * 0.025 * v); } sw.computeVertexNormals(); const so = mesh(sw, sat); so.castShadow = false; g.add(so);
      [-1, 1].forEach(a => { const sp = new T.PlaneGeometry(0.55, H - 0.1, 10, 16), q = sp.attributes.position; for (let i = 0; i < q.count; i++) { const x = q.getX(i), y = q.getY(i), t = 0.5 - y / (H - 0.1), k = 0.25 + 0.75 * Math.min(1, t * 1.6); q.setXYZ(i, a * W / 2 - a * (x + 0.275) * k * 0.9, y + (H - 0.1) / 2 + 0.05, 0.05 + Math.sin(x * 30) * 0.03 * k); } sp.computeVertexNormals(); const o = mesh(sp, sat); o.castShadow = false; g.add(o); });
      roseBall(g, 0.3, -W / 2 + 0.05, H - 0.05, 0.08, flowers, 70, 41); roseBall(g, 0.18, -W / 2 + 0.3, H - 0.12, 0.1, flowers, 30, 42); roseBall(g, 0.22, W / 2 - 0.05, H - 0.08, 0.08, flowers, 40, 43); break;
    }
    case "partition": { // four framed panels in a zigzag, cane or fabric in the middle
      const n = 4, al = 0.35, L = (W / n) / Math.cos(al), inset = material("fabric", it.color || "#efe6d2", { size: 0.4 }); let x = -W / 2, z = -L * Math.sin(al) / 2;
      for (let k = 0; k < n; k++) { const a = k % 2 ? -al : al, nx = x + L * Math.cos(a), nz = z + L * Math.sin(a), pn = new T.Group(); pn.position.set((x + nx) / 2, 0, (z + nz) / 2); pn.rotation.y = -a; g.add(pn);
        pn.add(rbox(L - 0.01, H, 0.035, 0.01, main, 0, 0, 0)); pn.add(box(L - 0.09, H - 0.24, 0.04, inset, 0, 0.14, 0)); x = nx; z = nz; } break;
    }
    case "bud_vases": { const r = rng(71), cols = palOf(it, ["#ffffff", "#efc7c2", "#f1a7bd"]), glass = material("glass"), stem = flat("#4a6b3e");
      [[-0.17, -0.02, 0.14], [-0.08, 0.06, 0.2], [0.01, -0.04, 0.12], [0.1, 0.05, 0.17], [0.18, -0.03, 0.1]].forEach(([x, z, h], i) => {
        g.add(mesh(lathe([[0.001, 0], [0.028, 0], [0.032, h * 0.25], [0.026, h * 0.55], [0.01, h * 0.75], [0.009, h], [0.012, h + 0.004]], 18), glass).translateX(x).translateZ(z));
        const top = new T.Vector3(x + (r() - 0.5) * 0.04, h + 0.06 + r() * 0.05, z + (r() - 0.5) * 0.03); g.add(stick(new T.Vector3(x, h * 0.4, z), top, 0.0025, stem, 5));
        bloomAt(g, ["rose", "garden", "peony"][i % 3], cols[i % cols.length], [top.x, top.y, top.z], 0.045, new T.Vector3((r() - 0.5) * 0.6, 1, (r() - 0.5) * 0.6), r() * 6); }); break; }
    case "table_garland": { // greenery down the middle of the table with a few blooms tucked in
      const r = rng(73), lv = [], lv2 = [], n = Math.round(W * 110);
      for (let k = 0; k < n; k++) { const t = r(), x = (t - 0.5) * W, zc = Math.sin(t * Math.PI * 3) * 0.05, rr = 0.04 + 0.08 * Math.sin(Math.PI * t); (k % 3 ? lv : lv2).push({ p: [x, 0.02 + r() * 0.06, zc + (r() - 0.5) * rr * 2], s: 0.07 + r() * 0.04, r: [-Math.PI / 2 + (r() - 0.5) * 0.9, r() * 6.3, (r() - 0.5) * 0.6] }); }
      g.add(inst(LEAF, material("velvet", "#5b7f5a", { side: T.DoubleSide, size: 0.2 }), lv)); g.add(inst(LEAF, material("velvet", "#8aa58a", { side: T.DoubleSide, size: 0.2 }), lv2));
      const cols = palOf(it, ["#ffffff", "#efc7c2"]); for (let k = 0; k < Math.round(W * 6); k++) { const t = (k + 0.5) / Math.round(W * 6), x = (t - 0.5) * W * 0.9; bloomAt(g, ["rose", "garden"][k % 2], cols[k % cols.length], [x, 0.07, Math.sin(t * Math.PI * 3) * 0.05 + (r() - 0.5) * 0.06], 0.04 + r() * 0.015, new T.Vector3((r() - 0.5) * 0.5, 1, (r() - 0.5) * 0.5), r() * 6); } break;
    }
    case "branches": { // painted branches rising from a glass cylinder, crystals hanging from the tips
      const r = rng(79), bm = material("paint", it.color || "#f4f1ea", { size: 0.3 }), tips = [];
      g.add(cyl(0.07, 0.07, 0.3, material("glass"), 0, 0, 0, 24, true)); g.add(cyl(0.065, 0.065, 0.012, material("glass"), 0, 0, 0, 24));
      const grow = (a, dir, len, rad, depth) => { const b = a.clone().addScaledVector(dir, len); g.add(stick(a, b, rad, bm, 5, rad * 0.7)); if (!depth) { tips.push(b); return; } const n = depth > 1 ? 2 + (r() < 0.5 ? 1 : 0) : 2;
        for (let k = 0; k < n; k++) { const nd = dir.clone().add(new T.Vector3((r() - 0.5) * 1.3, (r() - 0.2) * 0.5, (r() - 0.5) * 1.3)).normalize(); grow(b, nd, len * (0.62 + r() * 0.15), rad * 0.68, depth - 1); } };
      for (let k = 0; k < 3; k++) grow(new T.Vector3((r() - 0.5) * 0.04, 0.05, (r() - 0.5) * 0.04), new T.Vector3((r() - 0.5) * 0.25, 1, (r() - 0.5) * 0.25).normalize(), 0.42, 0.014, 3);
      g.add(inst(BALL, material("acrylic", "#ffffff"), tips.map(t => ({ p: [t.x, t.y - 0.05, t.z], s: [0.012, 0.022, 0.012] })))); break;
    }
    case "bouquet": { // a dome of blooms laid on its side, stems wrapped in ribbon
      const r = rng(83), cols = palOf(it, ["#ffffff", "#efc7c2", "#f1a7bd"]), c = new T.Vector3(0, 0.1, 0.08), ax = new T.Vector3(0, 0.15, 1).normalize(), lv = [];
      for (let k = 0; k < 26; k++) { const n = new T.Vector3((r() - 0.5) * 2, (r() - 0.5) * 2, (r() - 0.5) * 2).normalize(); if (n.dot(ax) < 0) n.negate(); n.lerp(ax, 0.25).normalize(); bloomAt(g, ["rose", "peony", "garden"][k % 3], cols[k % cols.length], [c.x + n.x * 0.09, c.y + n.y * 0.09, c.z + n.z * 0.09], 0.04 + r() * 0.012, n, r() * 6);
        if (k % 2) lv.push({ p: [c.x + n.x * 0.1, c.y + n.y * 0.1, c.z + n.z * 0.1 - 0.02], s: 0.06, r: [r() * 6, r() * 6, r() * 6] }); }
      g.add(inst(LEAF, material("velvet", "#4b7a4f", { side: T.DoubleSide, size: 0.2 }), lv));
      g.add(stick(new T.Vector3(0, 0.05, 0.02), new T.Vector3(0, 0.03, -0.2), 0.022, flat("#5d7a45"), 10, 0.014)); g.add(stick(new T.Vector3(0, 0.05, -0.01), new T.Vector3(0, 0.035, -0.11), 0.026, material("satin", it.color || "#f3ead6", { size: 0.2 }), 14)); break;
    }
    case "lanterns": { const lm = material(it.mat || "metal", it.color || "#2b2b30", { size: 0.3 }), gl = material("glass"), wax = material("fabric", "#fbf6ea", { size: 0.2 });
      [[-0.18, -0.05, 0.62], [0.1, 0.08, 0.42], [0.22, -0.12, 0.3]].forEach(([x, z, h]) => { const s2 = h * 0.38;
        g.add(box(s2 + 0.03, 0.03, s2 + 0.03, lm, x, 0, z)); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => g.add(box(0.012, h * 0.72, 0.012, lm, x + a * s2 / 2, 0.03, z + b * s2 / 2)));
        g.add(box(s2, h * 0.7, s2, gl, x, 0.03, z)); g.add(box(s2 + 0.03, 0.025, s2 + 0.03, lm, x, h * 0.75, z));
        const roof = mesh(new T.ConeGeometry(s2 * 0.75, h * 0.18, 4), lm); roof.rotation.y = Math.PI / 4; roof.position.set(x, h * 0.775 + h * 0.09, z); g.add(roof);
        const ring = mesh(new T.TorusGeometry(h * 0.05, 0.006, 6, 16), lm); ring.position.set(x, h * 0.97 + h * 0.03, z); g.add(ring);
        g.add(cyl(s2 * 0.25, s2 * 0.25, h * 0.3, wax, x, 0.03, z, 14)); g.add(mesh(new T.ConeGeometry(0.008, 0.03, 8), flame()).translateX(x).translateY(0.05 + h * 0.3).translateZ(z)); });
      lightHere(g, "#ffb76b", 0.8, 2.5, 0.3); break;
    }
    case "spotlight": { // a tripod stand with a spotlight head, a real light and a faint beam
      [0, 2.1, 4.2].forEach(a => g.add(stick(new T.Vector3(0, 0.9, 0), new T.Vector3(Math.cos(a) * 0.28, 0, Math.sin(a) * 0.28), 0.012, dark, 6)));
      g.add(cyl(0.018, 0.018, H - 0.95, dark, 0, 0.9, 0, 8)); const head = new T.Group(); head.position.set(0, H - 0.1, 0); g.add(head);
      head.add(cyl(0.11, 0.13, 0.36, main, 0, -0.18, 0, 20)); const lens = mesh(new T.CircleGeometry(0.1, 20), glow(it.color || "#fff4dc")); lens.position.y = -0.181; lens.rotation.x = Math.PI / 2; head.add(lens); head.rotation.x = -(Math.PI / 2 - 0.45); // the lens (pointing down) turned to point forward and a little down
      const dir = new T.Vector3(0, -Math.sin(0.45), Math.cos(0.45)), from = new T.Vector3(0, H - 0.1, 0).addScaledVector(dir, 0.2);
      beam(g, from, dir, 4, 0.09, 0.7, it.color || "#fff4dc");
      if (HI && itemLights < 8) { itemLights++; const l = new T.SpotLight(it.color || "#fff4dc", 30, 12, 0.22, 0.5, 1.4); l.position.copy(from); const tg = new T.Object3D(); tg.position.copy(from).addScaledVector(dir, 5); g.add(tg); l.target = tg; g.add(l); } break;
    }
    case "pedestals": { const pm = material(it.mat || "paint", it.color || "#f7f5f0", { size: 0.5 }), cols = flowers;
      [[-0.3, 0.02, 0.61, 0.15], [0, -0.03, 0.81, 0.17], [0.3, 0.03, 0.46, 0.13]].forEach(([x, z, h, rr], i) => { g.add(cyl(rr, rr, h, pm, x, 0, z, 32));
        if (i === 1) { g.add(cyl(0.08, 0.06, 0.06, material("gold"), x, h, z, 20)); roseBall(g, 0.13, x, h + 0.13, z, cols, 36, 91); }
        else { g.add(cyl(0.04, 0.04, 0.12 + i * 0.04, material("fabric", "#fbf6ea", { size: 0.2 }), x, h, z, 16)); g.add(mesh(new T.ConeGeometry(0.008, 0.03, 8), flame()).translateX(x).translateY(h + 0.15 + i * 0.04).translateZ(z)); } });
      lightHere(g, "#ffb76b", 0.5, 1.5, 0.9); break;
    }
    case "sculpture": { g.add(rbox(0.4, 1.0, 0.4, 0.01, main)); const k = mesh(new T.TorusKnotGeometry(0.15, 0.04, 90, 10, 2, 3), material("gold", it.mat === "paint" ? null : it.color)); k.position.y = 1.0 + 0.28; k.rotation.set(0.4, 0.3, 0); g.add(k); g.add(cyl(0.05, 0.07, 0.08, material("gold"), 0, 1.0, 0, 16)); break; }
    case "display_shelf": { // open shelving with books, vases and frames
      const r = rng(97), sy = [0.05, 0.45, 0.85, 1.25, H - 0.03];
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => g.add(box(0.035, H, 0.035, main, a * (W / 2 - 0.02), 0, b * (D / 2 - 0.02)))); sy.forEach(y => g.add(box(W, 0.03, D, main, 0, y, 0)));
      const books = ["#16255a", "#7a1f2b", "#c9a24a", "#f3ead6", "#3f6b44"].map(c => material("paint", c, { size: 0.2 })), gl = material("glass"), gold = material("gold");
      sy.slice(0, 4).forEach((y, k) => { const y0 = y + 0.03; let x = -W / 2 + 0.08;
        if (k % 2 === 0) { for (let j = 0; j < 6; j++) { const h = 0.18 + r() * 0.08, t = 0.03 + r() * 0.02; g.add(box(t, h, 0.2, books[j % 5], x, y0, -0.05)); x += t + 0.004; } g.add(mesh(lathe([[0.001, 0], [0.05, 0], [0.06, 0.08], [0.03, 0.2], [0.035, 0.24]], 18), gl).translateX(W / 2 - 0.2).translateY(y0)); }
        else { g.add(box(0.18, 0.24, 0.02, gold, -0.2, y0, -0.1)); g.add(box(0.15, 0.21, 0.022, material("paint", "#d8d2c6"), -0.2, y0 + 0.015, -0.1)); g.add(mesh(lathe([[0.001, 0], [0.07, 0], [0.08, 0.05], [0.05, 0.13], [0.06, 0.16]], 18), gold).translateX(0.2).translateY(y0)); roseBall(g, 0.06, 0.2, y0 + 0.2, 0, flowers, 12, 98 + k); } }); break;
    }
    case "aisle_runner": { g.add(box(W, H, D, material(it.mat || "fabric", it.color || "#ffffff", { size: 1 }))); const b = material("satin", "#d9c08a", { size: 0.5 }); [-1, 1].forEach(a => g.add(box(0.03, H + 0.001, D, b, a * (W / 2 - 0.05), 0, 0))); break; }
    case "led_wall": { // ground-stacked frame holding a wall of 500 mm panels showing a picture
      [-1, 1].forEach(a => { g.add(box(0.12, H, 0.12, dark, a * (W / 2 + 0.06), 0, -0.1)); g.add(box(0.12, 0.04, D, dark, a * (W / 2 + 0.06), 0, 0)); });
      const N = 1024, c = document.createElement("canvas"); c.width = N; c.height = Math.round(N * (H - 0.3) / W); const x = c.getContext("2d"), gr = x.createLinearGradient(0, 0, N, c.height);
      gr.addColorStop(0, "#16255a"); gr.addColorStop(0.6, it.color || "#2f6fd1"); gr.addColorStop(1, "#f6892f"); x.fillStyle = gr; x.fillRect(0, 0, N, c.height);
      x.fillStyle = "rgba(255,255,255,0.92)"; x.textAlign = "center"; x.textBaseline = "middle"; x.font = "italic " + Math.round(c.height * 0.16) + "px Georgia, serif"; x.fillText((it.label || "Welcome").slice(0, 28), N / 2, c.height / 2);
      x.strokeStyle = "rgba(0,0,0,0.35)"; x.lineWidth = 2; const cw = N / Math.round(W / 0.5), chh = c.height / Math.round((H - 0.3) / 0.5); for (let k = cw; k < N; k += cw) { x.beginPath(); x.moveTo(k, 0); x.lineTo(k, c.height); x.stroke(); } for (let k = chh; k < c.height; k += chh) { x.beginPath(); x.moveTo(0, k); x.lineTo(N, k); x.stroke(); }
      const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; const fr = flat("#121216");
      const wall = new T.Mesh(new T.BoxGeometry(W, H - 0.3, 0.1), [fr, fr, fr, fr, new T.MeshBasicMaterial({ map: t }), fr]); wall.position.set(0, 0.3 + (H - 0.3) / 2, 0); wall.castShadow = true; wall.userData.keep = true; g.add(wall); lightHere(g, it.color || "#6a8fe0", 1.5, 5, H / 2); break;
    }
    case "projector": { [0, 2.1, 4.2].forEach(a => g.add(stick(new T.Vector3(0, 0.7, 0), new T.Vector3(Math.cos(a) * 0.22, 0, Math.sin(a) * 0.22), 0.01, dark, 6)));
      g.add(cyl(0.016, 0.016, H - 0.8, dark, 0, 0.7, 0, 8)); g.add(box(0.4, 0.02, 0.36, dark, 0, H - 0.14, 0)); g.add(rbox(0.32, 0.12, 0.3, 0.02, material("paint", "#e9e9ec"), 0, H - 0.12, 0));
      const ln = mesh(new T.CircleGeometry(0.035, 16), glow("#fff8e6")); ln.position.set(0.08, H - 0.06, 0.151); g.add(ln); beam(g, new T.Vector3(0.08, H - 0.06, 0.16), new T.Vector3(0, 0.08, 1), 4.5, 0.03, 0.9, "#fff8e6"); break; }
    case "photo_booth": { // a backdrop facing a camera kiosk with a ring light
      const bd = material(it.mat || "fabric", it.color || "#f1d7d3", { size: 1 }), wh = material("paint", "#f4f4f6");
      [-1, 1].forEach(a => { g.add(box(0.05, H, 0.05, dark, a * W / 2, 0, -D / 2 + 0.05)); g.add(box(0.45, 0.015, 0.45, dark, a * W / 2, 0, -D / 2 + 0.05)); }); g.add(box(W, H - 0.05, 0.03, bd, 0, 0.05, -D / 2 + 0.05));
      const kz = D / 2 - 0.25, kiosk = new T.Group(); kiosk.position.set(0, 0, kz); g.add(kiosk); // its screen and ring light face the backdrop, where the guests stand
      kiosk.add(cyl(0.2, 0.22, 0.03, dark, 0, 0, 0, 24)); kiosk.add(cyl(0.035, 0.035, 1.2, wh, 0, 0.03, 0, 12)); kiosk.add(rbox(0.36, 0.5, 0.08, 0.02, wh, 0, 1.15, 0));
      const scr = mesh(new T.PlaneGeometry(0.28, 0.4), glow("#cfe0ff")); scr.position.set(0, 1.4, -0.041); scr.rotation.y = Math.PI; kiosk.add(scr);
      const ring = mesh(new T.TorusGeometry(0.2, 0.018, 8, 40), glow("#ffffff")); ring.position.set(0, 1.78, 0); kiosk.add(ring); kiosk.add(cyl(0.012, 0.012, 0.15, dark, 0, 1.63, 0, 6)); lightHere(g, "#ffffff", 1.2, 3.5, 1.7); break;
    }
    case "booth_360": { const R0 = W / 2 - 0.05, wh = material("paint", "#f4f4f6");
      g.add(cyl(R0, R0 + 0.02, 0.16, wh, 0, 0, 0, 48)); g.add(cyl(R0 - 0.02, R0 - 0.02, 0.012, material("velvet", "#1b1b22", { size: 1 }), 0, 0.16, 0, 48));
      const led = mesh(new T.TorusGeometry(R0 + 0.012, 0.012, 6, 64), glow(it.color || "#f6892f")); led.rotation.x = Math.PI / 2; led.position.y = 0.06; g.add(led);
      g.add(cyl(0.05, 0.05, 0.12, main, 0, 0.17, 0, 12)); const arm = new T.Group(); arm.position.y = 0.26; arm.rotation.y = 0.7; g.add(arm);
      arm.add(stick(new T.Vector3(0, 0, 0), new T.Vector3(R0 + 0.06, 0, 0), 0.02, main, 8)); arm.add(stick(new T.Vector3(R0 + 0.06, 0, 0), new T.Vector3(R0 + 0.06, H - 0.6, 0), 0.016, main, 8));
      arm.add(rbox(0.04, 0.16, 0.08, 0.01, dark, R0 + 0.03, H - 0.75, 0)); const rl = mesh(new T.TorusGeometry(0.07, 0.008, 6, 24), glow("#ffffff")); rl.position.set(R0 + 0.01, H - 0.67, 0); rl.rotation.y = Math.PI / 2; arm.add(rl); break; }
    case "fog": { // a dry-ice machine at the edge and soft see-through clouds over the floor
      g.add(rbox(0.5, 0.55, 0.45, 0.03, dark, -W / 2 + 0.35, 0, D / 2 - 0.3)); g.add(cyl(0.06, 0.06, 0.3, dark, -W / 2 + 0.35, 0.2, D / 2 - 0.55, 12).rotateX(Math.PI / 2));
      const k = "fog|" + HI; if (!matCache.has(k)) matCache.set(k, new T.MeshStandardMaterial({ color: "#ffffff", roughness: 1, transparent: true, opacity: 0.42, depthWrite: false }));
      const r = rng(101), puffs = []; for (let i = 0; i < 170; i++) { const s0 = 0.35 + r() * 0.45; puffs.push({ p: [(r() - 0.5) * (W - 0.4), 0.1 + r() * 0.14, (r() - 0.5) * (D - 0.4)], s: [s0, 0.14 + r() * 0.14, s0 * (0.8 + r() * 0.4)] }); }
      const m = inst(PUFF, matCache.get(k), puffs); m.castShadow = m.receiveShadow = false; m.userData.thru = true; m.renderOrder = 2; g.add(m); break;
    }
    case "cold_spark": { // the machine and a frozen moment of its fountain
      g.add(rbox(W, 0.3, D, 0.02, dark)); g.add(cyl(0.05, 0.06, 0.04, main, 0, 0.3, 0, 16));
      const r = rng(103), sp = []; for (let i = 0; i < 320; i++) { const t = Math.pow(r(), 0.8), y = 0.34 + t * (H - 0.4), a = r() * 6.3, rad = 0.02 + t * 0.18 + (t > 0.85 ? (t - 0.85) * 1.6 : 0) * r(); sp.push({ p: [Math.cos(a) * rad, y - (t > 0.85 ? r() * 0.4 : 0), Math.sin(a) * rad], s: 0.006 + r() * 0.006 }); }
      const m = inst(DOT, glow("#ffd27a"), sp); m.castShadow = false; m.userData.thru = true; g.add(m); lightHere(g, "#ffc46b", 2, 4, 1.2); break;
    }
    case "tent": case "tent_40x60": case "canopy": buildTent(g, it, scene); break;
    case "pergola": { // four posts on base plates, two beams, a row of slats
      const wd = material("wood", it.color, { size: 2 }), P = 0.14, bh = 0.2;
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => { const x = a * (W / 2 - P), z = b * (D / 2 - P); g.add(box(P, H - bh, P, wd, x, 0, z)); g.add(box(0.3, 0.02, 0.3, dark, x, 0, z)); });
      [-1, 1].forEach(b => g.add(box(W + 0.3, bh, 0.08, wd, 0, H - bh, b * (D / 2 - P))));
      const n = Math.max(4, Math.round(W / 0.3)); for (let k = 0; k < n; k++) g.add(box(0.05, 0.14, D + 0.3, wd, -W / 2 + (k + 0.5) * W / n, H - 0.14, 0)); break;
    }
    case "umbrella": { // a pole, ribs and an eight-sided canopy
      const pole = material("wood", "#8a6440", { size: 1 }), cloth = material("fabric", it.color || "#f4f1ea", { side: T.DoubleSide, size: 2 }), eave = C.eave * H / C.h, R = W / 2;
      g.add(cyl(0.025, 0.025, H - 0.05, pole, 0, 0, 0, 10)); g.add(cyl(0.25, 0.28, 0.08, dark, 0, 0, 0, 16));
      const top = mesh(new T.ConeGeometry(R, H - 0.08 - eave, 8, 1, true), cloth); top.position.y = eave + (H - 0.08 - eave) / 2; g.add(top);
      g.add(cyl(0.03, 0.01, 0.1, pole, 0, H - 0.1, 0, 8)); break;
    }
    case "generator": { // an enclosure on a two-wheel trailer, with vents and a tow bar
      const body = material("paint", it.color || "#e3e1d6", { size: 2 }), blk = material("metal", "#2b2c30"), L = W - 0.9, bx = 0.25;
      g.add(box(L + 0.1, 0.12, D - 0.2, blk, bx, 0.38, 0)); g.add(rbox(L, H - 0.55, D - 0.3, 0.05, body, bx, 0.5, 0));
      [-1, 1].forEach(sd => { for (let k = 0; k < 6; k++) g.add(box(L * 0.5, 0.03, 0.01, blk, bx + L * 0.12, 0.75 + k * 0.12, sd * ((D - 0.3) / 2 + 0.006))); const w = cyl(0.3, 0.3, 0.2, blk, 0, 0, 0, 16); w.rotation.x = Math.PI / 2; w.position.set(bx, 0.3, sd * (D / 2 - 0.1)); g.add(w); });
      g.add(stick(new T.Vector3(bx - L / 2, 0.44, 0), new T.Vector3(-W / 2 + 0.05, 0.44, 0), 0.04, blk, 6)); g.add(box(0.06, 0.44, 0.06, blk, -W / 2 + 0.35, 0, 0)); break;
    }
    case "restroom_trailer": { // a box trailer: two doors with steps, a roof edge, wheels
      const body = material("paint", it.color || "#f1efe8", { size: 3 }), trim = material("wood", "#6f4b30", { size: 1 }), blk = material("metal", "#2b2c30"), y0 = 0.55;
      g.add(box(W, H - y0 - 0.1, D, body, 0, y0, 0)); g.add(box(W + 0.06, 0.1, D + 0.06, trim, 0, H - 0.1, 0)); g.add(box(W + 0.02, 0.12, D + 0.02, trim, 0, y0, 0));
      [-1, 1].forEach(sd => { const x = sd * W / 4; g.add(box(0.8, 2.0, 0.04, trim, x, y0 + 0.1, D / 2 + 0.01)); g.add(box(1.1, 0.18, 0.6, blk, x, y0 - 0.2, D / 2 + 0.3)); g.add(box(1.1, 0.18, 0.3, blk, x, y0 - 0.4, D / 2 + 0.75)); g.add(box(0.35, 0.18, 0.02, flat("#1a2b4a"), x, y0 + 2.15, D / 2 + 0.02)); });
      [-1, 1].forEach(sd => { const w = cyl(0.32, 0.32, 0.22, blk, 0, 0, 0, 16); w.rotation.x = Math.PI / 2; w.position.set(0, 0.32, sd * (D / 2 - 0.15)); g.add(w); });
      g.add(box(W * 0.9, 0.08, D * 0.9, blk, 0, 0.42, 0)); break;
    }
    case "barricade": { // steel bike-rack barricade: a frame of tubes with upright bars, on two flat feet
      const st = material("metal", it.color || "#b9bcc2"), fh = 0.12;
      [fh, H].forEach(y => g.add(stick(new T.Vector3(-W / 2, y, 0), new T.Vector3(W / 2, y, 0), 0.019, st, 6)));
      [-1, 1].forEach(a => g.add(stick(new T.Vector3(a * W / 2, fh, 0), new T.Vector3(a * W / 2, H, 0), 0.019, st, 6)));
      const n = 12; for (let k = 1; k < n; k++) { const x = -W / 2 + k * W / n; g.add(stick(new T.Vector3(x, fh, 0), new T.Vector3(x, H, 0), 0.01, st, 5)); }
      [-1, 1].forEach(a => g.add(box(0.05, 0.03, D, st, a * (W / 2 - 0.15), 0, 0))); break;
    }
    case "building": { // the site's own building, plainly: walls, a flat roof with a parapet, rows of windows, glass front doors
      const wall = material("paint", it.color || "#d9d2c5", { size: Math.max(W, D) }), roof = material("concrete", "#8c8c88", { size: Math.max(W, D) }), glass = flat("#3d4d60", { roughness: 0.2, metalness: 0.4 }), cap = material("paint", "#b8b0a2", { size: 2 });
      g.add(box(W, H, D, wall)); g.add(box(W - 0.3, 0.02, D - 0.3, roof, 0, H, 0));
      [[W, 0.6, 0.15, 0, -D / 2 + 0.075], [W, 0.6, 0.15, 0, D / 2 - 0.075], [0.15, 0.6, D, -W / 2 + 0.075, 0], [0.15, 0.6, D, W / 2 - 0.075, 0]].forEach(([w, h, d, x, z]) => g.add(box(w, h, d, cap, x, H, z)));
      const floors = Math.max(1, Math.floor((H - 0.6) / 3.4));
      const row = (len, put) => { const n = Math.max(1, Math.floor(len / 3)); for (let k = 0; k < n; k++) for (let f = 0; f < floors; f++) put(-len / 2 + (k + 0.5) * len / n, 0.95 + f * 3.4); };
      row(W, (u, y) => { if (!(y < 2 && Math.abs(u) < 1.6)) g.add(box(1.4, 1.6, 0.05, glass, u, y, D / 2)); g.add(box(1.4, 1.6, 0.05, glass, u, y, -D / 2)); });
      row(D, (u, y) => { g.add(box(0.05, 1.6, 1.4, glass, W / 2, y, u)); g.add(box(0.05, 1.6, 1.4, glass, -W / 2, y, u)); });
      g.add(box(2.4, 2.4, 0.06, glass, 0, 0, D / 2 + 0.01)); g.add(box(3.4, 0.15, 1.4, cap, 0, 2.7, D / 2 + 0.7)); break;
    }
    default: g.add(box(W, H, D, main));
  }
  if (C.ceiling) g.traverse(o => { if (o.isMesh) o.castShadow = false; }); // hanging decor doesn't darken the whole floor
  if (!C.floor && !C.ceiling && !C.top && !C.over && W && D) g.add(contactShadow(W, D, /round|cocktail|cake/.test(it.kind) || it.kind.startsWith("balloon_column")));
  if (g.userData.blooms) { g.userData.blooms.forEach((l, k) => { const [sp, c] = k.split("|"); g.add(inst(bloomGeo(sp), petalMat(c), l)); }); delete g.userData.blooms; }
  mergeParts(g);
  g.position.set(it.x, it.y || 0, it.z); g.rotation.y = -(it.rot || 0) * Math.PI / 180;
  g.userData = { id: it.id, item: true };
  return g;
}
