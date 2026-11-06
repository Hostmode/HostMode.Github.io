# 3D designer upgrade (Nov 6, 2026): who builds what

Roy chose these features for the 3D designer (venue3d.html, 3d/). Four Claude sessions build them at the same time,
each in its own area, so their pull requests don't fight. If you are one of the agents, read this whole page, then
your own brief, before writing any code.

| Who | Brief | Branch | Features |
|---|---|---|---|
| Lead session (the one that wrote this) | (this page) | main | Eddie in the 3D designer, "Ask Eddie" in the Add tab, new pieces land where you look or where you tap |
| Agent 1, placement | [agent-1-placement.md](agent-1-placement.md) | `claude/3d-placement` | snap and line up, fill a table, copy in a pattern, undo/redo check |
| Agent 2, planning | [agent-2-planning.md](agent-2-planning.md) | `claude/3d-planning` | measure tool, head count and spacing check, seating chart, send to pull list |
| Agent 3, sharing: **Roy's GitHub builder agent**, one issue at a time | [agent-3-sharing.md](agent-3-sharing.md) | the builder's own `claude/issue-…` branches | #64 named versions (started Nov 6), then #65 saved layouts and #66 print or PDF (queued). #67, the view-only share link with comments and comment alerts, needs database rule changes, so it waits for Roy (high risk, not a Phase 1 builder job) |

## Already in the designer (don't rebuild)

Undo and redo (50 steps, the ↶ ↷ buttons), drag arrows, a walk view, the Ask box (`S.interpret`), "Copy" of a piece or set
(`duplicate_object`, `duplicate_set`), "Add chairs" for a selected table (`case "chairs"` in 3d/app.js), seat counts and
"won't fit" answers, "Download a picture" (.png), "Render photo", the 3D model file (.glb), the venue file (.json),
and 20 automatic earlier versions in Save & share (3d/store.js). Build on these.

## Rules for every agent

1. **Read first:** CLAUDE.md, `.claude/skills/3d-designer/SKILL.md`, `3d/PROJECT-RECORD.md`, and the Skills your brief names
   (privacy-check for anything that stores data, accessibility-check for new screens).
2. **Your own branch, then a pull request to main.** Never push to main. Roy merges.
3. **Your own files.** Put your code in the new file(s) your brief names. Touch the shared files (3d/scene.js, 3d/editor.js,
   3d/app.js, venue3d.html, css) only to hook your code in: small additions at the places your brief names, never
   moving, renaming or reformatting code you didn't write. This keeps the four pull requests mergeable.
4. **Designer panels are split:** Agent 1 owns the **Selected** tab, Agent 2 adds one new tab, **Plan**, Agent 3 owns
   **Save & share**, and the lead session owns **Add** and **Ask**. Adding your tab button to venue3d.html's tab bar is a
   one-line change.
5. **Every change to a design goes through `scene.js` `apply()` as a checked step**, and is one undo step. New steps
   live in your own file and are added to `S.OPS` from there (keep the same check-everything-or-change-nothing rule).
6. **Before every push:** `git fetch origin main && git merge origin/main`, fix any conflicts (CHANGELOG.md: keep both
   lines, newest first), then check your pull request isn't already merged
   (`gh api repos/Hostmode/HostMode.Github.io/pulls/N`). If it is, open a new branch for the rest.
7. **Checks:** run `bash agents/check_all.sh` (it must end with exit 0), add your own browser check at phone size to it with
   a self-test of planted mistakes, and look at your screenshots before calling anything done. The sandbox draws in
   software, so say speed still needs Roy's phone.
8. **Free tools only.** No paid services. Email sending is on hold (CLAUDE.md), so alerts stay inside Host Mode.
9. **Something you need belongs to another agent?** Don't build it. Say so in your pull request description, and add a
   line to the Team tab's General channel if you can.
10. **When you finish:** update CLAUDE.md's 3D designer line if needed, the 3d-designer Skill and 3d/PROJECT-RECORD.md,
    add one CHANGELOG.md line, and write the pull request description in plain words for Roy, ending with what he needs to do.
