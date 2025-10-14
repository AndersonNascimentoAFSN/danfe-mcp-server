#!/bin/bash

echo "╔════════════════════════════════════════════════════════════╗"
echo "║        🧹 Limpando Projeto - Removendo Obsoletos          ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Remover documentação redundante
echo "📝 Removendo documentação redundante..."
rm -f AGENT_GUIDE.md
rm -f CHECKLIST.md
rm -f CORRECOES_APLICADAS.md
rm -f PROJECT_SUMMARY.md
rm -f QUICKSTART.md
rm -f SOLUCAO_FINAL.md
rm -f STATUS_FINAL.md
rm -f STRUCTURE.md
rm -f VALIDATION_REPORT.md
echo "  ✅ 9 arquivos .md removidos"

# Remover configurações duplicadas
echo ""
echo "⚙️  Removendo configurações duplicadas..."
rm -f mcp-config-example.json
echo "  ✅ mcp-config-example.json removido"

# Remover scripts obsoletos
echo ""
echo "📜 Removendo scripts obsoletos..."
rm -f install.sh
rm -f setup-for-agents.sh
rm -f test-download.sh
rm -f validate.sh
echo "  ✅ 4 scripts obsoletos removidos"

# Remover testes não utilizados
echo ""
echo "🧪 Removendo testes não utilizados..."
rm -f src/test-final.ts
echo "  ✅ src/test-final.ts removido"

echo ""
echo "═════════════════════════════════════════════════════════════"
echo "✅ LIMPEZA CONCLUÍDA COM SUCESSO!"
echo "═════════════════════════════════════════════════════════════"
echo ""
echo "📁 Arquivos essenciais mantidos:"
echo "  ✅ README.md"
echo "  ✅ src/index.ts"
echo "  ✅ src/danfe-downloader-final.ts"
echo "  ✅ src/test-final-downloader.ts"
echo "  ✅ test-headless.sh"
echo "  ✅ configure-mcp.sh"
echo "  ✅ pre-production-check.sh"
echo "  ✅ run-danfe-downloader.sh"
echo "  ✅ mcp-config-xvfb.json"
echo "  ✅ package.json"
echo "  ✅ tsconfig.json"
echo ""
echo "📊 Total removido: 14 arquivos obsoletos"
echo ""
