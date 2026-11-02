# CLAUDE.md for Host Mode

Notes Claude reads at the start of every coding session. Keep this under about 200 lines. When one section grows past 30 to 40 lines and only matters for certain jobs, move it into a Skill.

## What Host Mode is

- An event app suite: event-night games, big screen, guest check-in, drink ordering, and a portal for professional planners and venues.
- Built for every kind of event (baby showers, birthdays, weddings, anniversaries, corporate events), whoever creates it.
- Goal: feel upscale and compete with professional event software.
- Base location: Charlotte, North Carolina.

## Map of the code

- games.html: the main app. It holds the games, admin console, planner portal, client portal, teammate portal, big screen and demos. It's very large, so search for a function by name instead of reading the whole file.
- index.html: the front page, which opens the create-event page in the Host Mode look.
- hosts.html and planners.html: the landing pages (single-event hosts and professional planners and venues).
- drinks.html: the drink-ordering app, locked behind the admin console PIN.
- demo.js: the guest demo data. pdemo.js: the planner demo data.
- database.rules.json: the Firebase security rules.
- sw.js: the offline copy. Pages load fresh from the network first.

## Words we use

- Roy is the admin (owner). His console is the "admin console."
- "Host" means a customer running their own event, not Roy.
- Helpers are now called "teammates."
- New hosts and planners join with one-time invite PINs that Roy issues.

## Brand

- The name is Host Mode. Colors are navy, orange and green.
- The old names (Spark Drinks, Hostwell) should not appear anywhere users can see them.
- The Firebase project ID still says spark-drinks. It can't be renamed, and users never see it.

## How planner portal features are built

Follow the pattern of the existing tabs, such as Packages, Leads, Inventory and Venue:

1. Add the tab to PL_TABS and its page function to plTabBody.
2. Add its data path to plSubs, so it loads live.
3. Put its button actions in ACT, using the drafts (dv) pattern for forms.
4. Use "tap again to delete" confirmations (L.confirm).
5. Add a tab badge, Home attention items and calendar entries where they help.
6. Add Help desk entries for the new feature.
7. Planner-only data needs no rule change (the planner already owns `planners/{uid}`). Only edit database.rules.json when clients, teammates or guests must read or write the new data.
8. Add sample data to the planner demo and raise PDEMO_V by one.

## Look and wording

- Phone first. Reuse the existing cards, buttons, pills, stats and calendar styles rather than making new ones.
- On-screen wording is plain and friendly, written for planners, with no technical jargon.
- Host Mode only tracks money. It never takes or sends payments.

## Testing and publishing

1. Check every script block in games.html for syntax errors.
2. Open the planner demo at games.html?pdemo=1#planner in a headless browser and click through the new feature.
3. Check that there are no page errors.
4. Commit with a short plain-English summary of what changed, then push to main.

## On hold until the current build is tested

- Email sending and reminders
- Card payments and subscriptions
- Contracts with e-signatures
- Deeper security work
- A backup plan, so no one loses information or access if the app goes down, is still wanted.
