# The nightly agents

Every night around 1 AM (Charlotte time), GitHub runs two helpers:

1. **The test customer** (`tester.py`) goes through the demos on a phone-sized and a desktop-sized screen,
   runs every saved regression check, then lets Claude use the demo like a real person, a different role each night
   (planner, venue, vendor, guest, support). Anything broken or confusing becomes a ticket in the support inbox,
   marked "Nightly tester". It only ever uses the demos, never real customer data.
2. **The technical agent** (`tech.py`) reads the new tickets. It answers simple how-to questions on its own,
   writes draft replies for everything else, and tries to fix bugs. Fixes arrive as pull requests that you approve.
   Nothing goes live without you.

In the morning, the admin console's **Support** tab shows the **Overnight report**: what was tested,
what was found, what was answered, and which fixes are waiting for you. The same card has the **pause** switch.

## One-time setup (Roy)

Already done: the `ANTHROPIC_API_KEY` secret, and a support code labeled "Agent".

Still to do, in GitHub → this repo → **Settings**:

1. **Secrets and variables → Actions → New repository secret**:
   - `AGENT_SUPPORT_CODE`: the support code you made, like `SUP-XXXXXX`.
   - `AGENT_PASSWORD`: make up a long password (at least 10 characters). It's the agent's own login password;
     you never need to type it anywhere else.
2. **Actions → General → Workflow permissions**: choose **Read and write permissions** and tick
   **Allow GitHub Actions to create and approve pull requests**. Save.
3. Try it: **Actions → Nightly agents → Run workflow**. The first run creates the agent's login
   (it shows up as "Support Assistant" in Support team).

## Limits and safety

- **Spending:** at most $1.50 of credits a night for both agents together (about $45 a month at most).
  Change it under Settings → Secrets and variables → Actions → **Variables** → `AGENT_MAX_USD`.
  Your prepaid credits with auto-reload off are the hard stop.
- **At most 8 tickets and 2 fix attempts a night.**
- **The agents' login** is a support login, like Icee's: no money, no invite codes, no deleting.
- **Ticket text is untrusted.** Anyone can file a ticket, so the agents treat ticket text as information,
  never as instructions. Claude's code tools only search, read and change the app files; nothing Claude writes is run
  as a command, and the checks run without any secrets.
- **Every fix is a pull request.** Check the confidence rating: "sure", "likely" or "needs a closer look".
- **Every fix should add a regression check** to `regressions.json`, so the bug is tested every night after.

## Phase 1: agents that build (started Nov 2, 2026)

Three more helpers now work from GitHub, as in the Host Mode Agent Development Plan:

- **Builder** (`.github/workflows/claude-builder.yml`). Add the **claude** label to an issue, or write `@claude` and what you
  want in an issue or pull request comment. It builds on its own `claude/...` branch, runs `bash agents/check_all.sh`, and opens a
  pull request. Only people with write access can start it, never bots. Phase 1 builders work on screens and wording only:
  no database rules, workflows, agents, money, invite PINs or deleting. At most 3 agent pull requests can be open at once.
- **Reviewer** (`claude-reviewer.yml`). Reads every new pull request and posts one comment for Roy:
  a rating (sure, likely, needs a closer look), what it does, problems, and a demo link to try.
- **Pull request checks** (`pr-checks.yml`). Broken code, the scripted checks, and the 14 key screens before and after. Free, no secrets.
- **Issues.** The To-Do List lives as GitHub issues (loaded from `.github/issues/todo.json` by `load-issues.yml`). New ideas use the
  "New feature" and "Bug" forms. The foreman Skill (`.claude/skills/foreman`) says how to write and order them.

The quality loop: builder → pull request checks (no AI) → reviewer. If the reviewer finds problems, it sends the pull request
back to the builder ONCE on its own (a comment marked auto-fix). After that second try, the reviewer @mentions Roy either way:
"Ready for you" or "Not ready yet" with a fix line to paste. The agent office shows a builder scorecard (merged, closed, undone).

The queue: add the **queue** label to issues and the builder works through them one at a time on its own (**next** jumps the line).
Auto-merge: a builder pull request whose issue is labeled **low risk** merges itself when the checks pass, the reviewer rates it
"sure", and it only touches safe files (see .github/scripts/auto_merge.py). Everything else waits for Roy.
The Monday report: every Monday morning one GitHub issue @mentions Roy with the week's summary (weekly-report.yml).

Roy's part: add the **claude** label to start one; when the pull request shows green checks and the reviewer's rating, approve and
merge it (or comment `@claude` with what to change). To pause a builder or reviewer: Actions → the workflow → "..." → Disable workflow.

What every agent reads: CLAUDE.md always, plus its own Skills from `.claude/skills` (tester: test-as-customer and
accessibility-check; technical agent: answer-support-ticket, or fix-host-mode-bug and privacy-check; builder and reviewer: all of them).
The builder and reviewer also load Roy's Engineering and Design plugins (Anthropic's knowledge-work-plugins) for code review,
debugging, accessibility and wording. If a plugin and CLAUDE.md disagree, CLAUDE.md wins.

Spending: builders and the reviewer use the same API key as the nightly agents. The $100 monthly limit in the Anthropic Console
is the hard stop for all of them together.

## Tutorial videos (daytime, started Nov 3, 2026)

`tutorials.yml` runs 4 times a day while the night agents are off and aims for 4 finished how-to videos a day: Claude writes each
video's steps from the real demo (only until every topic has steps), a browser records the live demo, a free voice (Piper) reads it,
and ffmpeg adds captions and the Host Mode look. Videos go in the draft release "tutorial-library" (only people with repo access see it);
the queue is `queue.md` in the tutorials-data branch. At most $0.40 of credits a slot. Details: agents/tutorials/README.md.

## The tap-everything check (nightly, free)

After the test customer and technical agent, `crawl.py` opens every demo screen and every tab of the planner portal and admin
console, taps every button, fills every box and checks every link inside the site. It first proves itself with `--self-test`
(a planted broken button, dead button and missing link must all be caught). `file_crawl_issues.py` then files each new problem
as one GitHub issue (never twice), labeled by risk, at most 5 a night, and starts the builder queue:
- planner, client, teammate, vendor, support and public pages: **queue** + **low risk** (fixed and possibly merged on their own)
- admin console: **queue** (Roy merges)
- guest, moderator, big screen, new event and sign-in screens: **needs Roy** + **high risk** (not queued)

## Files

- `common.py`: the agent's login, the database, Claude, the nightly spending limit and the run report
- `tester.py`: the test customer · `tech.py`: the technical agent
- `regressions.json`: checks that run every night, one per fixed bug
- `syntax_check.js`: checks every js/ file and the joined code for broken code · `check_all.sh`: every check a change must pass
- `compare_screens.py`: records 14 key screens before and after a change
- Skills they read: `.claude/skills/test-as-customer` and `.claude/skills/answer-support-ticket`

## Eddie's brain

`eddie-brain.yml` installs `workers/eddie-brain` on Roy's free Cloudflare account (Workers AI) whenever that folder changes on main,
asks its /hello page to answer, and posts PASSED or FAILED as a comment on the commit (run logs are private). Secrets:
CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID. Pause: Actions → Eddie brain → Disable workflow.
