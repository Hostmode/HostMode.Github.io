// Shapes for the Phase 5 library pieces (Nov 5, 2026). Called from buildItem's default case in decor.js, which passes its own helpers.
// Rules they follow (3d-realism skill): true size from W/D/H, rounded edges on what people touch, shared materials so mergeParts joins parts,
// detail drawn into textures not geometry. Contact shadows are added by buildItem afterwards.
import * as T from "./vendor/three-bundle.min.js";

const B = {}; // kind -> (it, g, h) where h = { box, rbox, cyl, ball, stick, flat, mesh, material }

const V = (x, y, z) => new T.Vector3(x, y, z);
const corners = (w, d) => [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => [a * w / 2, b * d / 2]);

// ---- Tables and seating ----
B.table_picnic = (it, g, h) => {
  const { W, D, H } = it, wd = h.material("wood", it.color, { size: 1.5 }), mt = h.material("metal", "#8c8f95");
  g.add(h.rbox(W, 0.04, 0.72, 0.01, wd, 0, H - 0.04, 0));
  [-1, 1].forEach(s => { g.add(h.rbox(W, 0.04, 0.28, 0.01, wd, 0, 0.43 - 0.04, s * 0.5)); });
  [-1, 1].forEach(a => {
    const x = a * (W / 2 - 0.25);
    [-1, 1].forEach(s => g.add(h.stick(V(x, 0, s * 0.62), V(x, H - 0.04, s * 0.12), 0.03, wd, 6)));
    g.add(h.box(0.05, 0.05, 1.3, wd, x, 0.36, 0)); g.add(h.box(0.05, 0.04, 0.72, wd, x, H - 0.08, 0));
  });
  g.add(h.box(W - 0.5, 0.03, 0.06, mt, 0, 0.2, 0));
};
B.table_kids = (it, g, h) => {
  const { W, D, H } = it, top = h.material("wood", it.color || "#e9c58a", { size: 1 }), mt = h.material("metal", it.color || "#4a6fa5");
  g.add(h.rbox(W, 0.04, D, 0.015, top, 0, H - 0.04, 0));
  corners(W - 0.2, D - 0.2).forEach(([x, z]) => g.add(h.rbox(0.05, H - 0.04, 0.05, 0.01, mt, x, 0, z)));
};
B.bar_stool = (it, g, h) => {
  const { W, H } = it, mt = h.material("metal", it.color || "#2e2e33"), seat = h.material("velvet", it.color || "#2e2e33", { size: 0.4 });
  g.add(h.cyl(W * 0.42, W * 0.42, 0.05, seat, 0, H - 0.05, 0, 28));
  corners(0.3, 0.3).forEach(([x, z]) => g.add(h.stick(V(x * 1.05, 0, z * 1.05), V(x * 0.55, H - 0.05, z * 0.55), 0.014, mt, 6)));
  const ring = h.cyl(0.17, 0.17, 0.015, mt, 0, 0.26, 0, 24); g.add(ring);
};
B.hay_bale = (it, g, h) => {
  const { W, D, H } = it, straw = h.material("mulch", it.color || "#d9b45a", { size: 0.8 }), twine = h.flat("#9a7b3f", { roughness: 1 });
  g.add(h.rbox(W, H, D, 0.05, straw, 0, 0, 0)); [-1, 1].forEach(s => g.add(h.rbox(0.012, H + 0.012, D + 0.012, 0.004, twine, s * W * 0.28, 0, 0)));
};
B.kids_chair = (it, g, h) => {
  const { W, D, H } = it, mt = h.material("metal", it.color || "#4a6fa5"), wd = h.material("wood", it.color || "#e9c58a", { size: 0.4 });
  g.add(h.rbox(W - 0.02, 0.03, D - 0.04, 0.01, wd, 0, 0.31, 0)); g.add(h.rbox(W - 0.02, 0.22, 0.025, 0.008, wd, 0, 0.36, -D / 2 + 0.03));
  corners(W - 0.06, D - 0.06).forEach(([x, z]) => g.add(h.cyl(0.012, 0.012, 0.31, mt, x, 0, z, 8)));
};
B.bleachers = (it, g, h) => {
  const { W, D, H } = it, al = h.material("metal", "#b9bcc2"), rows = 3, step = 0.5, rise = H / rows;
  for (let k = 0; k < rows; k++) {
    const y = rise * (k + 1) - 0.04, z = D / 2 - 0.3 - k * step;
    g.add(h.box(W, 0.04, 0.26, al, 0, y, z)); g.add(h.box(W, rise - 0.05, 0.03, al, 0, rise * k + 0.02, z - 0.12));
  }
  [-1, 1].forEach(a => {
    const x = a * (W / 2 - 0.03);
    for (let k = 0; k < rows; k++) { const z = D / 2 - 0.3 - k * step; g.add(h.box(0.04, rise * (k + 1) - 0.04, 0.05, al, x, 0, z)); }
    g.add(h.stick(V(x, 0.02, D / 2 - 0.15), V(x, H, -D / 2 + 0.3 + 0.3), 0.02, al, 6));
  });
  g.add(h.box(W, 0.04, 0.2, al, 0, 0.14, D / 2 - 0.05));
};

