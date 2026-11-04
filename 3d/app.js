// The 3D venue designer's screens: the Ask box, the library, the selected object, lights, room, views and files.
import { Editor, S, esc } from "./editor.js";
import { searchAssets, assetById } from "./library/assets.js";
import { EVENTS, STYLES } from "./library/contracts.js";

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
const EXAMPLES_IN = ["Move the stage to the front of the room, create a dance floor in the center, and arrange eight round tables around it", "Ivory floor-length linens with gold sequin runners and blush napkins", "Add white spandex chair covers with blush sashes", "Put tall centerpieces on every table", "Add a blush and gold balloon arch at the back", "Add string lights over the dance floor", "Set up this venue for a wedding with 100 guests", "Change the tablecloths to dark purple", "Add warm lighting around the dance floor", "Make the room look more elegant and upscale", "Move the bar to the left"];
const SITE_EXAMPLES = ["Show the shade at 3 pm", "Add a 10 by 10 canopy at the front", "Add three market umbrellas at the back left", "Add a generator at the back right", "Add a restroom trailer at the back", "Add a 40 by 60 tent in the center", "Add a pergola on the left"];
function askTab() {
  const EXAMPLES = ed.s.site ? SITE_EXAMPLES : EXAMPLES_IN;
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
// The library: search words, an event and a style narrow it down (searchAssets in 3d/library/assets.js). With nothing typed
// or picked it's every piece by category. Each piece gets a small picture, drawn a few at a time while this tab is open.
let libQ = "", libEv = "", libSt = "";
const cap = w => w.charAt(0).toUpperCase() + w.slice(1);
function libCard(k) { const c = S.CATALOG[k], u = THUMBS.get(k), a = assetById(k);
  return `<button class="lib" data-add="${k}" title="${esc(a && a.description || "")}"><img class="th" data-k="${k}" alt="" ${u ? `src="${u}"` : ""}>${esc(c.label)}<small>${fmt(c.w)} × ${fmt(c.d)}</small></button>`; }
function libList() {
  if (!libQ.trim() && !libEv && !libSt) {
    const cats = {}; Object.keys(S.CATALOG).forEach(k => (cats[S.CATALOG[k].cat] = cats[S.CATALOG[k].cat] || []).push(k));
    return S.CAT_ORDER.filter(c => cats[c]).map(cat => `<h3>${esc(cat)}</h3><div class="grid">${cats[cat].map(libCard).join("")}</div>`).join("");
  }
  const hits = searchAssets(libQ, { event: libEv, style: libSt }).filter(a => S.CATALOG[a.id]);
  return `<p class="muted" role="status">${hits.length ? hits.length + (hits.length === 1 ? " piece" : " pieces") : "Nothing matches. Try fewer words, or clear the filters."}</p><div class="grid">${hits.map(a => libCard(a.id)).join("")}</div>`;
}
function addTab() {
  return `<input id="libQ" type="search" class="search" placeholder="Search: arch, gold, rustic, throne…" aria-label="Search the library" value="${esc(libQ)}">
  <div class="row" style="margin:8px 0 2px"><label class="f">Event<select id="libEv"><option value="">Any event</option>${EVENTS.map(e => `<option value="${e}" ${libEv === e ? "selected" : ""}>${cap(e)}</option>`).join("")}</select></label>
  <label class="f">Style<select id="libSt"><option value="">Any style</option>${STYLES.map(e => `<option value="${e}" ${libSt === e ? "selected" : ""}>${cap(e)}</option>`).join("")}</select></label>
  <button class="btn l" data-x="libClear" style="align-self:flex-end" ${libQ || libEv || libSt ? "" : "hidden"}>Clear</button></div>
  <p class="muted">Tablecloths, runners, chair covers and sashes are on each table and chair: tap one in the room, then style it under Selected.</p>
  <div id="libList">${libList()}</div>
  <p class="muted">New things land in the middle of the room. Drag the arrows to move them. Centerpieces and candles go on a table: select the table first, or tap one after you add them.</p>`;
}
// Typing only redraws the results, never the search box, so the keyboard stays up on a phone.
function refreshLib() { const el = $("#libList"); if (el) { el.innerHTML = libList(); wantThumbs(); } const c = $("[data-x=libClear]"); if (c) c.hidden = !(libQ || libEv || libSt); }
// Library pictures: made on this device the first time the Add tab shows them, kept until the page closes.
const THUMBS = new Map(); let thumbQ = [], thumbBusy = false;
function paintThumbs() { document.querySelectorAll("#libList img[data-k]").forEach(i => { const u = THUMBS.get(i.dataset.k); if (u && i.getAttribute("src") !== u) i.src = u; }); }
function wantThumbs() { thumbQ = [...new Set([...document.querySelectorAll("#libList img[data-k]")].map(i => i.dataset.k))].filter(k => !THUMBS.has(k)); paintThumbs(); if (!thumbBusy && thumbQ.length) { thumbBusy = true; requestAnimationFrame(stepThumbs); } }
function stepThumbs() {
  if (tab !== "add" || window.HM3D_PAUSED || !thumbQ.length) { thumbBusy = false; return; }
  const batch = thumbQ.splice(0, 2);
  try { ed.thumbs(batch).forEach((u, i) => THUMBS.set(batch[i], u)); } catch (e) { thumbQ = []; thumbBusy = false; return; } // no pictures is fine: the names still show
  paintThumbs(); requestAnimationFrame(stepThumbs);
}

// ---------- Photo: design over a photo of the real venue (Stage A) ----------
// Choose a photo, drag four dots onto a rectangle on its floor, type that rectangle's near edge. The camera, the lens and the
// depth are worked out (S.photoCamera); only the typed length is measured, so everything else is labeled as an estimate.
let photoBusy = false;
function photoTab() {
  const P = ed.s.photo;
  if (!P) return `<div class="card"><b>Design over a photo of your venue</b>
    <p class="muted">Take or choose a photo of the empty room, then mark a rectangle on its floor and type one real measurement. Your tables and decor then appear in the photo, at the right size and angle, so you and your client can picture the real space.</p>
    <label class="btn o" style="display:inline-block">${photoBusy ? "Opening…" : "Choose a photo"}<input type="file" id="phFile" accept="image/*" hidden></label>
    <p class="muted">Best results: a wide photo taken standing, from a corner or the entrance, with lots of floor showing. The photo is kept with this design, on this device and in your own Host Mode account, and nowhere else.</p></div>`;
  const c = S.photoCamera(P), est = c.ok ? c.d : null, src = (k) => `<span class="src ${k}">${k}</span>`;
  const look = ed.view === "photo";
  return `<div class="row" style="margin-bottom:10px">${look ? `<button class="btn l" data-x="phOut">Back to 3D</button><button class="btn l" data-x="phBare">${ed.photoBare ? "Show my design" : "Show the bare room"}</button><button class="btn l" data-x="png">Save picture</button>` : ed.photoMissing ? `<p class="warn" style="color:#a15c00">This design's photo isn't on this device or in your account any more. Use a different photo below, or remove it.</p>` : `<button class="btn o" data-x="phIn" ${ed.photoImg ? "" : "disabled"}>${ed.photoImg ? "Look through the photo" : "Opening the photo…"}</button>`}</div>
  <div class="card"><b>1. Mark the floor</b>
    <p class="muted">Drag the four dots onto the corners of something rectangular on the floor: a rug, the dance floor, a row of floor tiles, or the room's corners. Dots 1 and 2 go on the far edge (left, then right); 3 and 4 on the near edge. When they're right, the orange grid lies flat on the floor.</p>
    <button class="btn ${ed.photoAlign && look ? "g" : "l"}" data-x="phAlign">${ed.photoAlign && look ? "Done marking" : "Move the dots"}</button></div>
  <div class="card" style="margin-top:8px"><b>2. One real measurement</b>
    <div class="row" style="margin-top:6px"><label class="f">Near edge, dot 4 to dot 3 (${uL()}) ${src("measured")}<input type="number" step="0.1" min="1" data-ph="w" value="${P.w ? toU(P.w) : ""}" placeholder="Measure it, e.g. 16"></label></div>
    ${!P.w ? `<p class="muted">Until you type this, sizes in the photo are only a guess.</p>` : ""}
    ${c.ok ? `<p style="margin:8px 0 4px">Far edge to near edge: about <b>${fmt(est)}</b> ${src(P.dSrc === "measured" ? "measured" : "estimated")}</p>
      <div class="row"><label class="f">Know the real distance? (${uL()})<input type="number" step="0.1" min="1" data-ph="d" value="${P.dSrc === "measured" && P.d ? toU(P.d) : ""}" placeholder="Leave empty to estimate"></label></div>
      ${c.lens === "guessed" ? `<p class="muted">The camera's lens couldn't be worked out from these dots, so a typical phone camera is assumed. Typing the real distance above fixes this.</p>` : ""}
      <p class="muted">The photo was taken from about ${fmt(c.height)} up, with a lens about ${Math.round(c.fov)}° tall ${src("estimated")}.</p>` : `<p class="warn" style="color:#a15c00">${esc(c.why)}</p>`}</div>
  <div class="card" style="margin-top:8px"><b>3. Where the marked floor is in the room</b>
    <p class="muted">How far dot 1 (far left) is from the room's left wall and back wall. Leave 0 if the marked floor is the whole room.</p>
    <div class="row"><label class="f">From the left wall (${uL()})<input type="number" step="0.5" data-ph="ox" value="${toU(P.ox || 0)}"></label><label class="f">From the back wall (${uL()})<input type="number" step="0.5" data-ph="oz" value="${toU(P.oz || 0)}"></label></div>
    ${c.ok && P.w ? `<button class="btn l" data-x="phRoom" style="margin-top:6px">Make the room ${fmt(P.w)} × ${fmt(est)}</button>` : ""}</div>
  <p class="muted">Sizes from a photo are estimates: check anything that has to fit before the day. Pieces can't hide behind real pillars or people in the photo yet.</p>
  <div class="row"><label class="btn l">Use a different photo<input type="file" id="phFile" accept="image/*" hidden></label><button class="btn ${confirmDel === "photo" ? "r" : "l"}" data-x="phDel">${confirmDel === "photo" ? "Tap again: the photo is deleted, not just hidden" : "Remove the photo"}</button></div>`;
}
// A photo from the phone: made smaller (1600 px on its long side is plenty) and re-drawn, which also drops hidden camera details.
async function usePhoto(file) {
  if (!file || !/^image\//.test(file.type)) return toast("That isn't a photo");
  photoBusy = true; render();
  try {
    const bmp = await createImageBitmap(file), k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height)), w = Math.round(bmp.width * k), h = Math.round(bmp.height * k);
    const c = document.createElement("canvas"); c.width = w; c.height = h; c.getContext("2d").drawImage(bmp, 0, 0, w, h); const url = c.toDataURL("image/jpeg", 0.85);
    const ref = S.uid("ph_"), old = ed.s.photo && ed.s.photo.ref, r = await ed.store.savePhoto(ref, url);
    if (!r.local && !r.cloud) toast("This photo can't be kept on this device, so it will be gone if the page closes");
    const keep = ed.s.photo && ed.s.photo.iw && Math.abs(ed.s.photo.iw / ed.s.photo.ih - w / h) < 0.01; // same shape: keep the dots where they were
    const res = ed.run([{ op: "set_photo", ref, iw: w, ih: h, ...(keep ? {} : { pts: [[0.3, 0.55], [0.7, 0.55], [0.86, 0.86], [0.14, 0.86]] }) }]);
    if (res.ok) { await ed.loadPhoto(); ed.photoAlign = true; ed.setView("photo"); tab = "photo"; toast("Now drag the four dots onto a rectangle on the floor"); if (old && old !== ref) ed.store.removePhoto(old); }
  } catch (e) { toast("That photo couldn't be opened"); }
  photoBusy = false; render();
}
// The four floor dots, laid over the photo while marking. Dragging moves them live; letting go keeps it as one undo step.
const dotsEl = document.createElement("div"); dotsEl.id = "phDots"; dotsEl.setAttribute("aria-label", "Floor corners: drag each dot onto a corner of the rectangle");
dotsEl.innerHTML = `<svg width="100%" height="100%" preserveAspectRatio="none"><polygon fill="rgba(246,137,47,.12)" stroke="#f6892f" stroke-width="2"></polygon></svg>` + [1, 2, 3, 4].map(n => `<button class="phd" data-n="${n - 1}" aria-label="Dot ${n}">${n}</button>`).join("");
$("#stage").appendChild(dotsEl);
function placeDots() {
  const on = ed.view === "photo" && ed.photoAlign && ed.s.photo && ed.photoImg; dotsEl.style.display = on ? "block" : "none"; if (!on) return;
  const cv = ed.r.domElement; ["left", "top", "width", "height"].forEach(k => dotsEl.style[k] = cv.style[k]);
  const pts = ed.s.photo.pts, w = cv.clientWidth, h = cv.clientHeight;
  dotsEl.querySelector("polygon").setAttribute("points", pts.map(([u, v]) => (u * w) + "," + (v * h)).join(" "));
  dotsEl.querySelectorAll(".phd").forEach(b => { const [u, v] = pts[+b.dataset.n]; b.style.left = (u * 100) + "%"; b.style.top = (v * 100) + "%"; });
}
let drag = null;
dotsEl.addEventListener("pointerdown", e => { const b = e.target.closest(".phd"); if (!b) return; e.preventDefault(); b.setPointerCapture(e.pointerId); drag = { n: +b.dataset.n, before: ed.s.photo.pts.map(p => p.slice()) }; });
dotsEl.addEventListener("pointermove", e => { if (!drag) return; const rc = dotsEl.getBoundingClientRect(), u = Math.max(-0.2, Math.min(1.2, (e.clientX - rc.left) / rc.width)), v = Math.max(-0.2, Math.min(1.2, (e.clientY - rc.top) / rc.height)); ed.s.photo.pts[drag.n] = [u, v]; ed.syncPhoto(); placeDots(); });
const endDrag = () => { if (!drag) return; const pts = ed.s.photo.pts.map(p => p.slice()); ed.s.photo.pts = drag.before; drag = null; ed.run([{ op: "set_photo", pts }]); };
dotsEl.addEventListener("pointerup", endDrag); dotsEl.addEventListener("pointercancel", endDrag);
window.addEventListener("resize", () => setTimeout(placeDots, 50));

