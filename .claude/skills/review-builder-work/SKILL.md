---
name: review-builder-work
description: Use in a coding session to check, fix up and hand off work the builder agent pushed to a claude/... branch, before Roy merges it.
---

# Review the builder's work

The reviewer agent reads code but can't see the screen. This is the hands-on check, done in a Claude Code session.

## 1. Find it

- Public runs and pull requests: `curl -sS "https://api.github.com/repos/Hostmode/HostMode.Github.io/actions/runs?per_page=8"` and
  `.../pulls?state=open`. The builder's comment on the issue says what it did and what it couldn't check (read the "Not done" part).
- Fetch the branch into its own folder, so main stays clean:
  `git fetch origin "+refs/heads/BRANCH:refs/remotes/origin/BRANCH"` then `git worktree add --detach SCRATCH/folder origin/BRANCH`.

## 2. Check it for real

- `bash agents/check_all.sh > out.txt 2>&1; echo $?`. The exit result must be 0. Never trust only the last line.
- Look at it: serve the folder on its own port, open the screen in Playwright, and screenshot it. For anything that moves, take
  5 or 6 shots a few seconds apart, put them in one grid image, and look for clipping, things passing behind furniture, labels
  left behind, and overlaps. To see every state, add the state's class to every element on the page before the shots.
- Try what the issue's "Done when" list says, like a person would: tap the buttons, drag, and read values back (for example the
  SVG's viewBox after zooming).

## 3. Fix it, without overwriting the builder

- Small fixes: make them in the folder, run the checks again, and commit as `Claude <noreply@anthropic.com>`.
- Force-pushing over the builder's branch is blocked, so push a **new** branch: `git push origin HEAD:refs/heads/claude/issue-N-something`.
- If main changed since, merge main into the branch (`git merge origin/main`), keep both sides of any CLAUDE.md conflict (usually
  two new lesson lines), run the checks again, then push. Confirm with the compare API: `behind_by` must be 0.

## 4. Hand it to Roy

- One link that opens the pull request, ready to tap:
  `https://github.com/Hostmode/HostMode.Github.io/compare/main...BRANCH?quick_pull=1&title=...&body=Closes%20%23N.`
- Tell him what you checked, what you fixed, and the one thing to do (tap Create pull request, wait for the buzz, then Merge).
- Remove the folder afterwards: `git worktree remove --force FOLDER && git worktree prune`.
- If something here tripped you up, add one line to CLAUDE.md's Lessons, or to the agent-workflows or draw-a-scene Skill.