// ---- Food and play ----
B.bar_cart = (it, g, h) => {
  const { W, D, H } = it, wd = h.material("wood", it.color || "#6b4a2f", { size: 1 }), br = h.material("gold"), glass = h.material("glass");
  g.add(h.rbox(W, 0.04, D, 0.01, wd, 0, 0.88, 0)); g.add(h.rbox(W - 0.1, 0.03, D - 0.1, 0.01, wd, 0, 0.3, 0));
  corners(W - 0.08, D - 0.08).forEach(([x, z]) => g.add(h.cyl(0.015, 0.015, 0.88, br, x, 0, z, 8)));
  [-1, 1].forEach(s => g.add(h.box(W + 0.02, 0.03, 0.02, br, 0, 0.96 + 0.01, s * (D / 2 - 0.04)))); g.add(h.box(0.02, 0.1, D - 0.08, br, -W / 2 - 0.06, 0.9, 0));
  [-1, 1].forEach(s => { const w = h.cyl(0.08, 0.08, 0.03, h.flat("#2b2c30"), 0, 0, 0, 20); w.rotation.x = Math.PI / 2; w.position.set(s * (W / 2 - 0.15), 0.08, D / 2 - 0.02); g.add(w); const w2 = w.clone(); w2.position.z = -D / 2 + 0.02; g.add(w2); });
  for (let k = 0; k < 5; k++) g.add(h.cyl(0.035, 0.04, 0.26, k % 2 ? glass : h.flat(["#2d5a3d", "#7a3a2a", "#c9a24a"][k % 3], { roughness: 0.2 }), -W / 2 + 0.2 + k * 0.17, 0.92, 0.06, 12));
};
B.food_truck = (it, g, h) => {
  const { W, D, H } = it, body = h.material("paint", it.color || "#e8e3d6", { size: 3 }), blk = h.material("metal", "#2b2c30"), glass = h.flat("#3d4d60", { roughness: 0.15, metalness: 0.4 }), awn = h.material("fabric", "#b23a3a", { size: 0.6 });
  const cabW = 1.5, bodyL = W - cabW;
  g.add(h.rbox(bodyL, 2.2, D, 0.06, body, -cabW / 2, 0.75, 0));
  g.add(h.rbox(cabW, 1.4, D - 0.1, 0.08, body, bodyL / 2, 0.75, 0)); g.add(h.box(cabW * 0.5, 0.5, D - 0.2, glass, bodyL / 2 + cabW * 0.18, 1.5, 0));
  g.add(h.box(W - 0.2, 0.18, D - 0.15, blk, 0, 0.45, 0));
  [-1.7, 1.9].forEach(x => [-1, 1].forEach(s => { const w = h.cyl(0.45, 0.45, 0.28, blk, 0, 0, 0, 20); w.rotation.x = Math.PI / 2; w.position.set(x, 0.45, s * (D / 2 - 0.08)); g.add(w); }));
  g.add(h.box(2.4, 0.9, 0.03, glass, -cabW / 2, 1.55, D / 2 + 0.005)); g.add(h.box(2.5, 0.05, 0.4, blk, -cabW / 2, 1.5, D / 2 + 0.2));
  const aw = h.box(2.6, 0.03, 0.6, awn, -cabW / 2, 2.55, D / 2 + 0.3); aw.rotation.x = 0.35; g.add(aw);
  g.add(h.box(0.9, 0.14, 0.6, blk, -bodyL / 2 + 0.7, 2.95, 0)); g.add(h.box(2.0, 0.28, 0.04, h.flat("#f4efe3"), -cabW / 2, 2.8, D / 2 + 0.01));
};
B.concession_cart = (it, g, h) => {
  const { W, D, H } = it, body = h.material("paint", it.color || "#c0392b", { size: 1 }), glass = h.material("glass"), mt = h.material("metal", "#b9bcc2"), awn = h.material("fabric", "#f4f1ea", { size: 0.3 });
  g.add(h.rbox(W, 0.7, D, 0.03, body, 0, 0.4, 0)); g.add(h.box(W - 0.06, 0.45, D - 0.06, glass, 0, 0.92 + 0.0, 0)); g.add(h.box(W + 0.04, 0.05, D + 0.04, mt, 0, 0.88, 0));
  const roof = h.rbox(W + 0.1, 0.05, D + 0.1, 0.02, awn, 0, H - 0.05, 0); g.add(roof);
  corners(W - 0.04, D - 0.04).forEach(([x, z]) => g.add(h.cyl(0.01, 0.01, 0.45, mt, x, 0.92, z, 6)));
  [-1, 1].forEach(s => { const w = h.cyl(0.26, 0.26, 0.05, h.flat("#2b2c30"), 0, 0, 0, 24); w.rotation.x = Math.PI / 2; w.position.set(0, 0.26, s * (D / 2 + 0.02)); g.add(w); });
  g.add(h.stick(V(W / 2, 0.8, 0), V(W / 2 + 0.35, 1.0, 0), 0.015, mt, 6));
};
B.grazing_table = (it, g, h) => {
  const { W, D, H } = it, lin = h.material("fabric", it.color || "#f7f5f0", { size: 1 }), wd = h.material("wood", "#8a5a35", { size: 1 });
  g.add(h.rbox(W + 0.03, H - 0.02, D + 0.03, 0.01, lin, 0, 0, 0)); g.add(h.box(W - 0.2, 0.012, D - 0.1, wd, 0, H, 0));
  const palette = ["#e8b84a", "#c0392b", "#6b8e4e", "#d9a066", "#7a3a5a", "#f1e3b0"], mats = palette.map(c => h.flat(c, { roughness: 0.6 }));
  let n = 0; for (let x = -W / 2 + 0.2; x < W / 2 - 0.15; x += 0.11) for (const z of [-0.2, -0.05, 0.1, 0.24]) {
    const k = n++ % 6, j = ((x * 37 + z * 11) * 100 | 0) % 3;
    g.add(j ? h.cyl(0.035, 0.035, 0.03 + (k % 3) * 0.015, mats[k], x + (k % 3) * 0.01, H + 0.012, z, 10) : h.box(0.08, 0.04, 0.07, mats[k], x, H + 0.012, z));
  }
  for (let x = -W / 2 + 0.4; x < W / 2 - 0.3; x += 0.7) g.add(h.box(0.14, 0.1, 0.14, wd, x, H + 0.012, -D / 2 + 0.1));
};
B.bounce_house = (it, g, h) => {
  const { W, D, H } = it, shell = h.material("fabric", it.color || "#e86a8a", { size: 1.2, side: T.DoubleSide }), cream = h.material("fabric", "#f4efe3", { size: 1 });
  g.add(h.rbox(W, 0.3, D, 0.12, shell, 0, 0, 0));
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => { const x = a * (W / 2 - 0.2), z = b * (D / 2 - 0.2); g.add(h.cyl(0.2, 0.22, 2.3, shell, x, 0.3, z, 16)); g.add(h.cyl(0.0, 0.34, 0.7, cream, x, 2.55, z, 16)); g.add(h.ball(0.06, shell, x, 3.27, z, 10)); });
  [[W - 0.4, 0, -D / 2 + 0.2], [0.4, -W / 2 + 0.2, 0], [0.4, W / 2 - 0.2, 0]].forEach(([w, x, z], i) => { if (i === 0) g.add(h.rbox(W - 0.4, 1.9, 0.4, 0.15, cream, 0, 0.3, z)); else g.add(h.rbox(0.4, 1.3, D - 0.4, 0.15, cream, x, 0.3, 0)); });
  g.add(h.rbox(W * 0.7, 0.6, 0.45, 0.1, shell, 0, 0.3, D / 2 - 0.2)); g.add(h.rbox(0.8, 0.45, 0.6, 0.06, h.flat("#2b2c30"), W / 2 - 0.5, 0, -D / 2 - 0.3));
};

