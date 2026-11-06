// Eddie's brain: a Cloudflare Worker on Workers AI (free plan, 10,000 units a day).
//   GET  /hello  a test answer, cached 10 minutes (the install workflow checks it)
//   POST /ask    {text, today, help:[titles]}  →  one job Eddie can do, as checked JSON
// Privacy: the page sends only what the person said, today's date and the Help desk titles. It never sends client,
// lead or inventory lists; names are matched to real records on the person's own phone. Nothing is stored here, and
// Cloudflare does not train on what Workers AI is sent.

const HELLO_MODELS = ["@cf/meta/llama-3.1-8b-instruct-fast", "@cf/meta/llama-3.1-8b-instruct", "@cf/meta/llama-3.2-3b-instruct"];
// JSON mode models (Cloudflare's JSON mode list): the small one first, the big one if the small one can't fill the form.
const ASK_MODELS = ["@cf/meta/llama-3.1-8b-instruct", "@cf/meta/llama-3.3-70b-instruct-fp8-fast"];
const ORIGINS = [/^https:\/\/hostmode\.github\.io$/, /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/];
export const JOBS = ["pull", "date", "client", "lead", "help", "none"];

const cors = origin => origin ? { "access-control-allow-origin": origin, "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type", "access-control-max-age": "86400", vary: "origin" } : {};
const json = (body, status = 200, extra = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...extra } });

// ---- the form Eddie fills in ----
export const SCHEMA = {
  type: "object",
  properties: {
    job: { type: "string", enum: JOBS },
    for: { type: "string" },                 // which event, client or booking, in the person's words
    items: { type: "array", items: { type: "object", properties: { what: { type: "string" }, qty: { type: "integer" } }, required: ["what", "qty"] } },
    title: { type: "string" }, date: { type: "string" }, time: { type: "string" },
    name: { type: "string" }, email: { type: "string" }, phone: { type: "string" },
    kind: { type: "string" }, guests: { type: "integer" },
    help: { type: "integer" },               // number of the Help desk title that answers a how-to question, 0 if none
    say: { type: "string" },                 // one short friendly sentence from Eddie
  },
  required: ["job", "say"],
};

const WD = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export function dayTable(today) {
  const t = new Date(today + "T12:00:00Z"), out = [];
  for (let i = 0; i < 28; i++) { const d = new Date(t); d.setUTCDate(t.getUTCDate() + i);
    out.push(`${i === 0 ? "today" : i === 1 ? "tomorrow" : WD[d.getUTCDay()]} ${d.toISOString().slice(0, 10)}${i >= 7 ? " (" + WD[d.getUTCDay()] + " week after)" : ""}`); }
  return out.join("\n");
}

export function prompt(text, today, help) {
  return [
    { role: "system", content:
`You are Eddie, the super assistant inside Host Mode, an app for event planners. Read what the planner said and fill in the form for ONE job.

Jobs:
- "pull": add rental items or decor to a pull list. items = each thing and how many (qty), for = the event, client or party it's for, date = when it goes out if they said one.
- "date": put something on the calendar for a client. title = what it is (like "Venue walkthrough"), date, time (24-hour HH:MM, empty if none), for = the client or event.
- "client": add a new client. name = the client's name, date = their event date if said, kind = the kind of event if said.
- "lead": add a new lead (someone interested, not booked yet). name, email, phone, kind, guests, date if said.
- "help": a how-to question about Host Mode. help = the number of the Help desk title below that answers it best (0 if none fits).
- "none": anything else, or you can't tell. Ask them to say it another way in "say".

Rules:
- Dates: use the calendar below and write YYYY-MM-DD. "Thursday" means the next Thursday from today. Leave date empty if they didn't say one.
- Times: "3" or "3pm" in the afternoon context means 15:00; "9am" means 09:00.
- Only use words the planner said. Never invent names, emails, phone numbers or items.
- "say" is one short, cheerful sentence about what you're about to do (or your answer), under 20 words. Don't say it's done: the planner still has to tap Yes.
- Fill fields you don't need with "" or 0, and items with [].

Calendar:
${dayTable(today)}

Help desk titles:
${help.map((h, i) => `${i + 1}. ${h}`).join("\n")}` },
    { role: "user", content: text },
  ];
}

