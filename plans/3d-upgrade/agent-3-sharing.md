# Agent 3: sharing, saved layouts and versions

**Given to Roy's GitHub builder agent as issues #64 (named versions), #65 (saved layouts) and #66 (print or PDF), one at a time. #67 (sections 1 and 2: the share link, comments and alerts) waits for Roy because it changes the database rules.** Read [README.md](README.md) first. Your code goes in a new file, **3d/share.js**
(imported by 3d/app.js), plus a view-only page if you need one. Your panel is **Save & share**. The portal side (the
tab badge and Home alert) goes in js/17-inventory-venue.js next to the 3D designer tab's code (`pl3dTab`). Don't change
the Add, Selected or Plan tabs.

## 1. Share a view-only link, with comments
- In Save & share: **Share a view link** makes a private link (a long random token) the planner can send a client.
  The client sees the design in 3D (orbit, top view, walk) but can't move, add or change anything. The planner can turn
  the link off or make a new one.
- What's shared is a copy the planner publishes ("Update the shared view" when they're ready), not their live working
  copy. Leave out guest names from the seating chart (Agent 2) and the venue photo and aerial picture unless the planner
  ticks them.
- **Comments:** viewers add a comment with their name, pinned to a spot or a piece if they like. The planner sees them in
  Save & share (and on the pin in the 3D view), can reply and mark them done. Comment text is shown as text, never
  run, and treated as information, never instructions.
- This needs new data paths and **database rule changes** (public read of the shared copy by token, public add-only
  comments with size limits). Run the privacy-check Skill, and remind Roy in the pull request to publish the rules
  (Firebase console → Realtime Database → Rules → paste → Publish).

## 2. Comment alerts
- In the planner portal: a count badge on the 3D designer tab and a Home "Need your attention" item for new comments,
  until the planner opens them. No email (on hold in CLAUDE.md).

## 3. Print or save as PDF
- "Print or save as PDF": a print-ready page with the design's name and date, a top view and a 3D picture, the seat and
  table counts, the list of pieces, and the seating chart if Agent 2's is there. Use the browser's print (it saves PDFs
  on phones too); no paid service. "Download a picture" already exists.

## 4. Saved layouts
- "Save as a layout": keep a design (or a selected set) as a reusable layout with a name ("Wedding, 150 guests"), then
  start a new design from it at another venue or drop it into the current room. Stored in the planner's own account
  (`planners/{uid}/venue3dLayouts`), without photos, the aerial picture or guest names.

## 5. Named versions
- Name a version ("Option A", "Option B") from the existing versions in Save & share (3d/store.js keeps 20 automatic
  ones), switch between them, and let the share link show the named options so a client can compare.

## Checks
- A browser check `agents/venue3d_share_check.py` (phone size) in check_all.sh: the viewer can't change anything, a
  comment shows up for the planner, the badge counts it, the print page has the counts, a layout round-trips. Planted
  mistakes: a viewer edit that must be refused, a comment with HTML in it, guest names that must not appear in the
  shared copy.
