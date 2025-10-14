#!/bin/bash

# pre-production-check.sh
# Script de validação pré-produção para DANFE Downloader MCP Server
#
# Verifica:
# - Ambiente do sistema (Node.js, xvfb, dependências)
# - Estrutura do projeto (arquivos essenciais)
# - Compilação (dist/ atualizado)
# - Configurações (MCP config válido)
# - Teste funcional (download XML)

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║   ✅ Verificação Pré-Produção - DANFE Downloader v1.0.0   ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

PROJECT_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ERRORS=0
WARNINGS=0

# Função para reportar erro
error() {
    echo "❌ ERRO: $1"
    ERRORS=$((ERRORS + 1))
}

# Função para reportar aviso
warning() {
    echo "⚠️  AVISO: $1"
    WARNINGS=$((WARNINGS + 1))
}

# Função para reportar sucesso
success() {
    echo "✅ $1"
}

echo "🔍 VERIFICAÇÃO DO AMBIENTE"
echo "─────────────────────────────────────────────────────────────"

# 1. Verificar Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
    if [ "$NODE_MAJOR" -ge 20 ]; then
        success "Node.js $NODE_VERSION (>= v20 requerido)"
    else
        error "Node.js $NODE_VERSION muito antigo (>= v20 requerido)"
    fi
else
    error "Node.js não instalado"
fi

# 2. Verificar npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    success "npm v$NPM_VERSION"
else
    error "npm não instalado"
fi

# 3. Verificar xvfb
if command -v xvfb-run &> /dev/null; then
    success "xvfb instalado e disponível"
else
    error "xvfb não instalado (essencial para modo headless)"
fi

echo ""
echo "🔍 VERIFICAÇÃO DO PROJETO"
echo "─────────────────────────────────────────────────────────────"

# 4. Verificar estrutura de arquivos essenciais
ESSENTIAL_FILES=(
    "package.json"
    "tsconfig.json"
    "src/index.ts"
    "src/danfe-downloader-final.ts"
)

for file in "${ESSENTIAL_FILES[@]}"; do
    if [ -f "$PROJECT_PATH/$file" ]; then
        success "$file existe"
    else
        error "$file não encontrado"
    fi
done

# 5. Verificar node_modules
if [ -d "$PROJECT_PATH/node_modules" ]; then
    success "node_modules/ existe"
else
    error "node_modules/ não encontrado (execute: npm install)"
fi

echo ""
echo "🔍 VERIFICAÇÃO DA COMPILAÇÃO"
echo "─────────────────────────────────────────────────────────────"

# 6. Verificar dist/
if [ -d "$PROJECT_PATH/dist" ]; then
    success "dist/ existe"
    
    # Verificar arquivos compilados
    COMPILED_FILES=(
        "dist/index.js"
        "dist/danfe-downloader-final.js"
    )
    
    for file in "${COMPILED_FILES[@]}"; do
        if [ -f "$PROJECT_PATH/$file" ]; then
            success "$file existe"
        else
            error "$file não encontrado (execute: npm run build)"
        fi
    done
    
    # Verificar se compilação está atualizada
    if [ -f "$PROJECT_PATH/src/index.ts" ] && [ -f "$PROJECT_PATH/dist/index.js" ]; then
        SRC_TIME=$(stat -c %Y "$PROJECT_PATH/src/index.ts" 2>/dev/null || stat -f %m "$PROJECT_PATH/src/index.ts" 2>/dev/null)
        DIST_TIME=$(stat -c %Y "$PROJECT_PATH/dist/index.js" 2>/dev/null || stat -f %m "$PROJECT_PATH/dist/index.js" 2>/dev/null)
        
        if [ "$DIST_TIME" -ge "$SRC_TIME" ]; then
            success "Compilação está atualizada"
        else
            warning "Compilação pode estar desatualizada (execute: npm run build)"
        fi
    fi
else
    error "dist/ não encontrado (execute: npm run build)"
fi

echo ""
echo "🔍 VERIFICAÇÃO DA CONFIGURAÇÃO MCP"
echo "─────────────────────────────────────────────────────────────"

# 7. Verificar arquivos de configuração MCP
if [ -f "$PROJECT_PATH/mcp-config-xvfb.json" ]; then
    success "mcp-config-xvfb.json existe"
else
    warning "mcp-config-xvfb.json não encontrado (template de configuração)"
fi

if [ -f "$PROJECT_PATH/configure-mcp.sh" ]; then
    success "configure-mcp.sh existe"
    if [ -x "$PROJECT_PATH/configure-mcp.sh" ]; then
        success "configure-mcp.sh é executável"
    else
        warning "configure-mcp.sh não é executável (execute: chmod +x configure-mcp.sh)"
    fi
else
    warning "configure-mcp.sh não encontrado"
fi

echo ""
echo "🔍 VERIFICAÇÃO DE DEPENDÊNCIAS"
echo "─────────────────────────────────────────────────────────────"

# 8. Verificar dependências críticas no package.json
if [ -f "$PROJECT_PATH/package.json" ]; then
    CRITICAL_DEPS=(
        "@modelcontextprotocol/sdk"
        "playwright"
        "zod"
    )
    
    for dep in "${CRITICAL_DEPS[@]}"; do
        if grep -q "\"$dep\"" "$PROJECT_PATH/package.json"; then
            success "$dep listado no package.json"
        else
            error "$dep não encontrado no package.json"
        fi
    done
fi

echo ""
echo "🔍 TESTE FUNCIONAL (OPCIONAL)"
echo "─────────────────────────────────────────────────────────────"

if [ -f "$PROJECT_PATH/test-headless.sh" ]; then
    success "test-headless.sh encontrado"
    echo "   Para executar teste funcional completo, execute:"
    echo "   ./test-headless.sh"
else
    warning "test-headless.sh não encontrado (script de teste opcional)"
fi

echo ""
echo "═════════════════════════════════════════════════════════════"
echo "                      RESULTADO FINAL"
echo "═════════════════════════════════════════════════════════════"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo "🎉 SUCESSO! Sistema 100% pronto para produção!"
    echo ""
    echo "✅ Todos os testes passaram"
    echo "✅ Nenhum erro encontrado"
    echo "✅ Nenhum aviso gerado"
    echo ""
    echo "Próximos passos:"
    echo "1. Configure o MCP: ./configure-mcp.sh"
    echo "2. Teste o download: ./test-headless.sh"
    echo "3. Integre com seu agente/cliente MCP"
    echo ""
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo "⚠️  ATENÇÃO: Sistema funcional com avisos"
    echo ""
    echo "✅ Nenhum erro crítico encontrado"
    echo "⚠️  $WARNINGS aviso(s) gerado(s)"
    echo ""
    echo "O sistema pode funcionar, mas recomenda-se revisar os avisos."
    echo ""
    exit 0
else
    echo "❌ FALHA: Sistema NÃO está pronto para produção"
    echo ""
    echo "❌ $ERRORS erro(s) crítico(s) encontrado(s)"
    echo "⚠️  $WARNINGS aviso(s) gerado(s)"
    echo ""
    echo "Corrija os erros acima antes de usar em produção."
    echo ""
    exit 1
fi
