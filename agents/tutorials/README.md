# Tutorial videos

Host Mode's how-to video library, made by GitHub during the day while the night agents are off.

## When it runs
`.github/workflows/tutorials.yml`, four times a day: about 9:43 AM, 12:43 PM, 3:43 PM and 6:43 PM Charlotte time.
The goal is 4 finished videos a day. By slot N, N videos should be done today, so a slot that falls short is made up
by the next one (at most 2 videos a slot). Nothing runs during the event freeze (Dec 31 to Jan 3).
Pause it: Actions → Tutorial videos → "..." → Disable workflow. Run one now: Actions → Tutorial videos → Run workflow.

## How one video is made
1. **Steps** (`steps/HM-Txx.json`): one line to say per step, and the taps done while it's said. T01, T03 and T04 are
   hand-written here. For the rest, `write_steps.py` has Claude look at the real demo screens and write them. They're kept
   in the tutorials-data branch, and each set is rehearsed in a browser before it's used.
2. **Voice**: Piper (free) reads each line. If `HEYGEN_API_KEY` is set as a secret, HeyGen is used instead.
3. **Recording** (`make_video.py`): a browser plays the live demo (hostmode.github.io, demo data only) at the voice's pace,
   with a visible cursor and an orange ring on each control. The demo-only switcher bar is hidden, since real hosts never see it.
4. **Look**: vertical (1080x1920) and wide (1920x1080) MP4s, navy page, white captions under an orange line, plus an .srt,
   a thumbnail and a check sheet of 3 frames.
5. **Checks**: every tap found its control, no page errors, both files play, the voice fits each step. Then it's **Completed**.

## Where things are
- Videos: the **draft** release "tutorial-library" (GitHub → Releases). A draft is only visible to people with access to the repo.
  Roy publishes when he's happy. Nothing goes public on its own.
- The queue (the one source of truth), scripts, captions, thumbnails, check sheets and research: the **tutorials-data** branch
  (`queue.md`, `production-status.md`).
- The topics, their order and their rules: `library.json` here. To add a tutorial, add a topic. To remake one, delete its row
  from `queue.json` on the tutorials-data branch (and its steps file there, to have the steps written again).

## Safety and spending
- Demo pages only: steps can only go to the event demo (e=DEMO), the planner demo (pdemo=1) or the public pages. Steps written
  by Claude run only as browser actions from a short fixed list, and never reach a shell.
- Claude is only used to write steps: at most `TUTORIAL_MAX_USD` a slot (Actions variable, default $0.40), from the same
  credits and $100 monthly cap as the other agents. Once every topic has steps, the job costs nothing.
- A topic that fails 3 times becomes Blocked, with the reason in the queue. HM-T02 (Creating Your First Event) is Blocked
  until Roy gives a test invite code, because recording it would create a real event.

Run locally: serve the repo on port 8765, then
`TUTORIAL_BASE=http://localhost:8765/ TEST_CHROME=/usr/bin/google-chrome python3 agents/tutorials/make_video.py agents/tutorials/steps/HM-T03.json --out /tmp/t03`
(add `--fast` for a quick rehearsal).
