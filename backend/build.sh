#!/bin/bash
set -e

echo "=== Install compiler ==="
apt-get update -y -qq
apt-get install -y -qq --no-install-recommends gcc 2>&1 | tail -3

mkdir -p ./libs

echo "=== Try to get real libGLESv2 first ==="
apt-get install -y -qq --no-install-recommends libgles2 libegl1 2>/dev/null || true

REAL_LIB=$(find /usr/lib -name "libGLESv2.so*" 2>/dev/null | head -1)
if [ -n "$REAL_LIB" ]; then
    cp -Lv "$REAL_LIB" ./libs/libGLESv2.so.2
    echo "Copied real libGLESv2 from $REAL_LIB"
else
    echo "=== Compiling libGLESv2 stub (CPU-only fallback) ==="
    cat > /tmp/gles2_stub.c << 'STUB'
/* Stub libGLESv2 — lets MediaPipe load, GPU init fails gracefully, falls back to CPU */
int  glGetError(void)          { return 0; }
void glFinish(void)            {}
void glFlush(void)             {}
void glEnable(unsigned int c)  {}
void glDisable(unsigned int c) {}
void glBindTexture(unsigned int t, unsigned int n) {}
void glDeleteTextures(int n, const unsigned int* ts) {}
void glGenTextures(int n, unsigned int* ts)         {}
void glTexImage2D(unsigned int a, int b, int c, int d, int e, int f, unsigned int g, unsigned int h, const void* i) {}
void glReadPixels(int a, int b, int c, int d, unsigned int e, unsigned int f, void* g) {}
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
    echo "Stub compiled OK"
fi

# Also stub libEGL if needed
REAL_EGL=$(find /usr/lib -name "libEGL.so*" 2>/dev/null | head -1)
if [ -n "$REAL_EGL" ]; then
    cp -Lv "$REAL_EGL" ./libs/libEGL.so.1
else
    echo "void eglGetError(void) {}" > /tmp/egl_stub.c
    gcc -shared -fPIC -Wl,-soname,libEGL.so.1 \
        -o ./libs/libEGL.so.1 /tmp/egl_stub.c || true
fi

echo "=== libs/ ==="
ls -la ./libs/

echo "=== Install Python packages ==="
pip install -r requirements.txt

echo "=== Build done ==="
