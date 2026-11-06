---
name: 3d-designer
description: Use when changing Host Mode's 3D venue designer (venue3d.html, 3d/), adding library pieces, working on the Photo view or outdoor sites, or building anything else on its engine, like the agent office in real 3D (office3d.html).
---

# The 3D designer

Status, decisions and limits live in `3d/PROJECT-RECORD.md`; the library's formats in `3d/library/README.md`. Read the record first.

## Where things are

- `venue3d.html` with `3d/`:
  - `scene.js`: the design model, the checked steps and the plain-language reader (`interpret`, `KIND_WORDS`).
  - `editor.js`: the Three.js view.
  - `decor.js`: surfaces and every piece's shape (`buildItem`); `decor_more.js` holds the newer pieces (add new ones there). See also the `3d-realism` skill.
  - `store.js`: saving on the device and to `planners/{uid}/venue3d`.
  - `app.js`: the panels.
  - Three.js is copied into `3d/vendor`, so there's no build step.
- **Every change goes through `scene.js` `apply()`, never raw code.** A batch either fully passes or changes nothing; deleting needs `confirm: true`.
- The portal's 3D designer tab and the admin console's agent office run in floating windows that survive the page's redraws. Each sits over an empty `.hmfloat` slot (`FLOATS` and `floatPlace` in `js/17-inventory-venue.js`) and is hidden and paused (`HM3D_PAUSED`) on other tabs.
- **Sets:** `it.set` plus `s.sets`, with the steps group_objects, move_set, rotate_set, duplicate_set, delete_set, ungroup_objects and rename_set. Attached pieces (`it.group`, like chairs and centerpieces) always come along. In the editor, `grp` is a selected set, moved by a stand-in point.
- **CATALOG flags:**
  - `top`: sits on a table.
  - `ceiling`: hangs from the ceiling.
  - `floor`: part of the floor layer.
  - `over`: tents and fog; never counts as bumping into things.
  - `oneSide`: head and sweetheart tables, seated on one side.
  - `structure`: columns.
- **Eddie (Nov 6, 2026):** the Add tab's box is "Ask Eddie" (`eddieGo` in app.js: `S.interpret` as a preview, else a library search). New pieces land at `ed.landingSpot()` (the floor in the middle of the view) or, with "Where I tap", at the next `groundTap` (`startPlace`/`endPlace`; leaving the Add tab cancels it). The portal's Eddie calls `window.hm3d.ask(text)` on the designer tab. Check: `agents/venue3d_eddie_check.py`.
- **Openings** are doors, windows, or `opening` (an open doorway with no door). Walls under 1.5 m are knee walls, and the dollhouse view never hides them.

## Adding a piece (Phase 4 added 28 this way)

1. Save a research finding in `3d/library/research/` with at least one real page you actually opened, and a spec in `specs/` pointing at it. Use real rental sizes, in meters.
2. Add its `CATALOG` entry (`scene.js`) with the right flags, and its shape in `buildItem` (`decor.js`).
3. Add its line in `META` (`3d/library/assets.js`): description, tags, event types and styles. Search reads all of these, plus everyday words (`SAY`), so "baby shower" works.
4. Put its words near the top of `KIND_WORDS`, so "add a …" in the Ask box finds it before an older, vaguer word does. Check that numbers in its name aren't read as a count ("a 360 booth" is one booth).
5. Run `bash agents/check_all.sh`, then look at the piece (below). The asset check proves it builds and fits its budget, not that it looks right.

## Traps that cost time

- **Detail budget:** draw calls, not triangles, slow phones. Parts sharing a material are joined (`mergeParts`), so keep materials shared, and mark a part `userData.keep` if it must stay separate. Tiny repeated things (buttons, sparks, candies) use the low-detail `DOT` sphere; full spheres blew three budgets.
- **Shared geometry** (`userData.shared`) is never disposed. Mark anything you reuse across rebuilds, like the office's people.
- **Gold on big flat faces looks brown,** because it mostly reflects the dark room. Use a gilded finish (less metal, more color), as on the throne.
- **Turning things:** a chair's front is +z, and turning it by `rot` points its front at (−sin rot, cos rot). Facing a table means rot = 180° minus its direction from the table. Getting this backwards had every side chair facing away, and it passed every check.
- **Long pieces need fewer segments:** a 24 ft head table at the normal cloth detail blew the Tables budget.
- **Color sets:** `mkItem` takes colors, not set names. Pass `S.PALETTES.hostmode.slice()`; `add_item` converts names, `mkItem` doesn't.
- **Tapping:** lines catch taps from a meter away by default, so set `ray.params.Line.threshold` small. A piece's spot must also be inside the picture: on an upright phone, step the camera back (the office's `goRoom`).
- **Big data never lives inside a design:** it's copied into 20 versions and every undo step. Photos are stored once (IndexedDB plus `planners/{uid}/venue3dPhoto/{ref}`), and the design holds only a reference. Removing the photo or the design deletes it.
- **Glass that bends light** doubled the time to draw a frame, so glass stays see-through.

