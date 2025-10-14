#!/usr/bin/env node
/**
 * MCP Server para Download e Leitura de XML de DANFE
 *
 * Servidor MCP que baixa e lê XML de DANFE do site meudanfe.com.br.
 * Exposto via HTTP usando Fastify para permitir acesso remoto.
 *
 * IMPORTANTE: Este servidor DEVE ser executado com xvfb:
 *   xvfb-run -a --server-args="-screen 0 1920x1080x24" node dist/index.js
 *
 * Como funciona:
 * - Usa Playwright em modo headed (navegador real)
 * - xvfb cria display virtual (não abre janela visível)
 * - Contorna proteção Cloudflare
 * - API HTTP via Fastify (melhor performance que Express)
 * - Ideal para uso com agentes de IA
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import Fastify from "fastify";
import fastifyCors from "@fastify/cors";
import { z } from "zod";
import { DanfeDownloaderFinal } from "./danfe-downloader-final.js";
import { DanfeXmlReader } from "./danfe-xml-reader.js";
const PORT = parseInt(process.env.PORT || "3000");
const HOST = process.env.HOST || "0.0.0.0";
// Create MCP server instance
const mcpServer = new McpServer({
    name: "danfe-downloader",
    version: "1.0.0",
    capabilities: {
        tools: {},
    },
});
// Register tool: download_danfe_xml
mcpServer.tool("download_danfe_xml", "Baixa o XML de uma DANFE do site meudanfe.com.br e retorna os dados estruturados do XML. A chave de acesso deve ter exatamente 44 dígitos numéricos.", {
    chaveAcesso: z
        .string()
        .length(44, "Chave de acesso deve ter exatamente 44 dígitos")
        .regex(/^[0-9]+$/, "Chave deve conter apenas números (0-9)")
        .describe("Chave de acesso da DANFE com 44 dígitos numéricos"),
}, async ({ chaveAcesso }) => {
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
        console.log(`✅ XML lido com sucesso\n`);
        const result = {
            success: true,
            filePath,
            fileName,
            chaveAcesso,
            timestamp: new Date().toISOString(),
            data: xmlData,
        };
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(result, null, 2),
                },
            ],
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`❌ Erro: ${errorMessage}\n`);
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
// Create Fastify app
const app = Fastify({
    logger: true,
    requestIdLogLabel: "reqId",
    disableRequestLogging: true,
});
// Register CORS
await app.register(fastifyCors, {
    origin: true,
    credentials: true,
});
// Health check endpoint
app.get("/health", async (request, reply) => {
    return {
        status: "healthy",
        service: "danfe-downloader",
        version: "1.0.0",
        timestamp: new Date().toISOString(),
    };
});
// MCP endpoint - list tools (simplified REST API)
app.get("/mcp/tools", async (request, reply) => {
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
                            pattern: "^[0-9]{44}$"
                        }
                    },
                    required: ["chaveAcesso"]
                }
            }
        ]
    };
});
// MCP endpoint - call tool (simplified REST API)
app.post("/mcp/tools/:toolName", async (request, reply) => {
    try {
        const { toolName } = request.params;
        const body = request.body;
        if (toolName !== "download_danfe_xml") {
            reply.code(404);
            return {
                error: `Tool not found: ${toolName}`,
            };
        }
        // Validate input - aceita tanto {"arguments": {"chaveAcesso": "..."}} quanto {"chaveAcesso": "..."}
        const chaveAcesso = body?.arguments?.chaveAcesso || body?.chaveAcesso;
        if (!chaveAcesso || typeof chaveAcesso !== "string") {
            reply.code(400);
            return {
                error: "Missing or invalid chaveAcesso argument. Use either {\"chaveAcesso\": \"...\"} or {\"arguments\": {\"chaveAcesso\": \"...\"}}",
            };
        }
        if (chaveAcesso.length !== 44 || !/^[0-9]+$/.test(chaveAcesso)) {
            reply.code(400);
            return {
                error: "Chave de acesso deve ter exatamente 44 dígitos numéricos",
            };
        }
        // Execute download
        console.log(`\n🚀 Iniciando download da DANFE...`);
        console.log(`📄 Chave: ${chaveAcesso}`);
        const downloader = new DanfeDownloaderFinal();
        const filePath = await downloader.downloadDanfeXml(chaveAcesso);
        const fileName = filePath.split("/").pop() || "unknown";
        console.log(`✅ Download concluído: ${fileName}`);
        // Read and parse XML
        console.log(`📖 Lendo XML...`);
        const reader = new DanfeXmlReader();
        const xmlData = await reader.readAndParse(filePath);
        console.log(`✅ XML lido com sucesso\n`);
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({
                        success: true,
                        filePath,
                        fileName,
                        chaveAcesso,
                        timestamp: new Date().toISOString(),
                        data: xmlData,
                    }, null, 2),
                },
            ],
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`❌ Erro: ${errorMessage}\n`);
        reply.code(500);
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({
                        success: false,
                        error: errorMessage,
                        timestamp: new Date().toISOString(),
                    }, null, 2),
                },
            ],
            isError: true,
        };
    }
});
// MCP endpoint - streamable HTTP (standard MCP protocol)
app.post("/mcp", async (request, reply) => {
    try {
        const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: undefined,
            enableJsonResponse: true,
        });
        // Handle connection close
        reply.raw.on("close", () => {
            transport.close();
        });
        await mcpServer.connect(transport);
        // Convert Fastify request/reply to Express-like objects for transport
        const req = request.raw;
        const res = reply.raw;
        await transport.handleRequest(req, res, request.body);
    }
    catch (error) {
        console.error("Error handling MCP request:", error);
        reply.code(500);
        return {
            jsonrpc: "2.0",
            error: {
                code: -32603,
                message: "Internal server error",
            },
            id: null,
        };
    }
});
// Start server
async function main() {
    const hasDisplay = !!process.env.DISPLAY;
    console.log("╔════════════════════════════════════════════════════════════╗");
    console.log("║        🚀 DANFE Downloader MCP Server v1.0.0             ║");
    console.log("║                  Powered by Fastify                       ║");
    console.log("╚════════════════════════════════════════════════════════════╝");
    console.log("");
    console.log("📋 Tool disponível: download_danfe_xml");
    console.log("📁 Downloads serão salvos em: downloads/");
    console.log("");
    if (hasDisplay) {
        console.log(`✅ Display detectado: ${process.env.DISPLAY}`);
        console.log("   Servidor pronto para download em modo headless");
    }
    else {
        console.log("⚠️  ATENÇÃO: Nenhum DISPLAY detectado!");
        console.log("   Para corrigir, execute com xvfb:");
        console.log("   xvfb-run -a --server-args=\"-screen 0 1920x1080x24\" node dist/index.js");
    }
    console.log("");
    try {
        await app.listen({ port: PORT, host: HOST });
        console.log(`✅ Servidor HTTP iniciado em http://${HOST}:${PORT}`);
        console.log("");
        console.log("📚 Endpoints disponíveis:");
        console.log(`   GET  http://${HOST}:${PORT}/health`);
        console.log(`   GET  http://${HOST}:${PORT}/mcp/tools`);
        console.log(`   POST http://${HOST}:${PORT}/mcp/tools/download_danfe_xml`);
        console.log(`   POST http://${HOST}:${PORT}/mcp (Standard MCP Protocol)`);
        console.log("");
    }
    catch (error) {
        console.error("❌ Erro ao iniciar servidor:", error);
        process.exit(1);
    }
}
main().catch((error) => {
    console.error("❌ Erro fatal ao iniciar servidor:", error);
    process.exit(1);
});
