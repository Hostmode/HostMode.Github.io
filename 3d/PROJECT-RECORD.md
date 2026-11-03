# Host Mode 3D Venue Designer — Project Record

Started Nov 3, 2026. Branch: `venue-3d-prototype` (not on main, not deployed). Status words: **Done** = built and tested here; **Planned** = not built.

## 1. Audit of the existing platform (Milestone 1) — Done

| Area | What exists |
|---|---|
| Hosting | GitHub Pages, repo `Hostmode/HostMode.Github.io`, branch `main` is production. No build step. |
| App | Vanilla JavaScript. `games.html` joins 23 files in `js/` (listed in HM_FILES) and runs them as one script. Offline copy in `sw.js`. |
| Database | Firebase Realtime Database (project `spark-drinks-2d185`), compat SDK 10.12.2 from gstatic. No Firebase Storage in use. |
| Accounts | Firebase Auth email/password. Planners and hosts are `planners/{uid}` (profile.kind). Owner at `partygames/owner`, admins at `partygames/admins`. |
| Permissions | `planners/{uid}` is readable by that account, the owner, admins and support staff, and writable by that account and owner/admins. A new `planners/{uid}/venue3d` path needs **no rule change**. |
| Venue features today | Planner portal Venue tab (`js/17-inventory-venue.js`): spaces, bookings, blocked days. Seating appears in planning screens. No 3D or floor-plan engine. The agent office is a hand-drawn SVG "3D" scene, not a 3D engine. |
| AI | Claude via `ANTHROPIC_API_KEY` in GitHub Actions only. Nothing calls an AI model from the browser (correctly, since the site is public). |
| Testing | `agents/check_all.sh` (syntax, Stay & Go math, scripted demo checks), Playwright screen comparisons, nightly tap-everything crawl. |
| Backups | Nightly encrypted database backup (`ops/BACKUPS.md`). |

### Agent capability map (from reading the workflow files and agent code; none were run from this session)

| Agent | Runs | Can read code | Can change code | Can run tests | Can research the web | How it hands work on |
|---|---|---|---|---|---|---|
| Test customer (night) | nightly, Claude | demos only | no | uses the demos | no | files support tickets |
| Technical agent (night) | nightly, Claude | yes | yes, as pull requests (2 fixes a night max) | yes | no | pull requests for Roy |
| Builder | `claude` label / @claude, Sonnet | yes | yes, own branch + pull request. Phase 1: screens and wording only | `check_all.sh`, screens | no (no web tools allowed) | pull request |
| Reviewer | every pull request, Sonnet | yes | no (comments only), auto-merges "low risk" | reads check results | no | pull request comment |
| Builder queue | issue labels, Haiku | no | no | no | no | starts the builder on the next "queue" issue |
| Pull request checks | every pull request, no AI | — | no | yes | no | pass/fail |
| Tap-everything crawl | nightly, no AI | — | no | yes | no | files GitHub issues, starts the queue |
| Backup | nightly, no AI | — | no | no | no | encrypted artifact |
| Tutorial videos | 4 daytime slots, Claude | demos | no | records demos | no | draft release |
| Monday report | weekly | — | no | no | no | GitHub issue |

Notes:
- The brief says "two night agents and six specialized agents." I found the two night agents and eight other automated jobs (the agent office shows six: tester, tech, builder, reviewer, checks, backup). Please confirm which six you mean.
- Delegation is real but indirect: night agents → tickets → technical agent; crawl → issues → builder queue → builder → reviewer. No agent can message another directly.
- **No agent can research the web**, so Milestone 2 research was done in this session.
- **What fits the existing agents now:** the builder can take small, well-written issues inside `3d/` once this branch is on GitHub (new library items, wording, panel layout). The reviewer and pull request checks already cover it (`check_all.sh` now runs the 3D model checks). **Needs your approval (agent changes):** adding a "venue designer" role to the test customer and adding `venue3d.html` to the crawl's SCREENS.
- No agent settings or permissions were changed.

## 2. Technology decision (Milestone 2) — Recommendation, needs your OK

**Recommendation: build Host Mode's own engine on Three.js (MIT), written as plain JavaScript modules like the rest of Host Mode, with the library copied into the repo.** Borrow ideas from the candidates; don't fork any of them.

