#!/usr/bin/env node
/**
 * MCP Server para GitHub Copilot (stdio transport)
 * 
 * Este é o servidor MCP usando stdio (stdin/stdout) 
 * necessário para integração com GitHub Copilot
 * 
 * IMPORTANTE: Este servidor DEVE ser executado com xvfb:
 *   xvfb-run -a --server-args="-screen 0 1920x1080x24" node dist/index-stdio.js
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { DanfeDownloaderFinal } from "./danfe-downloader-final.js";
import { DanfeXmlReader } from "./danfe-xml-reader.js";
import fs from "fs-extra";

// Configurar logging para stderr (não interferir com stdio)
const log = (message: string) => {
  console.error(message);
};

// Create MCP server
const server = new Server(
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

// Register tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "download_danfe_xml",
        description: "Baixa o XML de uma DANFE do site meudanfe.com.br e retorna os dados estruturados do XML. A chave de acesso deve ter exatamente 44 dígitos numéricos.",
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
  };
});

// Register call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name !== "download_danfe_xml") {
    throw new Error(`Unknown tool: ${request.params.name}`);
  }

  const args = request.params.arguments as { chaveAcesso?: string };
  const chaveAcesso = args.chaveAcesso;

  if (!chaveAcesso || typeof chaveAcesso !== "string") {
    throw new Error("Missing or invalid chaveAcesso argument");
  }

  if (chaveAcesso.length !== 44 || !/^[0-9]+$/.test(chaveAcesso)) {
    throw new Error("Chave de acesso deve ter exatamente 44 dígitos numéricos");
  }

  try {
    log(`\n🚀 Iniciando download da DANFE...`);
    log(`📄 Chave: ${chaveAcesso}`);

    // Download do XML
    const downloader = new DanfeDownloaderFinal();
    const filePath = await downloader.downloadDanfeXml(chaveAcesso);

    const fileName = filePath.split("/").pop() || "unknown";
    log(`✅ Download concluído: ${fileName}`);

    // Ler e estruturar dados do XML
    log(`📖 Lendo XML...`);
    const reader = new DanfeXmlReader();
    const xmlData = await reader.readAndParse(filePath);

    log(`✅ XML lido com sucesso`);

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
      log(`🗑️  XML excluído: ${fileName}\n`);
    } catch (unlinkError) {
      log(`⚠️  Não foi possível excluir o XML: ${unlinkError}\n`);
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
    log(`❌ Erro: ${errorMessage}\n`);

    const errorResult = {
      success: false,
      error: errorMessage,
      chaveAcesso,
      timestamp: new Date().toISOString(),
    };

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(errorResult, null, 2),
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const hasDisplay = !!process.env.DISPLAY;

  log("╔════════════════════════════════════════════════════════════╗");
  log("║     🚀 DANFE Downloader MCP Server (stdio)               ║");
  log("║         Para GitHub Copilot / Claude Desktop             ║");
  log("╚════════════════════════════════════════════════════════════╝");
  log("");
  log("📋 Tool disponível: download_danfe_xml");
  log("📁 Downloads serão salvos em: downloads/");
  log("");

  if (hasDisplay) {
    log(`✅ Display detectado: ${process.env.DISPLAY}`);
    log("   Servidor pronto para download em modo headless");
  } else {
    log("⚠️  ATENÇÃO: Nenhum DISPLAY detectado!");
    log("   Para corrigir, execute com xvfb:");
    log("   xvfb-run -a --server-args=\"-screen 0 1920x1080x24\" node dist/index-stdio.js");
  }

  log("");
  log("✅ Servidor MCP iniciado (stdio transport)");
  log("   Aguardando requisições do Copilot...");
  log("");

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  log(`❌ Erro fatal ao iniciar servidor: ${error}`);
  process.exit(1);
});
