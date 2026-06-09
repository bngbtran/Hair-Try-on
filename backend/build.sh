#!/bin/bash
set -e

echo "=== Python version ==="
python --version

echo "=== Install compiler & GL libs ==="
apt-get update -y -qq

apt-get install -y -qq --no-install-recommends gcc 2>&1 | tail -3

apt-get install -y -qq --no-install-recommends \
    libgles2 libegl1 libglvnd0 2>/dev/null || \
apt-get install -y -qq --no-install-recommends \
    libgles2-mesa libegl-mesa0 2>/dev/null || \
apt-get install -y -qq --no-install-recommends \
    libgl1-mesa-glx 2>/dev/null || true

mkdir -p ./libs

REAL_LIB=$(find /usr/lib /usr/lib/x86_64-linux-gnu /usr/lib/aarch64-linux-gnu \
               /lib /lib/x86_64-linux-gnu /usr/local/lib \
               -name "libGLESv2.so*" 2>/dev/null | head -1)

if [ -n "$REAL_LIB" ]; then
    echo "Found real libGLESv2: $REAL_LIB"
    cp -Lv "$REAL_LIB" ./libs/libGLESv2.so.2
else
    echo "=== Compiling libGLESv2 stub ==="
    cat > /tmp/gles2_stub.c << 'STUB'
/* Stub libGLESv2 — MediaPipe loads OK, GPU init fails gracefully, falls back to CPU */
int  glGetError(void)             { return 0; }
void glFinish(void)               {}
void glFlush(void)                {}
void glEnable(unsigned int c)     {}
void glDisable(unsigned int c)    {}
void glBindTexture(unsigned int t, unsigned int n) {}
void glDeleteTextures(int n, const unsigned int* ts) {}
void glGenTextures(int n, unsigned int* ts)         {}
void glTexImage2D(unsigned int a, int b, int c, int d, int e,
                  int f, unsigned int g, unsigned int h, const void* i) {}
void glReadPixels(int a, int b, int c, int d,
                  unsigned int e, unsigned int f, void* g) {}
void glViewport(int a, int b, int c, int d) {}
void glScissor(int a, int b, int c, int d)  {}
void glClear(unsigned int m)                {}
void glClearColor(float r, float g, float b, float a) {}
void glPixelStorei(unsigned int p, int v)   {}
STUB
    gcc -shared -fPIC \
        -Wl,-soname,libGLESv2.so.2 \
        -o ./libs/libGLESv2.so.2 \
        /tmp/gles2_stub.c
    echo "Stub compiled: $(ls -lh ./libs/libGLESv2.so.2)"
fi

REAL_EGL=$(find /usr/lib /usr/lib/x86_64-linux-gnu /usr/lib/aarch64-linux-gnu \
               /lib /lib/x86_64-linux-gnu /usr/local/lib \
               -name "libEGL.so*" 2>/dev/null | head -1)

if [ -n "$REAL_EGL" ]; then
    echo "Found real libEGL: $REAL_EGL"
    cp -Lv "$REAL_EGL" ./libs/libEGL.so.1
else
    echo "void eglGetError(void) {}" > /tmp/egl_stub.c
    gcc -shared -fPIC -Wl,-soname,libEGL.so.1 \
        -o ./libs/libEGL.so.1 /tmp/egl_stub.c || true
fi

echo "=== Installing libs to system paths ==="
cp ./libs/libGLESv2.so.2 /usr/local/lib/libGLESv2.so.2
[ -f ./libs/libEGL.so.1 ] && cp ./libs/libEGL.so.1 /usr/local/lib/libEGL.so.1 || true
ldconfig
echo "ldconfig OK — libs in cache:"
ldconfig -p | grep -E "libGLES|libEGL" || echo "  (not found in cache, LD_LIBRARY_PATH fallback active)"

echo "=== libs/ contents ==="
ls -lh ./libs/

echo "=== Install Python packages ==="
pip install -r requirements.txt

chmod +x ./start.sh

echo "=== Build done ==="
