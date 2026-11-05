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

export function buildMore(it, g, helpers) {
  const f = B[it.kind]; if (!f) return false;
  f(Object.assign({ W: it.w, D: it.d, H: it.h }, it), g, helpers); return true;
}
export const MORE_KINDS = Object.keys(B);
