# 🚀 GUIA DE DEPLOY NO RENDER (SEM DOCKER)

## ✅ Vantagens do Deploy Nativo vs Docker:

### Deploy Nativo (Recomendado para este projeto):
- ✅ **Mais rápido**: Build em ~2-3 minutos
- ✅ **Mais simples**: Menos configuração
- ✅ **Menos recursos**: Consome menos memória
- ✅ **Debugging mais fácil**: Logs mais claros
- ✅ **Auto-scaling nativo**: Render otimiza automaticamente

### Deploy com Docker:
- ❌ Build mais lento (~5-10 minutos)
- ❌ Mais complexo de configurar
- ❌ Consome mais recursos
- ✅ Ambiente 100% idêntico ao local

## 📋 PASSOS PARA DEPLOY NATIVO:

### 1. **Preparar o repositório:**
```bash
# Commit todas as mudanças
git add .
git commit -m "feat: prepare for Render native deployment"
git push origin main
```

### 2. **No painel do Render:**
1. Vá para https://dashboard.render.com
2. Clique em "New +" → "Web Service"
3. Conecte seu repositório GitHub
4. Configure:

**Service Name:** `danfe-downloader-mcp`
**Runtime:** `Node`
**Branch:** `main`
**Build Command:** `npm ci && npm run build && npx playwright install chromium`
**Start Command:** `npm run start:headless`

### 3. **Variáveis de ambiente (Environment Variables):**
```
NODE_ENV=production
HOST=0.0.0.0
LOG_LEVEL=info
DISPLAY=:99
PLAYWRIGHT_BROWSERS_PATH=/opt/render/.cache/ms-playwright
```

### 4. **Configurações avançadas:**
- **Instance Type:** Free (para testes) ou Starter ($7/mês)
- **Auto-Deploy:** ✅ Habilitado
- **Health Check Path:** `/health`

## 🔧 ARQUIVOS NECESSÁRIOS:

Os arquivos que criamos:
- `render-native.yaml` - Blueprint do Render
- `build-render-native.sh` - Script de build customizado
- Scripts atualizados no `package.json`

## 📱 TESTE LOCAL:

Antes de fazer deploy, teste localmente:
```bash
# Simular ambiente Render
NODE_ENV=production npm run start:headless
```

## 🐛 TROUBLESHOOTING:

### Se o build falhar:
1. Verifique se o `package.json` está correto
2. Adicione mais timeout no Render (Settings → Timeout: 15 min)
3. Use plano Starter se precisar de mais recursos

### Se Playwright falhar:
1. Verifique se xvfb está instalado
2. Confirme DISPLAY=:99
3. Veja logs: `npx playwright install chromium --verbose`

## 📊 MONITORAMENTO:

Após deploy, monitore:
- **Logs:** Render Dashboard → Service → Logs
- **Metrics:** CPU/Memory usage
- **Health:** Endpoint `/health`

## 🎯 PRÓXIMOS PASSOS:

1. Fazer commit e push
2. Fazer deploy no Render
3. Testar endpoints
4. Configurar domínio personalizado (opcional)
5. Setup de monitoring/alertas