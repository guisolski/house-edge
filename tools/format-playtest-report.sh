#!/usr/bin/env bash
# Format artifacts/playtest/REPORT.md so CI prettier --check never fails on it.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REPORT="$ROOT/artifacts/playtest/REPORT.md"
if [[ -f "$REPORT" ]]; then
  npx prettier --write "$REPORT"
fi
