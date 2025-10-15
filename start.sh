#!/bin/bash

# Script de inicialização para Render
# DANFE Downloader MCP Server

set -e  # Exit on any error

echo "🚀 Starting DANFE Downloader MCP Server on Render..."

# Configurar variáveis de ambiente para Render
export NODE_ENV=production
export HOST=0.0.0.0
export PORT=${PORT:-3000}
export DISPLAY=:99

echo "📋 Configuration:"
echo "   NODE_ENV: $NODE_ENV"
echo "   HOST: $HOST"  
echo "   PORT: $PORT"
echo "   DISPLAY: $DISPLAY"

# Iniciar Xvfb em background
echo "🖥️  Starting virtual display (Xvfb)..."
Xvfb :99 -screen 0 1920x1080x24 -ac +extension GLX +render -noreset &
XVFB_PID=$!

# Aguardar Xvfb iniciar
sleep 2

# Verificar se Xvfb está rodando
if ! ps -p $XVFB_PID > /dev/null; then
    echo "❌ Failed to start Xvfb"
    exit 1
fi

echo "✅ Xvfb started (PID: $XVFB_PID)"

# Função de cleanup
cleanup() {
    echo "🛑 Shutting down gracefully..."
    if ps -p $XVFB_PID > /dev/null; then
        kill $XVFB_PID
        echo "✅ Xvfb stopped"
    fi
    exit 0
}

# Capturar sinais para cleanup
trap cleanup SIGTERM SIGINT

# Iniciar o servidor MCP
echo "🚀 Starting MCP Server..."
exec node dist/index.js