---
name: draw-a-scene
description: Use when building or changing a flat drawn, interactive picture in Host Mode (one SVG), like the coming floor plans: angled views, people and furniture, tapping, walking and zooming. For real 3D, use the 3d-designer skill.
---

# Draw a scene

The agent office was the worked example until Nov 4, 2026, when it moved to real 3D (the 3d-designer skill). Its drawn version is in the repo's history at commit dfb679e (js/18-support-staff.js, agScene). Use a drawing when a picture must load instantly or be printed; use real 3D when people walk in front of and behind things, which a drawing can only fake.

## Build it as one SVG

- One `<svg viewBox="0 0 400 290">`, everything inside it. HTML laid over a drawing can't sit behind furniture, so don't mix them.
- **Angled 3D (isometric) floor:** a 10 by 10 grid. `agP(a, b, z)` turns floor spot (a, b) raised by z into a screen point:
  x = 200 + (a - b) * 18, y = 90 + (a + b) * 9 - z. `agBox(i, j, w, d, h, top, left, right)` draws a box with its two visible sides.
- **Draw back to front:** collect every piece of furniture and every person with a depth (i + j), sort, then draw. A person standing
  behind a desk is drawn first, so the desk hides their legs. To make one person draw later, give them a depth of their own
  (`AG_SPOT`'s 4th number).
- **Draw labels and name tags LAST,** after everything, so nothing covers them.
- Colors: navy #16255a, orange #f6892f, green #2f8a4c, plus a night palette (a `night` class on the scene).

## People and things to tap

- People are small SVGs with named parts (`.agbod`, `.agleg-l`, `.agleg-r`, `.agarm`, `.agarm-b`, `.agcarry`, `.agflag`), each with its
  pivot set in CSS (`transform-box: view-box; transform-origin: ...`), so they can be rotated without moving.
- A nested `<svg>` loses its CSS hook unless it has the class again (`<svg class="agp">`).
- `data-act` doesn't work on SVG. Catch taps with ONE document-level `click` and `keydown` listener that looks for `closest(".agw[data-agk]")`.
- Give every small thing to tap an invisible tap area (`<rect fill="transparent">`) around it: fingers miss the gaps between a head and shoulders.
- Each tappable person: `tabindex="0" role="button" aria-label="name: state. news"`, so keyboards and screen readers can use it.
- Under the picture, keep a plain list or chips with the same information: some people can't use the picture.

## Moving

- CSS animations only, no JavaScript timers. Move a wrapper group (`.agmove`) with `transform: translate(dx, dy)` measured from the
  person's home spot; flip the person with a second `step-end` animation of `scaleX(-1)` when walking left.
- People keep their drawing depth while they walk, so plan routes through open floor and never behind furniture.
- Anything that should follow a walker (a bubble, a ring, a name tag) goes inside a `.agmove` with the same agent classes.
- `@media (prefers-reduced-motion: reduce) { .agscene * { animation: none !important } }` is required.
- Zoom and pan by changing the SVG's `viewBox`, not CSS scale: lines stay sharp and taps land in the right place. While dragging,
  set the attribute directly; save the view in `L` when the finger lifts. `touch-action: none` on the scene only.

## Check it

- Screenshot it at phone width (412 wide, scale 2) and look. For motion, take 5 or 6 shots a few seconds apart and look at them as a grid.
- Make one check in agents/regressions.json that counts the real things (for example `.agw[data-agk]`, not every `.agw`).
- Add the screen to SCREENS in agents/crawl.py if it's a new screen, so the nightly tap-everything check covers it.
