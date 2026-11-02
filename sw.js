/* Offline copy of the app so it still opens when the hall has no signal.
   Pages: fresh from the network when possible, saved copy when not.
   Libraries and fonts: saved copy first, refreshed in the background.
   Live data (Firebase) is never touched here. */
const CACHE = "hostmode-v6";
const LIBS = /^https:\/\/(www\.gstatic\.com\/firebasejs|cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com)\//;

self.addEventListener("install", e => {
  /* games.html loads its code from js/ and its look from css/, so those are kept too (the list matches HM_FILES in games.html) */
  const APP = ["00-constants", "01-content", "02-core", "03-guest", "04-moderator", "05-custom-games", "06-event-types", "07-actions", "08-admin", "09-menu",
    "10-party-games", "11-tonight", "12-planning", "13-teammates", "14-client-portals", "15-client-tools", "16-planner-portal", "17-inventory-venue",
    "18-support-staff", "19-leads-boot"].map(f => "js/" + f + ".js");
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(["games.html", "index.html", "hosts.html", "planners.html", "drinks.html", "demo.html", "css/games.css"].concat(APP)).catch(() => {})));
  self.skipWaiting();
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const same = url.origin === self.location.origin;
  if (same && (req.mode === "navigate" || /\.html$/.test(url.pathname) || url.pathname.endsWith("/"))) {
    e.respondWith(
      fetch(url.href, { cache: "no-cache", credentials: "same-origin" }).then(r => { if (r.ok) { const c = r.clone(); caches.open(CACHE).then(x => x.put(url.pathname, c)); } return r; })
        .catch(() => caches.match(url.pathname).then(r => r || caches.match("games.html")))
    );
    return;
  }
  /* the app's own code and styles: always check for a newer copy, keep it for when there's no signal */
  if (same && /\.(js|css)$/.test(url.pathname) && !/sw\.js$/.test(url.pathname)) {
    e.respondWith(fetch(url.href, { cache: "no-cache", credentials: "same-origin" })
      .then(r => { if (r.ok) { const c = r.clone(); caches.open(CACHE).then(x => x.put(url.pathname, c)); } return r; })
      .catch(() => caches.match(url.pathname)));
    return;
  }
  if (LIBS.test(req.url)) {
    e.respondWith(caches.open(CACHE).then(c => c.match(req).then(hit => {
      const net = fetch(req).then(r => { if (r.ok || r.type === "opaque") c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    })));
  }
});
