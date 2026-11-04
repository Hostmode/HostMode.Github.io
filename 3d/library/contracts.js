// The shared formats every part of the 3D designer's upgrade uses: research findings, asset specs,
// asset records (what the library shows) and check results. One file, so the research sessions,
// the builder agent, the reviewer and the checks all read the same rules. See 3d/library/README.md.
// Each check returns a list of problems in plain words; an empty list means it's valid.

export const EVENTS = ["wedding", "shower", "birthday", "anniversary", "corporate", "gala", "graduation", "holiday", "community"];
export const STYLES = ["classic", "modern", "rustic", "glam", "garden", "boho", "minimal", "romantic", "playful"];
export const STATUS = ["research", "spec", "model", "integrate", "checked", "sent-back"];
export const ROLES = ["research", "modeling", "integration"];
export const CONFIDENCE = ["low", "medium", "high"];
export const PRIORITY = ["now", "next", "later"];

const isStr = (v, max = 400) => typeof v === "string" && v.trim().length > 0 && v.length <= max;
const isId = v => typeof v === "string" && /^[a-z][a-z0-9_]{1,40}$/.test(v);
const isDate = v => typeof v === "string" && /^\d{4}-\d{2}(-\d{2})?$/.test(v);
const isUrl = v => typeof v === "string" && /^https:\/\/[^\s]+$/.test(v);
const strList = (v, of) => Array.isArray(v) && v.length > 0 && v.every(x => of ? of.includes(x) : isStr(x, 60));
const num = (v, lo, hi) => typeof v === "number" && isFinite(v) && v >= lo && v <= hi;

// A research finding: what someone found out, with the pages it came from.
// {id, topic, events[], summary, sources:[{url, title, date?, note?}], confidence, licence, found (YYYY-MM-DD)}
export function checkFinding(f) {
  const p = [];
  if (!f || typeof f !== "object") return ["not a finding"];
  if (!isId(f.id)) p.push("id must be lowercase letters, numbers and _");
  if (!isStr(f.topic, 80)) p.push("needs a topic");
  if (!strList(f.events, EVENTS)) p.push("events must come from: " + EVENTS.join(", "));
  if (!isStr(f.summary, 1200)) p.push("needs a summary");
  if (!Array.isArray(f.sources) || !f.sources.length) p.push("needs at least one source");
  else f.sources.forEach((s, i) => { if (!isUrl(s && s.url)) p.push("source " + (i + 1) + " needs an https link"); if (!isStr(s && s.title, 200)) p.push("source " + (i + 1) + " needs a title"); if (s && s.date != null && !isDate(s.date)) p.push("source " + (i + 1) + " date must be YYYY-MM or YYYY-MM-DD"); });
  if (!CONFIDENCE.includes(f.confidence)) p.push("confidence must be low, medium or high");
  if (!isStr(f.licence, 300)) p.push("say what the sources allow (we describe and link; we never copy their pictures)");
  if (!isDate(f.found)) p.push("needs the date it was found");
  return p;
}

// An asset spec: what a new or improved piece should be, and the findings behind it.
// {id, name, category, tags[], events[], styles[], size:{w,d,h} (meters), materials[], colors, placement,
//  compatible[], modeling, priority, findings[] (finding ids), status}
export function checkSpec(s, findingIds = null) {
  const p = [];
  if (!s || typeof s !== "object") return ["not a spec"];
  if (!isId(s.id)) p.push("id must be lowercase letters, numbers and _");
  if (!isStr(s.name, 60)) p.push("needs a name");
  if (!isStr(s.category, 40)) p.push("needs a category");
  if (!strList(s.tags)) p.push("needs tags");
  if (!strList(s.events, EVENTS)) p.push("events must come from: " + EVENTS.join(", "));
  if (!strList(s.styles, STYLES)) p.push("styles must come from: " + STYLES.join(", "));
  if (!s.size || !["w", "d", "h"].every(k => num(s.size[k], 0.001, 40))) p.push("size needs w, d and h in meters"); // 1 mm and up, like asset records (an aisle runner is 5 mm)
  if (!strList(s.materials)) p.push("needs materials");
  if (!isStr(s.placement, 400)) p.push("say where it goes");
  if (!isStr(s.modeling, 800)) p.push("say how to build its shape");
  if (!PRIORITY.includes(s.priority)) p.push("priority must be now, next or later");
  if (!Array.isArray(s.findings) || !s.findings.length) p.push("needs the findings that support it");
  else if (findingIds) s.findings.forEach(f => { if (!findingIds.has(f)) p.push("unknown finding " + f); });
  if (!STATUS.includes(s.status)) p.push("status must be one of: " + STATUS.join(", "));
  return p;
}

// An asset record: one piece in the library, as the designer shows it.
// {id (the scene kind), name, description, category, tags[], events[], styles[], maker, size:{w,d,h},
//  settings[], budget:{tris, meshes}, source:{kind, licence}, version, status}
export function checkRecord(r, catalog = null) {
  const p = [];
  if (!r || typeof r !== "object") return ["not a record"];
  if (!isId(r.id)) p.push("id must be lowercase letters, numbers and _");
  if (catalog && !catalog[r.id]) p.push("no library piece called " + r.id);
  if (!isStr(r.name, 60)) p.push("needs a name");
  if (!isStr(r.description, 300)) p.push("needs a description");
  if (!isStr(r.category, 40)) p.push("needs a category");
  if (!strList(r.tags)) p.push("needs tags");
  if (!strList(r.events, EVENTS)) p.push("events must come from: " + EVENTS.join(", "));
  if (!strList(r.styles, STYLES)) p.push("styles must come from: " + STYLES.join(", "));
  if (!isStr(r.maker, 80)) p.push("say which shape maker draws it");
  if (!r.size || !["w", "d", "h"].every(k => num(r.size[k], 0.001, 40))) p.push("size needs w, d and h in meters");
  if (!Array.isArray(r.settings)) p.push("settings must be a list");
  if (!r.budget || !num(r.budget.tris, 10, 400000) || !num(r.budget.meshes, 1, 200)) p.push("budget needs tris and meshes");
  if (!r.source || !isStr(r.source.kind, 40) || !isStr(r.source.licence, 200)) p.push("source needs kind and licence");
  if (!Number.isInteger(r.version) || r.version < 1) p.push("version must be 1 or more");
  if (!STATUS.includes(r.status)) p.push("status must be one of: " + STATUS.join(", "));
  return p;
}

// A check result: one run of the asset check on one piece.
// {asset, version, pass, tris, meshes, ms, problems[], role (who it goes back to), when}
export function checkResult(c) {
  const p = [];
  if (!c || typeof c !== "object") return ["not a check result"];
  if (!isId(c.asset)) p.push("needs the asset id");
  if (typeof c.pass !== "boolean") p.push("pass must be true or false");
  if (!Array.isArray(c.problems)) p.push("problems must be a list");
  if (!c.pass && !ROLES.includes(c.role)) p.push("a failed check says who it goes back to: " + ROLES.join(", "));
  return p;
}
