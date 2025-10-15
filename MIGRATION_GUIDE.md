# 🔄 Guia de Migração do index.ts

Este guia mostra como migrar o `src/index.ts` atual para usar a nova arquitetura refatorada.

## ✅ Status Atual

- ✅ Todas as dependências instaladas
- ✅ Estrutura de pastas criada
- ✅ Todos os módulos novos implementados
- ✅ Projeto compila sem erros
- ⏳ `index.ts` ainda usa arquitetura antiga

## 🎯 Objetivo

Atualizar `src/index.ts` para:
1. Usar `Config` ao invés de `process.env` direto
2. Usar `logger` estruturado ao invés de `console.log`
3. Usar `randomUUID()` ao invés de `Math.random()`
4. Validar chaves NFe com checksum
5. Usar `PlaywrightAdapter` com Browser Pool
6. Aplicar Rate Limiting middleware
7. Usar Error Handler middleware
8. Inicializar Browser Pool no startup
9. Implementar graceful shutdown

## 📝 Passo a Passo

### 1. Atualizar Imports (topo do arquivo)

**Remover**:
```typescript
import { DanfeDownloaderFinal } from "./danfe-downloader-final.js";
```

**Adicionar** (após os imports do MCP):
```typescript
import { randomUUID } from "crypto";

// Import new architecture
import { Config } from "./config/index.js";
import { logger, withRequestId } from "./shared/logger/index.js";
import { NFeValidator } from "./shared/validators/nfe-validator.js";
import { 
  ChaveInvalidaError, 
  SessionNotFoundError 
} from "./shared/errors/domain-errors.js";
import { getBrowserPool } from "./infrastructure/browser/browser-pool.js";
import { PlaywrightAdapter } from "./infrastructure/browser/playwright-adapter.js";
import { errorHandler } from "./presentation/http/middleware/error-handler.js";
import { rateLimitMiddleware } from "./presentation/http/middleware/rate-limit.js";
```

### 2. Substituir constantes PORT e HOST

**Remover**:
```typescript
const PORT = parseInt(process.env.PORT || "3000");
const HOST = process.env.HOST || "0.0.0.0";
```

Não precisa de nada, já temos `Config.PORT` e `Config.HOST`!

### 3. Atualizar Versão do Servidor

**Trocar**:
```typescript
const mcpServer = new McpServer({
  name: "danfe-downloader",
  version: "1.0.0",  // OLD
});
```

**Para**:
```typescript
const mcpServer = new McpServer({
  name: "danfe-downloader",
  version: "2.0.0",  // NEW - refactored architecture
});
```

### 4. Refatorar Tool Handler `download_danfe_xml`

**Localizar** a função do tool (linha ~43):
```typescript
async ({ chaveAcesso }) => {
  try {
    console.log(`\n🚀 Iniciando download da DANFE...`);
    // ...
```

**Substituir TODO o conteúdo** por:
```typescript
async ({ chaveAcesso }) => {
  const requestId = randomUUID();
  const reqLogger = withRequestId(requestId);
  
  try {
    reqLogger.info({ chave: chaveAcesso }, 'Iniciando download da DANFE');

    // Validate chave with checksum
    const validation = NFeValidator.validateChave(chaveAcesso);
    if (!validation.valid) {
      throw new ChaveInvalidaError(chaveAcesso, validation.error!);
    }

    // Download using browser pool
    const downloader = new PlaywrightAdapter();
    const filePath = await downloader.downloadDanfeXml(chaveAcesso);

    const fileName = filePath.split("/").pop() || "unknown";
    reqLogger.info({ fileName }, 'Download concluído');

    // Parse XML
    reqLogger.info('Lendo XML');
    const reader = new DanfeXmlReader();
    const xmlData = await reader.readAndParse(filePath);

    reqLogger.info('XML lido com sucesso');

    const result = {
      success: true,
      filePath,
      fileName,
      chaveAcesso,
      requestId,
      timestamp: new Date().toISOString(),
      data: xmlData,
    };

    // Cleanup
    try {
      await fs.unlink(filePath);
      reqLogger.debug({ fileName }, 'XML excluído');
    } catch (unlinkError) {
      reqLogger.warn({ unlinkError, fileName }, 'Não foi possível excluir o XML');
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    reqLogger.error({ error: errorMessage }, 'Erro ao processar download');

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              success: false,
              error: errorMessage,
              chaveAcesso,
              requestId,
              timestamp: new Date().toISOString(),
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }
}
```

