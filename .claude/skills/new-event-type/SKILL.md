---
name: new-event-type
description: Use when adding a new kind of event to Host Mode, like a quinceañera, graduation, gender reveal or retirement party: games content, moments, theme colors, planning checklist and templates.
---

# Add a new event type

Every event type lives in a few shared lists. Add the new type to each one; never copy a whole screen.

## Where it goes

1. `js/06-event-types.js`
   - `EVENT_TYPES.<key>`: `label`, `moments` (use `MOM(id,name,title,sub,show)`), `reveal`, and `order` (the evening's run of games and moments).
   - `TYPE_CONTENT.<key>`: `title`, `tagline`, `themeDesc`, `colors` (rose, flame, gold, violet, leaf), `supOpts`,
     `trivia` (8 to 12 with `T_(question,[4 options],rightIndex)`), `hunt` (`HN(name,clue)`), `cw` (`CWI(WORD,clue)`, 8 to 12 words),
     `sups` (`SU("…?")`), and a `tie` question with a number answer.
2. `js/12-planning.js`: the planning checklist for the type (days before the event, task).
3. `js/15-client-tools.js`: the client checklist template for the type.
4. `js/08-admin.js`: a ready-made event preset if it deserves one (name, look, about).
5. The new-event page's type picker and any `eventType` lists (search `grep -n "anniversary" js/` and add the new key next to each hit).
6. Spanish for everything guests see: an `es` field on game items and `ES` entries for labels (see the spanish-check skill).
7. Help desk: mention the new type where event types are listed.

## Content quality

- Fun for every age in the room, family-friendly, nothing that embarrasses the guest of honor.
- Respect the culture of the event: a quinceañera has its own moments (entrance, father-daughter dance, the last doll, changing of the shoes). Ask Roy if unsure.
- Trivia answers must be correct; double-check facts. Spread the right answer across positions.
- Crossword words: 3 to 10 letters, no spaces.

## Test

1. `node agents/syntax_check.js`.
2. Create an event of the new type from the new-event page in the demo and open the guest view, the moderator console and the big screen.
3. Record screens before and after with `python agents/compare_screens.py` and check nothing else changed.

## Host Mode rules that always apply

- Plain, friendly words written for planners and hosts. No technical jargon.
- Never name a competitor or another app in anything public. Say "other apps". Unfinished features are "coming soon".
- Host Mode only tracks money. It never takes or sends payments.
- Never put customer data in the repo (it is public). Use the demos for examples.