## The Photo view (Stage A)

- `s.photo` holds `{ref, iw, ih, pts, w, d/dSrc, ox, oz}`: `pts` are the 4 floor dots, from 0 to 1, and `w` is the measured near edge.
- `S.photoCamera()` works out the camera, lens and depth from the four dots and one length. The model checks test it against a camera we know.
- The photo sits in an `<img>` behind a see-through canvas the photo's shape, so the photo keeps its own colors.
- Only the typed length is labeled "measured"; everything else is "estimated".

## Checking

- **The checks:**
  - `agents/venue3d_test.mjs`: the model checks.
  - `agents/venue3d_asset_check.py`: every piece built in a browser and held to its budget.
  - `agents/venue3d_photo_check.py`: the photo feature and Start over.
  - `agents/venue3d_site_check.py`: outdoor sites, tracing, the aerial picture and shade.
  - `agents/office3d_check.py`: the agent office.

  All five are in `check_all.sh`, and each has a self-test with planted mistakes.
- **Look at it.** Photograph each new piece alone, close up as well as from a distance. Use `agents/venue3d_shots.py` for before and after pictures. Look at anything turned or placed from straight above too.
- **In tests, wait for a result, not a fixed time.** Rebuilding a room takes seconds with the test browser's software graphics; a correct Start over looked like a failure because the test checked too early.
- **Measured speed isn't phone speed.** The sandbox draws in software, so say so and ask Roy to try it on his phone.

## Outdoor sites (Nov 4, 2026)

- **A design is outdoor when it has `s.site`** (`{ground, areas, edge, north, sun, aerial}`); the room is the site's size with a 30 m sky limit and no walls. Never change indoor behavior when adding outdoor features: guard with `s.site`.
- **North is −z** (up in the Top view), east is +x, unless `site.north` turns it. A compass bearing goes through `S.sunVec()`; don't work out directions by hand.
- **Shade:** every shading piece has `shade` ("roof", "slats", "round" or "box") and, for roofs, `eave` in CATALOG. A new tent or umbrella needs both, or the shade count silently ignores it.
- **Tracing** is the editor's `groundTap` hook: while it's set, taps give a ground point instead of picking a piece. Always clear it (`endTrace()`) when leaving.
- **The aerial picture** is stored like venue photos (a `ph_` ref) and must be deleted with the design (`store.remove`) and on Start over.
- **Wording:** sun and shade are "worked out, not a forecast"; generator distances say "check with the venue and the fire marshal". Never promise a layout passes inspection.
- **Checks:** `agents/venue3d_site_check.py`, and the "outdoor:" model checks in `venue3d_test.mjs`.
- **Traps:** a tent's ridge pole lies right above the middle table, so a tap there picks the tent; test taps away from the ridge. Outdoors a big site has 2 to 3 times the draw calls of the ballroom (mostly chairs): watch it on a real phone.

## The agent office (office3d.html, 3d/office.js)

- **Built on this engine:** the building is one design (22.5 by 10 m, two rooms, knee-height inside walls with open doorways, a corridor), furnished from the library. `Office` extends `Editor`; people are its own figures, re-added after each build.
- **The Agents tab owns the data** (`js/18-support-staff.js`). It sends `{hmOffice:"state", cast, sel, night, prs, tickets, budget}`, and a tap here sends back `{hmOffice:"pick", k}`.
- **Studio crew news** comes from real GitHub pull requests (`AG_CREW`), never made up.
- **Who walks:** working nightly helpers walk their routes. Finished crew carry their work down the corridor to Roy's door and back.

## Phase 6 note
26 more pieces (see 3d/PROJECT-RECORD.md) live in `3d/decor_more.js`. Sizes marked ESTIMATE in `3d/library/research/estimated_sizes_p6.json` still need a real page. The ADA ramp must stay 1:12 (a test enforces it).
