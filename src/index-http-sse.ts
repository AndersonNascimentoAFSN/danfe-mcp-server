#!/usr/bin/env node

/**
 * MCP Server para Download e Leitura de XML de DANFE
 * 
 * Servidor MCP que baixa e lê XML de DANFE do site meudanfe.com.br.
 * Exposto via HTTP usando Server-Sent Events (SSE) para compatibilidade com GitHub Copilot.
 * 
 * IMPORTANTE: Este servidor DEVE ser executado com xvfb:
 *   xvfb-run -a --server-args="-screen 0 1920x1080x24" node dist/index-http-sse.js
 * 
 * Como funciona:
 * - Usa Playwright em modo headed (navegador real)
 * - xvfb cria display virtual (não abre janela visível)
 * - Contorna proteção Cloudflare
 * - HTTP com SSE (compatível com GitHub Copilot e Claude Desktop)
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import express, { Request, Response } from "express";
import { z } from "zod";
import { DanfeDownloaderFinal } from "./danfe-downloader-final.js";
import { DanfeXmlReader } from "./danfe-xml-reader.js";
import fs from "fs-extra";

const PORT = parseInt(process.env.PORT || "3000");
const HOST = process.env.HOST || "0.0.0.0";

// Schema de validação
const DownloadDanfeSchema = z.object({
  chaveAcesso: z
    .string()
    .length(44, "Chave de acesso deve ter exatamente 44 dígitos")
    .regex(/^[0-9]+$/, "Chave deve conter apenas números (0-9)"),
});

// Definir tool
const downloadDanfeTool: Tool = {
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
};

// Criar servidor MCP
const mcpServer = new Server(
  {
    name: "danfe-downloader",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handler para listar tools
mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [downloadDanfeTool],
  };
});

// Handler para executar tool
mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name !== "download_danfe_xml") {
    throw new Error(`Unknown tool: ${request.params.name}`);
  }

  try {
    // Validar argumentos
    const args = DownloadDanfeSchema.parse(request.params.arguments);
    const { chaveAcesso } = args;

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
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    console.error(`❌ Erro: ${errorMessage}\n`);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              success: false,
              error: errorMessage,
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
});

// Criar servidor Express
const app = express();

// Middleware para parsing JSON
app.use(express.json());

// Armazenar transport globalmente
let currentTransport: SSEServerTransport | null = null;

// Health check endpoint
app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "healthy",
    service: "danfe-downloader-sse",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    transport: "sse",
  });
});

// Endpoint SSE para MCP
app.get("/sse", async (req: Request, res: Response) => {
  console.log("📡 Nova conexão SSE estabelecida");

  // Configurar headers SSE
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const transport = new SSEServerTransport("/message", res);
  currentTransport = transport;
  
  await mcpServer.connect(transport);

  // Cleanup quando conexão fechar
  req.on("close", () => {
    console.log("📡 Conexão SSE fechada");
    currentTransport = null;
  });
});

// Endpoint POST para mensagens MCP
app.post("/message", async (req: Request, res: Response) => {
  console.log("📨 Mensagem recebida:", req.body.method || "unknown");
  
  if (!currentTransport) {
    console.error("❌ Nenhum transport ativo!");
    return res.status(503).json({ error: "No active transport" });
  }

  try {
    // Processar mensagem através do transport (req, res, parsedBody)
    await currentTransport.handlePostMessage(req as any, res as any, req.body);
  } catch (error) {
    console.error("❌ Erro ao processar mensagem:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: String(error) });
    }
  }
});

// Iniciar servidor
async function main() {
  const hasDisplay = !!process.env.DISPLAY;

  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║   🚀 DANFE Downloader MCP Server v1.0.0 (SSE)            ║");
  console.log("║              Powered by Express + SSE                     ║");
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
    console.log(
      '   xvfb-run -a --server-args="-screen 0 1920x1080x24" node dist/index-http-sse.js'
    );
  }

  console.log("");

  app.listen(PORT, HOST, () => {
    console.log(`✅ Servidor HTTP (SSE) iniciado em http://${HOST}:${PORT}`);
    console.log("");
    console.log("📚 Endpoints disponíveis:");
    console.log(`   GET  http://${HOST}:${PORT}/health`);
    console.log(`   GET  http://${HOST}:${PORT}/sse (MCP via SSE)`);
    console.log(`   POST http://${HOST}:${PORT}/message (MCP messages)`);
    console.log("");
    console.log("🔧 Configuração GitHub Copilot:");
    console.log('   "danfe-xml": {');
    console.log(`     "url": "http://127.0.0.1:${PORT}/sse",`);
    console.log('     "transport": "sse"');
    console.log("   }");
    console.log("");
  });
}

main().catch((error) => {
  console.error("❌ Erro fatal ao iniciar servidor:", error);
  process.exit(1);
});
