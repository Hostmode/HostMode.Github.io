// Eddie's brain (test version). Only /hello for now: proves the Cloudflare keys and the free AI work.
// The real version (jobs Eddie can do, the knowledge pack, only answering Host Mode's own pages) comes later.

// Tried in order; the first one this account can run is used.
const MODELS = ["@cf/meta/llama-3.1-8b-instruct-fast", "@cf/meta/llama-3.1-8b-instruct", "@cf/meta/llama-3.2-3b-instruct"];

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "public, max-age=600" } });

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname !== "/hello") return json({ ok: false, error: "Not here yet" }, 404);

    // One answer per 10 minutes, so nobody can use up the free daily amount by calling this over and over.
    const cache = caches.default, key = new Request(url.origin + "/hello");
    const hit = await cache.match(key);
    if (hit) return hit;

    const tried = [];
    for (const model of MODELS) {
      try {
        const out = await env.AI.run(model, {
          messages: [
            { role: "system", content: "You are Eddie, Host Mode's super assistant: a small, friendly one-eyed monster who helps people plan and run events. Answer in one short, cheerful sentence." },
            { role: "user", content: "Say hello to Roy, who just set up your brain." },
          ],
          max_tokens: 60,
        });
        const res = json({ ok: true, model, reply: String(out && out.response || "").trim() });
        ctx.waitUntil(cache.put(key, res.clone()));
        return res;
      } catch (e) {
        tried.push(model + ": " + String(e && e.message || e).slice(0, 200));
      }
    }
    return json({ ok: false, error: "No model answered", tried }, 502);
  },
};
