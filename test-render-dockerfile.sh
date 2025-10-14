#!/bin/bash
# ============================================
# Test Render Dockerfile Locally
# ============================================
# 
# Este script testa o Dockerfile.render localmente
# antes de fazer deploy no Render
#
# Uso:
#   ./test-render-dockerfile.sh
#
# ============================================

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║   🧪 Testando Dockerfile.render Localmente                ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configurações
IMAGE_NAME="danfe-downloader-mcp-test"
CONTAINER_NAME="danfe-test"
PORT=3000

# Verificar se Docker está rodando
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker não está rodando!${NC}"
    echo "   Inicie o Docker e tente novamente."
    exit 1
fi

echo "🐳 Docker está rodando ✅"
echo ""

# Limpar containers/imagens antigas
echo "🧹 Limpando containers e imagens antigas..."
docker rm -f $CONTAINER_NAME 2>/dev/null || true
docker rmi -f $IMAGE_NAME 2>/dev/null || true
echo ""

# Build da imagem
echo "🔨 Construindo imagem Docker (pode levar 5-10 minutos)..."
echo "   Arquivo: Dockerfile.render"
echo "   Plataforma: linux/amd64 (mesmo que Render)"
echo ""

if docker build \
    --platform=linux/amd64 \
    -f Dockerfile.render \
    -t $IMAGE_NAME \
    . ; then
    echo -e "${GREEN}✅ Build completado com sucesso!${NC}"
else
    echo -e "${RED}❌ Build falhou!${NC}"
    exit 1
fi

echo ""
echo "📊 Informações da imagem:"
docker images $IMAGE_NAME --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"
echo ""

# Executar container
echo "🚀 Iniciando container..."
echo "   Porta: $PORT"
echo "   Nome: $CONTAINER_NAME"
echo ""

docker run -d \
    --name $CONTAINER_NAME \
    --platform=linux/amd64 \
    -p $PORT:3000 \
    -e PORT=3000 \
    -e HOST=0.0.0.0 \
    -e NODE_ENV=production \
    -e DISPLAY=:99 \
    $IMAGE_NAME

echo -e "${GREEN}✅ Container iniciado!${NC}"
echo ""

# Aguardar inicialização
echo "⏳ Aguardando servidor inicializar (30 segundos)..."
sleep 30

# Verificar logs
echo ""
echo "📋 Logs do container:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
docker logs $CONTAINER_NAME --tail 20
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Testar health check
echo "🏥 Testando health check..."
if curl -s http://localhost:$PORT/health > /dev/null; then
    echo -e "${GREEN}✅ Health check passou!${NC}"
    echo ""
    echo "Resposta:"
    curl -s http://localhost:$PORT/health | jq .
else
    echo -e "${RED}❌ Health check falhou!${NC}"
    echo ""
    echo "Logs completos:"
    docker logs $CONTAINER_NAME
    exit 1
fi

echo ""
echo "🧪 Testando endpoint /mcp/tools..."
if curl -s http://localhost:$PORT/mcp/tools > /dev/null; then
    echo -e "${GREEN}✅ Endpoint /mcp/tools respondeu!${NC}"
    echo ""
    echo "Resposta:"
    curl -s http://localhost:$PORT/mcp/tools | jq .
else
    echo -e "${RED}❌ Endpoint /mcp/tools falhou!${NC}"
fi

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                    ✅ TESTES CONCLUÍDOS                    ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "📊 Status do Container:"
docker ps --filter name=$CONTAINER_NAME --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""
echo "🌐 URLs para teste:"
echo "   Health Check: http://localhost:$PORT/health"
echo "   List Tools:   http://localhost:$PORT/mcp/tools"
echo "   MCP Endpoint: http://localhost:$PORT/mcp"
echo ""
echo "📋 Comandos úteis:"
echo "   Ver logs:     docker logs -f $CONTAINER_NAME"
echo "   Parar:        docker stop $CONTAINER_NAME"
echo "   Remover:      docker rm -f $CONTAINER_NAME"
echo "   Shell:        docker exec -it $CONTAINER_NAME /bin/bash"
echo ""
echo "🧪 Testar download DANFE:"
echo "   curl -X POST http://localhost:$PORT/mcp/tools/download_danfe_xml \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"chaveAcesso\": \"35241145070190000232550010006198721341979067\"}' | jq ."
echo ""
echo -e "${YELLOW}⚠️  Para parar o container:${NC}"
echo "   docker stop $CONTAINER_NAME && docker rm $CONTAINER_NAME"
echo ""
