#!/bin/bash

# Render.com ULTRA-FAST startup script
# Priority: Start Node.js server ASAP for port detection

set -e

# Critical: Set environment immediately  
export NODE_ENV=production
export HOST=0.0.0.0  
export PORT=${PORT:-10000}
export DISPLAY=:99

echo "🚀 RENDER FAST START - Port: $PORT"

# Start Xvfb in background with better error handling
echo "🖥️ Starting Xvfb..."
nohup Xvfb :99 -screen 0 1024x768x24 -ac -nolisten tcp -dpi 96 >/dev/null 2>&1 &
XVFB_PID=$!

# Give Xvfb a moment to start
sleep 1

# Verify Xvfb is running (but don't fail if it's not)
if kill -0 $XVFB_PID 2>/dev/null; then
    echo "✅ Xvfb started successfully (PID: $XVFB_PID)"
else
    echo "⚠️ Xvfb may have failed, but continuing (Playwright will auto-detect)"
fi

# IMMEDIATELY start Node.js (Render port detection is time-sensitive)
echo "🌐 STARTING NODE.JS NOW on $HOST:$PORT"
exec node dist/index.js