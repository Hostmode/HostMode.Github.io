// Placement tools for the 3D designer (Selected tab): snap and line up while dragging, fill a table with chairs, and copy in a pattern.
// Every change to a design is a checked step added to S.OPS / S.RUN from here (fill_tables, pattern_copy), so it is one undo step
// and the Ask box can use it later. The model parts have no screen in them and run in node for the checks.
import * as T from "./vendor/three-bundle.min.js";
import * as S from "./scene.js";

const r2 = v => Math.round(v * 100) / 100;
const isNum = v => typeof v === "number" && isFinite(v);
const lab = it => it.label || (S.CATALOG[it.kind] ? S.CATALOG[it.kind].label : it.kind);

// ---------- Snap and line up ----------
export const SNAP = { tol: 0.2, gap: 0.3 }; // how close (m) a piece must come to catch, and the gap kept from a wall
const isTable = it => it && it.kind.startsWith("table");
const boxOf = its => its.reduce((b, i) => { const f = S.footprint(i); return { x0: Math.min(b.x0, f.x0), x1: Math.max(b.x1, f.x1), z0: Math.min(b.z0, f.z0), z1: Math.max(b.z1, f.z1) }; }, { x0: Infinity, x1: -Infinity, z0: Infinity, z1: -Infinity });

// mover: { body (the piece or pieces being dragged), all (with attached chairs and decor), ignore (ids that are moving) }, both as boxes
// after the drag so far. Returns the nudge to apply (dx, dz) and the guide lines to draw: a flush wall or gap, an edge or center
// shared with another piece, or the grid. Each side is chosen on its own.
export function snapMove(s, mover, opts = {}) {
  const tol = opts.tol ?? SNAP.tol, gap = opts.gap ?? SNAP.gap, grid = opts.grid === undefined ? S.FT / 2 : opts.grid, R = s.room;
  const targets = s.items.filter(i => !mover.ignore.has(i.id) && !i.group && i.w && !S.offFloor(i)).map(S.footprint);
  const out = { dx: 0, dz: 0, guides: [] }, pick = {};
  for (const ax of ["x", "z"]) {
    const k0 = ax === "x" ? "x0" : "z0", k1 = ax === "x" ? "x1" : "z1", len = ax === "x" ? R.w : R.d;
    const b0 = mover.body[k0], b1 = mover.body[k1], bc = (b0 + b1) / 2, a0 = mover.all[k0], a1 = mover.all[k1];
    const c = []; // { d: how far to move, kind, line: where the line is drawn, t: the other piece }
    [0, gap].forEach(v => c.push({ d: v - a0, kind: "wall", line: v }));
    [len, len - gap].forEach(v => c.push({ d: v - a1, kind: "wall", line: v }));
    targets.forEach(t => { const tv = [t[k0], (t[k0] + t[k1]) / 2, t[k1]]; [b0, bc, b1].forEach(m => tv.forEach(v => c.push({ d: v - m, kind: "piece", line: v, t }))); });
    let best = null; c.forEach(x => { if (Math.abs(x.d) <= tol && (!best || Math.abs(x.d) < Math.abs(best.d) - 1e-9)) best = x; });
    if (!best && grid) best = { d: Math.round(bc / grid) * grid - bc, kind: "grid" };
    if (best) { out[ax === "x" ? "dx" : "dz"] = best.d; pick[ax] = best; }
  }
  for (const ax of ["x", "z"]) {
    const p = pick[ax]; if (!p || p.kind === "grid") continue;
    const o = ax === "x" ? "z" : "x", ko0 = o + "0", ko1 = o + "1", sh = ax === "x" ? out.dz : out.dx;
    let lo = mover.body[ko0] + sh, hi = mover.body[ko1] + sh;
    if (p.kind === "piece") { lo = Math.min(lo, p.t[ko0]); hi = Math.max(hi, p.t[ko1]); } else { lo = Math.min(lo, mover.all[ko0] + sh); hi = Math.max(hi, mover.all[ko1] + sh); }
    out.guides.push({ axis: ax, v: r2(p.line), a: lo, b: hi, kind: p.kind });
  }
  return out;
}

