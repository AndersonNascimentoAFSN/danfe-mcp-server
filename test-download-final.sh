#!/bin/bash

echo "🧪 Teste Final: DanfeDownloaderFinal vs PlaywrightAdapter"
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
sleep 10

# Initialize MCP session (required for streamable HTTP)
echo "🔗 Inicializando sessão MCP..."
SESSION_ID=$(curl -s -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"jsonrpc":"2.0","id":0,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test-client","version":"1.0.0"}}}' \
  | jq -r '.result.sessionId' 2>/dev/null)

echo "✅ Sessão criada: $SESSION_ID"

# Test download
echo "📥 Testando download..."
curl -X POST "http://localhost:3000/mcp?sessionId=$SESSION_ID" \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
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
  }' 2>&1 | tee /tmp/mcp-response.txt

echo ""
echo "📋 Logs do servidor:"
tail -n 50 /tmp/mcp-server.log

# Cleanup
echo ""
echo "🛑 Encerrando servidor..."
kill $SERVER_PID 2>/dev/null
wait $SERVER_PID 2>/dev/null

echo "✅ Teste concluído!"