### 5. Aplicar Middlewares

**Localizar** (após `app.use(express.json())`):
```typescript
const app = express();
app.use(express.json());
```

**Adicionar logo após**:
```typescript
// Apply rate limiting
app.use(rateLimitMiddleware);
```

### 6. Atualizar Health Check

**Trocar**:
```typescript
app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "healthy",
    service: "danfe-downloader",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});
```

**Para**:
```typescript
app.get("/health", (req: Request, res: Response) => {
  const pool = getBrowserPool();
  const metrics = pool.getMetrics();
  
  res.json({
    status: "healthy",
    service: "danfe-downloader",
    version: "2.0.0",
    timestamp: new Date().toISOString(),
    browserPool: metrics,
  });
});
```

### 7. Atualizar MCP Tool Description

**Trocar** (no `app.get("/mcp/tools")`):
```typescript
description: "Baixa o XML de uma DANFE... 44 dígitos numéricos.",
```

**Para**:
```typescript
description: "Baixa o XML de uma DANFE... 44 dígitos numéricos e passar na validação de checksum.",
```

### 8. Adicionar Logging aos Endpoints MCP

**Na função `app.post("/mcp")`**, logo no início:
```typescript
app.post("/mcp", async (req: Request, res: Response) => {
  console.log("📨 Requisição MCP recebida:", req.body?.method || "unknown");  // REMOVER
```

**Substituir por**:
```typescript
app.post("/mcp", async (req: Request, res: Response) => {
  const requestId = randomUUID();
  const reqLogger = withRequestId(requestId);
  
  reqLogger.debug({ method: req.body?.method }, 'Requisição MCP recebida');
```

**E trocar todos os `console.log`/`console.error` por `reqLogger.debug`/`reqLogger.info`/`reqLogger.error`**

### 9. Usar randomUUID() para Session ID

**Trocar** (dentro do `app.post("/mcp")`):
```typescript
const newSessionId = Math.random().toString(36).substring(2, 15);  // OLD - insecure!
```

**Para**:
```typescript
const newSessionId = randomUUID();  // NEW - cryptographically secure
```

### 10. Usar Domain Errors

**Trocar** (quando sessão não encontrada):
```typescript
console.error("❌ Sessão inválida:", sessionId);
return res.status(400).json({...});
```

**Para**:
```typescript
reqLogger.error({ sessionId }, 'Sessão inválida');
throw new SessionNotFoundError(sessionId || 'undefined');
```

### 11. Aplicar Error Handler (final do arquivo)

**Adicionar ANTES de `async function main()`**:
```typescript
// Apply error handler (must be last)
app.use(errorHandler);
```

### 12. Refatorar função `main()`