const SNAP_KEY = "hm3d_snap";
export const snapOn = () => { try { return localStorage.getItem(SNAP_KEY) !== "off"; } catch (e) { return true; } };
export const setSnap = on => { try { localStorage.setItem(SNAP_KEY, on ? "on" : "off"); } catch (e) {} };

// Works out what the editor is dragging right now, as a mover, or null when there's nothing to snap (lights, things on tables, turning).
function moverFor(ed, o) {
  const s = ed.s; let main, all, base;
  if (ed.grp && o === ed.pivot && ed.grpBase) {
    if (Math.abs(o.rotation.y) > 1e-3) return null;
    main = ed.grp.ids.map(id => ed.itemOf(id)).filter(Boolean); all = ed.grp.all.map(id => ed.itemOf(id)).filter(Boolean);
    base = ed.grpBase; var dx = o.position.x - base.x, dz = o.position.z - base.z;
  } else {
    const it = ed.itemOf(o.userData && o.userData.id);
    if (!it || !it.w || S.LIGHT_KINDS.includes(it.kind) || S.offFloor(it) || Math.abs(o.rotation.y + (it.rot || 0) * Math.PI / 180) > 1e-3 || Math.abs(o.scale.x - 1) + Math.abs(o.scale.z - 1) > 1e-3) return null;
    main = [it]; all = S.setClosure(s, [it.id]).map(id => ed.itemOf(id)).filter(Boolean); dx = o.position.x - it.x; dz = o.position.z - it.z;
  }
  if (!main.length || main.some(i => S.offFloor(i))) return null;
  const sh = b => ({ x0: b.x0 + dx, x1: b.x1 + dx, z0: b.z0 + dz, z1: b.z1 + dz });
  return { body: sh(boxOf(main)), all: sh(boxOf(all)), ignore: new Set(all.map(i => i.id)), dx, dz };
}

function drawGuides(ed, guides) {
  if (!ed._guides) { ed._guides = new T.LineSegments(new T.BufferGeometry(), new T.LineBasicMaterial({ color: "#f6892f", depthTest: false, transparent: true, opacity: 0.9 })); ed._guides.renderOrder = 12; ed._guides.frustumCulled = false; ed.scene3.add(ed._guides); }
  const pts = []; guides.forEach(g => { if (g.axis === "x") pts.push(g.v, 0.03, g.a - 0.3, g.v, 0.03, g.b + 0.3); else pts.push(g.a - 0.3, 0.03, g.v, g.b + 0.3, 0.03, g.v); });
  ed._guides.geometry.dispose(); ed._guides.geometry = new T.BufferGeometry(); ed._guides.geometry.setAttribute("position", new T.Float32BufferAttribute(pts, 3)); ed._guides.visible = pts.length > 0;
}

// Called by the editor while an arrow is dragged (before the pieces follow it): nudges the arrow's point, so the pieces catch.
function dragSnap(ed, o) {
  if (!snapOn() || ed.tc.mode !== "translate" || !o) return;
  const m = moverFor(ed, o); if (!m) { if (ed._guides) ed._guides.visible = false; return; }
  const r = snapMove(ed.s, m, { grid: ed.units === "ft" ? S.FT / 2 : 0.15 });
  o.position.x += r.dx; o.position.z += r.dz; drawGuides(ed, r.guides);
}
function dragDone(ed) { if (ed._guides) ed._guides.visible = false; }

// ---------- Fill a table ----------
const CHAIR_GAP = 0.02, SEAT_OFF = 0.32; // spare room between chairs; how far a chair's center sits from the table's edge (as chairsAround does)
const isRound = t => /^table_(round|cocktail)/.test(t.kind);
const isSerp = t => t.kind === "table_serpentine";
const oneSide = t => !!(S.CATALOG[t.kind] || {}).oneSide;
const turnPt = (t, x, z) => { const a = (t.rot || 0) * Math.PI / 180, c = Math.cos(a), s = Math.sin(a); return [x * c - z * s, x * s + z * c]; };
const facingOf = (nx, nz) => ((180 - Math.atan2(nx, nz) * 180 / Math.PI) % 360 + 360) % 360; // from the table out to the chair: rot = 180° minus that direction

