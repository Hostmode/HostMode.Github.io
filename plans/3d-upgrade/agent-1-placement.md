# Agent 1: placement tools

Branch `claude/3d-placement`. Read [README.md](README.md) first. Your code goes in a new file, **3d/placement.js**
(imported by 3d/app.js). Your panel is the **Selected** tab. In 3d/editor.js you may change only the dragging code (the
move/turn/resize arrows and `bindInput`'s drag part); the lead session is changing where *new* pieces land, so leave
the Add tab's code (`d.add` in 3d/app.js) and placement of new pieces alone.

## 1. Snap and line up
- While dragging a piece or a set, it snaps to: the walls (back flush against a wall, or a set gap from it), other
  pieces (edges and centers line up), and a grid (half a foot / 15 cm by default).
- Thin guide lines show what it snapped to while dragging, then disappear.
- A **Snap** on/off switch in the Selected tab (remember the choice on the device). Holding two fingers or a modifier
  key is not enough on a phone: the switch is the way to turn it off.
- Find what "snapping" the drag arrows already do (3d/PROJECT-RECORD.md says they snap) and build on it.
- Chairs and centerpieces attached to a table still come along (`it.group`).

## 2. Fill a table
- "Add chairs" already exists for a selected table. Make it: choose how many (a − / + stepper, starting at the table's
  usual count from `CATALOG[kind].seats`), spaced evenly, all facing the table (see the "Turning things" trap in the
  3d-designer Skill: rot = 180° minus the direction from the table), using the chair style already in the design.
- One-sided tables (`oneSide`: head, sweetheart) seat one side only. Serpentines follow the outer edge, like today.
- Works on a selected set of tables too ("Fill every table": same count on each).
- Refuse honestly when that many chairs won't fit around the table.

## 3. Copy in a pattern
- From a selected piece or set: **rows and columns** (how many of each, gap between them) or **around a circle**
  (how many, how far), with a preview (`ed.previewOps`) and Keep / Cancel.
- A new checked step, e.g. `pattern_copy`, so the Ask box and Eddie can use it later. It refuses copies that would land
  outside the room or overlap other pieces (tents and fog with `over` don't count), and says how many fit instead.
- One undo step for the whole pattern.

## 4. Undo and redo
- They exist (↶ ↷, 50 steps). Only make sure every new tool above is one undo step, and add Ctrl+Z / Ctrl+Shift+Z
  (and Cmd on a Mac) if they're missing. Don't rebuild undo.

## Checks
- Model checks for `pattern_copy` and the chair spacing (facing the table, checked from straight above) in
  `agents/venue3d_test.mjs`, and a browser check `agents/venue3d_placement_check.py` (phone size) added to check_all.sh,
  with planted mistakes: a pattern that runs out of the room, chairs that would face away, a snap that leaves a gap.
