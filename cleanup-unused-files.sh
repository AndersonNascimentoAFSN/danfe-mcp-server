#!/bin/bash
# Cleanup Unused Files - Análise 2025
# Remove documentação redundante e arquivos históricos não usados

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     🧹 Removendo Arquivos Não Usados - Análise 2025       ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Confirmar antes de remover
read -p "⚠️  Esta ação removerá 13 arquivos. Continuar? (s/n): " confirm
if [ "$confirm" != "s" ]; then
    echo "❌ Operação cancelada"
    exit 0
fi

echo ""
echo "🗑️  Removendo documentação redundante..."

# Contador
removed=0

# Documentação histórica/redundante
files_to_remove=(
    "API_USAGE.md"
    "IMPLEMENTACAO_COMPLETA.md"
    "IMPLEMENTACAO_FINALIZADA.md"
    "INDICE_DOCUMENTACAO.md"
    "QUICK_START.md"
    "README_NEW.md"
    "RESUMO_EXECUTIVO.md"
    "RESUMO_FINAL.md"
    "RESUMO_LIMPEZA.md"
    "SUMARIO_FINAL.md"
    "SUMARIO_IMPLEMENTACAO.md"
    "HOSPEDAGEM.md"
    "QUICKSTART_HOSPEDAGEM.md"
)

for file in "${files_to_remove[@]}"; do
    if [ -f "$file" ]; then
        rm -f "$file"
        echo "  ✅ Removido: $file"
        ((removed++))
    else
        echo "  ⏭️  Não encontrado: $file"
    fi
done

echo ""
echo "═════════════════════════════════════════════════════════════"
echo "✅ LIMPEZA CONCLUÍDA!"
echo "═════════════════════════════════════════════════════════════"
echo ""
echo "📊 Total removido: $removed arquivos"
echo ""
echo "📁 Arquivos essenciais mantidos:"
echo "  ✅ README.md (documentação consolidada)"
echo "  ✅ src/* (código fonte)"
echo "  ✅ Scripts operacionais (test-headless.sh, configure-mcp.sh, etc)"
echo "  ✅ Configuração (package.json, tsconfig.json, etc)"
echo ""
echo "🎯 Estrutura limpa e organizada!"
echo ""