// Chairs spaced evenly all the way round a table that isn't round (rectangles, squares): along its outline, each facing the nearest edge.
function outlineSeats(t, n, kind) {
  const w = t.w / 2, d = t.d / 2, q = SEAT_OFF, arc = q * Math.PI / 2;
  const seg = (len, f) => ({ len, f });
  const line = (x0, z0, x1, z1, nx, nz) => seg(Math.hypot(x1 - x0, z1 - z0), u => [x0 + (x1 - x0) * u, z0 + (z1 - z0) * u, nx, nz]);
  const corner = (cx, cz, a0) => seg(arc, u => { const a = (a0 + 90 * u) * Math.PI / 180; return [cx + q * Math.cos(a), cz + q * Math.sin(a), Math.cos(a), Math.sin(a)]; });
  const path = [line(0, -d - q, w, -d - q, 0, -1), corner(w, -d, -90), line(w + q, -d, w + q, d, 1, 0), corner(w, d, 0), line(w, d + q, -w, d + q, 0, 1), corner(-w, d, 90), line(-w - q, d, -w - q, -d, -1, 0), corner(-w, -d, 180), line(-w, -d - q, 0, -d - q, 0, -1)];
  const L = path.reduce((a, p) => a + p.len, 0), out = [];
  for (let k = 0; k < n; k++) {
    let s0 = (k + 0.5) * L / n, i = 0; while (i < path.length - 1 && s0 > path[i].len) { s0 -= path[i].len; i++; }
    const [lx, lz, nx, nz] = path[i].f(Math.min(1, s0 / path[i].len)), [px, pz] = turnPt(t, lx, lz), [wx, wz] = turnPt(t, nx, nz);
    out.push(S.mkItem(kind, t.x + px, t.z + pz, r2(facingOf(wx, wz)), { group: t.id }));
  }
  return out;
}
export function seatsAround(t, n, kind = "chair") { return isRound(t) || isSerp(t) || oneSide(t) ? S.chairsAround(t, n, kind) : outlineSeats(t, n, kind); }
// How many chairs of this kind fit around the table, side by side with a hand's width between.
export function seatCapacity(t, kind = "chair") {
  const cw = ((S.CATALOG[kind] || {}).w || 0.45) + CHAIR_GAP;
  const len = isRound(t) ? 2 * Math.PI * (Math.max(t.w, t.d) / 2 + SEAT_OFF) : isSerp(t) ? Math.PI / 2 * (t.w + 0.3) : oneSide(t) ? t.w : 2 * (t.w + t.d) + 2 * Math.PI * SEAT_OFF;
  return Math.floor(len / cw + 1e-9);
}
// The chair look already in this design: the table's own chairs first, then any chair.
function chairStyle(s, t) {
  const c = s.items.find(i => i.group === t.id && i.kind.startsWith("chair")) || s.items.find(i => i.kind.startsWith("chair"));
  return c ? { kind: c.kind, dress: c.dress, mat: c.mat, color: c.color } : { kind: "chair" };
}
function tablesOf(s, o) {
  let ids = o.set ? S.setMembers(s, o.set) : Array.isArray(o.ids) ? o.ids : o.id ? [o.id] : o.tables === "all" ? s.items.filter(isTable).map(i => i.id) : null;
  if (!ids || !ids.length) throw new Error("needs a table (id), tables (ids), a set, or tables: 'all'");
  const ts = ids.map(id => { const t = s.items.find(i => i.id === id); if (!t) throw new Error("there's no object called " + id); return t; }).filter(isTable);
  if (!ts.length) throw new Error("that isn't a table");
  return ts;
}

