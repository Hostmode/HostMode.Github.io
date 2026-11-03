# Host Mode tutorials: the data branch

The tutorial job (`.github/workflows/tutorials.yml` on main) keeps its work here, so the website branch stays clean.

- `queue.md`: every tutorial and its one status (the source of truth). `queue.json` is the same thing for the job.
- `production-status.md`: today's count, what's left, what's blocked, and what the last run did.
- `scripts/`: each finished video's narration, with the help desk answers it goes with.
- `steps/`: the steps Claude wrote (the hand-written ones are in agents/tutorials/steps on main).
- `captions/` (.srt), `thumbnails/`, `quality-control/` (check sheets and reports).
- `research/`: the Nov 3 help desk audit, feature check and roadmap.

The videos themselves are in the draft release "tutorial-library" (GitHub → Releases). Nothing is public until Roy publishes it.
