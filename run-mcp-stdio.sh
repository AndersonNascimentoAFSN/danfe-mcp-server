#!/bin/bash
# ============================================
# Run MCP Server with xvfb for Copilot
# ============================================

# Iniciar xvfb se DISPLAY não estiver definido
if [ -z "$DISPLAY" ]; then
    export DISPLAY=:99
    Xvfb :99 -screen 0 1920x1080x24 -ac -nolisten tcp -dpi 96 +extension RANDR > /dev/null 2>&1 &
    XVFB_PID=$!
    sleep 2
fi

# Executar servidor MCP (stdio)
exec node dist/index-stdio.js
