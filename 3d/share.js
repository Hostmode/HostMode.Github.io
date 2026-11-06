// Sharing and versions for the Save & share panel (part 1: named versions).
// A version's name is kept with the version itself ({t, s, name} on the device, planners/{uid}/venue3dRevName/{id}/{time}
// in the account), so a share link can show named options later. Naming never changes the design, so it doesn't go through
// apply(): it only changes the saved copy's label. Named versions are never pushed out by the 20-version limit.

export const MAX_NAME = 40;

// A name is plain text: trimmed, one line, at most 40 letters. It's only ever shown as text, never run.
export function cleanName(v) {
  return String(v == null ? "" : v).replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, MAX_NAME);
}

// Keeps every named version, plus the newest `max` unnamed ones. Newest first, as saved.
export function trimRevs(revs, max) {
  let n = 0;
  return revs.filter(r => r.name || ++n <= max);
}

// The "Earlier versions" part of Save & share: named versions on top, then the automatic ones.
// `revs` is store.revisions(id); `editing` is the version's time being named ("cur" for the current design).
export function versionsHtml(revs, editing, esc, draft) {
  const named = revs.filter(r => r.name), auto = revs.filter(r => !r.name);
  const when = t => new Date(t).toLocaleString();
  const box = key => `<div class="row" style="margin:4px 0 8px"><label class="muted" for="vName" style="flex:1 1 100%">Name (up to ${MAX_NAME} letters)</label><input id="vName" maxlength="${MAX_NAME}" value="${esc(draft || "")}" placeholder="Option A" style="flex:1;min-width:0"><button class="btn g" data-vsave="${key}">Save name</button><button class="btn l" data-vcancel="1">Cancel</button></div>`;
  const row = (r, isNamed) => `<div style="margin-bottom:8px"><div class="row"><span style="flex:1">${isNamed ? `<b>${esc(r.name)}</b> ` : ""}<span class="${isNamed ? "muted" : ""}">${esc(when(r.t))}</span> <span class="muted">${r.items} objects</span></span><button class="btn l" data-rev="${r.t}">${isNamed ? "Open" : "Go back to this"}</button></div>
    <div class="row" style="margin-top:4px">${isNamed ? `<button class="btn l" data-vname="${r.t}">Rename</button><button class="btn l" data-vunname="${r.t}">Remove name</button>` : `<button class="btn l" data-vname="${r.t}">Name this version</button>`}</div>
    ${String(editing) === String(r.t) ? box(r.t) : ""}</div>`;
  return `<h3>Named versions</h3>
   <div class="row"><button class="btn o" data-vname="cur">Name this version</button></div>
   <p class="muted" style="margin:6px 0">Saves the design as it is now with a name, like “Option A”. Named versions are kept for good.</p>
   ${editing === "cur" ? box("cur") : ""}
   ${named.map(r => row(r, true)).join("") || `<p class="muted">No named versions yet.</p>`}
   <h3>Earlier versions</h3><p class="muted" style="margin:0 0 6px">The last ${20} automatic versions.</p>
   ${auto.map(r => row(r, false)).join("") || `<p class="muted">Tap “Save a version” to keep a copy you can go back to.</p>`}`;
}