S.OPS.fill_tables = "id or ids or set or tables:'all', count (chairs at each table): sets the chairs evenly round each table, facing it, in the chair style already in the design";
S.RUN.fill_tables = (s, o) => {
  const n = Math.round(+o.count); if (!isNum(n) || n < 1 || n > 30) throw new Error("count must be between 1 and 30 chairs");
  const ts = tablesOf(s, o);
  ts.forEach(t => {
    const st = chairStyle(s, t), cap = seatCapacity(t, st.kind), name = lab(t);
    if (n > cap) throw new Error(`only ${cap} chair${cap === 1 ? "" : "s"} fit around ${name.toLowerCase()}`);
    s.items = s.items.filter(i => !(i.group === t.id && i.kind.startsWith("chair")));
    const cs = seatsAround(t, n, st.kind);
    cs.forEach(c => { if (st.dress) c.dress = S.clone(st.dress); if (st.mat) c.mat = st.mat; if (st.color) c.color = st.color; });
    if (cs.some(c => !S.inRoom(s, Object.assign({}, c, { y: 0 })))) throw new Error(`${n} chairs at ${name.toLowerCase()} would reach past the wall`);
    s.items.push(...cs);
  });
  return `Set ${n} chairs at ${ts.length === 1 ? lab(ts[0]).toLowerCase() : ts.length + " tables"}`;
};

// ---------- Copy in a pattern ----------
S.OPS.pattern_copy = "id or ids or set, mode grid|circle. grid: rows, cols, gap (m between copies, across and down; or gapX, gapZ). circle: count, radius (m from the piece). Copies the piece with its chairs and decor; refuses copies that leave the room or overlap other pieces, and says how many fit";
S.RUN.pattern_copy = (s, o) => {
  const ids = o.set ? S.setMembers(s, o.set) : Array.isArray(o.ids) ? o.ids : o.id ? [o.id] : null;
  if (!ids || !ids.length) throw new Error("needs a piece (id), pieces (ids) or a set");
  ids.forEach(id => { if (!s.items.some(i => i.id === id)) throw new Error("there's no object called " + id); });
  const src = S.setClosure(s, ids).map(id => s.items.find(i => i.id === id)), b = boxOf(src), W = b.x1 - b.x0, D = b.z1 - b.z0;
  const mode = o.mode || "grid", spots = [];
  if (mode === "grid") {
    const rows = Math.round(+(o.rows ?? 1)), cols = Math.round(+(o.cols ?? 1)), gx = +(o.gapX ?? o.gap ?? 0.6), gz = +(o.gapZ ?? o.gap ?? 0.6);
    if (![rows, cols].every(v => isNum(v) && v >= 1 && v <= 20)) throw new Error("rows and columns must each be between 1 and 20");
    if (![gx, gz].every(v => isNum(v) && v >= 0 && v <= 50)) throw new Error("the gap must be between 0 and 50 meters");
    if (rows * cols > 200) throw new Error("that's more than 200 copies");
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (r || c) spots.push([c * (W + gx), r * (D + gz)]);
    if (!spots.length) throw new Error("pick at least 2 rows or 2 columns, so there is something to copy");
  } else if (mode === "circle") {
    const n = Math.round(+o.count), rad = +o.radius;
    if (!isNum(n) || n < 1 || n > 60) throw new Error("count must be between 1 and 60");
    if (!isNum(rad) || rad < 0.3 || rad > 100) throw new Error("the distance must be between 0.3 and 100 meters");
    for (let k = 0; k < n; k++) { const a = k * 2 * Math.PI / n; spots.push([rad * Math.sin(a), -rad * Math.cos(a)]); }
  } else throw new Error("mode must be grid or circle");
  const R = s.room, put = [], why = new Set(); let fit = 0; const srcSet = o.set && s.sets && s.sets[o.set] ? s.sets[o.set].name : null;
  spots.forEach(([dx, dz]) => {
    const map = new Map(src.map(i => [i.id, S.uid("i_")])), newSet = o.set ? S.uid("set_") : null;
    const copy = src.map(i => { const n = S.clone(i); n.id = map.get(i.id); n.x = r2(i.x + dx); n.z = r2(i.z + dz);
      if (n.group) { if (map.has(n.group)) n.group = map.get(n.group); else delete n.group; }
      if (n.set) { if (newSet && n.set === o.set) n.set = newSet; else delete n.set; }
      return n; });
    const out = copy.some(n => { const f = S.footprint(n); return f.x0 < -0.01 || f.z0 < -0.01 || f.x1 > R.w + 0.01 || f.z1 > R.d + 0.01; });
    const bump = !out && copy.some(n => S.collisions({ items: s.items.concat(put) }, n).length);
    if (out) why.add("leave the room"); else if (bump) why.add("overlap another piece");
    if (out || bump) return;
    if (newSet) { s.sets = s.sets || {}; s.sets[newSet] = { name: (srcSet || "Set") + " copy " + (fit + 1) }; }
    put.push(...copy); fit++;
  });
  if (fit < spots.length) throw new Error(`only ${fit} of ${spots.length} cop${spots.length === 1 ? "y" : "ies"} would fit: the rest would ${[...why].join(" or ")}`);
  s.items.push(...put);
  return `Copied ${src.length === 1 ? lab(src[0]).toLowerCase() : "the group"} ${spots.length} time${spots.length === 1 ? "" : "s"} (${mode === "grid" ? "rows and columns" : "around a circle"})`;
};

