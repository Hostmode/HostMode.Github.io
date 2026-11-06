# Agent 2: planning tools

Branch `claude/3d-planning`. Read [README.md](README.md) first. Your code goes in a new file, **3d/planning.js**
(imported by 3d/app.js). Add one new designer tab, **Plan** (one button in venue3d.html's tab bar), and put all four
tools there. In 3d/editor.js you may add an overlay for measuring and highlights; use the `groundTap` hook pattern the
site tracing uses, and always clear it when leaving (see the Skill). Don't change dragging (Agent 1) or where new
pieces land (the lead session).

## 1. Measure tool
- Tap two points (on the floor or on pieces) and see the distance on a line between them, in feet and inches and in
  meters. Several measurements at once, each deletable; "Clear all".
- Works in the top view and the normal view, at phone size. Measurements are not saved into the design (they're a tool),
  unless you find a good reason; say which you chose.

## 2. Head count and spacing check
- A live count: seats (chairs plus bench and banquet seats), tables, and the guest count the room fits.
- A spacing check that marks problem spots in the room and lists them: walkways narrower than a minimum, chairs
  back-to-back between tables with too little room, doors and exits blocked.
- Use real, sourced numbers: save a research finding in `3d/library/research/` with a page you actually opened (for
  example the ADA's 36 inch accessible route), like the Skill asks for pieces. If a number isn't sourced, label it
  "estimated".
- Wording: "a guide, check with the venue and the fire marshal". Never say a layout passes inspection.

## 3. Seating chart
- Name tables (Table 1, "Head table") and put guest names on seats: tap a chair, type a name. A list view by table,
  with empty seats counted, and a printable list.
- Names are customer data. They're saved with the design in the planner's own account (`planners/{uid}/venue3d`), never in
  the repo or the demo data beyond made-up names, and never in a shared link unless the planner chooses (Agent 3 owns
  sharing: store the names so Agent 3 can leave them out by default; say where they are in your pull request).
- Run the privacy-check Skill.

## 4. Send to pull list
- One tap turns the layout into a pull list: count each kind of piece, match each to the planner's Inventory items
  (`planners/{uid}/gear`) by name, and show a review card (matched lines with counts, unmatched pieces listed, a date,
  who it's for) before saving.
- Save in exactly the Inventory tab's shape (`saveRes` in js/17-inventory-venue.js):
  `planners/{uid}/gearRes/{id} = {label, ref, from, to, items:{gearKey: qty}, note, status:"held", t}`.
  The planner owns this path, so no rule change. Show the "you're short on …" warning like the Inventory tab does.
- In the demo (`?demo=1`, 3d/store.js "local") use the demo's own data, never the real database.
- Eddie's pull list job in the portal (js/18b-eddie.js) is the lead session's; don't change it.

## Checks
- Model checks for the counts and the spacing rules in `agents/venue3d_test.mjs`; a browser check
  `agents/venue3d_planning_check.py` (phone size) in check_all.sh, with planted mistakes: a blocked door, a too-narrow
  walkway, a table nobody can reach, a seat named twice, a pull-list line that matches nothing.