| | Pascal Editor | Aedifex | OpenPlan3D |
|---|---|---|---|
| License | MIT | MIT (built on Pascal) | MIT |
| Activity | Very active, ~25k stars | Small (~54 stars) | Moderate (~260 stars) |
| Stack | Next.js 16, React 19, React Three Fiber, WebGPU renderer, Bun monorepo | Same as Pascal, pnpm | SvelteKit, Three.js |
| Strengths | Real architecture: mitered walls, CSG door/window cuts, levels, 50-step undo, MCP server for AI | In-editor assistant with 16 tools, previews before applying, collision auto-correct | Apple RoomPlan import (multi-scan stitching), DXF/PDF/SVG export, walkthrough |
| Storage | Browser IndexedDB / local SQLite | Not described | On the device only |
| AI | MCP server and skills | OpenAI-compatible API, server side | None |
| Fit for Host Mode | Second app with its own build system and server; heavy for phones | Same, plus OpenAI-only | Different framework, local-only |

Why own it: Host Mode has no build step, runs on GitHub Pages and Firebase, and is used mostly on Android phones. Pulling in a Next.js/React monorepo means a second app, a server, and a toolchain the agents don't know. A focused engine on Three.js matches the codebase, costs nothing to host, and is all ours.

- **Reused (ideas):** Pascal's schema-checked scene nodes and one-step undo; Aedifex's tool list and preview-before-keep; OpenPlan3D's RoomPlan import (to port later as an importer).
- **Reused (code):** Three.js r187 only (MIT; license in `3d/vendor/THREE-LICENSE.txt`). All furniture and textures are drawn in code, so there are no third-party assets to license.
- **Not reused:** whole repositories, Pascal's WebGPU-only renderer, Aedifex's OpenAI dependency, browser-only storage.
- **Graphics:** WebGL 2 now (works on almost every phone). WebGPU is detected and reported; Three.js's WebGPU renderer is the path to higher-quality renders later.
- **Formats:** Host Mode venue JSON is the source of truth; glTF binary (.glb) for export. OpenUSD isn't needed yet.
- **Blender:** worth using later for high-quality stills from the .glb export (free, could run in GitHub Actions). Not part of the editor.
- **Running cost of this prototype:** $0. GitHub Pages hosting; a design is about 30–60 KB in the database.

### Photo-to-3D (Milestone 6) — Planned, not tested
- Editable geometry: a photo plus one known measurement (say, a door is 7 ft) → Claude's image understanding proposes room size, doors and windows, every number marked **estimated**; the person corrects and confirms. The scene already stores where each room size came from (measured / confirmed / estimated / unknown).
- Visual realism (Gaussian splatting, NeRF, photogrammetry) needs many photos and GPU servers: a paid service or a home GPU. That's a separate, later decision. It does not produce editable walls by itself.
- LiDAR (Apple RoomPlan): import adapter later, never required.

## 3. What was built (Milestones 3–5) — Done on the branch

New files only; nothing in the live app was changed except one line in `agents/check_all.sh`.

- `venue3d.html` — the designer page (not linked from anywhere, marked noindex).
- `3d/scene.js` — the scene model: walls, doors, windows, room size with dimension sources, 27-item library, 14 materials, lights, and the **validated steps** (set_room, add_wall, add_opening, add_item, move_object, rotate_object, resize_object, duplicate_object, delete_object, change_material, add_light, modify_lighting, arrange_tables, save_view). A batch either fully passes or changes nothing. Deleting needs an OK. Unknown steps are refused, so no arbitrary code runs.
- `3d/scene.js` `interpret()` — free plain-language reader that turns requests into those same steps.
- `3d/editor.js` — the 3D view: dollhouse walls, drag arrows to move/turn/resize with snapping, top/front/side views, walk mode with on-screen arrows, shadows (Fast mode for weaker phones), pictures (.png), 3D model export (.glb).
- `3d/store.js` — saving: a working copy and 20 versions on the device, plus `planners/{uid}/venue3d` in Host Mode's database when signed in.
- `3d/app.js` — the panels: Ask, Add, Selected, Lights, Room, Views, Save & share.
- `3d/decor.js` — surfaces (textures, bump maps, sheen, clear coat) and every piece of furniture and decor.
- Tests: `agents/venue3d_test.mjs` (46 model checks, free) and `agents/venue3d_browser.py` (24 browser steps with screenshots).

### Test results (Nov 3, 2026, headless Chrome with software graphics)
All pass: opens with 4 walls, doors and windows · room drawn · top/front/side views · walk moves · tap selects · move (chairs follow their table) · turn · resize · material · drag arrows · warm lighting · undo/redo · **AI instruction "Move the stage to the front, create a dance floor in the center, arrange eight round tables around it" → preview → kept → 8 tables, 64 chairs, dance floor centered, no overlaps** · removal asks first · save, close, reopen · export venue file · export .glb · re-import · phone width with no sideways scrolling · no page errors.
The assistant also refuses honestly when things don't fit: 120 guests in the 60×45 ft sample room → "won't fit", and the same request in an 80×60 ft room seats all 120.

