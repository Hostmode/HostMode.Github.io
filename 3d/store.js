// Where venue designs are kept.
// - In the browser (localStorage): a quick working copy and the last 20 versions, so nothing is lost if the tab closes.
// - In Host Mode's database, when someone is signed in: planners/{uid}/venue3d/{id} (the design) and
//   planners/{uid}/venue3dRev/{id}/{time} (earlier versions). Only that account, admins and support staff can
//   read planners/{uid}, under the existing database rules, so no rule change is needed.
// The browser copy is a cache. The database copy is the real one once cloud saving is on.
import { validateFile } from "./scene.js";

const K = "hm3d_", MAX_REV = 20;
const ls = {
  get(k, d) { try { const v = localStorage.getItem(K + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(K + k, JSON.stringify(v)); return true; } catch (e) { return false; } },
  del(k) { try { localStorage.removeItem(K + k); } catch (e) {} }
};

// Venue photos are big (a few hundred KB), so each one is stored once, apart from the design and its 20 versions:
// on the device in IndexedDB (far more room than localStorage), and in the account at planners/{uid}/venue3dPhoto/{ref}.
// The design only holds the photo's ref and how it lines up. Photos are re-drawn through a canvas before they're kept,
// which drops the camera's hidden details (location, phone model).
const PHOTOS = new Map();
function idb() { return new Promise((res, rej) => { try { const r = indexedDB.open("hm3d", 1); r.onupgradeneeded = () => r.result.createObjectStore("photos"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); } catch (e) { rej(e); } }); }
async function idbDo(mode, fn) { const db = await idb(); return new Promise((res, rej) => { const tx = db.transaction("photos", mode), q = fn(tx.objectStore("photos")); tx.oncomplete = () => res(q && q.result); tx.onerror = () => rej(tx.error); }); }

export class Store {
  constructor() { this.uid = null; this.db = null; this.timer = null; this.status = "local"; }

  // Turn on cloud saving if Firebase is on the page and the person is signed in to Host Mode.
  async connect(config) {
    try {
      if (!window.firebase || !config) return this.setStatus("local");
      if (!firebase.apps.length) firebase.initializeApp(config);
      this.db = firebase.database();
      await new Promise(res => { const off = firebase.auth().onAuthStateChanged(u => { off(); this.uid = u ? u.uid : null; res(); }); setTimeout(res, 4000); });
      if (!this.uid) return this.setStatus("signed-out");
      const prof = await this.db.ref("planners/" + this.uid + "/profile/name").once("value");
      if (!prof.exists()) { this.uid = null; return this.setStatus("no-account"); }
      return this.setStatus("cloud");
    } catch (e) { return this.setStatus("offline"); }
  }
  setStatus(s) { this.status = s; this.onStatus && this.onStatus(s); return s; }

  list() {
    const idx = ls.get("index", {});
    return Object.values(idx).sort((a, b) => b.updated - a.updated);
  }
  async listCloud() {
    if (this.status !== "cloud") return [];
    const v = (await this.db.ref("planners/" + this.uid + "/venue3dIndex").once("value")).val() || {};
    return Object.values(v).sort((a, b) => b.updated - a.updated);
  }

  // Saved a second after the last change, so dragging doesn't write dozens of copies.
  autosave(s) { clearTimeout(this.timer); this.timer = setTimeout(() => this.save(s, false), 900); }

  async save(s, revision = true) {
    s.updated = Date.now();
    const okLocal = ls.set("p_" + s.id, s);
    const idx = ls.get("index", {}); idx[s.id] = { id: s.id, name: s.name, updated: s.updated, items: s.items.length }; ls.set("index", idx);
    if (revision) { const revs = ls.get("r_" + s.id, []); revs.unshift({ t: s.updated, s }); ls.set("r_" + s.id, revs.slice(0, MAX_REV)); }
    let okCloud = null;
    if (this.status === "cloud") {
      try {
        const base = "planners/" + this.uid;
        // Stored as text: the database can't hold some of the shapes a scene has (empty lists, nulls).
        const up = {};
        up[base + "/venue3d/" + s.id] = { name: s.name, updated: s.updated, json: JSON.stringify(s) };
        up[base + "/venue3dIndex/" + s.id] = { id: s.id, name: s.name, updated: s.updated, items: s.items.length };
        if (revision) up[base + "/venue3dRev/" + s.id + "/" + s.updated] = JSON.stringify(s);
        await this.db.ref().update(up); okCloud = true;
      } catch (e) { okCloud = false; }
    }
    this.lastSave = { local: okLocal, cloud: okCloud, t: s.updated };
    this.onSave && this.onSave(this.lastSave);
    return this.lastSave;
  }

  async open(id) {
    if (this.status === "cloud") {
      try { const v = (await this.db.ref("planners/" + this.uid + "/venue3d/" + id + "/json").once("value")).val(); if (v) return validateFile(JSON.parse(v)); } catch (e) {}
    }
    const s = ls.get("p_" + id, null); return s ? validateFile(s) : null;
  }
  // ---- venue photos ----
  async savePhoto(ref, dataUrl) {
    PHOTOS.set(ref, dataUrl); let local = false, cloud = null;
    try { await idbDo("readwrite", st => st.put(dataUrl, ref)); local = true; } catch (e) {}
    if (this.status === "cloud") { try { await this.db.ref("planners/" + this.uid + "/venue3dPhoto/" + ref).set(dataUrl); cloud = true; } catch (e) { cloud = false; } }
    return { local, cloud };
  }
  async loadPhoto(ref) {
    if (PHOTOS.has(ref)) return PHOTOS.get(ref);
    let v = null; try { v = await idbDo("readonly", st => st.get(ref)); } catch (e) {}
    if (!v && this.status === "cloud") { try { v = (await this.db.ref("planners/" + this.uid + "/venue3dPhoto/" + ref).once("value")).val(); if (v) idbDo("readwrite", st => st.put(v, ref)).catch(() => {}); } catch (e) {} }
    if (v) PHOTOS.set(ref, v); return v || null;
  }
  async removePhoto(ref) { PHOTOS.delete(ref); try { await idbDo("readwrite", st => st.delete(ref)); } catch (e) {} if (this.status === "cloud") { try { await this.db.ref("planners/" + this.uid + "/venue3dPhoto/" + ref).remove(); } catch (e) {} } }
  revisions(id) { return ls.get("r_" + id, []).map(r => ({ t: r.t, items: r.s.items.length })); }
  revision(id, t) { const r = ls.get("r_" + id, []).find(x => x.t === t); return r ? validateFile(JSON.parse(JSON.stringify(r.s))) : null; }
  async remove(id) {
    const cur = ls.get("p_" + id, null); if (cur && cur.photo && cur.photo.ref) await this.removePhoto(cur.photo.ref); // a removed design takes its photo with it
    ls.del("p_" + id); ls.del("r_" + id); const idx = ls.get("index", {}); delete idx[id]; ls.set("index", idx);
    if (this.status === "cloud") { const b = "planners/" + this.uid; const up = {}; up[b + "/venue3d/" + id] = null; up[b + "/venue3dIndex/" + id] = null; up[b + "/venue3dRev/" + id] = null; await this.db.ref().update(up); }
  }
}
