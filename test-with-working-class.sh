#!/bin/bash

echo "🧪 Testando download com DanfeDownloaderFinal (classe que funcionava)"
echo "📄 NFe: 35241145070190000232550010006198721341979067"
echo ""

# Start server in background
xvfb-run -a --server-args="-screen 0 1920x1080x24" node dist/index.js &
SERVER_PID=$!
echo "🚀 Servidor iniciado (PID: $SERVER_PID)"

# Wait for server to be ready
sleep 3

# Test download
echo ""
echo "📥 Enviando requisição de download..."
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
  }' | jq '.'

echo ""
echo "✅ Teste concluído!"
echo "🛑 Encerrando servidor..."
kill $SERVER_PID
wait $SERVER_PID 2>/dev/null

echo "✅ Servidor encerrado"
