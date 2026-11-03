# Help desk audit

Source: the `HELP` object in js/16-planner-portal.js (lines 174–248). The help desk is a search box with quick-link chips. It appears in the planner portal, the host dashboard, the event console and the admin console. **69 entries in four sets:**

| Set | Who sees it | Entries | Chips |
|---|---|---|---|
| `pl` | Planners & venues (planner portal) | 39 | invoice, client link, import, teammates, booking link, reports |
| `ho` | Hosts (event dashboard) | 7 | plan, travel, paid, password |
| `m` | Event console (moderator / host on the night) | 20 | start games, big screen, guest QR code, check in, scores, practice |
| `ad` | Admin console | 3 | agents, waiting, spending |

Stay & Go has extra entries in js/17a-stay-go.js (line 562). Those are not yet audited one by one.

## Common user tasks (what the entries cluster around)
1. Run the night: Live, Go live, big screen, guest QR, check-in, scores (console set)
2. Plan: date, countdown, to-dos (host + console)
3. Planner business: clients, portal link, invoices, payments, approvals, vendors
4. Inventory and venue bookings
5. Import and backup

## Confusing or thin spots (good tutorial targets)
- **"Create another event"** (host): says each event needs an invite code, but not where to get one. A video should show where the code is entered and who issues it.
- **"Open the big screen"** (console): says "Open this link on the TV" with no steps for casting or connecting a TV. That's the most likely day-of question.
- **"Let guests join"**: the path is Event → Links. The QR code is also on the big screen welcome page (verified on screen). Worth showing both.
- **Planning moved:** for new hosts, Plan moved from the console to the dashboard, while older events (the baby shower) keep it in the console. Two answers exist ("Plan your event" in `ho`, "Set the date and to-dos" in `m`). A video must say which one the viewer has.
- **Money wording:** several answers stress that Host Mode records payments but never takes or sends money. Tutorials must not imply payments are processed.
- **Missing entries:** nothing about Report a problem, the language button (Aa), Rehearsal results, or what the demo bar is.

## Topics that most need a video
Big screen setup, guest join/QR, going live with a game, check-in, the dashboard (Plan vs Run it), client portal + approvals, invoices, import.
