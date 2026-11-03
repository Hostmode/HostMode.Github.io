# Feature verification

Levels:
- **Seen**: opened and clicked in the demo on Nov 3.
- **Code + help**: found in the code and in a help desk answer, but not yet clicked through.
- **Caution**: exists with an important limit.

| ID | Topic | Level | Where it lives | Notes |
|---|---|---|---|---|
| T01 | Welcome to Host Mode | Seen | index.html → hosts.html / planners.html / demo.html | Two doors: "I'm hosting an event" / "I plan events for clients" |
| T02 | Creating Your First Event | Caution | index.html #create → games.html?invite=CODE#new | Needs a real invite code from Roy and creates a real event. Couldn't be recorded here (database unreachable). Needs a test code plus a throwaway event |
| T03 | Understanding Your Dashboard | Seen | games.html#planner (host): My events, Stay & Go, Help desk, Settings; Plan / Run it / Guest view / Big screen | **Test video made** |
| T04 | Host Mode, Big Screen, and Guest Experience | Seen | Console (#moderator), big screen (#screen), guest (games.html?e=CODE) | Demo bar switches views; screens sync live |
| T05 | Event Checklist | Code + help | Plan → to-do list | |
| T06 | Event Budget | Code + help | Plan (demo lists budget) | |
| T07 | Guests | Code + help | Console → Tonight → Guest list | Import from spreadsheet |
| T08 | Seating | Code + help | Plan (seating) | |
| T09 | Food & dietary | Code + help | Plan (food); Menu tab for orders | |
| T10 | Vendors & payments | Caution | Plan (vendors) | Hosts' Host Mode records payments only; no card payments (on hold) |
| T11 | Timeline | Code + help | Console → Tonight (run of show) | |
| T12 | Guest check-in | Code + help | Tonight → Guest list | |
| T13 | Big screen | Seen (screen) | #screen | Connecting a TV itself isn't in the app. The video explains opening the link on the TV's browser |
| T14 | Live trivia | Seen (Go live buttons) | Console → Live → Trivia → Go live | 5-second countdown on every phone |
| T15 | Inviting guests to participate | Code + help | Event → Links, QR | Invitations/RSVPs live in the separate invite app; don't show them here |
| T16 | Games & leaderboards | Seen (leaderboard) | Live, Teams, Scores | |
| T17 | Photos & special moments | Code + help | Moments | |
| T18 | Presentations & toasts | Code + help | Presentations | Presenter's phone is the remote |
| T19 | Getting started as a planner | Code + help | planners.html, planner portal | |
| T20 | Client portals | Code + help | Clients | |
| T21 | Templates | Code + help | Templates | |
| T22 | Client approvals | Code + help | Clients → send menu/floor plan/design | |
| T23 | Event team | Code + help | Teammates, Day-of mode, shifts | Shifts track pay only |
| T24 | Planner payments & vendors | Caution | Clients → Money, Vendors | Records only; card payments and email sending are on hold |
| T25 | Shared photo albums | Code + help | Memories | |
| T26 | Guest photos & wishes | Code + help | Memories, guest selfie | |
| T27 | Event keepsakes | Code + help | `keepsake` view (js/02-core.js) | No help desk entry yet |
| T28 | Reviews & testimonials | Code + help | Feedback | |

**Missing from the proposed list but real:** Stay & Go (group travel), Inventory, Venue bookings, Import & export, Rehearsal, Custom games, Menu & drink orders, Moderators. These are suggested as additions in the roadmap.
