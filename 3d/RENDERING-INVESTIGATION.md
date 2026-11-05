# Rendering upgrade investigation (Phase 2, Nov 4, 2026)

Nothing here changes `3d/vendor/three-bundle.min.js`. It is Three.js r187 (MIT, `3d/vendor/THREE-LICENSE.txt`), shared by `venue3d.html` and `office3d.html`.

## What is already in the bundle (checked by searching the file)
`OrbitControls`, `TransformControls`, `RoomEnvironment` and `OutputPass` are there. **Not** there: `Sky`, `RoundedBoxGeometry`, `EffectComposer`, `GTAOPass`/`SSAOPass`, `SMAAPass`.

## Per feature
| Feature | Need the addon? | Safest route | Cost |
|---|---|---|---|
| Rounded geometry | No. `rbox()` in `3d/decor.js` already rounds boxes (cached, shared). | Keep using `rbox()`. | none |
| Contact shadows | No. `contactShadow()` already exists; tents now use it at each pole foot. | Keep. | one small transparent plane per foot |
| Sky | `Sky` (examples/jsm/objects/Sky.js, MIT, r187) | Not needed yet: the time-of-day looks tint the background and fog. A gradient dome would do without any addon. If the real `Sky` is wanted, load it as its own ES module file in `3d/vendor/addons/` that imports from the bundle (needs the bundle to export `THREE`, or a small wrapper). | one large sphere, one shader |
| Anti-aliasing | No. The renderer already asks for MSAA (`antialias`) unless quality is "low". | For stills, render at 2x size and shrink (`snapshot`). `SMAAPass` only matters if a composer is added. | none |
| Ambient occlusion | Yes: `EffectComposer` + `GTAOPass` + `OutputPass`, which need `three/addons` imports. | Do it in an **isolated module** (`3d/post.js`), loaded only by `venue3d.html` and only for a "Presentation render" button, using vendor files copied from the same r187 release (same MIT license). The shared bundle stays unchanged and `office3d.html` is never affected. | roughly doubles frame time, so for stills only, never while editing |

## Version and licence
All addons must be copied from the r187 tag: mixing versions breaks shader chunks. They are MIT, same as Three.js, and need no change to the license file beyond naming them.

## Effect on other 3D pages
`office3d.html` imports the same bundle. As long as the bundle is not changed and the addons are loaded only by `venue3d.html`, nothing in the office changes. `agents/office3d_check.py` (run by `check_all.sh`) is the guard.

## Not yet tested
- Path tracing (three-gpu-pathtracer) was considered for the Render photo button and not built: it needs WebGPU, which most phones don't have, and a full venue would take minutes a picture on a phone GPU. An AI image-to-image restyle was also considered and not built: it needs a paid service and a server-held key. The render stays the GTAO raster path in `3d/post.js`, now behind the "Render photo" button (Views tab and Save & share), which forces high quality for the shot and shares or downloads a JPEG.
- No addon has been integrated beyond EffectComposer/GTAO/OutputPass, so none of the above costs are measured. Next step: test on the phone sizes, then decide.