// ---- check everything the model sends back; nothing unexpected reaches the page ----
const str = (v, n) => (typeof v === "string" ? v : "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, n);
export function clean(o, helpCount) {
  o = o && typeof o === "object" ? o : {};
  const job = JOBS.includes(o.job) ? o.job : "none";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(str(o.date, 10)) ? str(o.date, 10) : "";
  const tm = str(o.time, 5).match(/^(\d{1,2}):(\d{2})$/);
  const time = tm && +tm[1] < 24 && +tm[2] < 60 ? String(+tm[1]).padStart(2, "0") + ":" + tm[2] : "";
  const items = (Array.isArray(o.items) ? o.items : []).slice(0, 12)
    .map(x => ({ what: str(x && x.what, 60), qty: Math.min(10000, Math.max(0, Math.floor(+(x && x.qty) || 0))) }))
    .filter(x => x.what);
  const help = Math.floor(+o.help || 0);
  return {
    job, for: str(o.for, 80), items, title: str(o.title, 80), date, time,
    name: str(o.name, 80), email: str(o.email, 120), phone: str(o.phone, 30), kind: str(o.kind, 40),
    guests: Math.min(100000, Math.max(0, Math.floor(+o.guests || 0))),
    help: help >= 1 && help <= helpCount ? help : 0,
    say: str(o.say, 160),
  };
}

function parseOut(out) {
  const r = out && out.response;
  if (r && typeof r === "object") return r;
  const s = String(r || ""), a = s.indexOf("{"), b = s.lastIndexOf("}");
  if (a < 0 || b <= a) throw new Error("no JSON in the answer");
  return JSON.parse(s.slice(a, b + 1));
}

async function ask(env, body) {
  const text = str(body && body.text, 300);
  const today = /^\d{4}-\d{2}-\d{2}$/.test(String(body && body.today)) ? body.today : new Date().toISOString().slice(0, 10);
  const help = (Array.isArray(body && body.help) ? body.help : []).slice(0, 120).map(h => str(h, 90)).filter(Boolean);
  if (!text) return json({ ok: false, error: "empty" }, 400);
  const tried = [];
  for (const model of ASK_MODELS) {
    try {
      const out = await env.AI.run(model, { messages: prompt(text, today, help), max_tokens: 260, temperature: 0.1,
        response_format: { type: "json_schema", json_schema: SCHEMA } });
      return json({ ok: true, model, ...clean(parseOut(out), help.length) });
    } catch (e) {
      tried.push(model + ": " + String(e && e.message || e).slice(0, 160));
    }
  }
  // Out of free units for today, or the models are down: the page falls back to its own simple understanding.
  return json({ ok: false, error: "busy", tried }, 503);
}

async function hello(env, ctx, url) {
  const cache = caches.default, key = new Request(url.origin + "/hello");
  const hit = await cache.match(key);
  if (hit) return hit;
  const tried = [];
  for (const model of HELLO_MODELS) {
    try {
      const out = await env.AI.run(model, { messages: [
        { role: "system", content: "You are Eddie, Host Mode's super assistant: a small, friendly one-eyed monster who helps people plan and run events. Answer in one short, cheerful sentence." },
        { role: "user", content: "Say hello to Roy, who just set up your brain." }], max_tokens: 60 });
      const res = json({ ok: true, model, reply: String(out && out.response || "").trim() }, 200, { "cache-control": "public, max-age=600" });
      ctx.waitUntil(cache.put(key, res.clone()));
      return res;
    } catch (e) { tried.push(model + ": " + String(e && e.message || e).slice(0, 200)); }
  }
  return json({ ok: false, error: "No model answered", tried }, 502);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/hello" && request.method === "GET") return hello(env, ctx, url);
    if (url.pathname !== "/ask") return json({ ok: false, error: "Not here" }, 404);
    const origin = request.headers.get("origin") || "";
    const allowed = ORIGINS.some(r => r.test(origin)) ? origin : "";
    if (!allowed) return json({ ok: false, error: "Only Host Mode's own pages can ask Eddie" }, 403);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(allowed) });
    if (request.method !== "POST") return json({ ok: false, error: "Use POST" }, 405, cors(allowed));
    const len = +(request.headers.get("content-length") || 0);
    if (len > 16000) return json({ ok: false, error: "Too long" }, 413, cors(allowed));
    let body; try { body = JSON.parse((await request.text()).slice(0, 16000)); } catch (e) { return json({ ok: false, error: "Bad request" }, 400, cors(allowed)); }
    const res = await ask(env, body);
    Object.entries(cors(allowed)).forEach(([k, v]) => res.headers.set(k, v));
    res.headers.set("cache-control", "no-store");
    return res;
  },
};
