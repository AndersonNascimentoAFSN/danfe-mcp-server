# 🤖 GitHub Copilot - Configuração do MCP Server

## 📋 Pré-requisitos

- GitHub Copilot instalado no VS Code
- Node.js e npm instalados
- xvfb instalado (para modo headless no Linux)

## 🚀 Iniciar o Servidor

### Opção 1: Com xvfb (Recomendado - não abre navegador)
```bash
npm run start:sse:headless
```

### Opção 2: Sem xvfb (navegador será visível)
```bash
npm run start:sse
```

**✅ O servidor estará rodando em:** `http://127.0.0.1:3000`

## ⚙️ Configurar o GitHub Copilot

### 1️⃣ Abrir as Configurações do VS Code

- Pressione `Ctrl+,` (ou `Cmd+,` no Mac)
- Ou vá em: **File → Preferences → Settings**

### 2️⃣ Buscar por MCP Servers

Na barra de busca das configurações, digite:
```
mcp servers
```

### 3️⃣ Editar settings.json

Clique em "**Edit in settings.json**" para editar diretamente o arquivo de configurações.

### 4️⃣ Adicionar a Configuração

Adicione a seguinte configuração no `settings.json`:

```json
{
  "github.copilot.chat.mcp.servers": {
    "danfe-xml": {
      "url": "http://127.0.0.1:3000/sse",
      "transport": "sse"
    }
  }
}
```

**⚠️ Atenção:**
- Use `"transport": "sse"` (não "http")
- A URL deve terminar com `/sse`
- O servidor deve estar rodando ANTES de configurar

### 5️⃣ Recarregar o VS Code

Pressione `Ctrl+Shift+P` (ou `Cmd+Shift+P`) e execute:
```
Developer: Reload Window
```

Ou simplesmente feche e reabra o VS Code.

## 🧪 Testar a Integração

### 1️⃣ Verificar se o servidor está respondendo

```bash
curl http://127.0.0.1:3000/health
```

**Resposta esperada:**
```json
{"status":"ok","service":"DANFE Downloader MCP Server (SSE)","version":"1.0.0"}
```

### 2️⃣ Usar no GitHub Copilot Chat

Abra o Copilot Chat no VS Code e pergunte:

```
@workspace Quais tools estão disponíveis no MCP?
```

Ou tente baixar um XML:

```
@workspace Baixe o XML da nota fiscal com a chave: 35240811111111111111111111111111111111111111
```

## 📊 Verificar Logs

O servidor mostra logs detalhados:

```
✅ Servidor HTTP (SSE) iniciado em http://0.0.0.0:3000

📚 Endpoints disponíveis:
   GET  http://0.0.0.0:3000/health
   GET  http://0.0.0.0:3000/sse (MCP via SSE)
   POST http://0.0.0.0:3000/message (MCP messages)
```

## 🔍 Troubleshooting

### ❌ Erro: "address already in use"

```bash
# Verificar qual processo está na porta 3000
lsof -ti:3000

# Matar o processo
kill -9 $(lsof -ti:3000)

# Ou alterar a porta no código (src/index-http-sse.ts)
```

### ❌ GitHub Copilot não encontra o MCP

1. **Verificar se o servidor está rodando:**
   ```bash
   curl http://127.0.0.1:3000/health
   ```

2. **Verificar se a configuração está correta:**
   - Deve usar `"transport": "sse"` (não "http")
   - URL deve ser `http://127.0.0.1:3000/sse`

3. **Recarregar o VS Code:**
   ```
   Ctrl+Shift+P → Developer: Reload Window
   ```

4. **Ver logs do Copilot:**
   ```
   Ctrl+Shift+P → Developer: Open Logs Folder
   ```

### ❌ Navegador abrindo ao baixar XML

Use o script com xvfb:
```bash
npm run start:sse:headless
```

### ❌ Erro de display (DISPLAY is not set)

Instale e use xvfb:
```bash
sudo apt-get install xvfb
npm run start:sse:headless
```

## 📚 Recursos Adicionais

- [MCP Servers - GitHub Copilot](https://docs.github.com/en/copilot/using-github-copilot/using-mcp-servers-in-copilot)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [SSE Transport](https://modelcontextprotocol.io/docs/concepts/transports#server-sent-events-sse)

## 🎯 Exemplo de Uso Completo

```bash
# 1. Instalar dependências (se ainda não fez)
npm install

# 2. Compilar o TypeScript
npm run build

# 3. Iniciar o servidor (com xvfb)
npm run start:sse:headless

# 4. Em outro terminal, testar
curl http://127.0.0.1:3000/health

# 5. Configurar no VS Code (settings.json)
# {
#   "github.copilot.chat.mcp.servers": {
#     "danfe-xml": {
#       "url": "http://127.0.0.1:3000/sse",
#       "transport": "sse"
#     }
#   }
# }

# 6. Recarregar VS Code
# Ctrl+Shift+P → Developer: Reload Window

# 7. Usar no Copilot Chat
# @workspace Baixe o XML da nota fiscal com a chave: 35240811111111111111111111111111111111111111
```

## 🎉 Pronto!

Agora você pode usar o MCP Server diretamente no GitHub Copilot para baixar e ler XMLs de DANFE! 🚀
