#!/bin/bash
# filepath: cleanup-unused-files-v2.sh

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     🧹 Removendo Arquivos Não Usados - v2                 ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Confirmar antes de remover
read -p "⚠️  Esta ação removerá 9 arquivos. Continuar? (s/n): " confirm
if [ "$confirm" != "s" ]; then
    echo "❌ Operação cancelada"
    exit 0
fi

echo ""
echo "🗑️  Removendo arquivos não essenciais..."

# Documentação redundante
rm -f AUTO_DELETE_XML.md
rm -f CLEANUP_SUMMARY.md
rm -f GITHUB_COPILOT_SETUP.md
rm -f MCP_TRANSPORT_COMPARISON.md
rm -f QUICKSTART_RENDER.md
rm -f RENDER_DEPLOYMENT_READY.md

echo "  ✅ 6 arquivos de documentação removidos"

# Código não usado
rm -f src/index-http-sse.ts
rm -f src/index-stdio.ts
rm -f src/index-old.ts

echo "  ✅ 3 arquivos de código removidos"

# Scripts não usados
rm -f run-mcp-stdio.sh

echo "  ✅ 1 script removido"

echo ""
echo "═════════════════════════════════════════════════════════════"
echo "✅ LIMPEZA CONCLUÍDA!"
echo "═════════════════════════════════════════════════════════════"
echo ""
echo "📊 Removido: 10 arquivos"
echo ""
echo "📁 Arquivos mantidos:"
echo "  ✅ README.md"
echo "  ✅ COPILOT_SETUP.md (novo)"
echo "  ✅ src/index.ts (HTTP Streamable)"
echo "  ✅ src/danfe-downloader-final.ts"
echo "  ✅ src/danfe-xml-reader.ts"
echo "  ✅ src/test-final-downloader.ts"
echo "  ✅ run-danfe-downloader.sh"
echo "  ✅ test-headless.sh"
echo "  ✅ configure-mcp.sh"
echo "  ✅ pre-production-check.sh"
echo "  ✅ package.json, tsconfig.json"
echo ""
echo "🎯 Próximos passos:"
echo "  1. npm install (remover dependências não usadas)"
echo "  2. npm run build"
echo "  3. ./run-danfe-downloader.sh"
echo "  4. Configurar no VS Code (settings.json)"
echo ""
