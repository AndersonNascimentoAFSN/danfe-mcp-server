# ⚡ Quick Start - Deploy no Render em 5 Minutos

## 🎯 Objetivo
Deploy do DANFE Downloader MCP Server no Render em 5 minutos.

---

## ✅ Pré-requisitos
- [ ] Código no GitHub/GitLab
- [ ] Conta no Render (gratuita)

---

## 🚀 Passo a Passo

### 1️⃣ Acessar Render (30 segundos)
```
https://dashboard.render.com
```
- Criar conta ou fazer login
- Conectar GitHub

### 2️⃣ Criar Web Service (1 minuto)
1. Clique em **"New +"** → **"Web Service"**
2. Selecione seu repositório
3. Clique em **"Connect"**

### 3️⃣ Configurar (2 minutos)

**Configurações:**
```
Name:              danfe-downloader-mcp
Region:            Ohio (US East)
Branch:            main
Runtime:           Docker
Dockerfile Path:   ./Dockerfile.render
Docker Context:    .
Plan:              Free (ou Starter)
```

**Environment Variables** (automático via render.yaml, mas pode conferir):
```
PORT=3000
HOST=0.0.0.0
NODE_ENV=production
DISPLAY=:99
```

### 4️⃣ Deploy (1 minuto + 5-10 min build)
1. Clique em **"Create Web Service"**
2. Aguarde build completar (primeira vez: 5-10 min)
3. Status mudará para **"Live"** ✅

### 5️⃣ Testar (30 segundos)

**Sua URL:**
```
https://danfe-downloader-xyz.onrender.com
```

**Teste rápido:**
```bash
# Health check
curl https://SEU-SERVICO.onrender.com/health

# Listar tools
curl https://SEU-SERVICO.onrender.com/mcp/tools

# Download DANFE
curl -X POST https://SEU-SERVICO.onrender.com/mcp/tools/download_danfe_xml \
  -H "Content-Type: application/json" \
  -d '{"chaveAcesso": "35241145070190000232550010006198721341979067"}'
```

---

## 🎉 Pronto!

Seu servidor MCP está rodando em produção no Render!

**URL de produção**: `https://seu-servico.onrender.com`

---

## 📚 Próximos Passos (Opcional)

- [ ] Configurar domínio customizado
- [ ] Upgrade para Starter ($7/mês) se precisar 24/7
- [ ] Configurar monitoramento
- [ ] Adicionar rate limiting
- [ ] Configurar autenticação

---

## 🐛 Problemas?

### Build falha
- Verificar Dockerfile.render existe
- Verificar logs no Dashboard

### Servidor não responde
- Aguardar 30s (se Free tier)
- Verificar logs
- Testar health check

### xvfb não funciona
- Usar Dockerfile.render (não Dockerfile)
- Verificar DISPLAY=:99 está configurado

---

## 📖 Documentação Completa

- **[DEPLOY_RENDER.md](./DEPLOY_RENDER.md)** - Guia detalhado
- **[RENDER_DEPLOYMENT_READY.md](./RENDER_DEPLOYMENT_READY.md)** - Checklist
- **[README.md](./README.md)** - Documentação do projeto

---

## 💡 Dicas

### Free Tier
- Dorme após 15min inativo
- Primeira requisição: ~30s
- OK para desenvolvimento

### Upgrade para Starter
- Sempre ativo (24/7)
- Mais rápido
- $7/mês

### Auto-Deploy
- Push em `main` → Deploy automático
- Configurado via `render.yaml`

---

**Total: ~5 minutos + 10 minutos build = 15 minutos**

**Sucesso!** 🎉
