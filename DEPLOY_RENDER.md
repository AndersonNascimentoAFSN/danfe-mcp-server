# 🚀 Deploy no Render - DANFE Downloader MCP Server

## 📋 Índice
- [Visão Geral](#visão-geral)
- [Pré-requisitos](#pré-requisitos)
- [Método 1: Deploy via Dashboard (Recomendado)](#método-1-deploy-via-dashboard-recomendado)
- [Método 2: Deploy via Render Blueprint (IaC)](#método-2-deploy-via-render-blueprint-iac)
- [Método 3: Deploy via Render CLI](#método-3-deploy-via-render-cli)
- [Configuração Pós-Deploy](#configuração-pós-deploy)
- [Testes](#testes)
- [Troubleshooting](#troubleshooting)
- [Custos](#custos)
- [Escalabilidade](#escalabilidade)

---

## 🎯 Visão Geral

Este guia explica como fazer deploy do **DANFE Downloader MCP Server** no [Render](https://render.com), uma plataforma cloud moderna que suporta:

✅ **Docker nativo** - Sem configuração complexa  
✅ **xvfb automático** - Browser headless funciona out-of-the-box  
✅ **Auto-deploy** - Deploy automático a cada push no Git  
✅ **HTTPS gratuito** - SSL/TLS incluso  
✅ **Free tier disponível** - Teste gratuitamente  

### 🏗️ Arquitetura no Render

```
GitHub Repository
       ↓
   Render Build
       ↓
Docker Image (Node.js + Playwright + xvfb)
       ↓
   Web Service (porta 10000)
       ↓
   HTTPS URL: https://danfe-downloader-xyz.onrender.com
```

---

## 📦 Pré-requisitos

### 1. Conta no Render
- Acesse [render.com](https://render.com) e crie uma conta gratuita
- Conecte sua conta GitHub/GitLab

### 2. Repositório Git
- Código deve estar em um repositório Git (GitHub, GitLab, ou Bitbucket)
- Branch `main` ou `master` configurado

### 3. Arquivos Necessários (✅ Já Inclusos)
- ✅ `Dockerfile.render` - Dockerfile otimizado para Render
- ✅ `render.yaml` - Blueprint para Infrastructure as Code
- ✅ `.dockerignore` - Otimização de build
- ✅ `package.json` - Dependências Node.js
- ✅ `tsconfig.json` - Configuração TypeScript

---

## 🚀 Método 1: Deploy via Dashboard (Recomendado)

### Passo 1: Criar Novo Web Service

1. Acesse o [Render Dashboard](https://dashboard.render.com)
2. Clique em **"New +"** → **"Web Service"**
3. Conecte seu repositório Git

### Passo 2: Configurar Serviço

Preencha os campos:

| Campo | Valor |
|-------|-------|
| **Name** | `danfe-downloader-mcp` (ou outro nome) |
| **Region** | `Ohio (US East)` (escolha a mais próxima) |
| **Branch** | `main` |
| **Runtime** | `Docker` |
| **Dockerfile Path** | `./Dockerfile.render` |
| **Docker Context** | `.` (raiz do projeto) |

### Passo 3: Configurar Plano

| Opção | Descrição | Custo |
|-------|-----------|-------|
| **Free** | 512 MB RAM, 0.1 CPU, sleep após 15min inativo | Grátis |
| **Starter** | 512 MB RAM, 0.5 CPU, sempre ativo | $7/mês |
| **Standard** | 2 GB RAM, 1 CPU, sempre ativo | $25/mês |

> ⚠️ **Free Tier**: Serviço "dorme" após 15 minutos de inatividade. Primeira requisição após sleep leva ~30s para "acordar".

### Passo 4: Variáveis de Ambiente

Adicione as seguintes variáveis (já configuradas automaticamente no `render.yaml`):

| Key | Value | Descrição |
|-----|-------|-----------|
| `PORT` | `3000` | Porta do servidor (Render define automaticamente) |
| `HOST` | `0.0.0.0` | Bind em todas interfaces |
| `NODE_ENV` | `production` | Modo produção |
| `DISPLAY` | `:99` | Display virtual xvfb |

### Passo 5: Deploy

1. Clique em **"Create Web Service"**
2. Render iniciará o build automaticamente
3. Aguarde 5-10 minutos (primeira build instala Playwright)
4. Status mudará para **"Live"** quando estiver pronto ✅

### Passo 6: Testar

Sua URL será algo como: `https://danfe-downloader-xyz.onrender.com`

Teste o health check:
```bash
curl https://danfe-downloader-xyz.onrender.com/health
```

Resposta esperada:
```json
{
  "status": "healthy",
  "service": "danfe-downloader",
  "version": "1.0.0",
  "timestamp": "2025-10-14T23:30:00.000Z"
}
```

---

## 🛠️ Método 2: Deploy via Render Blueprint (IaC)

### Vantagens
- ✅ Infraestrutura como código (versionada no Git)
- ✅ Deploy automatizado
- ✅ Reproduzível em múltiplos ambientes
- ✅ Configuração declarativa

### Passo 1: Configurar render.yaml

O arquivo `render.yaml` já está configurado no projeto. Revise e ajuste se necessário:

```yaml
services:
  - type: web
    name: danfe-downloader-mcp
    runtime: image
    plan: free  # Altere se necessário
    region: ohio
    branch: main
    dockerfilePath: ./Dockerfile.render
    healthCheckPath: /health
    envVars:
      - key: PORT
        value: 3000
      # ... outras variáveis
```

### Passo 2: Deploy via Dashboard

1. Acesse [Render Dashboard](https://dashboard.render.com)
2. Clique em **"New +"** → **"Blueprint"**
3. Selecione seu repositório
4. Render detectará automaticamente o `render.yaml`
5. Revise a configuração e clique em **"Apply"**

### Passo 3: Auto-Deploy

Após configurado, todo push no branch `main` fará deploy automático! 🎉

```bash
git add .
git commit -m "Update feature"
git push origin main
# Render fará deploy automaticamente
```

---

## 💻 Método 3: Deploy via Render CLI

### Instalar Render CLI

```bash
npm install -g @renderinc/cli
```

### Login

```bash
render login
```

### Deploy

```bash
# Deploy usando render.yaml
render blueprint deploy

# Ou criar serviço manualmente
render services create \
  --name danfe-downloader-mcp \
  --type web \
  --runtime image \
  --plan free \
  --region ohio \
  --dockerfile ./Dockerfile.render \
  --branch main
```

---

## ⚙️ Configuração Pós-Deploy

### 1. Configurar Domínio Customizado (Opcional)

1. Acesse seu serviço no Dashboard
2. Vá em **Settings** → **Custom Domains**
3. Adicione seu domínio (ex: `danfe.seudominio.com`)
4. Configure DNS CNAME apontando para Render

### 2. Configurar Health Check

Render verifica automaticamente `/health` a cada 30 segundos.

Se o serviço não responder 3 vezes seguidas, Render tentará reiniciar.

### 3. Configurar Auto-Deploy

Por padrão, auto-deploy está ativado. Para desativar:

1. **Settings** → **Build & Deploy**
2. Desmarque **"Auto-Deploy"**

### 4. Configurar Logs

Acesse logs em tempo real:

```bash
# Via CLI
render services logs --service danfe-downloader-mcp --tail

# Ou via Dashboard
Dashboard → Service → Logs
```

---

## 🧪 Testes

### 1. Health Check

```bash
curl https://seu-servico.onrender.com/health
```

### 2. Listar Tools

```bash
curl https://seu-servico.onrender.com/mcp/tools
```

### 3. Download DANFE XML

```bash
curl -X POST https://seu-servico.onrender.com/mcp/tools/download_danfe_xml \
  -H "Content-Type: application/json" \
  -d '{
    "chaveAcesso": "35241145070190000232550010006198721341979067"
  }' | jq .
```

### 4. Teste com MCP Client

```javascript
// JavaScript
const response = await fetch('https://seu-servico.onrender.com/mcp/tools/download_danfe_xml', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    chaveAcesso: '35241145070190000232550010006198721341979067'
  })
});

const data = await response.json();
console.log(data);
```

---

## 🐛 Troubleshooting

### Problema: Build Timeout

**Sintoma**: Build falha com "Build exceeded maximum time"

**Solução**:
1. Upgrade para plano Starter (builds mais rápidos)
2. Otimize Dockerfile (já otimizado em `Dockerfile.render`)

### Problema: Serviço não responde após deploy

**Sintoma**: Status "Live" mas requisições falham

**Verificar**:
1. Logs do serviço: `Dashboard → Logs`
2. Health check passou: `Dashboard → Health`
3. Porta correta (Render usa `PORT` env var)

**Solução**:
```typescript
// Em src/index.ts, certifique-se que usa process.env.PORT
const PORT = parseInt(process.env.PORT || "3000");
```

### Problema: xvfb não funciona

**Sintoma**: "Error: Failed to launch chromium"

**Verificar**:
1. `DISPLAY=:99` está configurado
2. xvfb está no Dockerfile

**Solução**: Use `Dockerfile.render` que já configura xvfb corretamente

### Problema: Free tier "sleep"

**Sintoma**: Primeira requisição lenta (30s)

**Explicação**: Free tier dorme após 15min inativo

**Soluções**:
1. **Upgrade** para Starter ($7/mês) - sempre ativo
2. **Cron Job**: Ping a cada 10min (ex: UptimeRobot, cron-job.org)
3. **Aceitar** - OK para desenvolvimento/teste

```bash
# Cron job simples (pingar a cada 10 minutos)
*/10 * * * * curl https://seu-servico.onrender.com/health
```

### Problema: Memory Issues

**Sintoma**: "Out of memory" ou crashes aleatórios

**Solução**:
1. Upgrade para plano com mais RAM
2. Otimizar código (fechar browsers Playwright)
3. Limitar concorrência

```typescript
// Exemplo: limitar instâncias simultâneas de browser
const semaphore = new Semaphore(2); // máximo 2 downloads simultâneos
```

---

## 💰 Custos

### Planos Render

| Plano | RAM | CPU | Preço/mês | Indicado para |
|-------|-----|-----|-----------|---------------|
| **Free** | 512 MB | 0.1 | $0 | Desenvolvimento, testes |
| **Starter** | 512 MB | 0.5 | $7 | Produção leve (1-10 req/min) |
| **Standard** | 2 GB | 1.0 | $25 | Produção médio (10-100 req/min) |
| **Pro** | 4 GB | 2.0 | $85 | Produção pesado (100+ req/min) |

### Estimativa de Uso

**Cenário 1: Baixo tráfego** (10 downloads/dia)
- Plano: **Free** ou **Starter**
- Custo: **$0-7/mês**

**Cenário 2: Médio tráfego** (100 downloads/dia)
- Plano: **Starter** ou **Standard**
- Custo: **$7-25/mês**

**Cenário 3: Alto tráfego** (1000+ downloads/dia)
- Plano: **Standard** ou **Pro** + Load Balancer
- Custo: **$25-100+/mês**

---

## 📈 Escalabilidade

### Escalonamento Vertical

Upgrade de plano via Dashboard:
1. **Settings** → **Plan**
2. Selecione novo plano
3. Apply changes (sem downtime)

### Escalonamento Horizontal

Para tráfego muito alto:

```yaml
# render.yaml com múltiplas instâncias
services:
  - type: web
    name: danfe-downloader-mcp
    runtime: image
    plan: standard
    numInstances: 3  # 3 instâncias em paralelo
    region: ohio
    # ... resto da config
```

**Custo**: 3x Standard = $75/mês (suporta 300+ req/min)

### Load Balancing

Render faz load balancing automático entre instâncias.

---

## 🔒 Segurança

### 1. Variáveis de Ambiente Secretas

```bash
# Adicionar secrets via CLI
render env-var set MY_SECRET_KEY=valor-secreto \
  --service danfe-downloader-mcp

# Ou via Dashboard: Settings → Environment
```

### 2. Autenticação (Opcional)

Adicione autenticação no código:

```typescript
// src/index.ts
app.addHook('onRequest', async (request, reply) => {
  const apiKey = request.headers['x-api-key'];
  if (apiKey !== process.env.API_KEY) {
    reply.code(401).send({ error: 'Unauthorized' });
  }
});
```

### 3. Rate Limiting

```typescript
import rateLimit from '@fastify/rate-limit';

app.register(rateLimit, {
  max: 100, // 100 requisições
  timeWindow: '15 minutes'
});
```

---

## 📚 Recursos Adicionais

### Documentação Oficial
- [Render Docs](https://render.com/docs)
- [Deploy Docker Images](https://render.com/docs/deploy-an-image)
- [Render Blueprint](https://render.com/docs/blueprint-spec)

### Suporte
- [Render Community Forum](https://community.render.com)
- [Status Page](https://status.render.com)
- [Email Support](mailto:support@render.com) (planos pagos)

---

## ✅ Checklist de Deploy

- [ ] Conta Render criada e conectada ao GitHub
- [ ] Repositório Git com código atualizado
- [ ] `Dockerfile.render` configurado
- [ ] `render.yaml` revisado
- [ ] Plano selecionado (Free ou Starter)
- [ ] Web Service criado no Dashboard
- [ ] Variáveis de ambiente configuradas
- [ ] Build completado com sucesso
- [ ] Health check respondendo (`/health`)
- [ ] Teste de download funcionando
- [ ] Logs monitorados
- [ ] Domínio customizado configurado (opcional)
- [ ] Auto-deploy ativado

---

## 🎉 Conclusão

Seu **DANFE Downloader MCP Server** agora está rodando no Render com:

✅ **xvfb automático** - Browser headless funcionando  
✅ **HTTPS gratuito** - SSL/TLS incluso  
✅ **Auto-deploy** - Atualiza a cada push  
✅ **Monitoramento** - Health checks automáticos  
✅ **Escalável** - Upgrade fácil conforme necessário  

**URL de Produção**: `https://seu-servico.onrender.com`

---

**🚀 Deploy realizado com sucesso!**

Para dúvidas ou problemas, consulte a seção [Troubleshooting](#troubleshooting) ou abra uma issue no repositório.
