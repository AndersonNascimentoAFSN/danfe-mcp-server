#!/bin/bash
# Script para executar DANFE Downloader com xvfb

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

echo "╔════════════════════════════════════════════════════════════╗"
echo "║   🚀 DANFE Downloader MCP Server (HTTP Streamable)        ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "📁 Diretório: $PROJECT_DIR"
echo "🖥️  Modo: Headless (display virtual via xvfb)"
echo "🌐 Protocolo: HTTP Streamable"
echo "📦 Build: dist/index.js"
echo ""

# Verificar se xvfb está instalado
if ! command -v xvfb-run &> /dev/null; then
    echo "❌ Erro: xvfb não está instalado!"
    echo ""
    echo "Instale com: sudo apt-get install xvfb"
    exit 1
fi

# Verificar se o build existe
if [ ! -f "dist/index.js" ]; then
    echo "❌ Erro: dist/index.js não encontrado!"
    echo ""
    echo "Execute primeiro: npm run build"
    exit 1
fi

echo "✅ Iniciando servidor MCP..."
echo ""

# Executar com xvfb
xvfb-run -a --server-args="-screen 0 1920x1080x24" node dist/index.js
