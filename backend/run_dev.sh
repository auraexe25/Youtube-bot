#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

if [ ! -x ".venv/bin/python" ]; then
  echo "Missing backend virtualenv. Create it with: python -m venv .venv && .venv/bin/pip install -r requirements.txt"
  exit 1
fi

exec .venv/bin/python -m uvicorn main:app --reload --port 8000