// ---------- The Selected tab: the switch, the stepper and the pattern form ----------
const st = { fill: {}, pat: { open: false, mode: "grid", rows: 2, cols: 3, gap: 0.6, count: 6, radius: 3 } };

function snapSwitch() {
  const on = snapOn();
  return `<div class="row" style="margin-top:12px;align-items:center"><button class="btn ${on ? "g" : "l"}" data-p="snap" role="switch" aria-checked="${on}">Snap: ${on ? "on" : "off"}</button>
   <span class="muted" style="flex:1">${on ? "Pieces catch on walls, other pieces and a grid while you drag." : "Pieces move freely."}</span></div>`;
}
function fillCard(tables, firstOf) {
  const t = tables[0], seats = (S.CATALOG[t.kind] || {}).seats || 6, n = st.fill[t.id] ?? seats;
  const who = tables.length > 1 ? `Fill every table (${tables.length})` : "Fill the table";
  return `<div class="card" style="margin-top:10px"><b>${who}</b>
   <div class="row" style="align-items:center;margin-top:6px"><button class="btn l" data-p="fillDec" aria-label="Fewer chairs">−</button><output aria-live="polite" style="min-width:5.5em;text-align:center">${n} chair${n === 1 ? "" : "s"}</output><button class="btn l" data-p="fillInc" aria-label="More chairs">+</button>
   <button class="btn g" data-p="fillGo">${tables.length > 1 ? "Fill every table" : firstOf ? "Reset chairs" : "Add chairs"}</button></div></div>`;
}
function patternCard(ed) {
  const P = st.pat, ft = ed.units === "ft", u = ft ? "ft" : "m", toU = m => ft ? +(m / S.FT).toFixed(2) : +m.toFixed(2);
  if (!P.open) return `<div class="row" style="margin-top:10px"><button class="btn l" data-p="patOpen">Copy in a pattern</button></div>`;
  const num = (id, label, v, step = 1, min = 1) => `<label class="f">${label}<input type="number" id="${id}" min="${min}" step="${step}" value="${v}"></label>`;
  return `<div class="card" style="margin-top:10px"><b>Copy in a pattern</b>
   <div class="row" style="margin-top:6px"><button class="btn ${P.mode === "grid" ? "g" : "l"}" data-p="patGrid" aria-pressed="${P.mode === "grid"}">Rows and columns</button><button class="btn ${P.mode === "circle" ? "g" : "l"}" data-p="patCircle" aria-pressed="${P.mode === "circle"}">Around a circle</button></div>
   <div class="row" style="margin-top:8px">${P.mode === "grid" ? num("pRows", "Rows", P.rows) + num("pCols", "Columns", P.cols) + num("pGap", `Gap (${u})`, toU(P.gap), 0.5, 0) : num("pCount", "How many", P.count) + num("pRad", `How far (${u})`, toU(P.radius), 0.5, 1)}</div>
   <div class="row" style="margin-top:8px"><button class="btn g" data-p="patGo">Preview</button><button class="btn l" data-p="patClose">Close</button></div>
   <p class="muted" style="margin-top:6px">The piece stays where it is. Copies that would leave the room or land on something are refused, and you're told how many fit.</p></div>`;
}
const tablesIn = ed => ed.grp ? ed.grp.all.map(id => ed.itemOf(id)).filter(it => it && isTable(it) && !it.group) : [];
// One piece: its Snap switch, the fill stepper (tables) and the pattern form. Added to the Selected tab by app.js.
export function pieceCard(ed, it) {
  const kids = ed.s.items.some(i => i.group === it.id && i.kind.startsWith("chair"));
  return snapSwitch() + (isTable(it) ? fillCard([it], kids) : "") + patternCard(ed);
}
// A selected set or several picked pieces: the same, with "fill every table" when the selection has tables.
export function groupCard(ed) {
  const ts = tablesIn(ed);
  return snapSwitch() + (ts.length ? fillCard(ts, false) : "") + patternCard(ed);
}

