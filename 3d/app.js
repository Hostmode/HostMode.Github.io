// The 3D venue designer's screens: the Ask box, the library, the selected object, lights, room, views and files.
import { Editor, S, esc } from "./editor.js";

// Same Firebase project as games.html (js/02-core.js). Signing in there signs you in here (same website).
const FIREBASE_CONFIG = { apiKey: "AIzaSyAMWgxbGsq4yiQrsuLYJ1pEb5Qc-8o4zg0", authDomain: "spark-drinks-2d185.firebaseapp.com", databaseURL: "https://spark-drinks-2d185-default-rtdb.firebaseio.com", projectId: "spark-drinks-2d185", appId: "1:497288236361:web:468bd29601daa92e621e98" };

const $ = q => document.querySelector(q), body = $("#body");
const ed = new Editor(document.body);
let tab = "ask", lastLog = [], confirmDel = null, askText = "";
const U = () => ed.units, toU = m => U() === "ft" ? +(m / S.FT).toFixed(2) : +m.toFixed(2), fromU = v => U() === "ft" ? (+v) * S.FT : +v, uL = () => U() === "ft" ? "ft" : "m";
const fmt = m => S.fmtLen(m, U());
function toast(t) { const el = $("#toast"); el.textContent = t; el.style.display = "block"; clearTimeout(toast.t); toast.t = setTimeout(() => el.style.display = "none", 2600); }
function dl(blob, name) { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
const safeName = s => (s.name || "venue").replace(/[^a-z0-9]+/gi, "-").toLowerCase();

// ---------- Ask (the assistant) ----------
const EXAMPLES = ["Move the stage to the front of the room, create a dance floor in the center, and arrange eight round tables around it", "Ivory floor-length linens with gold sequin runners and blush napkins", "Add white spandex chair covers with blush sashes", "Put tall centerpieces on every table", "Add a blush and gold balloon arch at the back", "Add string lights over the dance floor", "Set up this venue for a wedding with 100 guests", "Change the tablecloths to dark purple", "Add warm lighting around the dance floor", "Make the room look more elegant and upscale", "Move the bar to the left"];
function askTab() {
  return `<p class="muted">Tell the designer what you want. It shows you the change first, and nothing is kept until you say so.</p>
  <textarea id="ask" placeholder="Arrange ten round tables with eight chairs at each table">${esc(askText)}</textarea>
  <div class="row" style="margin-top:8px"><button class="btn o" id="askGo">Show me</button></div>
  ${logHtml()}
  <h3>Try</h3><div class="row">${EXAMPLES.map(e => `<button class="chip" data-ex="${esc(e)}">${esc(e.length > 46 ? e.slice(0, 44) + "…" : e)}</button>`).join("")}</div>
  <details style="margin-top:16px"><summary class="muted">For Host Mode's AI helpers: send exact steps</summary>
  <p class="muted">A list of steps in JSON, like <code>[{"op":"move_object","id":"stage1","where":"front"}]</code>. Steps: ${Object.keys(S.OPS).join(", ")}. Every step is checked the same way as a tap.</p>
  <textarea id="opsJson" style="font-family:monospace;font-size:12px"></textarea><div class="row"><button class="btn l" id="opsGo">Preview these steps</button></div></details>`;
}
function logHtml() { return lastLog.length ? `<ul class="log">${lastLog.map(l => `<li class="${l.c || ""}">${esc(l.t.charAt(0).toUpperCase() + l.t.slice(1))}</li>`).join("")}</ul>` : ""; }
function doAsk(text) {
  askText = text;
  // close the phone's keyboard so the preview (or the answer) can be seen
  try { document.activeElement && document.activeElement.blur(); } catch (e) {}
  if (!String(text || "").trim()) { lastLog = [{ t: "Type what you'd like first, or tap one of the ideas below.", c: "warn" }]; render(); toast("Type what you'd like first"); return; }
  const { ops, notes } = S.interpret(ed.s, text);
  lastLog = notes.map(n => ({ t: n, c: /didn't|couldn't|won't/.test(n) ? "warn" : "" }));
  if (!ops.length) { lastLog.push({ t: "Nothing to change yet. Try saying it another way, or tap one of the ideas below.", c: "warn" }); render(); toast("I didn't understand that yet"); return; }
  render();
  previewSteps(ops);
}
// the preview shows at the top of the 3D view: bring it on screen (inside the planner portal, scroll the portal to the designer)
function showPreviewSpot() {
  try { if (window.frameElement) window.frameElement.scrollIntoView({ behavior: "smooth", block: "start" }); else window.scrollTo({ top: 0, behavior: "smooth" }); } catch (e) {}
}
function previewSteps(ops) {
  const del = ops.filter(o => o.op === "delete_object" && !o.confirm);
  if (del.length) { confirmDel = ops; showBanner(`<b>This removes things.</b> ${del.map(d => esc(d.id || S.CATALOG[d.kind].label)).join(", ")}<div class="row"><button class="btn r" id="bnDel">Yes, remove</button><button class="btn l" id="bnNo">Cancel</button></div>`); return; }
  const r = ed.previewOps(ops);
  if (!r.ok) { lastLog.push(...r.errors.map(e => ({ t: e, c: "err" }))); render(); return; }
  showBanner(`<b>Preview</b><div>${r.log.map(esc).join("<br>")}</div>${r.warnings.length ? `<div class="muted" style="color:#ffd9b0">${r.warnings.slice(0, 3).map(w => esc(w.msg)).join("<br>")}</div>` : ""}<div class="row"><button class="btn g" id="bnKeep">Keep it</button><button class="btn l" id="bnDrop">Undo this</button></div>`);
}
function showBanner(h) { const b = $("#banner"); b.innerHTML = h; b.style.display = "block"; showPreviewSpot(); }
function hideBanner() { $("#banner").style.display = "none"; }
$("#banner").addEventListener("click", e => {
  const id = e.target.id;
  if (id === "bnKeep") { const r = ed.keep(); hideBanner(); lastLog = (r.log || []).map(t => ({ t: "✓ " + t })); render(); }
  if (id === "bnDrop") { ed.drop(); hideBanner(); lastLog = [{ t: "Nothing was changed." }]; render(); }
  if (id === "bnDel") { const ops = confirmDel.map(o => o.op === "delete_object" ? Object.assign({}, o, { confirm: true }) : o); confirmDel = null; hideBanner(); previewSteps(ops); }
  if (id === "bnNo") { confirmDel = null; hideBanner(); }
});

// ---------- Add ----------
function addTab() {
  const cats = {}; Object.entries(S.CATALOG).forEach(([k, c]) => (cats[c.cat] = cats[c.cat] || []).push([k, c]));
  return `<p class="muted">Tablecloths, runners, chair covers and sashes are on each table and chair: tap one in the room, then style it under Selected.</p>` + S.CAT_ORDER.filter(c => cats[c]).map(cat => [cat, cats[cat]]).map(([cat, list]) => `<h3>${esc(cat)}</h3><div class="grid">${list.map(([k, c]) => `<button class="lib" data-add="${k}">${esc(c.label)}<small>${fmt(c.w)} × ${fmt(c.d)}</small></button>`).join("")}</div>`).join("") +
    `<p class="muted">New things land in the middle of the room. Drag the arrows to move them. Centerpieces and candles go on a table: select the table first, or tap one after you add them.</p>`;
}

// ---------- Selected ----------
const SW = ["white", "ivory", "champagne", "blush", "gold", "silver", "black", "navy", "dark purple", "lavender", "burgundy", "emerald", "sage", "orange"];
// pieces drawn with their own fixed look (lights, drapes, candles, lounge pieces, screens): Material would change nothing, so it isn't offered
const NO_MAT = new Set(["pipe_drape", "shimmer_wall", "ceiling_drape", "candle_cluster", "uplight", "string_lights", "chandelier", "candle_floor", "hanging_greenery", "sofa", "lounge_chair", "ottoman", "marquee", "speaker", "screen"]);
const CARPET_COLS = ["burgundy", "red", "navy", "blue", "grey", "black", "brown", "champagne", "ivory", "sage", "emerald", "dark purple"];
function grpCard() {
  const g = ed.grp, n = g.all.length, name = g.set ? ((ed.s.sets || {})[g.set] || {}).name || "Set" : "";
  return `<div class="card"><b>${g.set ? esc(name) : g.ids.length + " picked"}</b> <span class="muted">${n} piece${n === 1 ? "" : "s"} in all</span>
  <p class="muted" style="margin:6px 0">${ed.picking ? "Tap more things to add them, or tap one again to drop it. Chairs and decor on a table come with it." : g.set ? "Drag the arrows to move the whole set, or tap Turn at the bottom to turn it. To change one piece, tap it again." : "Drag the arrows to move them together, or tap Turn at the bottom to turn them."}</p>
  ${g.set && !ed.picking ? `<label class="f">Set name<input id="setName" maxlength="40" value="${esc(name)}"></label>` : ""}
  <div class="row" style="margin-top:10px">
   ${ed.picking ? `<button class="btn o" data-x="pickDone">Done picking</button>` : g.set ? "" : `<button class="btn l" data-x="pickMore">Pick more</button>`}
   ${!g.set && n >= 2 ? `<button class="btn g" data-x="grpMake">Group as a set</button>` : ""}
   ${ed.picking ? "" : `<button class="btn l" data-x="grpTurn">Turn 45°</button><button class="btn l" data-x="grpDup">Copy</button>${g.set ? `<button class="btn l" data-x="grpUn">Ungroup</button>` : ""}
   <button class="btn r" data-x="grpDel">${confirmDel === "grp" ? "Tap again to remove all " + n : "Remove"}</button>`}</div></div>`;
}
function placeCard() {
  const c = S.CATALOG[ed.placeTop];
  return `<div class="card"><b>Where should the ${esc(c.label.toLowerCase())} go?</b><p class="muted">Tap a table in the room to put it on that table.</p>
  <div class="row"><button class="btn g" data-x="topAll">Put on every table</button><button class="btn l" data-x="topCancel">Cancel</button></div>
  <p class="muted" style="margin-top:6px">Every table replaces the centerpieces already on the tables.</p></div>`;
}
function selTab() {
  if (ed.placeTop) return placeCard();
  if (ed.grp) return grpCard();
  const it = ed.sel && ed.itemOf(ed.sel);
  if (!it) return ed.picking ? `<div class="card"><b>Pick several</b><p class="muted">Tap the things you want, like a table and the bar next to it. Then group them as a set, or move, copy or remove them together.</p><div class="row"><button class="btn l" data-x="pickDone">Cancel</button></div></div>`
    : `<p class="muted">Tap something in the room to select it.</p><div class="row"><button class="btn l" data-x="pickStart">Pick several</button></div>`;
  if (S.LIGHT_KINDS.includes(it.kind)) return lightCard(it, true);
  const c = S.CATALOG[it.kind], kids = ed.s.items.filter(i => i.group === it.id && i.kind.startsWith("chair")).length;
  return `<div class="card"><b>${esc(it.label || c.label)}</b> <span class="muted">${kids ? kids + " chairs" : ""}</span>${dressCard(it)}
  <div class="row" style="margin-top:8px">
   <label class="f">Across (${uL()})<input type="number" step="0.5" data-sz="w" value="${toU(it.w)}"></label>
   <label class="f">Deep (${uL()})<input type="number" step="0.5" data-sz="d" value="${toU(it.d)}"></label>
   <label class="f">Tall (${uL()})<input type="number" step="0.25" data-sz="h" value="${toU(it.h)}"></label></div>
  <div class="row" style="margin-top:8px">
   <label class="f">From left wall (${uL()})<input type="number" step="0.5" data-pos="x" value="${toU(it.x)}"></label>
   <label class="f">From front wall (${uL()})<input type="number" step="0.5" data-pos="z" value="${toU(it.z)}"></label>
   <label class="f">Turn (°)<input type="number" step="15" data-rot value="${Math.round(it.rot)}"></label></div>
  ${c.palette || c.dress || NO_MAT.has(it.kind) ? "" : `<h3>Material</h3>`}<select id="matSel" ${c.palette || c.dress || NO_MAT.has(it.kind) ? "hidden" : ""}>${Object.entries(S.MATERIALS).map(([k, m]) => `<option value="${k}" ${k === it.mat ? "selected" : ""}>${esc(m.label)}</option>`).join("")}</select>
  ${c.palette || c.dress === "table" ? "" : `<h3>${c.dress === "chair" ? "Chair frame color" : "Color"}</h3>`}<div class="row" ${c.palette || c.dress === "table" ? "hidden" : ""}>${SW.map(n => `<button class="sw" title="${n}" aria-label="${n}" data-col="${n}" style="background:${S.COLORS[n]}"></button>`).join("")}<input type="color" id="colPick" value="${it.color || S.MATERIALS[it.mat].color}" aria-label="Any color"></div>
  <div class="row" style="margin-top:12px"><button class="btn l" data-x="dup">Copy</button><button class="btn l" data-x="pickStart">Pick several</button>${it.kind.startsWith("table") ? `<button class="btn l" data-x="chairs">${kids ? "Reset" : "Add"} chairs</button>` : ""}
   <button class="btn r" data-x="del">${confirmDel === it.id ? "Tap again to remove" : "Remove"}</button></div></div>`;
}

// ---------- Decorating (linens, chair dressing, color sets) ----------
const DSW = ["white", "ivory", "champagne", "blush", "rose", "gold", "silver", "black", "navy", "dark purple", "lavender", "burgundy", "emerald", "sage", "light blue", "orange"];
function dressCard(it) {
  const c = S.CATALOG[it.kind];
  if (c.palette) {
    const cur = (it.palette || []).join();
    return `<h3>Colors</h3><div class="row">${Object.entries(S.PALETTES).map(([k, p]) => `<button class="chip${cur === p.join() ? " on" : ""}" data-pal="${k}" aria-label="${k}" style="display:flex;gap:2px;align-items:center">${p.map(x => `<span style="width:14px;height:14px;border-radius:50%;background:${x};box-shadow:0 0 0 1px #0002"></span>`).join("")}<span style="margin-left:4px">${k === "hostmode" ? "Host Mode" : k[0].toUpperCase() + k.slice(1)}</span></button>`).join("")}</div>`;
  }
  if (!c.dress) return "";
  const d = S.dressOf(it), spec = S.DRESS[c.dress], who = c.dress === "table" ? "tables" : "chairs";
  const rows = Object.entries(spec).map(([k, f]) => {
    if (f.opts) return `<label class="f" style="margin-top:6px">${f.label}<select data-dr="${k}">${Object.entries(f.opts).map(([v, l]) => `<option value="${v}" ${d[k] === v ? "selected" : ""}>${l}</option>`).join("")}</select></label>`;
    const val = k === "linenColor" ? (d.linenColor || it.color) : d[k];
    if (k === "linenColor" && d.linen === "none") return ""; if (k === "overlayColor" && d.overlay === "none") return ""; if (k === "runnerColor" && d.runner === "none") return ""; if (k === "coverColor" && d.cover === "none") return "";
    return `<div style="margin-top:6px"><span class="muted">${f.label}</span><div class="row" style="gap:5px;margin-top:3px">${f.none ? `<button class="chip" style="padding:4px 8px" data-drc="${k}" data-v="none">${val ? "None" : "<b>None</b>"}</button>` : ""}${DSW.map(n => `<button class="sw${val === S.COLORS[n] ? " on" : ""}" title="${n}" aria-label="${f.label}: ${n}" data-drc="${k}" data-v="${n}" style="background:${S.COLORS[n]};${val === S.COLORS[n] ? "box-shadow:0 0 0 3px var(--orange)" : ""}"></button>`).join("")}</div></div>`;
  }).join("");
  return `<h3>${c.dress === "table" ? "Linens and place settings" : "Chair dressing"}</h3>${rows}<div class="row" style="margin-top:8px"><button class="btn o" data-x="dressAll">Use this look on all ${who}</button></div>`;
}

// ---------- Lights ----------
function lightCard(L, solo) {
  const k = L.kelvin || 0;
  return `<div class="card" style="margin-bottom:8px"><div class="row"><b style="flex:1">${esc(L.name || L.kind)}</b><span class="src">${L.kind}</span></div>
   <label class="f">Brightness<input type="range" min="0" max="${L.kind === "spot" ? 120 : L.kind === "point" ? 30 : 4}" step="0.1" value="${L.intensity}" data-li="${L.id}" data-lk="intensity"></label>
   ${L.kind !== "ambient" ? `<label class="f">Warm ↔ cool (${k ? k + " K" : "color"})<input type="range" min="2000" max="6500" step="100" value="${k || 3500}" data-li="${L.id}" data-lk="kelvin"></label>` : ""}
   ${solo ? `<div class="row"><button class="btn r" data-x="del">${confirmDel === L.id ? "Tap again to remove" : "Remove light"}</button></div>` : ""}</div>`;
}
function lightTab() {
  return `<div class="row"><button class="btn l" data-addl="point">Add a light</button><button class="btn l" data-addl="spot">Add a spotlight</button>
   <button class="btn l" data-x="quality">Quality: ${ed.quality === "high" ? "High (shadows)" : "Fast"}</button></div><h3>Lights in the room</h3>` + ed.s.lights.map(L => lightCard(L)).join("");
}

// ---------- Room ----------
function srcSel(k) { const v = ed.s.room.dimSrc[k] || "unknown"; return `<select data-src="${k}" aria-label="Where this number came from">${S.DIM_SRC.map(x => `<option ${x === v ? "selected" : ""}>${x}</option>`).join("")}</select> <span class="src ${v}">${v}</span>`; }
function roomTab() {
  const R = ed.s.room, n = S.counts(ed.s);
  return `<div class="card"><b>${n.tables} tables · ${n.seats} seats</b><div class="muted">${fmt(R.w)} × ${fmt(R.d)} room, ${Math.round(R.w * R.d / S.FT / S.FT).toLocaleString()} sq ft</div></div>
  <h3>Size</h3>
  ${[["w", "Width"], ["d", "Length"], ["h", "Ceiling height"]].map(([k, l]) => `<div class="row" style="margin-bottom:6px"><label class="f">${l} (${uL()})<input type="number" step="0.5" data-room="${k}" value="${toU(R[k])}"></label><div>${srcSel(k)}</div></div>`).join("")}
  <p class="muted">Mark each size as measured, confirmed by the venue, or estimated, so nobody plans around a guess.</p>
  <h3>Surfaces</h3><div class="row">
   ${[["floor", "Floor"], ["walls", "Walls"], ["ceiling", "Ceiling"]].map(([k, l]) => `<label class="f">${l}<select data-surf="${k}">${Object.entries(S.MATERIALS).map(([m, M]) => `<option value="${m}" ${R[k] === m ? "selected" : ""}>${esc(M.label)}</option>`).join("")}</select></label>`).join("")}</div>
  ${/carpet/.test(R.floor) ? `<h3>Carpet color</h3><div class="row">${CARPET_COLS.map(n => `<button class="sw" title="${n}" aria-label="${n} carpet" data-fcol="${n}" style="background:${S.COLORS[n]}"></button>`).join("")}<input type="color" id="floorCol" aria-label="Any carpet color" value="${R.floorColor || S.MATERIALS[R.floor].color}"></div>`
    : `<div class="row" style="margin-top:6px"><button class="btn l" data-x="carpet">Carpet the floor</button></div>`}
  <label class="f" style="margin-top:6px">Wall color<input type="color" id="wallCol" value="${R.wallColor}"></label>
  <h3>Doors and windows</h3>
  ${ed.s.walls.map(w => `<div class="row" style="margin-bottom:6px"><span style="flex:1">${esc(w.name)} <span class="muted">${fmt(S.wallLen(w))} · ${ed.s.openings.filter(o => o.wall === w.id).map(o => o.type).join(", ") || "plain"}</span></span><button class="btn l" data-open="door" data-wall="${w.id}">+ Door</button><button class="btn l" data-open="window" data-wall="${w.id}">+ Window</button></div>`).join("")}
  <h3>Units</h3><div class="row"><button class="btn ${U() === "ft" ? "" : "l"}" data-units="ft">Feet</button><button class="btn ${U() === "m" ? "" : "l"}" data-units="m">Meters</button></div>`;
}

// ---------- Views ----------
function viewsTab() {
  return `<div class="row"><button class="btn" data-x="saveView">Save this view</button><button class="btn l" data-x="png">Download a picture</button></div>
   <h3>Saved views</h3>${ed.s.views.map(v => `<button class="lib" style="width:100%;margin-bottom:6px" data-go="${v.id}">${esc(v.name)}</button>`).join("") || `<p class="muted">None yet.</p>`}
   <p class="muted">Walk: drag to look around, use the arrows (or W A S D on a keyboard) to move.</p>`;
}

// ---------- Save & share ----------
let projects = [];
function fileTab() {
  const st = ed.store.status, revs = ed.store.revisions(ed.s.id);
  const cloud = { cloud: "Saved to your Host Mode account too.", "signed-out": "Only saved on this device. Sign in to Host Mode on this site to keep designs in your account.", "no-account": "Only saved on this device: this sign-in has no planner or host account.", offline: "Only saved on this device right now (can't reach Host Mode).", local: "Only saved on this device." }[st];
  return `<div class="card"><b>${esc(ed.s.name)}</b><div class="muted">${esc(cloud)}</div>
   <div class="row" style="margin-top:8px"><button class="btn g" data-x="save">Save a version</button><button class="btn l" data-x="new">New sample venue</button></div></div>
   <h3>Share or back up</h3><div class="row"><button class="btn l" data-x="json">Download venue file</button><button class="btn l" data-x="glb">Download 3D model (.glb)</button>
   <label class="btn l" style="display:inline-block">Open a venue file<input type="file" id="imp" accept=".json,application/json" hidden></label></div>
   <h3>Your venues</h3>${projects.map(p => `<div class="row" style="margin-bottom:6px"><span style="flex:1">${esc(p.name)} <span class="muted">${new Date(p.updated).toLocaleString()}</span></span>${p.id === ed.s.id ? `<span class="src confirmed">open</span>` : `<button class="btn l" data-openp="${p.id}">Open</button>`}</div>`).join("") || `<p class="muted">None saved yet.</p>`}
   <h3>Earlier versions</h3>${revs.map(r => `<div class="row" style="margin-bottom:6px"><span style="flex:1">${new Date(r.t).toLocaleString()} <span class="muted">${r.items} objects</span></span><button class="btn l" data-rev="${r.t}">Go back to this</button></div>`).join("") || `<p class="muted">Tap “Save a version” to keep a copy you can go back to.</p>`}
   <p class="muted">Graphics: ${ed.gpu.webgl2 ? "WebGL 2" : "WebGL 1"}${ed.gpu.webgpu ? " (this device also has WebGPU)" : ""}. Preview build: not part of Host Mode yet.</p>`;
}

// ---------- Render and events ----------
function render() {
  if (!ed.s) return;
  document.querySelectorAll(".tabs button").forEach(b => b.classList.toggle("on", b.dataset.tab === tab));
  body.innerHTML = { ask: askTab, add: addTab, sel: selTab, light: lightTab, room: roomTab, views: viewsTab, file: fileTab }[tab]();
  $("#undo").disabled = !ed.hist.length; $("#redo").disabled = !ed.fut.length;
  document.querySelectorAll("[data-view]").forEach(b => b.classList.toggle("on", b.dataset.view === ed.view));
  document.querySelectorAll("[data-mode]").forEach(b => b.classList.toggle("on", b.dataset.mode === ed.mode));
  $("#modes").style.display = ed.view === "walk" ? "none" : "flex"; $("#pad").style.display = ed.view === "walk" ? "grid" : "none";
  if (document.activeElement !== $("#name")) $("#name").value = ed.s.name;
}
let lastSel = null;
ed.on(info => {
  if (info.toast) toast(info.toast);
  if (info.errors) { lastLog = info.errors.map(t => ({ t, c: "err" })); toast(info.errors[0]); }
  else if (info.log && info.why !== "assistant") { if (info.warnings && info.warnings.length) toast(info.warnings[0].msg); }
  const selKey = ed.sel || (ed.grp ? "g:" + (ed.grp.set || ed.grp.ids.join(",")) : ed.picking ? "picking" : null);
  if (selKey !== lastSel) { lastSel = selKey; confirmDel = null; if (selKey && tab !== "light") tab = "sel"; }
  render();
});

document.querySelector(".tabs").addEventListener("click", e => { const t = e.target.dataset.tab; if (t) { tab = t; if (t === "file") refreshProjects(); render(); } });
document.querySelectorAll("[data-view]").forEach(b => b.onclick = () => ed.setView(b.dataset.view));
document.querySelectorAll("[data-mode]").forEach(b => b.onclick = () => ed.setMode(b.dataset.mode));
$("#undo").onclick = () => ed.undo(); $("#redo").onclick = () => ed.redo();
$("#name").addEventListener("change", e => { ed.s.name = e.target.value.trim().slice(0, 60) || "Untitled venue"; ed.store.autosave(ed.s); });
document.querySelectorAll("#pad button").forEach(b => { const k = b.dataset.k, on = v => e => { e.preventDefault(); ed.walk.keys[k] = v; }; b.addEventListener("pointerdown", on(true)); ["pointerup", "pointerleave", "pointercancel"].forEach(ev => b.addEventListener(ev, on(false))); });

body.addEventListener("click", async e => {
  const d = e.target.closest("button,[data-x]")?.dataset || {}; const it = ed.sel && ed.itemOf(ed.sel);
  if (e.target.id === "askGo") return doAsk($("#ask").value);
  if (d.ex) { $("#ask").value = d.ex; return doAsk(d.ex); }
  if (e.target.id === "opsGo") { try { const ops = JSON.parse($("#opsJson").value); previewSteps(Array.isArray(ops) ? ops : [ops]); } catch (er) { toast("Those steps aren't valid JSON"); } return; }
  if (d.add && S.CATALOG[d.add].top) {
    const sel = ed.sel ? S.rootOf(ed.s, ed.sel) : ed.grp ? ed.grp.ids.map(id => ed.itemOf(id)).find(i => i && S.CATALOG[i.kind].dress === "table") : null;
    if (sel && S.CATALOG[sel.kind].dress === "table") { const id = S.uid("i_"), r = ed.run([{ op: "add_item", kind: d.add, on: sel.id, id }]); if (r.ok) { ed.select(id); toast("Put on the selected table"); } return; }
    ed.select(null); ed.placeTop = d.add; tab = "sel"; render(); toast("Tap a table to put it on"); return;
  }
  if (d.add) { const id = S.uid("i_"); const r = ed.run([{ op: "add_item", kind: d.add, id, x: ed.s.room.w / 2, z: ed.s.room.d / 2 }]); if (r.ok) { ed.select(id); toast("Added " + S.CATALOG[d.add].label.toLowerCase()); } return; }
  if (d.col && it) return ed.run([{ op: "change_material", id: it.id, color: d.col }]);
  if (d.drc && it) return ed.run([{ op: "dress_object", id: it.id, [d.drc]: d.v }]);
  if (d.pal && it) return ed.run([{ op: "dress_object", id: it.id, palette: d.pal }]);
  if (d.addl) { const id = S.uid("L_"); ed.run([{ op: "add_light", kind: d.addl, id, kelvin: 3000, x: ed.s.room.w / 2, z: ed.s.room.d / 2 }]); ed.select(id); return; }
  if (d.open) { const w = ed.s.walls.find(x => x.id === d.wall); const used = ed.s.openings.filter(o => o.wall === w.id).map(o => o.at), L = S.wallLen(w); let at = L / 2; for (const f of [0.5, 0.25, 0.75, 0.15, 0.85]) { at = L * f; if (used.every(u => Math.abs(u - at) > 1.8)) break; } return ed.run([{ op: "add_opening", type: d.open, wall: w.id, at }]); }
  if (d.units) { ed.units = d.units; localStorage.setItem("hm3d_units", d.units); return render(); }
  if (d.go) return ed.goView(d.go);
  if (d.openp) { const s = await ed.store.open(d.openp); if (s) { ed.load(s); toast("Opened " + s.name); } return; }
  if (d.rev) { const s = ed.store.revision(ed.s.id, +d.rev); if (s) { ed.hist.push(ed.s); ed.fut = []; ed.s = s; ed.build(); ed.store.autosave(s); toast("Went back to that version (Undo brings it back)"); render(); } return; }
  if (d.x === "topAll" && ed.placeTop) { const kind = ed.placeTop; ed.placeTop = null; const r = ed.run([{ op: "decorate_tables", kind, tables: "all" }]); if (r.ok) toast(r.log[0] || "Put on every table"); render(); return; }
  if (d.x === "topCancel") { ed.placeTop = null; render(); return; }
  if (d.fcol) { ed.run([{ op: "change_material", id: "floor", color: d.fcol }]); return; }
  if (d.x === "carpet") { ed.run([{ op: "change_material", id: "floor", mat: "carpet" }]); toast("Carpeted the floor. Pick a carpet color, or Carpet, plain, under Floor."); return; }
  // sets and several picked things
  const gt = ed.grpTarget();
  switch (d.x) {
    case "pickStart": case "pickMore": ed.setPicking(true); render(); return;
    case "pickDone": ed.setPicking(false); render(); return;
    case "grpMake": if (ed.grp) { const id = S.uid("set_"), r = ed.run([{ op: "group_objects", ids: ed.grp.ids, id }]); if (r.ok) { ed.picking = false; ed.selectGroup(S.setMembers(ed.s, id), id); toast(r.log[0]); } } return;
    case "grpTurn": if (gt) ed.run([Object.assign({ op: "rotate_set", by: 45 }, gt)]); return;
    case "grpDup": if (gt) { const before = new Set(Object.keys(ed.s.sets || {})), r = ed.run([Object.assign({ op: "duplicate_set" }, gt)]);
      if (r.ok) { const nu = Object.keys(ed.s.sets || {}).find(k => !before.has(k)); if (nu) ed.selectGroup(S.setMembers(ed.s, nu), nu); toast("Copied. The copy is selected, so you can drag it where you want it."); } } return;
    case "grpUn": if (ed.grp && ed.grp.set) { const ids = ed.grp.ids.slice(); const r = ed.run([{ op: "ungroup_objects", set: ed.grp.set }]); if (r.ok) { ed.selectGroup(ids, null); toast("Ungrouped. They're still picked, so you can move them together once more."); } } return;
    case "grpDel": if (gt) { if (confirmDel !== "grp") { confirmDel = "grp"; render(); } else { confirmDel = null; const r = ed.run([Object.assign({ op: "delete_set", confirm: true }, gt)]); if (r.ok) { ed.select(null); toast(r.log[0]); } } } return;
  }
  switch (d.x) {
    case "dressAll": if (it) { const C = S.CATALOG[it.kind], dd = S.dressOf(it), o = { op: "dress_object", kind: C.dress === "table" ? "tables" : "chairs" }; Object.keys(S.DRESS[C.dress]).forEach(k => { if (dd[k] == null && k !== "linenColor" && !S.DRESS[C.dress][k].none) return; o[k] = k === "linenColor" ? (dd.linenColor || it.color || "white") : dd[k] == null ? "none" : dd[k]; }); const r = ed.run([o]); if (r.ok) toast(r.log[0]); } break;
    case "dup": if (it) { ed.run([{ op: "duplicate_object", id: it.id }]); } break;
    case "chairs": if (it) { const n = S.CATALOG[it.kind].seats || 6; const kids = ed.s.items.filter(i => i.group === it.id).map(i => i.id); ed.run([...kids.map(id => ({ op: "delete_object", id, confirm: true })), ...S.chairsAround(it, n).map(c => ({ op: "add_item", kind: "chair", x: c.x, z: c.z, rot: c.rot, group: it.id }))]); } break;
    case "del": if (it) { if (confirmDel !== it.id) { confirmDel = it.id; render(); } else { confirmDel = null; ed.run([{ op: "delete_object", id: it.id, confirm: true }]); ed.select(null); } } break;
    case "quality": ed.quality = ed.quality === "high" ? "low" : "high"; localStorage.setItem("hm3d_quality", ed.quality); ed.applyQuality(); render(); break;
    case "saveView": { const v = ed.currentView(); const def = "View " + (ed.s.views.length + 1), name = window.HM3D_PREVIEW ? def : (prompt("Name this view", def) ?? null); if (name) ed.run([{ op: "save_view", name, pos: v.pos, target: v.target }]); break; }
    case "png": { const url = ed.snapshot(1920); const b = await (await fetch(url)).blob(); dl(b, safeName(ed.s) + ".png"); break; }
    case "save": { const r = await ed.store.save(ed.s, true); toast(r.cloud ? "Saved to your account" : r.local ? "Saved on this device" : "Couldn't save"); refreshProjects(); break; }
    case "new": ed.load(S.sampleVenue()); await ed.store.save(ed.s, true); refreshProjects(); toast("New sample venue"); break;
    case "json": dl(new Blob([JSON.stringify(ed.s, null, 1)], { type: "application/json" }), safeName(ed.s) + ".hostmode-venue.json"); break;
    case "glb": try { dl(await ed.exportGLB(), safeName(ed.s) + ".glb"); } catch (er) { toast("Couldn't make the 3D model file"); } break;
  }
});
body.addEventListener("change", async e => {
  const t = e.target, it = ed.sel && ed.itemOf(ed.sel);
  if (t.id === "floorCol") { ed.run([{ op: "change_material", id: "floor", color: t.value }]); return; }
  if (t.id === "setName" && ed.grp && ed.grp.set) { ed.run([{ op: "rename_set", set: ed.grp.set, name: t.value }]); return; }
  if (t.dataset.sz && it) ed.run([{ op: "resize_object", id: it.id, [t.dataset.sz]: fromU(t.value) }]);
  if (t.dataset.pos && it) ed.run([{ op: "move_object", id: it.id, [t.dataset.pos]: fromU(t.value) }]);
  if (t.dataset.rot != null && it) ed.run([{ op: "rotate_object", id: it.id, rot: +t.value }]);
  if (t.dataset.dr && it) ed.run([{ op: "dress_object", id: it.id, [t.dataset.dr]: t.value }]);
  if (t.id === "matSel" && it) ed.run([{ op: "change_material", id: it.id, mat: t.value }]);
  if (t.id === "colPick" && it) ed.run([{ op: "change_material", id: it.id, color: t.value }]);
  if (t.dataset.li) ed.run([{ op: "modify_lighting", id: t.dataset.li, [t.dataset.lk]: +t.value }]);
  if (t.dataset.room) ed.run([{ op: "set_room", [t.dataset.room]: fromU(t.value) }]);
  if (t.dataset.src) ed.run([{ op: "set_room", dimSrc: { [t.dataset.src]: t.value } }]);
  if (t.dataset.surf) ed.run([{ op: "change_material", id: t.dataset.surf, mat: t.value }]);
  if (t.id === "wallCol") ed.run([{ op: "change_material", id: "walls", color: t.value }]);
  if (t.id === "imp" && t.files[0]) {
    try { const s = S.validateFile(JSON.parse(await t.files[0].text())); s.id = s.id || S.uid("v_"); ed.load(s); await ed.store.save(ed.s, true); refreshProjects(); toast("Opened " + s.name); }
    catch (er) { toast(er.message || "That file couldn't be opened"); }
  }
});
async function refreshProjects() { const loc = ed.store.list(), cl = await ed.store.listCloud().catch(() => []); const m = new Map(); [...loc, ...cl].forEach(p => { if (!m.has(p.id) || m.get(p.id).updated < p.updated) m.set(p.id, p); }); projects = [...m.values()].sort((a, b) => b.updated - a.updated); if (tab === "file") render(); }

ed.store.onSave = r => { const el = $("#saveState"); el.textContent = r.cloud ? "Saved to account" : r.local ? "Saved on device" : "Not saved"; el.className = "pill " + (r.cloud ? "ok" : r.local ? "" : "warn"); };
ed.store.onStatus = () => render();

// Start: open the last venue on this device, or the sample.
(async () => {
  if (!ed.r) return;
  /* ?demo=1 (the planner demo's 3D designer tab): designs stay on this device, never in a real account */
  if (new URLSearchParams(location.search).get("demo") === "1") ed.store.setStatus("local"); else ed.store.connect(FIREBASE_CONFIG).then(refreshProjects);
  const want = new URLSearchParams(location.search).get("v"), last = ed.store.list()[0];
  const s = (want && await ed.store.open(want)) || (last && await ed.store.open(last.id)) || S.sampleVenue();
  ed.load(s); if (!last) ed.store.save(ed.s, true);
  refreshProjects(); render();
})();

// For tests and Host Mode's own agents: the same checked steps a person uses. Nothing here runs arbitrary code.
window.hm3d = { scene: () => S.clone(ed.s), interpret: t => S.interpret(ed.s, t), preview: ops => ed.previewOps(ops), keep: () => ed.keep(), drop: () => ed.drop(), run: ops => ed.run(ops), undo: () => ed.undo(), redo: () => ed.redo(), save: () => ed.store.save(ed.s, true), open: id => ed.store.open(id).then(s => s && ed.load(s)), select: id => ed.select(id), setView: v => ed.setView(v), snapshot: w => ed.snapshot(w), exportGLB: () => ed.exportGLB(), editor: ed };