**Substituir TODO o conteúdo da função `main()`** por:
```typescript
async function main() {
  const hasDisplay = !!process.env.DISPLAY;

  logger.info("╔════════════════════════════════════════════════════════════╗");
  logger.info("║   🚀 DANFE Downloader MCP Server v2.0.0                  ║");
  logger.info("║        Refactored Architecture - Production Ready        ║");
  logger.info("╚════════════════════════════════════════════════════════════╝");
  logger.info("");
  logger.info("📋 Tool disponível: download_danfe_xml");
  logger.info(`📁 Downloads: ${Config.DOWNLOADS_DIR}/`);
  logger.info("");

  if (hasDisplay) {
    logger.info(`✅ Display: ${process.env.DISPLAY}`);
  } else {
    logger.warn("⚠️  DISPLAY não detectado! Execute com xvfb:");
    logger.warn('   xvfb-run -a --server-args="-screen 0 1920x1080x24" node dist/index.js');
  }

  logger.info("");

  // Initialize browser pool
  logger.info("🎭 Inicializando browser pool...");
  const browserPool = getBrowserPool();
  await browserPool.initialize();
  logger.info("✅ Browser pool inicializado");

  logger.info("");

  app.listen(Config.PORT, Config.HOST, () => {
    logger.info(`✅ Servidor HTTP em http://${Config.HOST}:${Config.PORT}`);
    logger.info("");
    logger.info("📚 Endpoints:");
    logger.info(`   GET  http://${Config.HOST}:${Config.PORT}/health`);
    logger.info(`   GET  http://${Config.HOST}:${Config.PORT}/mcp/tools`);
    logger.info(`   POST http://${Config.HOST}:${Config.PORT}/mcp`);
    logger.info("");
    logger.info("🔧 GitHub Copilot config:");
    logger.info('   "github.copilot.chat.mcp.servers": {');
    logger.info('     "danfe-xml": {');
    logger.info(`       "url": "http://127.0.0.1:${Config.PORT}/mcp",`);
    logger.info('       "transport": "streamable-http"');
    logger.info("     }");
    logger.info("   }");
    logger.info("");
    logger.info(`🛡️  Rate Limit: ${Config.RATE_LIMIT_MAX_REQUESTS} req/${Config.RATE_LIMIT_WINDOW_MS}ms`);
    logger.info(`🎭 Browser Pool: ${Config.BROWSER_POOL_SIZE} contexts`);
    logger.info(`📝 Log Level: ${Config.LOG_LEVEL}`);
    logger.info("");
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received. Starting graceful shutdown...`);
    
    // Close browser pool
    await browserPool.shutdown();
    
    // Close server
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}
```

### 13. Atualizar catch final

**Trocar**:
```typescript
main().catch((error) => {
  console.error("❌ Erro fatal ao iniciar servidor:", error);
  process.exit(1);
});
```

**Para**:
```typescript
main().catch((error) => {
  logger.error({ error }, 'Erro fatal ao iniciar servidor');
  process.exit(1);
});
```

## ✅ Validação

Após as mudanças:

1. **Compile**:
```bash
npm run build
```

2. **Execute**:
```bash
xvfb-run -a --server-args="-screen 0 1920x1080x24" node dist/index.js
```

3. **Verifique a saída**:
```
📋 Configuration loaded:
   NODE_ENV: development
   PORT: 3000
   LOG_LEVEL: info
   BROWSER_POOL_SIZE: 3
   REDIS: Disabled
   RATE_LIMIT: Enabled
╔════════════════════════════════════════════════════════════╗
║   🚀 DANFE Downloader MCP Server v2.0.0                  ║
║        Refactored Architecture - Production Ready        ║
╚════════════════════════════════════════════════════════════╝
🎭 Inicializando browser pool...
✅ Browser pool inicializado
✅ Servidor HTTP em http://0.0.0.0:3000
🛡️  Rate Limit: 100 req/900000ms
🎭 Browser Pool: 3 contexts
```

4. **Teste health**:
```bash
curl http://localhost:3000/health
```

Deve retornar:
```json
{
  "status": "healthy",
  "service": "danfe-downloader",
  "version": "2.0.0",
  "browserPool": {
    "totalContexts": 3,
    "availableContexts": 3,
    "inUseContexts": 0
  }
}
```

## 🎯 Resultado Esperado

- ✅ Servidor inicia com logs estruturados coloridos
- ✅ Browser pool inicializado com 3 contextos
- ✅ Rate limiting ativo (100 req/15min)
- ✅ Validação de chave com checksum
- ✅ UUIDs seguros para sessões
- ✅ Graceful shutdown (Ctrl+C fecha browser pool)
- ✅ Logs redactam dados sensíveis automaticamente

## 🚨 Troubleshooting

### Erro: Cannot find module '@/config'
**Solução**: Certifique-se que compilou com `npm run build`. O TypeScript precisa resolver os path aliases.

### Erro: Browser pool not initialized
**Solução**: Verifique que `await browserPool.initialize()` está sendo chamado antes de `app.listen()`.

### Logs não aparecem coloridos
**Solução**: Normal. Pino Pretty só coloriza em desenvolvimento quando NODE_ENV=development.

## 📚 Próximo Passo

Depois da migração: **Testar download real via GitHub Copilot**!

Precisa de ajuda com algum passo? É só pedir!
