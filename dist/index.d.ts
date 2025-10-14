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
export {};
