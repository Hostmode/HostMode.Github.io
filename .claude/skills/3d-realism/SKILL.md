---
name: 3d-realism
description: Use when making the 3D designer look more realistic (hyperrealism): presentation renders, ambient occlusion, sky and lighting, ground and fabric textures, or applying realism to a new library piece. Also covers adding Three.js addons safely and testing renders in a headless browser.
---

# Realism in the 3D designer

Read the `3d-designer` skill first. This one is what we learned making it look real (Nov 5, 2026, PR #49). Investigation notes: `3d/RENDERING-INVESTIGATION.md`.

## The principles (apply them to every new piece)

1. **Real size, real scale.** Pieces use true rental sizes in meters; textures use `size`/`span` so weave, planks and blades stay true to scale.
2. **Contact shadows.** Anything standing on the ground gets `contactShadow()` at its feet; this does more for "grounded" than any material.
3. **Rounded edges.** Use `rbox()` (cached, shared) for anything a person would touch. Sharp box corners read as fake.
4. **Surface detail in the maps, not the geometry.** Draw detail into the color and bump canvases in `surface()` (`3d/decor.js`) so draw calls stay low. Share materials so `mergeParts` can join parts.
5. **Break up tiling.** Mix a fine noise with a large, low-frequency one (grass uses 55/45) and draw wrapped detail (blades are drawn again at ±N near edges so the texture still tiles).
6. **Light and sky.** Outdoor sites have a gradient sky dome (`makeSky`, `updateSky` in `3d/editor.js`) driven by `MOODS` (`zen` zenith, `sky2` horizon). A new look must set both.
7. **Ambient occlusion for stills only.** The "Presentation picture" (`ed.presentation()`, `3d/post.js`) uses GTAO. It roughly doubles frame time, so never run it while editing.

## Adding a Three.js addon (do it like post.js)

- The shared bundle `3d/vendor/three-bundle.min.js` is never changed: the office imports it too.
- Copy the addon files from the SAME release tag (`npm pack three@0.187.0`) into `3d/vendor/addons/`, keeping the folder layout, and rewrite `from 'three'` to the relative path of the bundle. Every name the addons import must be exported by the bundle; check by importing the bundle in Node and testing each name (a missing one fails only at runtime in the browser).
- Load addons with dynamic `import()` from one isolated module so only `venue3d.html` pays for them. Fall back to the plain render if the import fails.
- Name the addons in `THREE-LICENSE.txt` if you add new ones (MIT, same as Three.js).

## Traps

- **`ShaderMaterial` already injects the tone mapping and color space chunks.** Adding `#include <tonemapping_pars_fragment>` or `<colorspace_pars_fragment>` yourself gives "redefinition" errors and a black or missing object. Only add the `*_fragment` includes at the end of `main()`.
- **A sky dome must follow the camera** (copy `cam.position` each frame), use `depthWrite: false`, `side: BackSide`, `fog: false`, and `userData.thru` so taps go through it. Scale it inside the camera far plane (350 vs far 400).
- **`PCFSoftShadowMap` was removed in r187** and logs a warning; that warning is old and harmless.
- **`camPreset()` doesn't always move the camera in tests.** For test pictures set `ed.persp.position` and `ed.orbit.target` directly, then `ed.orbit.update()`.
- **Snapshots of a half-lit scene mislead.** Wait about 700 ms after `setMood()` before `snapshot()`.
- **A first look from far away hides texture work.** Check a new texture from about 1 m above the ground.

## Testing renders

- No Playwright system-wide: `python3 -m venv /tmp/v && /tmp/v/bin/pip install playwright && /tmp/v/bin/python -m playwright install --with-deps chromium`.
- The repo's checks expect a server on port 8765: `python3 -m http.server 8765` from the repo root, then run `agents/venue3d_site_check.py`, `office3d_check.py`, `venue3d_asset_check.py` with that Python. Stop the server by its PID afterward (`ps aux | grep http.server`, then `kill <pid>`).
- For your own pictures: open `venue3d.html?demo=1`, open the Files tab, click `[data-x=newSite]` for an outdoor site, then call `hm3d.editor.snapshot(w)` (stills) or `await hm3d.editor.presentation(w)` (AO). The test browser draws in software: say so, and ask Roy to try it on his phone.
- Look at the picture. Passing checks prove a piece builds, not that it looks right.

## Files

`3d/post.js` (AO module) · `3d/vendor/addons/` (r187 addons) · `3d/editor.js` (`makeSky`, `updateSky`, `presentation`, `MOODS`) · `3d/decor.js` (`surface()` textures).
