#!/bin/bash

echo "🧪 Teste: PlaywrightAdapter com código refatorado"
echo "📄 NFe: 35241145070190000232550010006198721341979067"
echo ""

cd /home/andersonnascimento/develop/github/projects/projeto_final/mcp-server-old

# Kill any running server
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
sleep 2

# Start server
echo "🚀 Iniciando servidor..."
xvfb-run -a --server-args="-screen 0 1920x1080x24" node dist/index.js > /tmp/mcp-server.log 2>&1 &
SERVER_PID=$!

# Wait for ready
echo "⏳ Aguardando servidor ficar pronto..."
sleep 20
echo "✅ Servidor pronto!"

# Test download
echo "📥 Testando download com PlaywrightAdapter refatorado..."
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "download_danfe_xml",
      "arguments": {
        "chaveAcesso": "35241145070190000232550010006198721341979067"
      }
    }
  }' 2>&1 | tee /tmp/mcp-response.json

echo ""
echo "📋 Últimas 60 linhas do log:"
tail -n 60 /tmp/mcp-server.log

# Cleanup
echo ""
echo "🛑 Encerrando servidor..."
kill $SERVER_PID 2>/dev/null
wait $SERVER_PID 2>/dev/null

echo "✅ Teste concluído!"
