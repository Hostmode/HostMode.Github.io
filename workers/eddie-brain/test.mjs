// Tests for Eddie's brain with a pretend AI (no network). Run: node workers/eddie-brain/test.mjs
import worker, { clean, dayTable, prompt } from "./src/index.js";

let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log("FAIL " + m); } else console.log("ok   " + m); };
const store = new Map();
globalThis.caches = { default: { match: async k => store.get(k.url)?.clone(), put: async (k, r) => store.set(k.url, r) } };
const ctx = { waitUntil: p => p };
const req = (path, o = {}) => new Request("https://eddie-brain.x.workers.dev" + path, o);
const post = (body, origin = "https://hostmode.github.io") =>
  req("/ask", { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(body) });

// the form check
const c = clean({ job: "pull", for: "Rosa's 30th", items: [{ what: "gold chairs", qty: 20.7 }, { what: "", qty: 3 }, { what: "x", qty: -5 }],
  date: "2026-11-12", time: "3:05", email: 5, help: 99, say: "Adding chairs!\n", extra: "<script>" }, 10);
ok(c.job === "pull" && c.items.length === 2 && c.items[0].qty === 20 && c.items[1].qty === 0, "items are whole numbers and blanks are dropped");
ok(c.time === "03:05" && c.date === "2026-11-12" && c.email === "" && c.help === 0 && !("extra" in c), "time, date, email, help and unknown fields are checked");
ok(clean({ job: "delete everything", date: "next week", time: "25:00" }, 5).job === "none", "an unknown job becomes none");
ok(clean({ job: "date", date: "next week", time: "25:00" }, 5).date === "" && clean({ time: "25:00" }, 5).time === "", "bad dates and times are dropped");
ok(clean(null, 1).job === "none" && clean({ job: "help", help: 3 }, 5).help === 3, "empty answers and help numbers");
ok(dayTable("2026-11-06").split("\n")[0] === "today, Friday 2026-11-06" && dayTable("2026-11-06").includes("tomorrow, Saturday 2026-11-07") && dayTable("2026-11-06").includes("next week's Saturday 2026-11-14"), "the calendar names tomorrow's weekday and next week's days");
ok(prompt("hi", "2026-11-06", ["Add a new client"])[0].content.includes("1. Add a new client"), "Help desk titles are numbered in the prompt");

// the pages
let seen = null;
const env = { AI: { run: async (model, inp) => { seen = { model, inp };
  if (inp.response_format) return { response: { job: "date", for: "Rosa", title: "Walkthrough", date: "2026-11-12", time: "15:00", say: "Putting it on the calendar!" } };
  return { response: "Hi Roy!" }; } } };
let r = await worker.fetch(post({ text: "put a walkthrough with Rosa on Thursday at 3", today: "2026-11-06", help: ["Add a new client"] }), env, ctx);
let j = await r.json();
ok(r.status === 200 && j.ok && j.job === "date" && j.time === "15:00" && r.headers.get("access-control-allow-origin") === "https://hostmode.github.io", "/ask answers Host Mode's site with a checked job");
ok(seen.model === "@cf/meta/llama-3.1-8b-instruct" && seen.inp.messages[1].content.startsWith("put a walkthrough"), "the small model gets only the sentence as the question");
r = await worker.fetch(post({ text: "hi" }, "https://evil.example"), env, ctx);
ok(r.status === 403, "other websites are refused");
r = await worker.fetch(req("/ask", { method: "OPTIONS", headers: { origin: "http://localhost:8765" } }), env, ctx);
ok(r.status === 204 && r.headers.get("access-control-allow-methods").includes("POST"), "the browser's pre-check is answered for the test server");
r = await worker.fetch(post({ text: "" }), env, ctx);
ok(r.status === 400, "an empty question is refused");
let n = 0;
const flaky = { AI: { run: async m => { n++; if (m.includes("8b")) throw new Error("JSON Mode couldn't be met"); return { response: '{"job":"lead","name":"Maria Lopez","say":"New lead!"}' }; } } };
j = await (await worker.fetch(post({ text: "new lead maria lopez" }), flaky, ctx)).json();
ok(j.ok && j.job === "lead" && j.name === "Maria Lopez" && n === 2 && j.model.includes("70b"), "if the small model can't fill the form, the big one tries (text answers are read too)");
const down = { AI: { run: async () => { throw new Error("daily free allocation used up"); } } };
r = await worker.fetch(post({ text: "add 20 chairs" }), down, ctx);
j = await r.json();
ok(r.status === 503 && j.error === "busy" && r.headers.get("access-control-allow-origin"), "when the free amount is used up, the page is told it's busy");
r = await worker.fetch(req("/hello"), env, ctx);
ok((await r.json()).reply === "Hi Roy!", "/hello still works");
r = await worker.fetch(req("/other"), env, ctx);
ok(r.status === 404, "other pages are not here");

console.log(fails ? `${fails} failed` : "Eddie brain: all passed");
process.exit(fails ? 1 : 0);
