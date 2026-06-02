#!/bin/bash
set -e

echo "=== Installing system GL dependencies ==="
apt-get update -y
apt-get install -y --no-install-recommends \
    libgles2 libegl1 libgl1 libgbm1 libglib2.0-0

echo "=== Copying GL libraries into project (persists to runtime) ==="
mkdir -p ./libs

# Copy the specific libraries MediaPipe needs
for pattern in "libGLESv2.so*" "libEGL.so*" "libGL.so*" "libgbm.so*"; do
    find /usr/lib/x86_64-linux-gnu /usr/lib/aarch64-linux-gnu 2>/dev/null \
        -name "$pattern" -exec cp -Lv {} ./libs/ \; 2>/dev/null || true
done

echo "=== Libraries copied ==="
ls -la ./libs/ 2>/dev/null || echo "(empty)"

echo "=== Installing Python packages ==="
pip install -r requirements.txt

echo "=== Build done ==="
