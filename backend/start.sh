#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LIBS_DIR="$SCRIPT_DIR/libs"
export LD_LIBRARY_PATH="$LIBS_DIR:/usr/local/lib:$LD_LIBRARY_PATH"
if [ -f "$LIBS_DIR/libGLESv2.so.2" ]; then
  export LD_PRELOAD="$LIBS_DIR/libGLESv2.so.2:$LD_PRELOAD"
fi
if [ -f "$LIBS_DIR/libEGL.so.1" ]; then
  export LD_PRELOAD="$LIBS_DIR/libEGL.so.1:$LD_PRELOAD"
fi

echo "START SH: LD_LIBRARY_PATH=$LD_LIBRARY_PATH"
ls -l "$LIBS_DIR" || true
cd "$SCRIPT_DIR"
exec uvicorn app.main:app --host 0.0.0.0 --port $PORT
