#!/bin/bash

echo "🚀 Iniciando deploy para Render (nativo)..."

# 1. Verificar se está no git
if [ ! -d ".git" ]; then
    echo "❌ Este não é um repositório git"
    exit 1
fi

# 2. Verificar se há mudanças não commitadas
if ! git diff-index --quiet HEAD --; then
    echo "⚠️  Há mudanças não commitadas"
    echo "Fazendo commit automático..."
    git add .
    git commit -m "feat: prepare for Render native deployment - $(date)"
fi

# 3. Push para o repositório
echo "📤 Fazendo push para GitHub..."
git push origin main

# 4. Testar build localmente
echo "🔧 Testando build localmente..."
npm ci
npm run build:render

if [ $? -eq 0 ]; then
    echo "✅ Build local passou!"
else
    echo "❌ Build local falhou"
    exit 1
fi

echo ""
echo "✅ PRONTO PARA DEPLOY!"
echo ""
echo "📋 PRÓXIMOS PASSOS:"
echo "1. Vá para https://dashboard.render.com"
echo "2. Clique em 'New +' → 'Web Service'"
echo "3. Conecte seu repositório"
echo "4. Use estas configurações:"
echo ""
echo "   Service Name: danfe-downloader-mcp"
echo "   Runtime: Node"
echo "   Build Command: npm ci && npm run build:render"
echo "   Start Command: npm run start:render"
echo ""
echo "   Environment Variables:"
echo "   NODE_ENV=production"
echo "   LOG_LEVEL=info"
echo "   DISPLAY=:99"
echo ""
echo "5. Clique em 'Deploy'"
echo ""
echo "📊 Acompanhe o deploy em tempo real no dashboard do Render"