### Known limits (not yet true)
- **Cloud saving is written but untested**: this sandbox can't reach Firebase. It needs one signed-in test on the live site.
- The plain-language reader handles common requests only. A real AI model (Claude) can send the same steps, but connecting one safely needs a small server to hold the key (decision below).
- Not tested on real phones yet, only phone-sized headless Chrome.
- Walls are straight 4-wall rooms plus extra walls; no L-shaped room drawing tool, columns as library items, no multi-floor.
- Collision checks use boxes (round tables count as squares).
- Photo reconstruction: not started.

## 3b. Decor library and surface quality (Nov 3, 2026) — Done on the branch

Roy asked for a decorator's library before going further. Priority order is what decorators change most often first; it's also the order of the Add tab.

| Priority | Category | Built |
|---|---|---|
| 1 | Linens (on every table) | Floor-length, lap-length, fitted spandex, pleated skirt or no cloth; square or sequin overlay; satin or sequin runner; charger plates; napkins. Any color. |
| 2 | Chair dressing (on every chair) | Banquet or fitted spandex covers, satin sashes tied in a bow; chair styles Chiavari, ghost, cross-back, folding. |
| 3 | Balloons | Garland, full arch, column, balloon wall, each with a color set (Blush, Garden, Navy, Host Mode, Classic, Jewel, Rainbow or any colors). Gold and silver balloons are chrome. |
| 4 | Backdrops and drapery | Backdrop, pipe and drape, flower wall, shimmer (sequin) wall, ceiling draping. |
| 5 | Centerpieces (sit on the table) | Low floral, tall floral, candle cluster. One step puts one on every table. |
| 6 | Lighting and candles | Uplights (real colored light), string lights, chandelier (real light), floor candles, light truss. |
| 7 | Florals and greenery | Floral arch, aisle flower stand, hanging greenery, potted plant. |
| 8 | Lounge and accents | Sofa, lounge chair, ottoman, coffee table, area rug, welcome sign (shows its label), marquee letters (LOVE or the label's letters), gift table. |

50 library pieces in all, 20 materials. How it works:
- Linens and chair dressing are settings on each table and chair (`dress`), not separate objects, so "Use this look on all tables" restyles a whole room in one step, and re-arranging tables keeps the look (cloths, chairs, covers, sashes, centerpieces).
- New checked steps: `dress_object`, `decorate_tables`, `swap_style`. Centerpieces ride on their table (move, copy and delete with it); ceiling pieces follow the ceiling height; neither counts as an overlap.
- The Ask box understands decor requests, e.g. "Ivory floor-length linens with gold sequin runners and blush napkins", "Add white spandex chair covers with blush sashes", "Switch to ghost chairs", "Put tall centerpieces on every table", "Add a blush and gold balloon arch at the back", "Add string lights over the dance floor". "More elegant" now means ivory floor-length linens, champagne runners and sashes, gold chargers, tall centerpieces and warmer light.

Surfaces (all drawn in code, still nothing to license): every surface now has a bump map and true-to-scale texture. Planked oak and herringbone floors with per-plank tone and joints; polished floors, marble and the dance floor have a clear coat; woven linen, satin and velvet have fabric sheen; sequins catch light; plaster walls; patterned banquet carpet; soft studio reflections so gold, chrome, glass and satin read correctly; window frames, paneled doors, baseboards and crown molding. "Fast" quality skips bumps, sheen and the small decor lights for weaker phones.

Not yet: realistic photo textures (would need licensed or self-made photo scans), wrinkles that react to objects (cloth is shaped, not simulated), text on marquee letters beyond a small built-in alphabet, rentals/inventory link (planned with integration: each piece could map to the planner's Inventory items and counts).

## 4. Decisions for Roy
1. **Getting the branch onto GitHub.** This session was refused permission to push. Options: (a) give this session push access when asked, (b) start a Claude Code session on the repo and ask it to apply the branch bundle, (c) leave it here for now.
2. **Foundation.** Approve "our own engine on Three.js", or ask for a Pascal-based separate app instead (more features sooner, much heavier, second toolchain).
3. **Real AI for the Ask box.** (a) stay with the free reader, (b) a small Cloudflare Worker holding the Claude key (free tier; a few tenths of a cent per request on your prepaid credits), (c) Firebase Functions (needs the paid Blaze plan).
4. **Photo test.** Send a photo of a venue you have permission to use, plus one real measurement.
5. **Agent changes.** OK to add the designer to the nightly test customer and the crawl?

## 5. Next work after approval
Live cloud-save test → real phone test → Milestone 6 photo test → planner portal integration plan (Venue tab "Open in 3D", seat counts into guest counts, saved venue templates, client portal view-only, importer/export tabs, Help desk entries, Report a problem button).
