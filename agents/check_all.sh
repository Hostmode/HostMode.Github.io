#!/usr/bin/env bash
# Every check a change must pass before it goes to Roy: broken code, then the scripted checks on the demos.
# Used by the builder agent and the pull request checks. Starts its own local server and stops it after.
set -u
cd "$(dirname "$0")/.."
node agents/syntax_check.js || exit 1
node agents/stay_go_test.js || exit 1
node agents/venue3d_test.mjs || exit 1
node workers/eddie-brain/test.mjs || exit 1
python3 -m http.server 8765 >/dev/null 2>&1 &
SERVER=$!
trap 'kill $SERVER 2>/dev/null' EXIT
sleep 2
python3 agents/venue3d_asset_check.py || exit 1
python3 agents/venue3d_photo_check.py || exit 1
python3 agents/venue3d_site_check.py || exit 1
python3 agents/office3d_check.py || exit 1
python3 agents/eddie_check.py || exit 1
python3 agents/tester.py --scripted-only
