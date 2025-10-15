#!/usr/bin/env node

/**
 * MCP Server para Download e Leitura de XML de DANFE
 * 
 * Servidor MCP usando Streamable HTTP Transport (compatível com GitHub Copilot)
 * Baixa e lê XML de DANFE do site meudanfe.com.br.
 * 
 * IMPORTANTE: Este servidor DEVE ser executado com xvfb:
 *   xvfb-run -a --server-args="-screen 0 1920x1080x24" node dist/index.js
 * 
 * Como funciona:
 * - Usa Playwright em modo headed (navegador real)
 * - xvfb cria display virtual (não abre janela visível)
 * - Contorna proteção Cloudflare
 * - HTTP Streamable (compatível com GitHub Copilot)
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express, { Request, Response } from "express";
import { z } from "zod";
import { DanfeDownloaderFinal } from "./danfe-downloader-final.js";
import { DanfeXmlReader } from "./danfe-xml-reader.js";
import fs from "fs-extra";

const PORT = parseInt(process.env.PORT || "3000");
const HOST = process.env.HOST || "0.0.0.0";

// Create MCP server instance
const mcpServer = new McpServer({
  name: "danfe-downloader",
  version: "1.0.0",
});

// Register tool: download_danfe_xml
mcpServer.tool(
  "download_danfe_xml",
  "Baixa o XML de uma DANFE do site meudanfe.com.br e retorna os dados estruturados do XML. A chave de acesso deve ter exatamente 44 dígitos numéricos.",
  {
    chaveAcesso: z
      .string()
      .length(44, "Chave de acesso deve ter exatamente 44 dígitos")
      .regex(/^[0-9]+$/, "Chave deve conter apenas números (0-9)")
      .describe("Chave de acesso da DANFE com 44 dígitos numéricos"),
  },
  async ({ chaveAcesso }) => {
    try {
      console.log(`\n🚀 Iniciando download da DANFE...`);
      console.log(`📄 Chave: ${chaveAcesso}`);

      // Download do XML
      const downloader = new DanfeDownloaderFinal();
      const filePath = await downloader.downloadDanfeXml(chaveAcesso);

      const fileName = filePath.split("/").pop() || "unknown";
      console.log(`✅ Download concluído: ${fileName}`);

      // Ler e estruturar dados do XML
      console.log(`📖 Lendo XML...`);
      const reader = new DanfeXmlReader();
      const xmlData = await reader.readAndParse(filePath);

      console.log(`✅ XML lido com sucesso`);

      const result = {
        success: true,
        filePath,
        fileName,
        chaveAcesso,
        timestamp: new Date().toISOString(),
        data: xmlData,
      };

      // Excluir arquivo XML após processar
      try {
        await fs.unlink(filePath);
        console.log(`🗑️  XML excluído: ${fileName}\n`);
      } catch (unlinkError) {
        console.warn(`⚠️  Não foi possível excluir o XML: ${unlinkError}\n`);
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
      console.error(`❌ Erro: ${errorMessage}\n`);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: false,
                error: errorMessage,
                chaveAcesso,
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

// Health check endpoint
app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "healthy",
    service: "danfe-downloader",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

// MCP endpoint - list tools (REST API helper)
app.get("/mcp/tools", async (req: Request, res: Response) => {
  res.json({
    tools: [
      {
        name: "download_danfe_xml",
        description:
          "Baixa o XML de uma DANFE do site meudanfe.com.br e retorna os dados estruturados do XML. A chave de acesso deve ter exatamente 44 dígitos numéricos.",
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
  console.log("📨 Requisição MCP recebida:", req.body?.method || "unknown");
  
  try {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    let transportData: { transport: StreamableHTTPServerTransport; sessionId: string };

    if (sessionId && transports.has(sessionId)) {
      // Reuse existing transport
      console.log("🔄 Reutilizando sessão:", sessionId);
      transportData = transports.get(sessionId)!;
    } else if (!sessionId || req.body?.method === "initialize") {
      // New session - initialize
      console.log("🆕 Criando nova sessão");
      
      // Pre-generate session ID
      const newSessionId = Math.random().toString(36).substring(2, 15);
      console.log("🔑 Session ID gerado:", newSessionId);
      
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => newSessionId, // Return the same ID
      });

      transportData = {
        transport,
        sessionId: newSessionId,
      };

      // Store transport when session is initialized
      transport.onclose = () => {
        console.log("🚪 Fechando sessão:", transportData.sessionId);
        transports.delete(transportData.sessionId);
      };

      await mcpServer.connect(transport);
      
      // Store transport by session ID
      transports.set(transportData.sessionId, transportData);
      console.log("💾 Sessão armazenada:", transportData.sessionId);
    } else {
      // Invalid request
      console.error("❌ Sessão inválida:", sessionId);
      return res.status(400).json({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Bad Request: Invalid or missing session ID",
        },
        id: null,
      });
    }

    // Set session ID header before handling request
    if (!res.headersSent) {
      res.setHeader("Mcp-Session-Id", transportData.sessionId);
      console.log("📤 Retornando session ID no header:", transportData.sessionId);
    }
    
    await transportData.transport.handleRequest(req as any, res as any, req.body);
  } catch (error) {
    console.error("❌ Erro ao processar requisição MCP:", error);
    
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: "Internal server error",
          data: error instanceof Error ? error.message : String(error),
        },
        id: null,
      });
    }
  }
});

// Handle GET requests for SSE (optional, for streaming responses)
app.get("/mcp", async (req: Request, res: Response) => {
  console.log("📡 Requisição GET /mcp");
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  
  if (!sessionId || !transports.has(sessionId)) {
    console.error("❌ Sessão não encontrada:", sessionId);
    return res.status(400).send("Invalid or missing session ID");
  }

  const transportData = transports.get(sessionId)!;
  await transportData.transport.handleRequest(req as any, res as any);
});

// Handle DELETE requests for session termination
app.delete("/mcp", async (req: Request, res: Response) => {
  console.log("🗑️  Requisição DELETE /mcp");
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  
  if (!sessionId || !transports.has(sessionId)) {
    console.error("❌ Sessão não encontrada:", sessionId);
    return res.status(400).send("Invalid or missing session ID");
  }

  const transportData = transports.get(sessionId)!;
  await transportData.transport.handleRequest(req as any, res as any);
  
  // Clean up
  transportData.transport.close();
  transports.delete(sessionId);
  console.log("✅ Sessão removida:", sessionId);
});

// Start server
async function main() {
  const hasDisplay = !!process.env.DISPLAY;

  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║   🚀 DANFE Downloader MCP Server v1.0.0                  ║");
  console.log("║        HTTP Streamable (GitHub Copilot Ready)            ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log("");
  console.log("📋 Tool disponível: download_danfe_xml");
  console.log("📁 Downloads serão salvos em: downloads/");
  console.log("");

  if (hasDisplay) {
    console.log(`✅ Display detectado: ${process.env.DISPLAY}`);
    console.log("   Servidor pronto para download em modo headless");
  } else {
    console.log("⚠️  ATENÇÃO: Nenhum DISPLAY detectado!");
    console.log("   Para corrigir, execute com xvfb:");
    console.log('   xvfb-run -a --server-args="-screen 0 1920x1080x24" node dist/index.js');
  }

  console.log("");

  app.listen(PORT, HOST, () => {
    console.log(`✅ Servidor HTTP iniciado em http://${HOST}:${PORT}`);
    console.log("");
    console.log("📚 Endpoints disponíveis:");
    console.log(`   GET  http://${HOST}:${PORT}/health`);
    console.log(`   GET  http://${HOST}:${PORT}/mcp/tools (helper)`);
    console.log(`   POST http://${HOST}:${PORT}/mcp (MCP Streamable)`);
    console.log("");
    console.log("🔧 Configuração GitHub Copilot:");
    console.log('   {');
    console.log('     "github.copilot.chat.mcp.servers": {');
    console.log('       "danfe-xml": {');
    console.log(`         "url": "http://127.0.0.1:${PORT}/mcp",`);
    console.log('         "transport": "streamable-http"');
    console.log("       }");
    console.log("     }");
    console.log("   }");
    console.log("");
  });
}

main().catch((error) => {
  console.error("❌ Erro fatal ao iniciar servidor:", error);
  process.exit(1);
});
