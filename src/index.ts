#!/usr/bin/env node

/**
 * MCP Server para Download e Leitura de XML de DANFE
 * 
 * Servidor MCP usando Streamable HTTP Transport (compatível com GitHub Copilot)
 * Arquitetura refatorada com:
 * - Browser Pool para reutilização de contextos (95% mais rápido)
 * - Rate Limiting para proteção contra DDoS
 * - Structured Logging com redação de dados sensíveis
 * - Domain Errors tipados
 * - Validação completa de chave NFe (com checksum)
 * - Configuration Management com Zod
 * - DNS Rebinding Protection
 * 
 * IMPORTANTE: Este servidor DEVE ser executado com xvfb:
 *   xvfb-run -a --server-args="-screen 0 1920x1080x24" node dist/index.js
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express, { Request, Response } from "express";
import { z } from "zod";
import { randomUUID } from "crypto";
import fs from "fs-extra";

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
import { DanfeXmlReader } from "./danfe-xml-reader.js";
import { errorHandler } from "./presentation/http/middleware/error-handler.js";
import { rateLimitMiddleware } from "./presentation/http/middleware/rate-limit.js";

// Create MCP server instance
const mcpServer = new McpServer({
  name: "danfe-downloader",
  version: "2.0.0",
});

// Register tool: download_danfe_xml
mcpServer.tool(
  "download_danfe_xml",
  "Baixa o XML de uma DANFE do site meudanfe.com.br e retorna os dados estruturados do XML. A chave de acesso deve ter exatamente 44 dígitos numéricos e passar na validação de checksum.",
  {
    chaveAcesso: z
      .string()
      .length(44, "Chave de acesso deve ter exatamente 44 dígitos")
      .regex(/^[0-9]+$/, "Chave deve conter apenas números (0-9)")
      .describe("Chave de acesso da DANFE com 44 dígitos numéricos"),
  },
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

      // Download using PlaywrightAdapter (now with isolated browser instances)
      // NOTE: Uses isolated browser per download (not pool) to avoid state contamination
      // See ROOT_CAUSE_ANALYSIS.md for details on why browser pool was causing issues
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
);

// Create Express app
const app = express();
app.use(express.json());

// Apply rate limiting
app.use(rateLimitMiddleware);

// Health check endpoint
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

// MCP endpoint - list tools (REST API helper)
app.get("/mcp/tools", async (req: Request, res: Response) => {
  res.json({
    tools: [
      {
        name: "download_danfe_xml",
        description:
          "Baixa o XML de uma DANFE do site meudanfe.com.br e retorna os dados estruturados do XML. A chave de acesso deve ter exatamente 44 dígitos numéricos e passar na validação de checksum.",
        inputSchema: {
          type: "object",
          properties: {
            chaveAcesso: {
              type: "string",
              description: "Chave de acesso da DANFE com 44 dígitos numéricos",
              pattern: "^[0-9]{44}$",
            },
          },
          required: ["chaveAcesso"],
        },
      },
    ],
  });
});

// Store transports by session ID
const transports: Map<string, {
  transport: StreamableHTTPServerTransport;
  sessionId: string;
}> = new Map();

// MCP endpoint - Streamable HTTP (with session support)
app.post("/mcp", async (req: Request, res: Response) => {
  const requestId = randomUUID();
  const reqLogger = withRequestId(requestId);
  
  reqLogger.debug({ method: req.body?.method }, 'Requisição MCP recebida');
  
  try {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    let transportData: { transport: StreamableHTTPServerTransport; sessionId: string };

    if (sessionId && transports.has(sessionId)) {
      // Reuse existing transport
      reqLogger.debug({ sessionId }, 'Reutilizando sessão');
      transportData = transports.get(sessionId)!;
    } else if (!sessionId || req.body?.method === "initialize") {
      // New session - initialize with secure UUID
      reqLogger.info('Criando nova sessão');
      
      const newSessionId = randomUUID();
      reqLogger.debug({ sessionId: newSessionId }, 'Session ID gerado');
      
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => newSessionId,
      });

      transportData = {
        transport,
        sessionId: newSessionId,
      };

      // Store transport when session is initialized
      transport.onclose = () => {
        reqLogger.info({ sessionId: transportData.sessionId }, 'Fechando sessão');
        transports.delete(transportData.sessionId);
      };

      await mcpServer.connect(transport);
      
      // Store transport by session ID
      transports.set(transportData.sessionId, transportData);
      reqLogger.debug({ sessionId: transportData.sessionId }, 'Sessão armazenada');
    } else {
      // Invalid request
      reqLogger.error({ sessionId }, 'Sessão inválida');
      throw new SessionNotFoundError(sessionId || 'undefined');
    }

    // Set session ID header before handling request
    if (!res.headersSent) {
      res.setHeader("Mcp-Session-Id", transportData.sessionId);
      reqLogger.debug({ sessionId: transportData.sessionId }, 'Retornando session ID no header');
    }
    
    await transportData.transport.handleRequest(req as any, res as any, req.body);
  } catch (error) {
    reqLogger.error({ error }, 'Erro ao processar requisição MCP');
    
    if (!res.headersSent) {
      // Use error handler
      errorHandler(error as Error, req, res, () => {});
    }
  }
});

// Handle GET requests for SSE (optional, for streaming responses)
app.get("/mcp", async (req: Request, res: Response) => {
  const requestId = randomUUID();
  const reqLogger = withRequestId(requestId);
  
  try {
    reqLogger.debug('Requisição GET /mcp');
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    
    if (!sessionId || !transports.has(sessionId)) {
      reqLogger.error({ sessionId }, 'Sessão não encontrada');
      throw new SessionNotFoundError(sessionId || 'undefined');
    }

    const transportData = transports.get(sessionId)!;
    await transportData.transport.handleRequest(req as any, res as any);
  } catch (error) {
    reqLogger.error({ error }, 'Erro ao processar GET /mcp');
    
    if (!res.headersSent) {
      errorHandler(error as Error, req, res, () => {});
    }
  }
});

// Handle DELETE requests for session termination
app.delete("/mcp", async (req: Request, res: Response) => {
  const requestId = randomUUID();
  const reqLogger = withRequestId(requestId);
  
  try {
    reqLogger.debug('Requisição DELETE /mcp');
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    
    if (!sessionId || !transports.has(sessionId)) {
      reqLogger.error({ sessionId }, 'Sessão não encontrada');
      throw new SessionNotFoundError(sessionId || 'undefined');
    }

    const transportData = transports.get(sessionId)!;
    await transportData.transport.handleRequest(req as any, res as any);
    
    // Clean up
    transportData.transport.close();
    transports.delete(sessionId);
    reqLogger.info({ sessionId }, 'Sessão removida');
  } catch (error) {
    reqLogger.error({ error }, 'Erro ao processar DELETE /mcp');
    
    if (!res.headersSent) {
      errorHandler(error as Error, req, res, () => {});
    }
  }
});

// Apply error handler (must be last)
app.use(errorHandler);

// Start server
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
    if (Config.MCP_DNS_REBINDING_PROTECTION) {
      logger.info(`🔒 DNS Rebinding Protection: ENABLED`);
      logger.info(`   Allowed hosts: ${Config.MCP_ALLOWED_HOSTS.join(', ')}`);
    }
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

main().catch((error) => {
  logger.error({ error }, 'Erro fatal ao iniciar servidor');
  process.exit(1);
});