// ---- Lighting, audio, stage ----
B.neon_sign = (it, g, h) => {
  const { W, D, H } = it, glow = h.flat(it.color || "#ff4fa0", { emissive: new T.Color(it.color || "#ff4fa0"), emissiveIntensity: 2.5, roughness: 0.4 }), mt = h.material("metal", "#b9bcc2");
  g.add(h.box(W, H, 0.01, h.material("acrylic"), 0, 0, -0.01));
  const pts = []; for (let k = 0; k <= 40; k++) { const t = k / 40 * Math.PI * 2; pts.push(V((Math.sin(t) * 0.42 + Math.sin(t * 2) * 0.04) * W * 0.9, H / 2 + Math.sin(t * 2) * H * 0.3, 0.012)); }
  g.add(h.mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts, true), 120, 0.008, 8, true), glow));
  corners(W - 0.05, H - 0.05).forEach(([x, z]) => { const s = h.cyl(0.01, 0.01, 0.025, mt, 0, 0, 0, 8); s.rotation.x = Math.PI / 2; s.position.set(x, H / 2 + z, 0.003); g.add(s); });
};
B.light_tower = (it, g, h) => {
  const { W, H } = it, mt = h.material("metal", "#3b3b40"), glow = h.flat("#fff6d8", { emissive: new T.Color("#fff1c8"), emissiveIntensity: 1.8, roughness: 0.5, transparent: true, opacity: 0.9 });
  [0, 120, 240].forEach(d => { const a = d * Math.PI / 180; g.add(h.stick(V(Math.cos(a) * W * 0.48, 0.02, Math.sin(a) * W * 0.48), V(0, 1.3, 0), 0.02, mt, 6)); });
  g.add(h.cyl(0.03, 0.03, H - 1.3 - 0.35, mt, 0, 1.3, 0, 10)); g.add(h.ball(0.35, glow, 0, H - 0.35, 0, 24)); g.add(h.cyl(0.08, 0.08, 0.06, mt, 0, H - 0.72, 0, 12));
};
B.path_lights = (it, g, h) => {
  const { W, H } = it, mt = h.material("metal", "#2e2e33"), glow = h.flat("#ffe6a8", { emissive: new T.Color("#ffd98a"), emissiveIntensity: 1.6, roughness: 0.5 });
  for (let k = 0; k < 6; k++) { const x = -W / 2 + 0.2 + k * (W - 0.4) / 5; g.add(h.cyl(0.0, 0.015, 0.12, mt, x, 0, 0, 6)); g.add(h.cyl(0.012, 0.012, H - 0.32, mt, x, 0.1, 0, 8)); g.add(h.cyl(0.055, 0.06, 0.2, glow, x, H - 0.2, 0, 12)); g.add(h.cyl(0.0, 0.075, 0.05, mt, x, H - 0.15, 0, 12)); }
};
B.tiki_torch = (it, g, h) => {
  const { W, H } = it, pole = h.material("wood", "#6b4a2f", { size: 0.5 }), mt = h.material("metal", "#3b3b40"), flame = h.flat("#ffb347", { emissive: new T.Color("#ff9a2e"), emissiveIntensity: 3, roughness: 1 });
  g.add(h.cyl(0.0, W * 0.5, 0.1, mt, 0, 0, 0, 8)); g.add(h.cyl(W * 0.45, W * 0.5, H - 0.3, pole, 0, 0.08, 0, 10)); for (let k = 0; k < 4; k++) g.add(h.cyl(W * 0.52, W * 0.52, 0.015, mt, 0, 0.3 + k * 0.28, 0, 10));
  g.add(h.cyl(0.05, 0.04, 0.12, mt, 0, H - 0.22, 0, 12)); g.add(h.cyl(0.0, 0.035, 0.12, flame, 0, H - 0.1, 0, 8));
};
B.tv_monitor = (it, g, h) => {
  const { W, D, H } = it, blk = h.material("metal", "#1d1d21"), screen = h.flat("#0b0e14", { roughness: 0.08, metalness: 0.6 });
  g.add(h.rbox(W, 0.72, 0.04, 0.012, blk, 0, 1.05, 0)); g.add(h.box(W - 0.05, 0.67, 0.005, screen, 0, 1.075, 0.022));
  g.add(h.cyl(0.025, 0.025, 1.05, blk, 0, 0.03, -0.04, 10)); g.add(h.box(0.6, 0.04, 0.06, blk, 0, 0, -0.04)); g.add(h.box(0.06, 0.03, D - 0.1, blk, 0, 0, 0));
};
B.foh_mixer = (it, g, h) => {
  const { W, D, H } = it, blk = h.material("fabric", "#18181c", { size: 1 }), mt = h.material("metal", "#2b2c30"), pale = h.flat("#9aa0a8", { roughness: 0.4 });
  g.add(h.box(W, 0.04, D, blk, 0, 0.78, 0)); corners(W - 0.1, D - 0.1).forEach(([x, z]) => g.add(h.box(0.04, 0.78, 0.04, mt, x, 0, z)));
  g.add(h.box(W, 0.55, 0.01, blk, 0, 0.22, D / 2 + 0.002));
  const top = 0.82; g.add(h.rbox(0.6, 0.06, 0.4, 0.01, mt, -0.55, top, 0)); for (let k = 0; k < 10; k++) g.add(h.box(0.012, 0.012, 0.18, pale, -0.8 + k * 0.05, top + 0.06, 0.04));
  [0.3, 0.62].forEach(x => { g.add(h.cyl(0.11, 0.11, 0.025, mt, x, top, -0.02, 24)); g.add(h.cyl(0.095, 0.095, 0.004, pale, x, top + 0.025, -0.02, 24)); });
  g.add(h.rbox(0.34, 0.015, 0.24, 0.006, mt, 0.05, top, 0.12)); const lid = h.rbox(0.34, 0.012, 0.22, 0.006, mt, 0, 0, 0); lid.position.set(0.05, top + 0.13, -0.0); lid.rotation.x = -1.2; g.add(lid);
};
B.line_array = (it, g, h) => {
  const { W, H } = it, mt = h.material("metal", "#2b2c30"), blk = h.material("paint", "#16161a", { size: 1 });
  [0, 120, 240].forEach(d => { const a = d * Math.PI / 180; g.add(h.stick(V(Math.cos(a) * W * 0.48, 0.02, Math.sin(a) * W * 0.48), V(0, 1.45, 0), 0.015, mt, 6)); });
  g.add(h.cyl(0.025, 0.025, 0.2, mt, 0, 1.45, 0, 8));
  const cab = h.rbox(0.36, 0.6, 0.35, 0.02, blk, 0, 0, 0); cab.position.set(0, H - 0.68, 0); cab.rotation.x = 0.1; g.add(cab);
  g.add(h.box(0.32, 0.54, 0.01, mt, 0, H - 0.65, 0.18));
};
// Line array flown from truss: two box-truss towers, a top beam, and a hang of cabinets curving down on each side (sizes are ESTIMATES, see estimated_sizes_p6).
B.flown_line_array = (it, g, h) => {
  const { W, D, H } = it, mt = h.material("metal", "#b9bcc2"), blk = h.material("paint", "#16161a", { size: 1 }), grille = h.flat("#0d0d10", { roughness: 0.6 }), TR = 0.15;
  const run = (a, b) => { // a box truss between two points: four chords and a zig-zag on the two long faces
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([x, z]) => g.add(h.stick(V(a.x + x * TR, a.y, a.z + z * TR), V(b.x + x * TR, b.y, b.z + z * TR), 0.018, mt, 5)));
    const len = a.distanceTo(b), n = Math.max(2, Math.round(len / 0.3));
    for (let k = 0; k < n; k++) [-1, 1].forEach(z => { const t0 = k / n, t1 = (k + 1) / n, up = k % 2 ? 1 : -1;
      const P = (t, y) => V(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t + y * TR, a.z + z * TR);
      g.add(h.stick(P(t0, up), P(t1, -up), 0.008, mt, 4)); });
  };
  const half = W / 2 - 0.4;
  [-1, 1].forEach(s => { run(V(s * half, 0.1, 0), V(s * half, H - 0.15, 0)); g.add(h.box(0.7, 0.05, 0.7, mt, s * half - 0.35, 0, -0.35)); });
  run(V(-half, H - 0.15, 0), V(half, H - 0.15, 0));
  [-1, 1].forEach(s => { const x = s * (half - 0.9), top = H - 0.2;
    g.add(h.box(0.04, 0.04, 0.5, mt, x, top - 0.04, 0));
    for (let k = 0; k < 8; k++) { // each cabinet leans a little more than the one above it
      const c = h.rbox(0.55, 0.25, 0.45, 0.015, blk, 0, 0, 0); c.position.set(x, top - 0.3 - k * 0.27, 0.02 * k); c.rotation.x = 0.02 + k * 0.025; g.add(c);
      const f = h.box(0.5, 0.2, 0.01, grille, 0, 0, 0); f.position.set(x, top - 0.28 - k * 0.27, 0.23 + 0.02 * k + k * 0.006); f.rotation.x = 0.02 + k * 0.025; g.add(f); } });
};
B.runway = (it, g, h) => {
  const { W, D, H } = it, deck = h.material("carpet_plain", it.color || "#ece8e2", { size: 2 }), skirt = h.material("fabric", "#18181c", { size: 1 }), mt = h.material("metal", "#b9bcc2");
  g.add(h.box(W - 0.04, H - 0.05, D - 0.04, skirt, 0, 0, 0)); g.add(h.box(W, 0.05, D, deck, 0, H - 0.05, 0));
  [-1, 1].forEach(s => g.add(h.box(0.025, 0.02, D, mt, s * (W / 2 - 0.0125), H - 0.02, 0)));
  for (let z = -D / 2 + 2.44; z < D / 2 - 0.1; z += 2.44) g.add(h.box(W, 0.002, 0.01, h.flat("#8a8780"), 0, H, z));
  for (let k = 0; k < 2; k++) g.add(h.box(W * 0.8, 0.2 + k * 0.2, 0.3, deck, 0, 0, D / 2 + 0.15 + (1 - k) * 0.3));
};
B.riser = (it, g, h) => {
  const { W, D, H } = it, deck = h.material("carpet_plain", it.color || "#2e2e33", { size: 2 }), mt = h.material("metal", "#8c8f95");
  g.add(h.box(W, 0.05, D, deck, 0, H - 0.05, 0)); corners(W - 0.12, D - 0.12).forEach(([x, z]) => g.add(h.box(0.06, H - 0.05, 0.06, mt, x, 0, z)));
  g.add(h.box(W - 0.2, 0.04, 0.03, mt, 0, 0.3, D / 2 - 0.06)); g.add(h.box(W - 0.2, 0.04, 0.03, mt, 0, 0.3, -D / 2 + 0.06));
  [-1, 1].forEach(s => g.add(h.box(0.025, 0.025, D, mt, s * (W / 2 - 0.012), H - 0.025, 0)));
  g.add(h.box(0.9, 0.2, 0.3, deck, 0, 0, D / 2 + 0.3)); g.add(h.box(0.9, 0.4, 0.3, deck, 0, 0, D / 2 + 0.0));
};
B.tent_flooring = (it, g, h) => {
  const { W, D, H } = it, panel = h.material(it.mat || "parquet", it.color, { size: 0.91 }), seam = h.flat("#2b2c30");
  const n = Math.max(1, Math.round(W / 0.91)), m = Math.max(1, Math.round(D / 0.91)), pw = W / n, pd = D / m;
  for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) g.add(h.box(pw - 0.008, H, pd - 0.008, panel, -W / 2 + (i + 0.5) * pw, 0, -D / 2 + (j + 0.5) * pd));
  g.add(h.box(W, H * 0.5, D, seam, 0, 0, 0));
};