// ---------- Selected ----------
const SW = ["white", "ivory", "champagne", "blush", "gold", "silver", "black", "navy", "dark purple", "lavender", "burgundy", "emerald", "sage", "orange"];
// pieces drawn with their own fixed look (lights, drapes, candles, lounge pieces, screens): Material would change nothing, so it isn't offered
const NO_MAT = new Set(["pipe_drape", "shimmer_wall", "ceiling_drape", "candle_cluster", "uplight", "string_lights", "chandelier", "candle_floor", "hanging_greenery", "sofa", "lounge_chair", "ottoman", "marquee", "speaker", "screen", "fog", "cold_spark", "led_wall", "projector", "spotlight", "booth_360", "tent", "bud_vases", "table_garland", "bouquet", "branches"]);
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
   <label class="f">From ${ed.s.site ? "the left edge" : "left wall"} (${uL()})<input type="number" step="0.5" data-pos="x" value="${toU(it.x)}"></label>
   <label class="f">From ${ed.s.site ? "the top edge" : "front wall"} (${uL()})<input type="number" step="0.5" data-pos="z" value="${toU(it.z)}"></label>
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

// ---------- Site (outdoor designs) ----------
// The ground, the property line, buildings already there, an aerial picture to trace over, and the sun and shade.
// Tracing: tap the ground in the view (the Top view is easiest) at each corner; nothing changes until Done.
let trace = null; // {kind: "edge" | "area" | "marks", mat, pts}
const sqft = m2 => Math.round(m2 / S.FT / S.FT).toLocaleString();
const ZONES = [["", "This phone's time zone"], ["America/New_York", "Eastern"], ["America/Chicago", "Central"], ["America/Denver", "Mountain"], ["America/Phoenix", "Arizona"], ["America/Los_Angeles", "Pacific"], ["America/Anchorage", "Alaska"], ["Pacific/Honolulu", "Hawaii"]];
// Hours from UTC on that date (summer time included) in a named zone, or this phone's own zone.
function tzOn(date, zone) {
  const d = new Date(date + "T12:00:00");
  if (!zone) return -d.getTimezoneOffset() / 60;
  try { const t = new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: "shortOffset" }).formatToParts(d).find(x => x.type === "timeZoneName").value, m = t.match(/GMT([+-]\d+)(?::(\d+))?/); return m ? +m[1] + (m[2] ? Math.sign(+m[1]) * m[2] / 60 : 0) : 0; } catch (e) { return -d.getTimezoneOffset() / 60; }
}
let sunZone = "";
function shadeWords(r, sun) {
  if (!r) return "";
  const when = S.clock(sun.time) + " on " + S.dayName(sun.date);
  if (!r.up) return `<b>${when}:</b> the sun is down.` + (r.set ? ` Sunset is about ${S.clock(r.set)}.` : "");
  const seats = r.seats ? ` <b>${r.shaded} of ${r.seats} seats are in shade</b>${r.part ? `, ${r.part} partly (pergola slats)` : ""}${r.sunny ? `, ${r.sunny} in the sun` : ""}.` : " There are no seats on the site yet.";
  return `<b>${when}:</b> the sun is ${Math.round(r.elev)}° up in the ${S.compass(r.az)}.${seats}<div class="muted" style="margin-top:4px">Sunrise about ${S.clock(r.rise || "06:00")}, sunset about ${S.clock(r.set || "20:00")} ${'<span class="src estimated">worked out, not a forecast</span>'}</div>`;
}
function siteTab() {
  const s = ed.s, R = s.room, S0 = s.site, n = S.counts(s), sun = S0.sun, rep = S.shadeReport(s), A = S0.aerial;
  if (trace) return traceCard();
  const tm = sun ? sun.time.split(":").map(Number) : [12, 0], mins = tm[0] * 60 + tm[1];
  const bld = s.items.filter(i => i.kind === "building"), E = S0.edge;
  return `<div class="card"><b>${n.tables} tables · ${n.seats} seats</b><div class="muted">${fmt(R.w)} × ${fmt(R.d)} site, ${sqft(R.w * R.d)} sq ft (${(R.w * R.d / 4046.86).toFixed(2)} acres)</div></div>
  <h3>Sun and shade</h3><div class="card">
   <div id="shadeTxt">${shadeWords(rep, sun)}</div>
   <label class="f" style="margin-top:8px">Time of day: <b id="sunT">${S.clock(sun.time)}</b><input type="range" id="sunTime" min="300" max="1320" step="15" value="${mins}" aria-label="Time of day"></label>
   <div class="row" style="margin-top:6px"><label class="f">Date<input type="date" id="sunDate" value="${sun.date}"></label>
    <label class="f">Time zone<select id="sunZone">${ZONES.map(([z, l]) => `<option value="${z}" ${z === sunZone ? "selected" : ""}>${l}</option>`).join("")}</select></label></div>
   <div class="row" style="margin-top:6px"><label class="f">Latitude<input type="number" step="0.0001" id="sunLat" value="${sun.lat}"></label><label class="f">Longitude<input type="number" step="0.0001" id="sunLng" value="${sun.lng}"></label></div>
   <div class="row" style="margin-top:6px"><button class="btn l" data-x="sunHere">Use where I am</button><button class="btn ${ed.sunMarksOn ? "o" : "l"}" data-x="sunMarks">${ed.sunMarksOn ? "Hide sunny seats" : "Mark seats in the sun"}</button></div>
   <p class="muted">${esc(sun.place || "")}${sun.place ? " · " : ""}Shade is worked out from where the sun is, under tents, canopies, umbrellas, pergolas and buildings. It knows nothing about clouds or trees.${ed.quality === "high" ? "" : " Fast mode draws no shadows: use Mark seats in the sun."}</p></div>
  <h3>Property line</h3><div class="card">${E ? `<b>${fmt(E.pts.reduce((a, p, i) => a + Math.hypot(p[0] - E.pts[(i + 1) % E.pts.length][0], p[1] - E.pts[(i + 1) % E.pts.length][1]), 0))} around</b> · ${sqft(S.polyArea(E.pts))} sq ft
    <div class="row" style="margin-top:6px"><label class="f">Where it came from<select id="edgeSrc">${["measured", "confirmed", "estimated"].map(x => `<option ${x === E.src ? "selected" : ""}>${x}</option>`).join("")}</select></label><span class="src ${E.src}">${E.src}</span></div>
    <div class="row" style="margin-top:8px"><button class="btn l" data-x="trEdge">Trace it again</button><button class="btn ${confirmDel === "edge" ? "r" : "l"}" data-x="edgeDel">${confirmDel === "edge" ? "Tap again to remove it" : "Remove"}</button></div>
    <p class="muted">The designer warns when anything stands past this line.</p>`
    : `<p class="muted">Trace the edge of the property so nothing gets planned on the neighbor's land. Tap the ground at each corner, in order.</p><button class="btn o" data-x="trEdge">Trace the property line</button>`}</div>
  <h3>Ground</h3><div class="card"><div class="row"><label class="f">The whole site<select id="siteGround">${S.GROUND.map(g => `<option value="${g}" ${g === S0.ground ? "selected" : ""}>${esc(S.MATERIALS[g].label)}</option>`).join("")}</select></label></div>
   ${S0.areas.map(a => `<div class="row" style="margin-top:6px"><span style="flex:1">${esc(a.name)} <span class="muted">${esc(S.MATERIALS[a.mat].label.toLowerCase())} · ${sqft(S.polyArea(a.pts))} sq ft</span></span><button class="btn ${confirmDel === a.id ? "r" : "l"}" data-gdel="${a.id}">${confirmDel === a.id ? "Tap again" : "Remove"}</button></div>`).join("")}
   <div class="row" style="margin-top:8px"><label class="f">Paint an area with<select id="paintMat">${S.GROUND.map(g => `<option value="${g}" ${g === "asphalt" ? "selected" : ""}>${esc(S.MATERIALS[g].label)}</option>`).join("")}</select></label><button class="btn l" data-x="trArea" style="align-self:flex-end">Draw it</button></div>
   <p class="muted">Parking, paths, patios, gravel and sand: tap the ground at each corner of the area.</p></div>
  <h3>Buildings already there</h3><div class="card">${bld.map(b => `<div class="row" style="margin-bottom:6px"><span style="flex:1">${esc(b.label || "Building")} <span class="muted">${fmt(b.w)} × ${fmt(b.d)}, ${fmt(b.h)} tall</span></span><button class="btn l" data-pick="${b.id}">Edit</button></div>`).join("")}
   <button class="btn l" data-x="addBldg">Add a building</button><p class="muted">Size it under Selected to match the real one. Buildings cast shade too.</p></div>
  <h3>Picture from above</h3>${aerialCard(A)}
  <h3>Site size</h3><div class="row">${[["w", "Width"], ["d", "Length"]].map(([k, l]) => `<label class="f">${l} (${uL()})<input type="number" step="1" data-site="${k}" value="${toU(R[k])}"></label>`).join("")}
   <label class="f">North is turned (°)<input type="number" step="5" id="siteNorth" value="${S0.north || 0}"></label></div>
  <p class="muted">North is straight up in the Top view unless you turn it, for a site plan or picture that isn't north-up.</p>
  <h3>Units</h3><div class="row"><button class="btn ${U() === "ft" ? "" : "l"}" data-units="ft">Feet</button><button class="btn ${U() === "m" ? "" : "l"}" data-units="m">Meters</button></div>`;
}
function aerialCard(A) {
  if (!A) return `<div class="card"><p class="muted">Trace over a drone photo, a site plan from the venue, or a satellite screenshot. Use a picture you have the right to use. It's kept with this design, on this device and in your own Host Mode account.</p>
    <label class="btn o" style="display:inline-block">${photoBusy ? "Opening…" : "Choose a picture"}<input type="file" id="aeFile" accept="image/*" hidden></label></div>`;
  const sz = S.aerialSize(A, ed.s.room);
  return `<div class="card">${ed.aerialMissing ? `<p style="color:#a15c00">This picture isn't on this device or in your account any more.</p>` : ""}
   <b>${fmt(sz.w)} × ${fmt(sz.d)}</b> <span class="src ${sz.measured ? "measured" : "estimated"}">${sz.measured ? "to scale" : "not to scale yet"}</span>
   <p class="muted">${sz.measured ? `Scaled from ${fmt(A.len)} between your two marks.` : "Mark two spots you know the distance between (a building's front, a parking row, a lot line), then type that distance."}</p>
   <div class="row"><button class="btn ${sz.measured ? "l" : "o"}" data-x="trMarks">${sz.measured ? "Mark again" : "Mark a length I know"}</button>${sz.measured ? `<button class="btn l" data-x="aeFit">Make the site the picture's size</button>` : ""}</div>
   ${A.pa && A.pb ? `<div class="row" style="margin-top:6px"><label class="f">Real distance between the marks (${uL()}) <span class="src measured">measured</span><input type="number" step="0.5" min="1" id="aeLen" value="${A.len ? toU(A.len) : ""}" placeholder="e.g. 120"></label></div>` : ""}
   <div class="row" style="margin-top:6px"><label class="f">See-through<input type="range" id="aeOp" min="0.2" max="1" step="0.05" value="${A.opacity ?? 1}"></label><label class="f">Turn (°)<input type="number" step="1" id="aeRot" value="${A.rot || 0}"></label></div>
   <div class="row" style="margin-top:6px"><label class="btn l">Use a different picture<input type="file" id="aeFile" accept="image/*" hidden></label><button class="btn ${confirmDel === "aerial" ? "r" : "l"}" data-x="aeDel">${confirmDel === "aerial" ? "Tap again: the picture is deleted" : "Remove"}</button></div>
   <p class="muted">Sizes from a picture are only as good as the distance you type. Check anything that has to fit.</p></div>`;
}
function traceCard() {
  const t = trace, n = t.pts.length, need = t.kind === "marks" ? 2 : 3;
  const what = t.kind === "edge" ? "the property line" : t.kind === "area" ? "the " + S.MATERIALS[t.mat].label.toLowerCase() + " area" : "two marks on the picture";
  return `<div class="card"><b>Tracing ${esc(what)}</b>
   <p class="muted">${t.kind === "marks" ? "Tap the two ends of something whose real length you know." : "Tap the ground at each corner, going round in order."} The Top view is easiest. ${n} ${n === 1 ? "point" : "points"} so far.</p>
   <div class="row"><button class="btn g" data-x="trDone" ${n >= need ? "" : "disabled"}>Done</button><button class="btn l" data-x="trUndo" ${n ? "" : "disabled"}>Undo last point</button><button class="btn l" data-x="trCancel">Cancel</button></div></div>`;
}
function startTrace(kind, extra = {}) {
  trace = Object.assign({ kind, pts: [] }, extra); ed.select(null); if (ed.view !== "top") ed.setView("top");
  ed.groundTap = p => { if (trace.kind === "marks" && trace.pts.length >= 2) trace.pts = []; trace.pts.push(p); ed.setTrace(trace.pts, trace.kind !== "marks"); render(); };
  ed.setTrace([], kind !== "marks"); tab = "site"; render(); toast(kind === "marks" ? "Tap the first end" : "Tap the ground at the first corner");
}
function endTrace() { trace = null; ed.groundTap = null; ed.setTrace([]); render(); }
function finishTrace() {
  const t = trace; if (!t) return; let r;
  if (t.kind === "edge") r = ed.run([{ op: "trace_boundary", pts: t.pts, src: (ed.s.site.edge || {}).src || "estimated" }]);
  else if (t.kind === "area") r = ed.run([{ op: "paint_ground", mat: t.mat, pts: t.pts }]);
  else { const A = ed.s.site.aerial, R = ed.s.room; r = ed.run([{ op: "set_aerial", pa: S.siteToAerial(A, R, ...t.pts[0]), pb: S.siteToAerial(A, R, ...t.pts[1]), len: null }]); if (r.ok) setTimeout(() => { const el = $("#aeLen"); if (el) el.focus(); }, 50); }
  if (r && r.ok) { toast(t.kind === "marks" ? "Now type the real distance between the marks" : r.log[0]); endTrace(); }
}
async function useAerial(file) {
  if (!file || !/^image\//.test(file.type)) return toast("That isn't a picture");
  photoBusy = true; render();
  try {
    const bmp = await createImageBitmap(file), k = Math.min(1, 2048 / Math.max(bmp.width, bmp.height)), w = Math.round(bmp.width * k), h = Math.round(bmp.height * k);
    const c = document.createElement("canvas"); c.width = w; c.height = h; c.getContext("2d").drawImage(bmp, 0, 0, w, h); const url = c.toDataURL("image/jpeg", 0.85);
    const ref = S.uid("ph_"), old = ed.s.site.aerial && ed.s.site.aerial.ref, r = await ed.store.savePhoto(ref, url);
    if (!r.local && !r.cloud) toast("This picture can't be kept on this device, so it will be gone if the page closes");
    const res = ed.run([{ op: "set_aerial", ref, iw: w, ih: h, pa: [0.25, 0.5], pb: [0.75, 0.5], len: null, x: ed.s.room.w / 2, z: ed.s.room.d / 2, rot: 0, opacity: 1 }]);
    if (res.ok) { if (old && old !== ref) ed.store.removePhoto(old); ed.setView("top"); toast("Next: mark a length you know on the picture"); }
  } catch (e) { toast("That picture couldn't be opened"); }
  photoBusy = false; render();
}

// ---------- Views ----------
function viewsTab() {
  return `<div class="row"><button class="btn" data-x="saveView">Save this view</button><button class="btn l" data-x="png">Download a picture</button></div>
   <h3>Saved views</h3>${ed.s.views.map(v => `<button class="lib" style="width:100%;margin-bottom:6px" data-go="${v.id}">${esc(v.name)}</button>`).join("") || `<p class="muted">None yet.</p>`}
   <p class="muted">Walk: drag to look around, use the arrows (or W A S D on a keyboard) to move.</p>`;
}

// ---------- Save & share ----------
let projects = [];
const DEMO = new URLSearchParams(location.search).get("demo") === "1";
function fileTab() {
  const st = ed.store.status, revs = ed.store.revisions(ed.s.id);
  const cloud = { cloud: "Saved to your Host Mode account too.", "signed-out": "Only saved on this device. Sign in to Host Mode on this site to keep designs in your account.", "no-account": "Only saved on this device: this sign-in has no planner or host account.", offline: "Only saved on this device right now (can't reach Host Mode).", local: "Only saved on this device." }[st];
  return `<div class="card"><b>${esc(ed.s.name)}</b><div class="muted">${esc(cloud)}</div>
   <div class="row" style="margin-top:8px"><button class="btn g" data-x="save">Save a version</button><button class="btn l" data-x="new">New sample ballroom</button><button class="btn l" data-x="newSite">New outdoor site</button><button class="btn l" data-x="newLunch">Sample outdoor site</button><button class="btn ${confirmDel === "reset" ? "r" : "l"}" data-x="reset">${confirmDel === "reset" ? "Tap again to delete it" : "Start over"}</button></div>
   ${confirmDel === "reset" ? `<p class="muted" role="alert">${DEMO ? "This deletes every design made in this demo on this device, with their earlier versions and photos," : "This deletes this design, its earlier versions and its photo,"} and opens a fresh ${ed.s.site ? "sample outdoor site" : "sample ballroom"}. It can't be undone.</p>` : ""}</div>
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
  const out = !!ed.s.site; if (out && tab === "room") tab = "site"; if (!out && tab === "site") tab = "room";
  if (!out && trace) endTrace();
  document.querySelectorAll(".tabs button").forEach(b => b.classList.toggle("on", b.dataset.tab === tab));
  const rb = $("[data-tab=room]"), sb = $("[data-tab=site]"); if (rb) rb.hidden = out; if (sb) sb.hidden = !out;
  body.innerHTML = { ask: askTab, add: addTab, sel: selTab, light: lightTab, room: roomTab, site: siteTab, views: viewsTab, photo: photoTab, file: fileTab }[tab]();
  const pv = $("[data-view=photo]"); if (pv) pv.hidden = !ed.s.photo; placeDots();
  $("#undo").disabled = !ed.hist.length; $("#redo").disabled = !ed.fut.length;
  document.querySelectorAll("[data-view]").forEach(b => b.classList.toggle("on", b.dataset.view === ed.view));
  document.querySelectorAll("[data-mode]").forEach(b => b.classList.toggle("on", b.dataset.mode === ed.mode));
  $("#modes").style.display = ed.view === "walk" ? "none" : "flex"; $("#pad").style.display = ed.view === "walk" ? "grid" : "none";
  if (document.activeElement !== $("#name")) $("#name").value = ed.s.name;
  if (tab === "add") wantThumbs();
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
  if (d.x === "libClear") { libQ = libEv = libSt = ""; render(); return; }
  if (d.x === "phIn") { ed.setView("photo"); return; }
  if (d.x === "phOut") { ed.photoAlign = false; ed.setView("orbit"); return; }
  if (d.x === "phAlign") { if (ed.view !== "photo") { ed.photoAlign = true; ed.setView("photo"); } else { ed.photoAlign = !ed.photoAlign; ed.syncPhoto(); render(); } return; }
  if (d.x === "phBare") { ed.photoBare = !ed.photoBare; ed.syncPhoto(); render(); return; }
  if (d.x === "phRoom") { const P = ed.s.photo, c = S.photoCamera(P); if (c.ok) { const r = ed.run([{ op: "set_room", w: Math.max(2, P.w), d: Math.max(2, c.d) }, { op: "set_photo", ox: 0, oz: 0 }]); if (r.ok) toast("The room now matches the marked floor"); } return; }
  if (d.x === "phDel") { if (confirmDel !== "photo") { confirmDel = "photo"; render(); return; } confirmDel = null; const ref = ed.s.photo && ed.s.photo.ref; const r = ed.run([{ op: "clear_photo", confirm: true }]); if (r.ok) { if (ref) ed.store.removePhoto(ref); toast("Removed the photo from this design, this device and your account"); } return; }
  if (d.fcol) { ed.run([{ op: "change_material", id: "floor", color: d.fcol }]); return; }
  if (d.gdel) { if (confirmDel !== d.gdel) { confirmDel = d.gdel; render(); return; } confirmDel = null; ed.run([{ op: "remove_ground", id: d.gdel, confirm: true }]); return; }
  if (d.pick) { ed.select(d.pick); return; }
  switch (d.x) {
    case "trEdge": startTrace("edge"); return;
    case "trArea": startTrace("area", { mat: ($("#paintMat") || {}).value || "asphalt" }); return;
    case "trMarks": startTrace("marks"); return;
    case "trUndo": if (trace) { trace.pts.pop(); ed.setTrace(trace.pts, trace.kind !== "marks"); render(); } return;
    case "trCancel": endTrace(); return;
    case "trDone": finishTrace(); return;
    case "edgeDel": if (confirmDel !== "edge") { confirmDel = "edge"; render(); return; } confirmDel = null; ed.run([{ op: "trace_boundary", pts: [], confirm: true }]); return;
    case "addBldg": { const id = S.uid("i_"), r = ed.run([{ op: "add_building", id, x: ed.s.room.w / 2, z: ed.s.room.d / 2 }]); if (r.ok) { ed.select(id); toast("Added a building: set its size to match the real one"); } return; }
    case "aeFit": { const A = ed.s.site.aerial, sz = S.aerialSize(A, ed.s.room); const r = ed.run([{ op: "set_site", w: Math.min(400, Math.max(5, sz.w)), d: Math.min(400, Math.max(5, sz.d)) }, { op: "set_aerial", x: Math.min(400, sz.w) / 2, z: Math.min(400, sz.d) / 2, rot: 0 }]); if (r.ok) toast("The site is now the picture's size"); return; }
    case "aeDel": { if (confirmDel !== "aerial") { confirmDel = "aerial"; render(); return; } confirmDel = null; const ref = ed.s.site.aerial && ed.s.site.aerial.ref; const r = ed.run([{ op: "clear_aerial", confirm: true }]); if (r.ok && ref) { ed.store.removePhoto(ref); toast("Removed the picture from this design, this device and your account"); } return; }
    case "sunMarks": ed.setSunMarks(!ed.sunMarksOn); render(); return;
    case "sunHere": if (!navigator.geolocation) { toast("This browser can't share where you are"); return; }
      navigator.geolocation.getCurrentPosition(pos => { const r = ed.run([{ op: "set_sun", lat: +pos.coords.latitude.toFixed(4), lng: +pos.coords.longitude.toFixed(4), place: "" }]); if (r.ok) toast("Using where you are now. Change it if the site is somewhere else."); }, () => toast("Couldn't get where you are. Type the latitude and longitude instead."), { timeout: 10000 }); return;
  }
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
    // Start over: the design (in the demo, every demo design on this device) is deleted for good, with its versions and photo,
    // and a fresh sample ballroom opens. Tap twice. Keeps the demo from filling the phone's storage.
    case "reset": {
      if (confirmDel !== "reset") { confirmDel = "reset"; render(); break; }
      confirmDel = null; clearTimeout(ed.store.timer); // a save still waiting would bring the old design back
      const ids = new Set(DEMO ? ed.store.list().map(p => p.id) : []); ids.add(ed.s.id);
      const ref = ed.s.photo && ed.s.photo.ref, aref = ed.s.site && ed.s.site.aerial && ed.s.site.aerial.ref, wasSite = !!ed.s.site;
      for (const id of ids) await ed.store.remove(id); if (ref) await ed.store.removePhoto(ref); if (aref) await ed.store.removePhoto(aref); if (DEMO) await ed.store.clearPhotos();
      ed.photoBare = ed.photoAlign = false; ed.placeTop = null; ed.setPicking && ed.setPicking(false); if (trace) endTrace();
      ed.load(wasSite ? S.sampleSite() : S.sampleVenue()); await ed.store.save(ed.s, true); await refreshProjects(); tab = "file"; render();
      toast(DEMO ? "Started over: the demo's designs are deleted from this device" : "Started over: that design is deleted"); break;
    }
    case "new": ed.load(S.sampleVenue()); await ed.store.save(ed.s, true); refreshProjects(); toast("New sample ballroom"); break;
    case "newSite": case "newLunch": { if (trace) endTrace(); let ns = S.sampleSite(d.x === "newSite" ? "blank" : "luncheon");
      if (d.x === "newSite") { const n = new Date(), day = n.getFullYear() + "-" + String(n.getMonth() + 1).padStart(2, "0") + "-" + String(n.getDate()).padStart(2, "0"), r = S.apply(ns, [{ op: "set_sun", date: day, time: "12:00", tz: tzOn(day, "") }]); if (r.ok) ns = r.scene; } // a new site starts on today, at noon
      ed.load(ns); }
      await ed.store.save(ed.s, true); refreshProjects(); tab = "site"; render(); toast(d.x === "newSite" ? "New outdoor site: trace the property line, paint the ground, then add tents" : "Opened the corporate luncheon sample site"); break;
    case "json": { const out = S.clone(ed.s); if (out.photo) { const img = await ed.store.loadPhoto(out.photo.ref); if (img) out.photo_image = img; } if (out.site && out.site.aerial) { const img = await ed.store.loadPhoto(out.site.aerial.ref); if (img) out.aerial_image = img; } dl(new Blob([JSON.stringify(out, null, 1)], { type: "application/json" }), safeName(ed.s) + ".hostmode-venue.json"); break; }
    case "glb": try { dl(await ed.exportGLB(), safeName(ed.s) + ".glb"); } catch (er) { toast("Couldn't make the 3D model file"); } break;
  }
});
body.addEventListener("input", e => { if (e.target.id === "libQ") { libQ = e.target.value.slice(0, 60); refreshLib(); }
  if (e.target.id === "sunTime") { const m = +e.target.value, t = String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0"), el = $("#sunT"); if (el) el.textContent = S.clock(t); } });
body.addEventListener("change", async e => {
  const t = e.target, it = ed.sel && ed.itemOf(ed.sel);
  if (t.id === "phFile" && t.files[0]) { usePhoto(t.files[0]); t.value = ""; return; }
  if (t.id === "aeFile" && t.files[0]) { useAerial(t.files[0]); t.value = ""; return; }
  if (t.id === "sunTime") { const m = +t.value; ed.run([{ op: "set_sun", time: String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0") }]); if (ed.sunMarksOn) ed.drawSunMarks(); return; }
  if (t.id === "sunDate" && t.value) { ed.run([{ op: "set_sun", date: t.value, tz: tzOn(t.value, sunZone) }]); return; }
  if (t.id === "sunZone") { sunZone = t.value; ed.run([{ op: "set_sun", tz: tzOn(ed.s.site.sun.date, sunZone) }]); return; }
  if (t.id === "sunLat" || t.id === "sunLng") { if (t.value === "" || !isFinite(+t.value)) return; ed.run([{ op: "set_sun", [t.id === "sunLat" ? "lat" : "lng"]: +t.value, place: "" }]); return; }
  if (t.id === "edgeSrc" && ed.s.site.edge) { ed.run([{ op: "trace_boundary", pts: ed.s.site.edge.pts, src: t.value }]); return; }
  if (t.id === "siteGround") { ed.run([{ op: "set_site", ground: t.value }]); return; }
  if (t.dataset.site) { ed.run([{ op: "set_site", [t.dataset.site]: fromU(t.value) }]); return; }
  if (t.id === "siteNorth") { ed.run([{ op: "set_site", north: +t.value || 0 }]); if (ed.s.site.sun) ed.run([{ op: "set_sun" }]); return; }
  if (t.id === "aeLen") { const v = t.value.trim(); ed.run([{ op: "set_aerial", len: v === "" || !isFinite(+v) ? null : fromU(v) }]); return; }
  if (t.id === "aeOp") { ed.run([{ op: "set_aerial", opacity: +t.value }]); return; }
  if (t.id === "aeRot") { ed.run([{ op: "set_aerial", rot: +t.value || 0 }]); return; }
  if (t.dataset.ph) { const k = t.dataset.ph, v = t.value.trim(); if (k === "d") { ed.run([{ op: "set_photo", d: v === "" ? null : fromU(v), dSrc: "measured" }]); return; } if (v === "" || !isFinite(+v)) return; ed.run([{ op: "set_photo", [k]: fromU(v) }]); return; }
  if (t.id === "libEv" || t.id === "libSt") { if (t.id === "libEv") libEv = t.value; else libSt = t.value; refreshLib(); return; }
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
    try { const raw = JSON.parse(await t.files[0].text()), img = typeof raw.photo_image === "string" && /^data:image\/(jpeg|png|webp);base64,/.test(raw.photo_image) ? raw.photo_image : null; const aimg = typeof raw.aerial_image === "string" && /^data:image\/(jpeg|png|webp);base64,/.test(raw.aerial_image) ? raw.aerial_image : null; const s = S.validateFile(raw); if (s.photo && img) await ed.store.savePhoto(s.photo.ref, img); if (s.site && s.site.aerial && aimg) await ed.store.savePhoto(s.site.aerial.ref, aimg); s.id = s.id || S.uid("v_"); ed.load(s); await ed.store.save(ed.s, true); refreshProjects(); toast("Opened " + s.name); }
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
