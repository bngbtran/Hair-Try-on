#!/bin/bash
set -e

export LD_LIBRARY_PATH=/opt/render/project/src/backend/libs:/usr/local/lib:$LD_LIBRARY_PATH
exec uvicorn app.main:app --host 0.0.0.0 --port $PORT
