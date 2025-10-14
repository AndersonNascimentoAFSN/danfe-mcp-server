#!/bin/bash

# configure-mcp.sh
# Script para configurar automaticamente o MCP Server DANFE Downloader
# 
# Funções:
# - Detecta caminho absoluto do projeto
# - Valida pré-requisitos (xvfb, Node.js, build)
# - Gera arquivo de configuração MCP correto
# - Fornece instruções de instalação

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     🔧 Configurador MCP - DANFE Downloader v1.0.0         ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# 1. Detectar caminho do projeto
PROJECT_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "📁 Caminho do projeto: $PROJECT_PATH"
echo ""

# 2. Validar pré-requisitos
echo "🔍 Validando pré-requisitos..."
echo ""

# Verificar xvfb
if ! command -v xvfb-run &> /dev/null; then
    echo "❌ ERRO: xvfb não está instalado"
    echo ""
    echo "Para instalar no Ubuntu/Debian:"
    echo "  sudo apt-get update"
    echo "  sudo apt-get install -y xvfb"
    echo ""
    exit 1
fi
echo "  ✅ xvfb instalado: $(xvfb-run --help 2>&1 | head -n 1)"

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo "❌ ERRO: Node.js não está instalado"
    echo ""
    echo "Instale Node.js v20+ em: https://nodejs.org/"
    echo ""
    exit 1
fi
NODE_VERSION=$(node --version)
echo "  ✅ Node.js instalado: $NODE_VERSION"

# Verificar npm
if ! command -v npm &> /dev/null; then
    echo "❌ ERRO: npm não está instalado"
    exit 1
fi
NPM_VERSION=$(npm --version)
echo "  ✅ npm instalado: v$NPM_VERSION"

# Verificar se o projeto foi compilado
if [ ! -f "$PROJECT_PATH/dist/index.js" ]; then
    echo "⚠️  AVISO: Projeto não compilado. Executando build..."
    echo ""
    cd "$PROJECT_PATH"
    npm run build
    echo ""
fi
echo "  ✅ Projeto compilado: dist/index.js existe"

echo ""
echo "✅ Todos os pré-requisitos validados!"
echo ""

# 3. Gerar arquivo de configuração
CONFIG_FILE="$PROJECT_PATH/mcp-config-generated.json"

cat > "$CONFIG_FILE" << EOF
{
  "mcpServers": {
    "danfe-downloader": {
      "command": "xvfb-run",
      "args": [
        "-a",
        "--server-args=-screen 0 1920x1080x24",
        "node",
        "$PROJECT_PATH/dist/index.js"
      ]
    }
  }
}
EOF

echo "📝 Arquivo de configuração gerado: mcp-config-generated.json"
echo ""

# 4. Mostrar conteúdo do arquivo
echo "📋 Conteúdo da configuração:"
echo "─────────────────────────────────────────────────────────────"
cat "$CONFIG_FILE"
echo "─────────────────────────────────────────────────────────────"
echo ""

# 5. Instruções de instalação
echo "🎯 PRÓXIMOS PASSOS:"
echo ""
echo "1. Copie o conteúdo de mcp-config-generated.json"
echo ""
echo "2. Para Claude Desktop, adicione ao arquivo de configuração:"
echo "   Linux: ~/.config/Claude/claude_desktop_config.json"
echo "   macOS: ~/Library/Application Support/Claude/claude_desktop_config.json"
echo "   Windows: %APPDATA%\\Claude\\claude_desktop_config.json"
echo ""
echo "3. Para outros clientes MCP, use o conteúdo gerado conforme"
echo "   as instruções do seu cliente"
echo ""
echo "4. Reinicie o cliente MCP para aplicar as mudanças"
echo ""
echo "5. Teste com a ferramenta download_danfe_xml"
echo ""
echo "✅ Configuração concluída com sucesso!"
echo ""
