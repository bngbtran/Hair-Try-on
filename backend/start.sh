#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
export LD_LIBRARY_PATH="$SCRIPT_DIR/libs:/usr/local/lib:$LD_LIBRARY_PATH"
cd "$SCRIPT_DIR"
exec uvicorn app.main:app --host 0.0.0.0 --port $PORT
