# Host Mode helper agents

Host Mode itself lives at **https://hostmode.app**, and its code is kept privately on GitLab.
Old links to hostmode.github.io are sent on to hostmode.app (index.html and 404.html keep the page,
the event code and everything after it).

This repo only holds two helper agents that run on GitHub Actions and report to GitLab:

| Agent | When | What it does |
|---|---|---|
| **Security watch** (`.github/workflows/security-watch.yml`) | every night, and by hand | Checks the live site's safety settings, that private files aren't served, that private database areas can't be read without signing in, and scans the code on GitLab for leaked keys. Each new problem becomes one GitLab issue labeled "security watch". It never changes code. |
| **Eddie render farm** (`.github/workflows/eddie-render.yml`) | by hand (Actions → Eddie render farm → Run workflow) | Renders an Eddie clip in Blender on several machines at once from the rig package kept privately on GitLab, and uploads the finished video back to GitLab. |

Nothing private is printed in the run logs, because this repo is public: findings and videos go only to GitLab.

Secret needed (Settings → Secrets and variables → Actions): `GITLAB_TOKEN`, a GitLab project access token
for host-mode-group/hostmode with the `api` scope (role Reporter is enough for the security watch; Developer for the render farm's uploads).
