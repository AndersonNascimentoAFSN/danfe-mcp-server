#!/bin/bash

# Render.com ULTRA-FAST startup script
# Priority: Start Node.js server ASAP for port detection

set -e

# Critical: Set environment immediately  
export NODE_ENV=production
export HOST=0.0.0.0  
export PORT=${PORT:-10000}
export DISPLAY=:99

echo "� RENDER FAST START - Port: $PORT"

# Start Xvfb in background (don't wait)
echo "🖥️ Starting Xvfb..."
nohup Xvfb :99 -screen 0 1024x768x24 -ac -nolisten tcp >/dev/null 2>&1 &

# IMMEDIATELY start Node.js (Render port detection is time-sensitive)
echo "🌐 STARTING NODE.JS NOW on $HOST:$PORT"
exec node dist/index.js