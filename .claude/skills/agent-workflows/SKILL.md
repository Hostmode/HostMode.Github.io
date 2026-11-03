---
name: agent-workflows
description: Use when changing or adding to Host Mode's agent system on GitHub (builder, reviewer, queue, auto-merge, tap-everything check, Monday report, nightly agents), or when an agent job didn't do what it should.
---

# Host Mode's agent system

How the agents fit together, the GitHub traps already hit, and how to add a new agent safely.

## The pieces (all in .github/workflows unless noted)

| Piece | Starts when | What it does |
| --- | --- | --- |
| claude-builder | the `claude` label, an `@claude` comment from Roy, or a marked comment from Claude's bot | builds one issue on a `claude/issue-N-...` branch; its last step opens the pull request if the builder only left a link |
| pr-checks | every pull request and every push to `claude/**` | broken code, the scripted checks, the 14 key screens (no AI, no secrets) |
| claude-reviewer | the checks finishing on a `claude/**` branch, a pull request opened by a person, or Run workflow | one review per version, then: send back once (`<!-- auto-fix -->`), auto-merge, or @mention Roy |
| .github/scripts/auto_merge.py | the reviewer, after a review with passing checks | merges only "low risk" issues rated "sure" that touch safe files, 200 lines or fewer |
| builder-queue | a builder pull request closing, the `queue` label, auto-merge, the tap-everything filer, Run workflow | starts the next `queue` issue, one at a time (`next` goes first, `needs Roy` is skipped, nothing during the Dec 31 to Jan 3 freeze) |
| nightly-agents | every night | test customer, technical agent, then the tap-everything check (agents/crawl.py) and its filer (agents/file_crawl_issues.py) |
| weekly-report | Monday mornings | one issue @mentioning Roy with the week (.github/scripts/weekly_report.py) |
| load-issues | a change to .github/issues/*.json or its script | turns lists into issues once each, and makes sure the labels exist |

Marks that connect them: `<!-- auto-fix -->` (reviewer → builder, once per pull request), `<!-- queue-start -->` (queue → builder),
`<!-- reviewed-final:SHA -->` (one review per version), `<!-- crawl:SIG -->` (one issue per problem).

## GitHub traps (each one cost us a failed run)

1. **GitHub's own token doesn't wake other jobs.** A pull request, label, comment or merge made with `github.token` starts no other
   workflow. Exceptions: `workflow_dispatch` and `repository_dispatch` do work, so start the next job with
   `POST /repos/{repo}/actions/workflows/NAME.yml/dispatches`. To start the builder, the comment must come from Claude's bot (run
   claude-code-action with one fixed `gh issue comment` command), because comments from github-actions[bot] don't trigger it.
2. **Builder pull requests come from a bot** (`claude[bot]`), and claude-code-action refuses bots unless `allowed_bots` lists it.
   Only allow `claude,claude[bot]`, never `*` (the repo is public).
3. **Judge a version only after its checks finish.** A review during the checks said "not ready" for no reason and used up the fix round.
4. **Anything that decides on its own runs main's copy of its script** (`git show FETCH_HEAD:path`), and never on the `pull_request`
   event (that runs the pull request's own copy of the workflow). A change must not be able to rewrite the rules it's judged by.
5. **Every checker needs a self-test** with planted problems (`crawl.py --self-test`). A check that finds nothing proves nothing.
   Report one bug once: group repeats of the same error.
6. **Run logs are private** (Roy's public view and the API without a login can't see them). Use the public runs list and
   check-run annotations to see what failed, write errors into reports, and keep the night going after one part fails.
7. **Pushes are refused when they'd show Roy's private email.** Commit as `Claude <noreply@anthropic.com>`.
8. **Force-pushing is blocked here.** To update a builder's branch, push a new `claude/issue-N-something` branch instead.
9. **Untrusted text never reaches a shell.** Issue titles and comments go through `env:` variables and quoted `"$VAR"`, never `${{ }}`
   inside `run:`. The builder may only run the commands listed in its `--allowedTools`; add a script to agents/ for a new check.

## Adding or changing an agent

- [ ] It reads CLAUDE.md and the Skills that fit (put it in its prompt).
- [ ] Its permissions are the minimum it needs; secrets only where used.
- [ ] Who can start it is checked (owner, member or collaborator; or one marked comment from Claude's bot).
- [ ] It can't loop: every automatic hand-off is marked and counted (once per pull request, one queue job at a time).
- [ ] It can't spend without limit: a model choice, `--max-turns`, and the $100 monthly cap.
- [ ] It has a pause: Actions → the workflow → Disable workflow (say so at the top of the file).
- [ ] It reports in plain words, and pings Roy only when he needs to act.
- [ ] Validate the YAML (`python3 -c "import yaml; yaml.safe_load(open(F))"`), dry-run any script (`--dry-run`), push, then watch its
      first real run in the public runs list. Add one line to CLAUDE.md's map, the README in agents/, and this Skill.
