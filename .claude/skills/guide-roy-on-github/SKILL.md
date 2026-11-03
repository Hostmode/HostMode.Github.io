---
name: guide-roy-on-github
description: Use when walking Roy through something on GitHub from his Android phone (the GitHub app or the browser), especially in voice sessions: merging, labels, running a workflow, settings, notifications.
---

# Guide Roy on GitHub

Roy works from an Android phone, often by voice. One step at a time, exact button names, and wait for "done" before the next.
Repo: **Hostmode / HostMode.Github.io** (github.com/Hostmode/HostMode.Github.io). Roy's account shows as **Hostmode**.

## Finding things in the GitHub app

- **The repo:** the search icon, type HostMode.Github.io, tap it. ("Home → Issues" only shows issues he made or was assigned, so it looks empty.)
- **Issues or pull requests:** inside the repo, scroll down and tap Issues or Pull requests.
- **Labels on an issue:** tap the round **"i"** button at the bottom right, next to Comment, then Labels. Tick the label, then back.
- **Merging:** open the pull request, scroll to the bottom, tap Merge.
- **Notifications:** profile picture → gear → Notifications → push on, **Mentioned** on. If Android blocks it, tap the button to allow it.

## In the phone's browser (github.com)

- **Settings:** in the repo, swipe the row of tabs (Code, Issues, Pull requests...) left, or tap "...". Settings is the last tab.
- **Secrets:** Settings → Secrets and variables → Actions → New repository secret. Name in capitals with underscores.
- **Actions → Run workflow:** Actions tab (may be under "More") → tap "All workflows" to open the list → pick the workflow →
  "Run workflow" (sometimes behind "...") → the green button.
- **Workflow permissions:** Settings → Actions → General (the Actions section, not the main General page) → Workflow permissions.
- **Rulesets:** Settings → Rules → Rulesets (done Nov 3: "Protect main" requires the "checks" status check, with Repository admin allowed to bypass).
- A link that opens a pull request ready to create: `.../compare/main...BRANCH?quick_pull=1&title=...&body=Closes%20%23N.` Roy taps
  "Create pull request".

## How to talk him through it

- Say where he is first ("you're in the repo's file list"), then the one next tap.
- If he can't find it, ask for a screenshot instead of guessing again.
- Never ask him to read a code, password or secret out loud; he types it.
- End with what happens next and when he'll hear about it (the buzz from a reviewer comment, the Monday report).