// Hooks the editor's dragging and the Selected tab's buttons. ctx: { body, render, toast, preview }
export function install(ed, ctx) {
  ed.tc.setTranslationSnap(null); // the arrows' own half-foot snap is replaced by the Snap switch (see dragSnap)
  ed.snapHook = o => dragSnap(ed, o); ed.snapDone = () => dragDone(ed);
  const target = () => ed.grp ? ed.grpTarget() : ed.sel ? { id: ed.sel } : null;
  const field = (id, d) => { const el = ctx.body.querySelector("#" + id), v = el ? parseFloat(el.value) : NaN; return isNum(v) ? v : d; };
  ctx.body.addEventListener("click", e => {
    const b = e.target.closest("[data-p]"); if (!b) return; const x = b.dataset.p, P = st.pat, ft = ed.units === "ft";
    const tables = ed.grp ? tablesIn(ed) : ed.sel && isTable(ed.itemOf(ed.sel)) ? [ed.itemOf(ed.sel)] : [], t0 = tables[0];
    if (x === "snap") { setSnap(!snapOn()); ctx.render(); return; }
    if (x === "fillDec" || x === "fillInc") { if (t0) { const n = st.fill[t0.id] ?? ((S.CATALOG[t0.kind] || {}).seats || 6); st.fill[t0.id] = Math.max(1, Math.min(30, n + (x === "fillInc" ? 1 : -1))); ctx.render(); } return; }
    if (x === "fillGo" && t0) {
      const n = st.fill[t0.id] ?? ((S.CATALOG[t0.kind] || {}).seats || 6), r = ed.run([{ op: "fill_tables", ids: tables.map(t => t.id), count: n }]);
      if (r.ok) ctx.toast(r.log[0]); return; // a refusal is shown by the editor's own error toast
    }
    if (x === "patOpen") { P.open = true; ctx.render(); return; }
    if (x === "patClose") { P.open = false; ctx.render(); return; }
    if (x === "patGrid" || x === "patCircle") { P.mode = x === "patGrid" ? "grid" : "circle"; ctx.render(); return; }
    if (x === "patGo" && target()) {
      const toM = v => ft ? v * S.FT : v;
      if (P.mode === "grid") { P.rows = Math.round(field("pRows", P.rows)); P.cols = Math.round(field("pCols", P.cols)); P.gap = toM(field("pGap", ft ? P.gap / S.FT : P.gap)); }
      else { P.count = Math.round(field("pCount", P.count)); P.radius = toM(field("pRad", ft ? P.radius / S.FT : P.radius)); }
      const op = Object.assign({ op: "pattern_copy", mode: P.mode }, target(), P.mode === "grid" ? { rows: P.rows, cols: P.cols, gap: r2(P.gap) } : { count: P.count, radius: r2(P.radius) });
      ctx.preview([op]);
    }
  });
}
