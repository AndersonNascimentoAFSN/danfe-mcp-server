# 🤖 GitHub Copilot - Configuração MCP Server (HTTP Streamable)

## 📋 Pré-requisitos

- GitHub Copilot instalado no VS Code
- Node.js >= 20 e npm instalados
- xvfb instalado (Linux) para modo headless

## 🚀 Passo a Passo

### 1️⃣ Instalar Dependências

```bash
npm install
```

### 2️⃣ Compilar o Projeto

```bash
npm run build
```

### 3️⃣ Iniciar o Servidor

**Com xvfb (Recomendado - não abre navegador):**
```bash
npm run start:headless
```

**Ou usando o script:**
```bash
./run-danfe-downloader.sh
```

**Sem xvfb (navegador será visível):**
```bash
npm start
```

O servidor estará rodando em: `http://127.0.0.1:3000`

### 4️⃣ Configurar no VS Code

1. Abrir Settings (JSON):
   - `Ctrl+,` ou `Cmd+,` (Mac)
   - Buscar: "mcp servers"
   - Clicar em "Edit in settings.json"

2. Adicionar a configuração:

```json
{
  "github.copilot.chat.mcp.servers": {
    "danfe-xml": {
      "url": "http://127.0.0.1:3000/mcp",
      "transport": "streamable-http"
    }
  }
}
```

**⚠️ Importante:**
- Use `"transport": "streamable-http"` (não "sse" ou "http")
- A URL deve terminar com `/mcp`
- O servidor deve estar rodando ANTES de usar no Copilot

3. Recarregar o VS Code:
   - `Ctrl+Shift+P` → "Developer: Reload Window"

### 5️⃣ Verificar

Teste se o servidor está respondendo:

```bash
curl http://127.0.0.1:3000/health
```

**Resposta esperada:**
```json
{
  "status": "healthy",
  "service": "danfe-downloader",
  "version": "1.0.0",
  "timestamp": "2025-10-14T..."
}
```

## 🧪 Testar no Copilot

Abra o GitHub Copilot Chat e teste:

```
@workspace Quais tools estão disponíveis?
```

Ou baixe um XML:

```
@workspace Baixe o XML da nota fiscal com a chave: 35241145070190000232550010006198721341979067
```

## 📊 Verificar Logs

O servidor mostra logs detalhados:

```
✅ Servidor HTTP iniciado em http://0.0.0.0:3000

📚 Endpoints disponíveis:
   GET  http://0.0.0.0:3000/health
   GET  http://0.0.0.0:3000/mcp/tools (helper)
   POST http://0.0.0.0:3000/mcp (MCP Streamable)
```

## 🔍 Troubleshooting

### ❌ Erro: "address already in use"

```bash
# Verificar qual processo está na porta 3000
lsof -ti:3000

# Matar o processo
kill -9 $(lsof -ti:3000)

# Ou alterar a porta
PORT=8080 ./run-danfe-downloader.sh
```

### ❌ GitHub Copilot não encontra o MCP

1. **Verificar se o servidor está rodando:**
   ```bash
   curl http://127.0.0.1:3000/health
   ```

2. **Verificar configuração:**
   - Deve usar `"transport": "streamable-http"`
   - URL deve ser `http://127.0.0.1:3000/mcp` (com `/mcp`)

3. **Recarregar VS Code:**
   - `Ctrl+Shift+P` → "Developer: Reload Window"

4. **Ver logs do Copilot:**
   - `Ctrl+Shift+P` → "Developer: Open Logs Folder"

### ❌ Navegador abrindo ao baixar XML

Use o script com xvfb:
```bash
npm run start:headless
```

### ❌ Erro de display (DISPLAY is not set)

Instale e use xvfb:
```bash
sudo apt-get install xvfb
npm run start:headless
```

## 📚 Recursos Adicionais

- [MCP Servers - GitHub Copilot](https://docs.github.com/en/copilot/using-github-copilot/using-mcp-servers-in-copilot)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Streamable HTTP Transport](https://modelcontextprotocol.io/docs/concepts/transports#http)

## 🎯 Exemplo de Uso Completo

```bash
# 1. Instalar e compilar
npm install && npm run build

# 2. Iniciar servidor (terminal 1)
npm run start:headless

# 3. Testar (terminal 2)
curl http://127.0.0.1:3000/health

# 4. Configurar no VS Code
# Adicionar ao settings.json:
# {
#   "github.copilot.chat.mcp.servers": {
#     "danfe-xml": {
#       "url": "http://127.0.0.1:3000/mcp",
#       "transport": "streamable-http"
#     }
#   }
# }

# 5. Recarregar VS Code
# Ctrl+Shift+P → Developer: Reload Window

# 6. Usar no Copilot Chat
# @workspace Baixe o XML da chave: 35241145070190000232550010006198721341979067
```

## 🎉 Pronto!

Agora você pode usar o MCP Server diretamente no GitHub Copilot para baixar e ler XMLs de DANFE! 🚀

---

**Transport usado:** HTTP Streamable (stateless)  
**Compatibilidade:** ✅ GitHub Copilot, ✅ Claude Desktop, ✅ APIs REST  
**Última atualização:** 14 de outubro de 2025