// ---- Corporate ----
B.trade_show_booth = (it, g, h) => {
  const { W, D, H } = it, wall = h.material("fabric", it.color || "#f4f1ea", { size: 1.5 }), mt = h.material("metal", "#b9bcc2"), top = h.flat("#ffffff", { roughness: 0.3 }), drape = h.material("fabric", "#2e3a52", { size: 1 });
  g.add(h.box(W, H, 0.05, wall, 0, 0, -D / 2 + 0.03)); [-1, 1].forEach(s => { g.add(h.box(W * 0.2, H, 0.06, mt, s * (W / 2 - 0.1), 0, -D / 2 + 0.03)); g.add(h.box(0.05, H, 0.05, mt, s * (W / 2), 0, -D / 2 + 0.03)); });
  g.add(h.box(0.03, 0.9, 0.03, mt, -W / 2, 0, D / 2 - 0.1)); g.add(h.box(0.03, 0.9, 0.03, mt, W / 2, 0, D / 2 - 0.1)); [-1, 1].forEach(s => g.add(h.box(0.03, 0.9, D - 0.1, drape, s * (W / 2 - 0.015), 0, 0)));
  g.add(h.rbox(1.22, 0.9, 0.5, 0.02, h.material("paint", "#2e3a52", { size: 1 }), 0, 0, 0.45)); g.add(h.rbox(1.26, 0.04, 0.54, 0.015, top, 0, 0.9, 0.45));
  g.add(h.box(W * 0.6, 0.3, 0.08, h.flat("#1f2b44"), 0, H, -D / 2 + 0.03));
};
B.pop_up_banner = (it, g, h) => {
  const { W, D, H } = it, panel = h.material("fabric", it.color || "#f4f1ea", { size: 0.8 }), mt = h.material("metal", "#8c8f95");
  g.add(h.rbox(W, 0.1, D, 0.04, mt, 0, 0, 0)); g.add(h.box(W - 0.02, H - 0.15, 0.01, panel, 0, 0.1, -0.02)); g.add(h.cyl(0.012, 0.012, H - 0.1, mt, 0, 0.1, -0.06, 8)); g.add(h.box(0.04, 0.02, 0.03, mt, 0, H - 0.03, -0.02));
};
B.registration_desk = (it, g, h) => {
  const { W, D, H } = it, front = h.material("paint", it.color || "#2e3a52", { size: 1 }), top = h.flat("#f4f1ea", { roughness: 0.35 }), mt = h.material("metal", "#8c8f95");
  g.add(h.rbox(W, H - 0.04, D, 0.02, front, 0, 0, 0)); g.add(h.rbox(W + 0.06, 0.04, D + 0.06, 0.015, top, 0, H - 0.04, 0.03)); g.add(h.box(0.4, 0.2, 0.012, h.flat("#c9a24a"), -W / 4, 0.45, D / 2 + 0.002));
  g.add(h.rbox(0.34, 0.018, 0.24, 0.006, mt, -0.3, H, 0.0)); const lid = h.rbox(0.34, 0.012, 0.22, 0.006, mt, 0, 0, 0); lid.position.set(-0.3, H + 0.12, -0.1); lid.rotation.x = -1.35; g.add(lid); g.add(h.rbox(0.25, 0.04, 0.18, 0.01, h.flat("#2b2c30"), 0.3, H, 0.03));
};

// ---- Outdoor and site ----
B.gazebo = (it, g, h) => {
  const { W, D, H } = it, mt = h.material("metal", "#f0efe9"), cloth = h.material("fabric", it.color || "#f4f1ea", { side: T.DoubleSide, size: 1.5 }), eave = 2.0;
  corners(W - 0.1, D - 0.1).forEach(([x, z]) => { g.add(h.box(0.08, eave, 0.08, mt, x, 0, z)); g.add(h.box(0.2, 0.02, 0.2, mt, x, 0, z)); });
  const roof = h.mesh(new T.ConeGeometry(W * 0.74, H - eave, 4, 1, true), cloth); roof.rotation.y = Math.PI / 4; roof.position.y = eave + (H - eave) / 2; g.add(roof);
  g.add(h.box(W + 0.1, 0.06, 0.04, mt, 0, eave - 0.06, D / 2 - 0.05)); g.add(h.box(W + 0.1, 0.06, 0.04, mt, 0, eave - 0.06, -D / 2 + 0.05)); g.add(h.box(0.04, 0.06, D + 0.1, mt, W / 2 - 0.05, eave - 0.06, 0)); g.add(h.box(0.04, 0.06, D + 0.1, mt, -W / 2 + 0.05, eave - 0.06, 0));
  g.add(h.cyl(0.0, 0.04, 0.2, mt, 0, H - 0.04, 0, 8));
};
B.shade_sail = (it, g, h) => {
  const { W, D, H } = it, mt = h.material("metal", "#8c8f95"), cloth = h.material("fabric", it.color || "#d9cdb8", { side: T.DoubleSide, size: 1.5 });
  const a = V(-W / 2, 3.0, -D / 2 + D * 0.15), b = V(W / 2, 2.7, -D / 2 + D * 0.15), c = V(0, 2.4, D / 2 - D * 0.1);
  const geo = new T.BufferGeometry().setFromPoints([a, b, c]); geo.setAttribute("uv", new T.Float32BufferAttribute([0, 0, 1, 0, 0.5, 1], 2)); geo.computeVertexNormals(); g.add(h.mesh(geo, cloth));
  [a, b, c].forEach(p => g.add(h.cyl(0.05, 0.06, p.y, mt, p.x, 0, p.z, 10)));
};
B.bell_tent = (it, g, h) => {
  const { W, D, H } = it, cloth = h.material("fabric", it.color || "#efe6d2", { side: T.DoubleSide, size: 1.5 }), wd = h.material("wood", "#8a6440", { size: 0.6 });
  g.add(h.cyl(W / 2, W / 2, 1.0, cloth, 0, 0, 0, 40, true)); const cone = h.mesh(new T.ConeGeometry(W / 2, H - 1.0, 40, 1, true), cloth); cone.position.y = 1.0 + (H - 1.0) / 2; g.add(cone);
  g.add(h.cyl(0.03, 0.03, 0.5, wd, 0, H - 0.1, 0, 8)); g.add(h.box(1.1, 1.75, 0.04, h.flat("#2b2c30"), 0, 0, W / 2 - 0.02));
  g.add(h.cyl(W / 2 + 0.01, W / 2 + 0.01, 0.04, h.flat("#8a7a5a"), 0, 0, 0, 40, true));
};
B.patio_heater = (it, g, h) => {
  const { W, H } = it, mt = h.material("metal", it.color || "#b9bcc2"), blk = h.material("metal", "#2b2c30");
  g.add(h.cyl(0.24, 0.26, 0.04, blk, 0, 0, 0, 24)); g.add(h.rbox(0.45, 0.62, 0.45, 0.04, blk, 0, 0.04, 0)); g.add(h.cyl(0.03, 0.03, H - 0.66 - 0.2, mt, 0, 0.66, 0, 10));
  g.add(h.cyl(0.02, W / 2, 0.22, mt, 0, H - 0.22, 0, 28)); g.add(h.cyl(0.05, 0.05, 0.04, h.flat("#ffb347", { emissive: new T.Color("#ff7a1a"), emissiveIntensity: 1.2 }), 0, H - 0.24, 0, 10));
};
B.handwash_station = (it, g, h) => {
  const { W, D, H } = it, body = h.material("paint", it.color || "#d9d6cc", { size: 1 }), mt = h.material("metal", "#b9bcc2"), blk = h.material("metal", "#2b2c30");
  g.add(h.rbox(W, 0.88, D, 0.03, body, 0, 0.1, 0)); g.add(h.rbox(W, 0.65, D * 0.5, 0.03, body, 0, 0.98, -D * 0.25));
  [-1, 1].forEach(s => { g.add(h.box(0.26, 0.04, 0.3, mt, s * 0.16, 0.98, 0.12)); g.add(h.cyl(0.012, 0.012, 0.16, mt, s * 0.16, 0.98, -0.02, 8)); g.add(h.rbox(0.1, 0.12, 0.05, 0.015, blk, s * 0.16, 1.28, -0.03)); });
  g.add(h.box(0.22, 0.1, 0.18, blk, 0, 0, D / 2 - 0.1)); g.add(h.rbox(W - 0.1, 0.1, D - 0.1, 0.02, blk, 0, 0.02, 0));
};
B.cable_ramp = (it, g, h) => {
  const { W, D, H } = it, blk = h.material("paint", "#1d1d21", { size: 0.5 }), lid = h.material("paint", it.color || "#f1c232", { size: 0.5 });
  g.add(h.box(W, H * 0.45, D * 0.5, blk, 0, 0, 0)); [-1, 1].forEach(s => { const w = h.box(W, H * 0.55, D * 0.25, blk, 0, 0, s * D * 0.375); w.rotation.x = -s * 0.2; g.add(w); });
  g.add(h.box(W * 0.98, 0.01, D * 0.4, lid, 0, H - 0.01, 0));
};

