#!/usr/bin/env bash
# Records the 14 key screens (before) or compares them (after). Starts its own local server and stops it after.
# Usage: bash agents/screens.sh before   |   bash agents/screens.sh after
set -u
cd "$(dirname "$0")/.."
case "${1:-}" in before|after) ;; *) echo "Use: bash agents/screens.sh before|after"; exit 2;; esac
python3 -m http.server 8765 >/dev/null 2>&1 &
SERVER=$!
trap 'kill $SERVER 2>/dev/null' EXIT
sleep 2
python3 agents/compare_screens.py "$1"
