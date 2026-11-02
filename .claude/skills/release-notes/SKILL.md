---
name: release-notes
description: Use when writing the weekly “what's new in Host Mode” notes for hosts and planners from the week's changes.
---

# Release notes

A short weekly note so customers see Host Mode getting better.

## Steps

1. Collect the week's changes: `git log --since="7 days ago" --oneline` and read the commit summaries. Skip agent branches that weren't merged.
2. Keep only what customers notice. Drop internal work (tests, agents, refactors, backups) unless it makes something faster or more reliable they'd feel.
3. Group under: **New**, **Better**, **Fixed**. Planner features and host/guest features can be split if both changed.
4. Write each item as one plain sentence about what they can now do, and where: "In Teammates, you can now schedule event-day shifts with hourly pay."
5. Put the most useful change first. Five to eight items at most.

## Tone

- Warm and confident, not salesy. No exclamation-mark pileups.
- Name screens the way the app does (Clients, Packages, Venue, Teammates, Import & export, Help desk).
- Unfinished features are "coming soon" at most.

## Deliver

- A title like "What's new in Host Mode · week of Nov 2".
- An optional Spanish version.
- A two-sentence version for social media.

## Host Mode rules that always apply

- Plain, friendly words written for planners and hosts. No technical jargon.
- Never name a competitor or another app in anything public. Say "other apps". Unfinished features are "coming soon".
- Host Mode only tracks money. It never takes or sends payments.
- Never put customer data in the repo (it is public). Use the demos for examples.