// ---- Phase 6 pieces (Nov 5, 2026). Sizes: see 3d/library/research/*_p6.json; most are estimates and say so there. ----
B.champagne_tower = (it, g, h) => {
  const { W, H } = it, glass = h.material("glass", "#eaf3f6"), cloth = h.material("fabric", it.color || "#f4f1ea", { size: 1 }), gold = h.material("gold");
  g.add(h.cyl(0.42, 0.42, 0.76, cloth, 0, 0, 0, 32)); g.add(h.cyl(0.45, 0.45, 0.02, gold, 0, 0.76, 0, 32));
  const tiers = [[0.36, 12], [0.27, 9], [0.18, 6], [0.09, 3], [0, 1]];
  tiers.forEach(([r, n], k) => {
    const y = 0.78 + k * 0.17;
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, rr = n === 1 ? 0 : r; g.add(h.cyl(0.045, 0.012, 0.11, glass, Math.cos(a) * rr, y, Math.sin(a) * rr, 10, false)); }
  });
};
B.coffee_station = (it, g, h) => {
  const { W, D, H } = it, cloth = h.material("fabric", it.color || "#f4f1ea", { size: 1 }), steel = h.material("metal", "#c9ccd1"), blk = h.material("metal", "#2b2c30"), paper = h.flat("#f7f5ef");
  g.add(h.rbox(W, 0.04, D, 0.01, cloth, 0, 0.72, 0)); g.add(h.box(W - 0.04, 0.72, D - 0.04, cloth, 0, 0, 0));
  [-1, 1].forEach(s => { const x = s * 0.35; g.add(h.cyl(0.205, 0.205, 0.66, steel, x, 0.76, -0.1, 28)); g.add(h.cyl(0.215, 0.215, 0.03, blk, x, 1.39, -0.1, 28)); g.add(h.box(0.05, 0.04, 0.06, blk, x, 0.9, 0.12)); });
  for (let i = 0; i < 3; i++) g.add(h.cyl(0.04, 0.032, 0.1, paper, 0.1 + i * 0.1, 0.76, 0.22, 12));
  g.add(h.box(0.3, 0.02, 0.2, blk, -0.6, 0.76, 0.2));
};
B.water_station = (it, g, h) => {
  const { W, D, H } = it, body = h.material("paint", it.color || "#f1f2f4", { size: 1 }), blk = h.material("metal", "#2b2c30");
  g.add(h.rbox(W, H, D, 0.025, body, 0, 0, 0)); g.add(h.rbox(W - 0.04, 0.4, 0.02, 0.01, blk, 0, 0.72, D / 2 - 0.005));
  g.add(h.box(0.045, 0.045, 0.05, h.flat("#3b7dd8"), -0.05, 0.95, D / 2)); g.add(h.box(0.045, 0.045, 0.05, h.flat("#d83b3b"), 0.05, 0.95, D / 2));
  g.add(h.box(W - 0.06, 0.02, 0.1, blk, 0, 0.82, D / 2 + 0.03));
};
B.cornhole = (it, g, h) => {
  const { W, D, H } = it, wd = h.material("wood", "#b98a5a", { size: 0.6 }), paint = h.material("paint", it.color || "#2f5d8a", { size: 0.6 }), hole = h.flat("#0d0d10"), lo = 0.08;
  const deck = new T.Group(); deck.position.set(0, (H + lo) / 2, 0); deck.rotation.x = Math.asin((H - lo) / D);
  deck.add(h.rbox(W, 0.025, D, 0.006, paint, 0, -0.0125, 0)); deck.add(h.cyl(0.076, 0.076, 0.004, hole, 0, 0.0005, -D / 2 + 0.23, 24));
  deck.add(h.box(W, 0.03, 0.03, wd, 0, -0.04, D / 2 - 0.02)); deck.add(h.box(W, 0.03, 0.03, wd, 0, -0.04, -D / 2 + 0.02));
  g.add(deck);
  [-1, 1].forEach(s => { g.add(h.box(0.04, H - 0.03, 0.04, wd, s * (W / 2 - 0.1), 0, -D / 2 + 0.05)); g.add(h.box(0.04, lo - 0.02, 0.04, wd, s * (W / 2 - 0.1), 0, D / 2 - 0.05)); });
};
B.fire_pit = (it, g, h) => {
  const { W, H } = it, steel = h.material("metal", "#3a3a3f"), ember = h.flat("#ff7a1a", { emissive: new T.Color("#ff5a0a"), emissiveIntensity: 1.1 }), log = h.material("wood", "#4b3220", { size: 0.4 });
  g.add(h.cyl(W / 2, W * 0.36, H * 0.6, steel, 0, H * 0.4, 0, 32, false)); g.add(h.cyl(W * 0.47, W * 0.47, 0.01, ember, 0, H * 0.98, 0, 32));
  [0, 1, 2].forEach(i => g.add(h.stick(V(Math.cos(i * 2.1) * 0.25, H, Math.sin(i * 2.1) * 0.25), V(-Math.cos(i * 2.1) * 0.25, H + 0.05, -Math.sin(i * 2.1) * 0.25), 0.04, log, 7)));
  [0, 1, 2, 3].forEach(i => { const a = i * Math.PI / 2 + Math.PI / 4; g.add(h.stick(V(Math.cos(a) * W * 0.3, 0, Math.sin(a) * W * 0.3), V(Math.cos(a) * W * 0.33, H * 0.45, Math.sin(a) * W * 0.33), 0.018, steel, 6)); });
};
B.confetti_cannon = (it, g, h) => {
  const { H } = it, tube = h.material("paint", it.color || "#c0392b", { size: 0.3 }), steel = h.material("metal", "#8c8f95");
  g.add(h.cyl(0.04, 0.04, H * 0.7, tube, 0, H * 0.3, 0, 16)); g.add(h.cyl(0.045, 0.045, 0.02, steel, 0, H - 0.02, 0, 16));
  [0, 1, 2].forEach(i => { const a = i * 2.094; g.add(h.stick(V(0, H * 0.35, 0), V(Math.cos(a) * 0.1, 0, Math.sin(a) * 0.1), 0.008, steel, 6)); });
};
B.bubble_machine = (it, g, h) => {
  const { W, D, H } = it, body = h.material("metal", "#2b2c30"), mt = h.material("metal", "#b9bcc2");
  g.add(h.rbox(W, H * 0.62, D, 0.03, body, 0, 0, 0)); g.add(h.cyl(0.11, 0.11, 0.015, mt, 0, H * 0.62, 0, 20)); g.add(h.cyl(0.11, 0.11, 0.02, h.flat("#cfe6f2", { transparent: true, opacity: 0.45 }), 0, H * 0.62 + 0.04, 0, 20));
  g.add(h.box(W * 0.8, 0.012, 0.02, mt, 0, H * 0.62 + 0.15, D / 4)); g.add(h.cyl(0.14, 0.14, 0.02, mt, 0, H * 0.62 + 0.15, D / 4 + 0.01, 20));
};
B.easel_sign = (it, g, h) => {
  const { W, D, H } = it, wd = h.material("wood", "#b98a5a", { size: 0.5 }), board = h.material("paint", it.color || "#f4f1ea", { size: 0.5 });
  [-1, 1].forEach(s => g.add(h.stick(V(s * W * 0.45, 0, D * 0.3), V(s * W * 0.1, H * 0.95, 0), 0.016, wd, 6)));
  g.add(h.stick(V(0, 0, -D * 0.45), V(0, H * 0.85, -0.03), 0.016, wd, 6));
  const b = h.rbox(0.56, 0.76, 0.02, 0.006, board, 0, 0.62, 0.03); b.rotation.x = -0.12; g.add(b); g.add(h.box(0.6, 0.03, 0.06, wd, 0, 0.58, 0.07));
};
B.card_box = (it, g, h) => {
  const { W, D, H } = it, wd = h.material("wood", it.color || "#c9a27a", { size: 0.4 }), gold = h.material("gold");
  g.add(h.rbox(W, H, D, 0.015, wd, 0, 0, 0)); g.add(h.box(W * 0.6, 0.012, 0.012, h.flat("#1d1d21"), 0, H + 0.001, 0)); g.add(h.box(W * 0.6, 0.004, 0.02, h.flat("#1d1d21"), 0, H, 0)); g.add(h.box(0.1, 0.012, 0.004, gold, 0, H * 0.5, D / 2 + 0.001));
};
B.stanchion = (it, g, h) => {
  const { W, H } = it, gold = h.material("metal", it.color || "#b9bcc2"), rope = h.material("velvet", "#7a1f2b", { size: 0.2 });
  [-1, 1].forEach(s => { const x = s * (W / 2 - 0.165); g.add(h.cyl(0.165, 0.17, 0.025, gold, x, 0, 0, 24)); g.add(h.cyl(0.02, 0.02, H - 0.05, gold, x, 0.02, 0, 10)); g.add(h.ball(0.04, gold, x, H - 0.02, 0, 12)); });
  const a = V(-(W / 2 - 0.165), H - 0.12, 0), b = V(W / 2 - 0.165, H - 0.12, 0), m = V(0, H - 0.3, 0);
  const curve = new T.QuadraticBezierCurve3(a, m, b); g.add(h.mesh(new T.TubeGeometry(curve, 14, 0.022, 8), rope));
};
B.misting_fan = (it, g, h) => {
  const { W, H } = it, mt = h.material("metal", it.color || "#2b2c30"), al = h.material("metal", "#b9bcc2"), blue = h.flat("#9fd0e8", { transparent: true, opacity: 0.35 });
  g.add(h.cyl(0.26, 0.28, 0.04, mt, 0, 0, 0, 28)); g.add(h.cyl(0.025, 0.025, H - 0.4, al, 0, 0.04, 0, 10));
  const head = new T.Group(); head.position.set(0, H - 0.26, 0.04); head.rotation.x = -0.12;
  head.add(h.cyl(0.26, 0.26, 0.1, mt, 0, -0.05, 0, 28)); const grill = h.cyl(0.27, 0.27, 0.01, blue, 0, 0.06, 0, 28); grill.rotation.x = Math.PI / 2; grill.position.set(0, 0, 0.07); head.add(grill);
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; head.add(h.stick(V(0, 0, 0.08), V(Math.cos(a) * 0.26, Math.sin(a) * 0.26, 0.08), 0.004, al, 4)); }
  const ring = h.cyl(0.255, 0.255, 0.012, al, 0, 0, 0.08, 28); ring.rotation.x = Math.PI / 2; head.add(ring); g.add(head);
};
B.trash_station = (it, g, h) => {
  const { W, D, H } = it, cols = ["#2b2c30", "#2e6bb0", "#3e8a4b"], n = 3, bw = W / n;
  cols.forEach((c, i) => { const m = h.material("paint", c, { size: 0.5 }); g.add(h.rbox(bw - 0.04, H - 0.18, D - 0.04, 0.03, m, -W / 2 + (i + 0.5) * bw, 0, 0)); g.add(h.rbox(bw - 0.02, 0.05, D - 0.02, 0.02, m, -W / 2 + (i + 0.5) * bw, H - 0.18, 0)); g.add(h.box(bw * 0.5, 0.12, 0.012, h.flat("#101014"), -W / 2 + (i + 0.5) * bw, H - 0.31, D / 2 - 0.018)); g.add(h.box(bw * 0.7, 0.14, 0.01, h.flat("#f4f1ea"), -W / 2 + (i + 0.5) * bw, H - 0.5, D / 2 - 0.012)); });
};
B.coat_rack = (it, g, h) => {
  const { W, D, H } = it, mt = h.material("metal", it.color || "#c9ccd1"), wood = h.material("wood", "#b98a5a", { size: 0.4 }), fab = h.material("fabric", "#3a4558", { size: 0.6 });
  [-1, 1].forEach(s => { const x = s * (W / 2 - 0.03); g.add(h.box(0.03, 0.03, D, mt, x, 0.07, 0)); [-1, 1].forEach(t => { g.add(h.cyl(0.03, 0.03, 0.04, h.flat("#2b2c30"), x, 0, t * (D / 2 - 0.05), 10)); }); g.add(h.stick(V(x, 0.07, -D * 0.35), V(x, H - 0.05, 0), 0.012, mt, 6)); g.add(h.stick(V(x, 0.07, D * 0.35), V(x, H - 0.05, 0), 0.012, mt, 6)); });
  g.add(h.stick(V(-W / 2 + 0.03, H - 0.05, 0), V(W / 2 - 0.03, H - 0.05, 0), 0.012, mt, 8));
  for (let i = 0; i < 9; i++) { const x = -W / 2 + 0.15 + i * (W - 0.3) / 8; g.add(h.box(0.02, 0.02, 0.02, mt, x, H - 0.1, 0)); g.add(h.rbox(0.07, 0.95, 0.4, 0.03, i % 3 === 1 ? fab : h.material("fabric", i % 2 ? "#7a1f2b" : "#d9d4c7", { size: 0.6 }), x, H - 1.05, 0)); }
};
B.ada_ramp = (it, g, h) => {
  const { W, D, H } = it, rise = H, run = rise * 12, land = D - run, top = -D / 2 + land, mt = h.material("metal", it.color || "#9a9da3", { size: 0.8 }), rail = h.material("metal", "#c9ccd1");
  const ang = Math.atan(rise / run), len = Math.hypot(run, rise);
  g.add(h.box(W, 0.04, land, mt, 0, rise - 0.04, -D / 2 + land / 2));
  const slope = h.box(W, 0.04, len, mt, 0, 0, 0); slope.position.set(0, rise / 2 - 0.02, top + run / 2); slope.rotation.x = ang; g.add(slope);
  const sh = new T.Shape(); sh.moveTo(0, 0); sh.lineTo(run, 0); sh.lineTo(0, rise - 0.04); sh.closePath();
  [-1, 1].forEach(s => {
    const geo = new T.ExtrudeGeometry(sh, { depth: 0.03, bevelEnabled: false }); geo.rotateY(-Math.PI / 2); geo.translate(s * (W / 2 - 0.015) + 0.015, 0, top);
    const side = h.mesh(geo, mt); g.add(side);
    const x = s * (W / 2 - 0.04);
    g.add(h.stick(V(x, rise + 0.91, -D / 2 + 0.03), V(x, rise + 0.91, top), 0.02, rail, 6)); g.add(h.stick(V(x, rise + 0.91, top), V(x, 0.91, top + run), 0.02, rail, 6));
    [-D / 2 + 0.05, top, top + run / 2, top + run].forEach((z, i) => { const y = i === 2 ? rise / 2 : i === 3 ? 0 : rise; g.add(h.stick(V(x, y, z), V(x, y + 0.91, z), 0.015, rail, 6)); });
  });
};
B.golf_cart = (it, g, h) => {
  const { W, D, H } = it, body = h.material("paint", it.color || "#f4f1ea", { size: 1 }), blk = h.material("metal", "#2b2c30"), seat = h.material("velvet", "#3a3a3f", { size: 0.4 }), glass = h.flat("#cfe6f2", { transparent: true, opacity: 0.35 });
  const L = D < W ? W : D; // long axis is x
  g.add(h.rbox(L, 0.3, D * 0.9, 0.05, body, 0, 0.18, 0)); g.add(h.rbox(L * 0.3, 0.2, D * 0.86, 0.05, body, L * 0.33, 0.45, 0));
  [-1, 1].forEach(s => { [-0.3, 0.3].forEach(x => { const w = h.cyl(0.2, 0.2, 0.15, blk, x * L / 0.6 * 0.5, 0, s * (D / 2 - 0.1), 20); w.rotation.x = Math.PI / 2; w.position.y = 0.2; g.add(w); }); });
  g.add(h.rbox(0.5, 0.12, D * 0.8, 0.03, seat, -L * 0.05, 0.4, 0)); g.add(h.rbox(0.1, 0.4, D * 0.8, 0.03, seat, -L * 0.2, 0.46, 0)); g.add(h.rbox(0.5, 0.12, D * 0.8, 0.03, seat, -L * 0.3, 0.4, 0)); g.add(h.rbox(0.1, 0.4, D * 0.8, 0.03, seat, -L * 0.42, 0.46, 0));
  corners(L * 0.78, D * 0.8).forEach(([x, z]) => g.add(h.box(0.03, H - 0.62, 0.03, blk, x * 0.9 - L * 0.05, 0.62, z)));
  g.add(h.rbox(L * 0.74, 0.04, D * 0.88, 0.02, body, -L * 0.05, H - 0.04, 0));
  const ws = h.box(0.02, 0.5, D * 0.78, glass, L * 0.27, 0.62, 0); ws.rotation.z = -0.25; g.add(ws);
};
B.ticket_booth = (it, g, h) => {
  const { W, D, H } = it, wall = h.material("paint", it.color || "#2e3a52", { size: 1 }), roof = h.material("paint", "#f4f1ea", { size: 1 }), glass = h.flat("#cfe6f2", { transparent: true, opacity: 0.3 }), blk = h.material("metal", "#2b2c30");
  g.add(h.box(W, 1.05, D, wall, 0, 0, 0)); g.add(h.rbox(W + 0.1, 0.06, D + 0.2, 0.02, roof, 0, H - 0.06, 0.05));
  [-1, 1].forEach(s => { g.add(h.box(0.05, H - 1.1, 0.05, blk, s * (W / 2 - 0.03), 1.05, D / 2 - 0.03)); g.add(h.box(0.05, H - 1.1, 0.05, blk, s * (W / 2 - 0.03), 1.05, -D / 2 + 0.03)); g.add(h.box(0.03, H - 1.15, D - 0.1, wall, s * (W / 2 - 0.015), 1.05, 0)); });
  g.add(h.box(W - 0.1, H - 1.2, 0.02, wall, 0, 1.05, -D / 2 + 0.02)); g.add(h.box(W - 0.14, 0.9 - 0.04, 0.012, glass, 0, 1.1, D / 2 - 0.02));
  g.add(h.box(W - 0.1, 0.04, 0.25, roof, 0, 1.05, D / 2 + 0.1)); g.add(h.box(0.3, 0.18, 0.012, h.flat("#c9a24a"), 0, H - 0.3, D / 2 + 0.1));
};
B.first_aid_tent = (it, g, h) => {
  const { W, D, H } = it, eave = it.eave || 2.2, mt = h.material("metal", "#f0efe9"), cloth = h.material("fabric", "#f4f1ea", { side: T.DoubleSide, size: 1.5 }), red = h.flat("#c0392b"), wd = h.material("wood", "#b98a5a", { size: 0.6 }), wh = h.flat("#ffffff");
  corners(W - 0.1, D - 0.1).forEach(([x, z]) => g.add(h.box(0.06, eave, 0.06, mt, x, 0, z)));
  const roof = h.mesh(new T.ConeGeometry(W * 0.74, H - eave, 4, 1, true), cloth); roof.rotation.y = Math.PI / 4; roof.position.y = eave + (H - eave) / 2; g.add(roof);
  g.add(h.box(W, 0.45, 0.02, cloth, 0, eave - 0.45, D / 2 - 0.05)); g.add(h.box(0.9, 0.3, 0.012, wh, 0, eave - 0.38, D / 2 - 0.035)); g.add(h.box(0.22, 0.06, 0.014, red, 0, eave - 0.26, D / 2 - 0.03)); g.add(h.box(0.06, 0.22, 0.014, red, 0, eave - 0.34, D / 2 - 0.03));
  g.add(h.rbox(1.83, 0.04, 0.76, 0.01, wd, 0, 0.72, -0.5)); [-1, 1].forEach(s => g.add(h.box(0.05, 0.72, 0.05, mt, s * 0.85, 0, -0.5)));
  g.add(h.rbox(0.36, 0.22, 0.14, 0.02, red, -0.4, 0.76, -0.5)); g.add(h.box(0.1, 0.03, 0.005, wh, -0.4, 0.88, -0.42)); g.add(h.box(0.03, 0.1, 0.005, wh, -0.4, 0.83, -0.42));
  g.add(h.rbox(0.5, 0.5, 0.5, 0.03, h.material("metal", "#b9bcc2"), 1.0, 0, 0.3)); g.add(h.rbox(0.45, 0.04, 0.9, 0.02, h.flat("#d9d4c7"), -0.9, 0.45, 0.5));
};
B.tree = (it, g, h) => {
  const { W, H } = it, pot = h.material("stone", "#8a8d93", { size: 0.8 }), bark = h.material("wood", "#5a4030", { size: 0.5 }), leaf = h.material("mulch", "#3f6f3a", { size: 0.7 });
  g.add(h.cyl(0.26, 0.2, 0.42, pot, 0, 0, 0, 28)); g.add(h.cyl(0.02, 0.045, H * 0.55, bark, 0, 0.4, 0, 8));
  [[0, 1.55, 0, 0.5], [0.22, 1.9, 0.1, 0.38], [-0.22, 1.75, -0.12, 0.36], [0.05, 2.15, -0.1, 0.32], [-0.1, 1.45, 0.25, 0.3], [0.25, 1.5, -0.2, 0.3]].forEach(([x, y, z, r]) => { const b = h.ball(r * H / 2.4, leaf, x * W, y * H / 2.4, z * W, 20); b.scale.y = 0.85; g.add(b); });
};
B.hedge_wall = (it, g, h) => {
  const { W, D, H } = it, leaf = h.material("mulch", "#3f6f3a", { size: 0.5 }), frame = h.material("metal", "#2b2c30");
  g.add(h.rbox(W, H - 0.1, D, 0.06, leaf, 0, 0.1, 0));
  [-1, 1].forEach(s => g.add(h.box(0.05, 0.1, D + 0.25, frame, s * (W / 2 - 0.1), 0, 0)));
};
B.topiary = (it, g, h) => {
  const { W, D, H } = it, pot = h.material("stone", "#d9d4c7", { size: 0.8 }), leaf = h.material("mulch", "#3f6f3a", { size: 0.7 }), bark = h.material("wood", "#5a4030", { size: 0.5 });
  [-1, 1].forEach((s, i) => {
    const x = s * (W / 4);
    g.add(h.cyl(0.17, 0.12, 0.3, pot, x, 0, 0, 24)); g.add(h.cyl(0.015, 0.02, 0.35, bark, x, 0.3, 0, 8));
    if (i === 0) g.add(h.ball(0.22, leaf, x, 0.65 + 0.22, 0, 22)); else g.add(h.cyl(0.0, 0.2, 0.55, leaf, x, 0.62, 0, 20));
  });
};
B.poster_easel = (it, g, h) => {
  const { W, D, H } = it, wd = h.material("wood", "#b98a5a", { size: 0.5 }), board = h.flat("#f4f1ea", { roughness: 0.5 }), ink = h.flat("#2e3a52");
  [-1, 1].forEach(s => g.add(h.stick(V(s * W * 0.5, 0, D * 0.3), V(s * W * 0.06, H * 0.95, 0), 0.018, wd, 6)));
  g.add(h.stick(V(0, 0, -D * 0.5), V(0, H * 0.8, -0.03), 0.018, wd, 6)); g.add(h.box(W * 0.9, 0.03, 0.05, wd, 0, 0.72, 0.03));
  const p = h.rbox(0.61, 0.91, 0.012, 0.003, board, 0, 0.75, 0.05); p.rotation.x = -0.1; g.add(p); const t = h.box(0.4, 0.07, 0.004, ink, 0, 1.45, 0.058); t.rotation.x = -0.1; g.add(t);
};
B.upright_piano = (it, g, h) => {
  const { W, D, H } = it, body = h.material("paint", it.color || "#1b1b1f", { size: 1 }), ivory = h.flat("#f4f1ea"), blk = h.flat("#0d0d10"), brass = h.material("gold");
  g.add(h.rbox(W, H - 0.1, D, 0.02, body, 0, 0.1, 0)); g.add(h.rbox(W + 0.04, 0.05, D + 0.05, 0.015, body, 0, H - 0.05, 0.01));
  g.add(h.box(W * 0.9, 0.025, 0.22, ivory, 0, 0.74, D / 2 + 0.1)); g.add(h.rbox(W * 0.9, 0.05, 0.05, 0.01, body, 0, 0.7, D / 2 + 0.2));
  for (let i = 0; i < 24; i++) { const x = -W * 0.43 + (i + 0.5) * W * 0.86 / 24; if ([1, 3, 6, 8, 10, 13, 15, 18, 20, 22].includes(i)) g.add(h.box(W * 0.86 / 24 * 0.55, 0.02, 0.12, blk, x, 0.77, D / 2 + 0.07)); }
  g.add(h.box(W * 0.8, 0.5, 0.01, h.flat("#2a2a30"), 0, 0.82, D / 2 - 0.001)); [-1, 1].forEach(s => { g.add(h.box(0.03, 0.12, 0.03, brass, s * W * 0.2, 0.0, D / 2 - 0.05)); g.add(h.cyl(0.03, 0.03, 0.03, h.flat("#2b2c30"), s * (W / 2 - 0.1), 0, D / 2 - 0.1, 10)); });
  g.add(h.rbox(0.5, 0.45, 0.35, 0.03, h.material("velvet", "#3a3a3f", { size: 0.4 }), 0, 0, D / 2 + 0.55));
};
B.baby_grand = (it, g, h) => {
  const { W, D, H } = it, body = h.material("paint", it.color || "#1b1b1f", { size: 1 }), ivory = h.flat("#f4f1ea"), blk = h.flat("#0d0d10");
  const shape = new T.Shape(); const w = W / 2, d = D / 2;
  shape.moveTo(-w, -d); shape.lineTo(w * 0.35, -d); shape.bezierCurveTo(w * 1.05, -d * 0.6, w * 1.05, d * 0.1, w * 0.4, d * 0.25); shape.bezierCurveTo(w * 0.1, d * 0.4, w * 0.3, d * 0.7, -w * 0.05, d); shape.lineTo(-w, d); shape.closePath();
  const geo = new T.ExtrudeGeometry(shape, { depth: 0.26, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.01, bevelSegments: 2, curveSegments: 14 }); geo.rotateX(Math.PI / 2); geo.translate(0, 0.74 + 0.0, 0);
  const cs = h.mesh(geo, body); cs.position.y = 0.26 + 0.0; g.add(cs);
  g.add(h.box(0.05, 0.74, 0.05, body, -w + 0.05, 0, -d + 0.1)); g.add(h.box(0.05, 0.74, 0.05, body, -w + 0.05, 0, d - 0.1)); g.add(h.box(0.05, 0.74, 0.05, body, w * 0.5, 0, -d + 0.05));
  g.add(h.box(W * 0.8, 0.025, 0.14, ivory, -w * 0.05 - 0.0, 0.73, -d - 0.0));
  g.add(h.rbox(0.45, 0.08, 0.3, 0.02, h.material("velvet", "#3a3a3f", { size: 0.4 }), 0, 0.42, -d - 0.45));
};
B.classroom_desk = (it, g, h) => {
  const { W, D, H } = it, top = h.material("paint", it.color || "#e9e6dd", { size: 1 }), mt = h.material("metal", "#8c8f95");
  g.add(h.rbox(W, 0.035, D, 0.01, top, 0, H - 0.035, 0)); [-1, 1].forEach(s => { const x = s * (W / 2 - 0.1); [-1, 1].forEach(t => g.add(h.cyl(0.018, 0.018, H - 0.035, mt, x, 0, t * (D / 2 - 0.05), 8))); g.add(h.box(0.025, 0.025, D - 0.1, mt, x, 0.1, 0)); });
  g.add(h.box(W - 0.2, 0.025, 0.025, mt, 0, 0.1, 0));
};
B.charging_station = (it, g, h) => {
  const { W, D, H } = it, body = h.material("paint", it.color || "#2e3a52", { size: 0.8 }), blk = h.flat("#101014"), led = h.flat("#6bd36b", { emissive: new T.Color("#4fd04f"), emissiveIntensity: 0.9 });
  g.add(h.cyl(0.18, 0.2, 0.03, h.material("metal", "#2b2c30"), 0, 0, 0, 28)); g.add(h.rbox(W * 0.7, H - 0.03, D * 0.7, 0.03, body, 0, 0.03, 0));
  for (let r = 0; r < 4; r++) { g.add(h.box(W * 0.56, 0.05, 0.012, blk, 0, 0.35 + r * 0.17, D * 0.35)); g.add(h.box(0.02, 0.012, 0.014, led, W * 0.2, 0.39 + r * 0.17, D * 0.352)); }
  g.add(h.box(W * 0.6, 0.12, 0.012, h.flat("#c9a24a"), 0, H - 0.18, D * 0.35));
};
B.photo_backdrop_frame = (it, g, h) => {
  const { W, D, H } = it, mt = h.material("metal", it.color || "#b9bcc2"), cloth = h.material("fabric", "#efe9dc", { size: 1 });
  [-1, 1].forEach(s => { g.add(h.box(0.05, 0.05, D, mt, s * (W / 2 - 0.025), 0, 0)); g.add(h.box(0.04, H, 0.04, mt, s * (W / 2 - 0.02), 0, 0)); });
  g.add(h.box(W, 0.04, 0.04, mt, 0, H - 0.04, 0)); g.add(h.box(W - 0.08, H - 0.15, 0.012, cloth, 0, 0.1, -0.01));
  [-1, 1].forEach(s => g.add(h.box(0.03, 0.03, 0.03, h.flat("#2b2c30"), s * (W / 2 - 0.02), 0.05, D / 2 - 0.05)));
};

export function buildMore(it, g, helpers) {
  const f = B[it.kind]; if (!f) return false;
  f(Object.assign({ W: it.w, D: it.d, H: it.h }, it), g, helpers); return true;
}
export const MORE_KINDS = Object.keys(B);
