#!/bin/bash

# Render.com optimized startup script
# DANFE Downloader MCP Server

set -e  # Exit on any error

echo "🚀 Starting DANFE Downloader MCP Server on Render..."

# Environment variables (Render best practices)
export NODE_ENV=production
export HOST=0.0.0.0
export PORT=${PORT:-10000}  # Render default is 10000
export DISPLAY=:99

# Debug info for Render logs
echo "📋 Render Configuration:"
echo "   NODE_ENV: $NODE_ENV"
echo "   HOST: $HOST (bind all interfaces)"  
echo "   PORT: $PORT (Render managed)"
echo "   DISPLAY: $DISPLAY"

# Start Xvfb with minimal config for faster startup
echo "🖥️  Starting Xvfb (virtual display)..."
Xvfb :99 -screen 0 1024x768x24 -ac -nolisten tcp > /dev/null 2>&1 &
XVFB_PID=$!

# Quick Xvfb validation (non-blocking)
sleep 1
if ! ps -p $XVFB_PID > /dev/null 2>&1; then
    echo "⚠️  Xvfb failed, starting without display..."
    export DISPLAY=""
else
    echo "✅ Xvfb ready (PID: $XVFB_PID)"
fi

# Cleanup function
cleanup() {
    echo "🛑 Graceful shutdown..."
    if [ ! -z "$XVFB_PID" ] && ps -p $XVFB_PID > /dev/null 2>&1; then
        kill $XVFB_PID 2>/dev/null || true
    fi
    exit 0
}

# Signal handlers
trap cleanup SIGTERM SIGINT

# Start Node.js server immediately (Render port detection)
echo "🌐 Starting Node.js server on $HOST:$PORT..."
echo "⏰ $(date): Server starting..."

# Execute Node.js (critical for Render port detection)
exec node dist/index.js