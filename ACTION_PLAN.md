# 🎯 Plano de Ação - Refatoração Arquitetural

**Baseado em**: ARCHITECTURE_ANALYSIS.md  
**Última Atualização**: 15 de Outubro de 2025

---

## 📋 Índice

1. [Overview](#overview)
2. [Matriz de Priorização](#matriz-de-priorização)
3. [Fase 1: Foundations](#fase-1-foundations-1-2-semanas)
4. [Fase 2: Production Ready](#fase-2-production-ready-2-3-semanas)
5. [Fase 3: Enterprise](#fase-3-enterprise-3-4-semanas)
6. [Checklist de Execução](#checklist-de-execução)

---

## Overview

### Estatísticas Gerais

| Categoria | Total | Críticos 🔴 | Importantes 🟡 | Melhorias 🟢 |
|-----------|-------|-------------|----------------|--------------|
| **Problemas Identificados** | 79 | 17 | 35 | 27 |
| **Horas Estimadas** | 320h | 80h | 160h | 80h |
| **Sprints (2 semanas)** | 8 | 2 | 4 | 2 |

### ROI Esperado por Fase

| Fase | Investimento | ROI | Payback |
|------|-------------|-----|---------|
| **Fase 1** | 80h (2 semanas) | 5x performance | Imediato |
| **Fase 2** | 120h (3 semanas) | 99.9% uptime | 1 mês |
| **Fase 3** | 120h (3 semanas) | Scaling infinito | 3 meses |

---

## Matriz de Priorização

### Quadrante: Impacto vs Esforço

```
         Alto Impacto
              ↑
    Q2        |        Q1
  Do Later    |    Do First
              |
──────────────┼──────────────→ Baixo Esforço
              |
    Q3        |        Q4
   Ignore     |   Quick Wins
              |
         Baixo Impacto
```

### Q1: Do First (Alto Impacto, Baixo Esforço) ⚡

| # | Item | Impacto | Esforço | Prioridade |
|---|------|---------|---------|------------|
| 1 | Browser Pool | 🔥🔥🔥🔥🔥 | 4h | P0 |
| 2 | Rate Limiting | 🔥🔥🔥🔥 | 2h | P0 |
| 3 | DNS Rebinding Protection | 🔥🔥🔥🔥 | 1h | P0 |
| 4 | Structured Logging | 🔥🔥🔥🔥 | 3h | P0 |
| 5 | Config com Zod | 🔥🔥🔥 | 3h | P1 |
| 6 | Mask Sensitive Data | 🔥🔥🔥 | 2h | P1 |
| 7 | UUID para Session | 🔥🔥🔥 | 1h | P1 |

**Total Q1**: 16h (2 dias)

### Q2: Do Later (Alto Impacto, Alto Esforço) 🏗️

| # | Item | Impacto | Esforço | Prioridade |
|---|------|---------|---------|------------|
| 8 | Reestruturar Arquitetura | 🔥🔥🔥🔥🔥 | 40h | P1 |
| 9 | Redis Session Store | 🔥🔥🔥🔥 | 16h | P1 |
| 10 | Domain Errors | 🔥🔥🔥🔥 | 12h | P1 |
| 11 | Retry Logic | 🔥🔥🔥🔥 | 8h | P1 |
| 12 | Validação NFe Completa | 🔥🔥🔥 | 8h | P2 |
| 13 | Tests Suite (80%) | 🔥🔥🔥🔥🔥 | 40h | P2 |
| 14 | OpenTelemetry | 🔥🔥🔥🔥 | 16h | P2 |

**Total Q2**: 140h (17.5 dias)

### Q4: Quick Wins (Baixo Impacto, Baixo Esforço) ✨

| # | Item | Impacto | Esforço | Prioridade |
|---|------|---------|---------|------------|
| 15 | Health Check Proper | 🔥🔥 | 2h | P2 |
| 16 | Graceful Shutdown | 🔥🔥 | 2h | P2 |
| 17 | CORS Config | 🔥🔥 | 1h | P3 |
| 18 | OpenAPI Docs | 🔥🔥 | 4h | P3 |

**Total Q4**: 9h (1 dia)

---

## Fase 1: Foundations (1-2 semanas)

### Sprint 1: Performance & Security (Semana 1)

#### Objetivo
Resolver problemas críticos de performance e segurança

#### Tasks

##### 1. Browser Pool (P0) - 4h
**Issue**: #1 - Implementar Browser Pool

**Descrição**:
- Criar `infrastructure/browser/browser-pool.ts`
- Implementar pool com 3 contextos
- Lifecycle: initialize → acquire → release → shutdown

**Acceptance Criteria**:
- [ ] Browser iniciado uma vez no startup
- [ ] Pool com 3 contextos pré-aquecidos
- [ ] Método `acquireContext()` retorna context disponível
- [ ] Método `releaseContext()` limpa estado
- [ ] Método `shutdown()` fecha tudo gracefully
- [ ] Tests: 100% coverage

**Arquivos**:
```
infrastructure/browser/
├── browser-pool.ts          # NEW
├── browser-pool.test.ts     # NEW
└── playwright-adapter.ts    # REFACTOR from danfe-downloader-final.ts
```

**Code Snippet**:
```typescript
export class PlaywrightBrowserPool {
  private browser: Browser | null = null;
  private contexts: BrowserContext[] = [];
  private maxContexts = Config.BROWSER_POOL_SIZE;
  private contextInUse = new Set<BrowserContext>();

  async initialize(): Promise<void> { /* ... */ }
  async acquireContext(): Promise<BrowserContext> { /* ... */ }
  async releaseContext(context: BrowserContext): Promise<void> { /* ... */ }
  async shutdown(): Promise<void> { /* ... */ }
}
```

**Impacto Esperado**:
- ⚡ 95% redução em tempo de setup
- 🚀 10x aumento em throughput
- 💾 30% redução em memória

---

##### 2. Rate Limiting (P0) - 2h
**Issue**: #2 - Adicionar Rate Limiting

**Descrição**:
- Instalar `express-rate-limit`
- Configurar limiter middleware
- Headers: X-RateLimit-*

**Acceptance Criteria**:
- [ ] Rate limiter ativo em `/mcp`
- [ ] 100 req/15min por IP
- [ ] Headers X-RateLimit-Limit, Remaining, Reset
- [ ] Response 429 com Retry-After
- [ ] Tests: verificar bloqueio após limite

**Code Snippet**:
```typescript
import rateLimit from 'express-rate-limit';

export const rateLimiter = rateLimit({
  windowMs: Config.RATE_LIMIT_WINDOW_MS,
  max: Config.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  handler: (req, res) => {
    res.status(429).json({
      jsonrpc: '2.0',
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests',
        data: { retryAfter: req.rateLimit.resetTime }
      },
      id: null
    });
  }
});

app.use('/mcp', rateLimiter);
```

---

##### 3. DNS Rebinding Protection (P0) - 1h
**Issue**: #3 - Ativar DNS Rebinding Protection

**Descrição**:
- Atualizar StreamableHTTPServerTransport config
- Conforme documentação oficial MCP SDK

**Acceptance Criteria**:
- [ ] `enableDnsRebindingProtection: true`
- [ ] `allowedHosts` configurado
- [ ] Tests: bloqueia hosts não permitidos

**Code Snippet**:
```typescript
const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: () => randomUUID(),
  enableJsonResponse: true,
  enableDnsRebindingProtection: true,
  allowedHosts: Config.MCP_ALLOWED_HOSTS,
  onsessioninitialized: (id) => { /* ... */ },
  onsessionclosed: (id) => { /* ... */ }
});
```

---

##### 4. Structured Logging (P0) - 3h
**Issue**: #4 - Implementar Logging Estruturado

**Descrição**:
- Instalar Pino
- Criar logger wrapper
- Redact sensitive data

**Acceptance Criteria**:
- [ ] Logger em `shared/logger/index.ts`
- [ ] Logs formato JSON
- [ ] Redação de chaves (4 primeiros + 4 últimos dígitos)
- [ ] Níveis: debug, info, warn, error
- [ ] Request ID correlation
- [ ] Tests: verificar redação

**Code Snippet**:
```typescript
import pino from 'pino';

export const logger = pino({
  level: Config.LOG_LEVEL,
  redact: {
    paths: ['chaveAcesso', '*.chaveAcesso', 'password'],
    censor: (value, path) => {
      if (path.includes('chaveAcesso')) {
        return `${value.substring(0,4)}***${value.slice(-4)}`;
      }
      return '***REDACTED***';
    }
  },
  timestamp: pino.stdTimeFunctions.isoTime
});

export function withRequestId(requestId: string) {
  return logger.child({ requestId });
}
```

---

##### 5. Config com Zod (P1) - 3h
**Issue**: #5 - Centralizar Configuração

**Descrição**:
- Criar schema Zod
- Validar env vars em startup
- Exit(1) se inválido

**Acceptance Criteria**:
- [ ] Schema em `config/env.schema.ts`
- [ ] Validação no startup
- [ ] Type-safe Config export
- [ ] .env.example atualizado
- [ ] Tests: validação schema

---

##### 6. Mask Sensitive Data (P1) - 2h
**Issue**: #6 - Mascarar Dados Sensíveis

**Descrição**:
- Criar função maskChave()
- Atualizar todos os logs
- Garantir LGPD compliance

**Acceptance Criteria**:
- [ ] Função em `shared/utils/mask.ts`
- [ ] Todos logs usando mask
- [ ] Tests: verificar masking

---

##### 7. UUID para Session (P1) - 1h
**Issue**: #7 - Trocar Math.random por UUID

**Descrição**:
- Importar randomUUID from crypto
- Substituir sessionIdGenerator

**Acceptance Criteria**:
- [ ] UUID v4 usado
- [ ] Tests: validar formato

---

### Sprint 2: Architecture & Quality (Semana 2)

#### Objetivo
Estabelecer arquitetura sólida e testes

#### Tasks

##### 8. Reestruturar Arquitetura (P1) - 40h
**Issue**: #8 - Implementar Layered Architecture

**Descrição**:
- Criar estrutura de pastas
- Migrar código para layers
- Implementar Dependency Injection

**Nova Estrutura**:
```
src/
├── config/
│   ├── env.schema.ts
│   └── index.ts
│
├── core/
│   ├── entities/
│   │   ├── danfe.entity.ts
│   │   └── session.entity.ts
│   │
│   ├── usecases/
│   │   ├── download-danfe.usecase.ts
│   │   └── parse-xml.usecase.ts
│   │
│   └── interfaces/
│       ├── browser.interface.ts
│       ├── parser.interface.ts
│       └── session-store.interface.ts
│
├── infrastructure/
│   ├── browser/
│   │   ├── browser-pool.ts
│   │   └── playwright-adapter.ts
│   │
│   ├── storage/
│   │   ├── memory-session-store.ts
│   │   └── file-storage.ts
│   │
│   └── xml/
│       └── xml2js-parser.ts
│
├── presentation/
│   ├── http/
│   │   ├── controllers/
│   │   │   ├── health.controller.ts
│   │   │   └── mcp.controller.ts
│   │   │
│   │   └── middleware/
│   │       ├── auth.middleware.ts
│   │       ├── rate-limit.middleware.ts
│   │       └── error-handler.middleware.ts
│   │
│   └── mcp/
│       ├── handlers/
│       │   └── download-tool.handler.ts
│       │
│       └── mcp-server-factory.ts
│
├── shared/
│   ├── logger/
│   ├── errors/
│   ├── validators/
│   └── utils/
│
└── index.ts (slim entry point)
```

**Acceptance Criteria**:
- [ ] Toda estrutura criada
- [ ] Código migrado mantendo funcionalidade
- [ ] Dependency Injection configurado
- [ ] Tests passando
- [ ] index.ts < 100 linhas

---

##### 9. Domain Errors (P1) - 12h
**Issue**: #9 - Implementar Domain Errors

**Descrição**:
- Criar base class DomainError
- Implementar errors específicos
- Atualizar error handler

**Errors**:
- ChaveInvalidaError
- DownloadTimeoutError
- CloudflareBlockedError
- XmlParseError
- SessionNotFoundError

**Acceptance Criteria**:
- [ ] Base class em `shared/errors/domain-errors.ts`
- [ ] 5+ errors específicos
- [ ] Propriedades: code, statusCode, retryable, details
- [ ] Error handler middleware
- [ ] Tests: cada error

---

##### 10. Validação NFe Completa (P2) - 8h
**Issue**: #10 - Validar Chave NFe

**Descrição**:
- Implementar NFeValidator
- Validar: UF, data, CNPJ, modelo, checksum

**Acceptance Criteria**:
- [ ] Classe em `shared/validators/nfe-validator.ts`
- [ ] Valida UF (código IBGE)
- [ ] Valida data (AAMM)
- [ ] Valida CNPJ (dígitos verificadores)
- [ ] Valida modelo (55 ou 65)
- [ ] Valida checksum (módulo 11)
- [ ] Tests: 100% coverage
- [ ] Tests: casos válidos e inválidos

---

##### 11. Tests Suite (P2) - 40h
**Issue**: #11 - Implementar Tests

**Descrição**:
- Setup Vitest
- Tests unitários
- Tests integração
- Coverage 80%+

**Estrutura**:
```
tests/
├── unit/
│   ├── validators/
│   ├── usecases/
│   └── utils/
│
├── integration/
│   ├── mcp/
│   └── browser/
│
└── e2e/
    └── download-flow.test.ts
```

**Acceptance Criteria**:
- [ ] Vitest configurado
- [ ] Coverage > 80%
- [ ] CI rodando tests
- [ ] Tests passando

---

## Fase 2: Production Ready (2-3 semanas)

### Sprint 3-4: Resilience & Observability

#### Tasks Principais

##### 12. Redis Session Store (P1) - 16h
**Issue**: #12 - Persistir Sessions em Redis

**Descrição**:
- Implementar RedisSessionStore
- Integrar com transport
- TTL automático

**Acceptance Criteria**:
- [ ] Interface ISessionStore
- [ ] RedisSessionStore implementado
- [ ] Fallback para MemoryStore
- [ ] TTL configurável
- [ ] Tests: mock Redis

---

##### 13. Retry Logic (P1) - 8h
**Issue**: #13 - Implementar Retry com Backoff

**Descrição**:
- Instalar async-retry
- Wrapper em use cases
- Exponential backoff

**Acceptance Criteria**:
- [ ] 3 tentativas padrão
- [ ] Exponential backoff (2^n)
- [ ] Apenas erros retryable
- [ ] Logs de retry
- [ ] Tests: mock failures

---

##### 14. OpenTelemetry (P2) - 16h
**Issue**: #14 - Implementar Tracing + Metrics

**Descrição**:
- Setup OpenTelemetry SDK
- Instrumentação automática
- Métricas customizadas

**Métricas**:
- danfe_downloads_total
- danfe_download_duration_seconds
- mcp_active_sessions
- browser_contexts_active

**Acceptance Criteria**:
- [ ] SDK configurado
- [ ] Auto-instrumentation ativo
- [ ] 10+ métricas customizadas
- [ ] Endpoint /metrics (Prometheus)
- [ ] Tracing distribuído
- [ ] Tests: métricas incrementam

---

##### 15. Health Check Proper (P2) - 2h
**Issue**: #15 - Melhorar Health Check

**Descrição**:
- Verificar browser pool
- Verificar disk space
- Verificar memory
- Verificar Redis

**Acceptance Criteria**:
- [ ] GET /health retorna checks
- [ ] Status: healthy|degraded|unhealthy
- [ ] Cada check com status
- [ ] Tests: simular failures

---

##### 16. Graceful Shutdown (P2) - 2h
**Issue**: #16 - Implementar Graceful Shutdown

**Descrição**:
- Handler SIGTERM
- Fechar browser pool
- Fechar Redis
- Timeout 30s

**Acceptance Criteria**:
- [ ] SIGTERM handler
- [ ] Cleanup em ordem
- [ ] Force shutdown após 30s
- [ ] Logs de shutdown
- [ ] Tests: simular SIGTERM

---

##### 17. OpenAPI Docs (P3) - 4h
**Issue**: #17 - Documentar API

**Descrição**:
- Criar openapi.yaml
- Swagger UI
- Schemas completos

**Acceptance Criteria**:
- [ ] openapi.yaml completo
- [ ] Swagger UI em /docs
- [ ] Todos endpoints documentados
- [ ] Schemas validados

---

## Fase 3: Enterprise (3-4 semanas)

### Sprint 5-8: Advanced Features

#### Tasks Principais

##### 18. Autenticação (P2) - 16h
- [ ] API Key authentication
- [ ] Rate limit por API key
- [ ] Admin dashboard

##### 19. Queue System (P2) - 24h
- [ ] BullMQ integration
- [ ] Job queue
- [ ] Worker pool
- [ ] Job retry

##### 20. Browser Pool Advanced (P3) - 16h
- [ ] Auto-scaling
- [ ] Health monitoring
- [ ] Circuit breaker

##### 21. CI/CD (P2) - 16h
- [ ] GitHub Actions
- [ ] Docker build
- [ ] Deploy automático
- [ ] Rollback

##### 22. Load Testing (P3) - 8h
- [ ] k6 scripts
- [ ] Load test CI
- [ ] Performance baseline

---

## Checklist de Execução

### Pré-requisitos

- [ ] Git branch: `feature/architecture-refactor`
- [ ] Node.js 18+ instalado
- [ ] Docker instalado (para Redis)
- [ ] xvfb instalado

### Dependencies

```bash
# Fase 1
npm install pino zod express-rate-limit vitest @vitest/coverage-v8

# Fase 2
npm install ioredis async-retry @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node

# Fase 3
npm install bullmq passport passport-http-bearer k6
```

### Comandos

```bash
# Tests
npm run test              # Run all tests
npm run test:unit         # Unit tests
npm run test:integration  # Integration tests
npm run test:coverage     # Coverage report

# Build
npm run build             # TypeScript compile
npm run lint              # ESLint
npm run type-check        # tsc --noEmit

# Run
npm run dev               # Development
npm run start:headless    # Production (xvfb)
```

### Monitoramento

```bash
# Health Check
curl http://localhost:3000/health

# Metrics
curl http://localhost:3000/metrics

# OpenAPI
open http://localhost:3000/docs
```

---

## 📊 Tracking Progress

### Dashboard

| Fase | Status | Progresso | ETA |
|------|--------|-----------|-----|
| Fase 1 | 🔄 In Progress | 0/16h | 2 semanas |
| Fase 2 | ⏳ Pending | 0/120h | 3 semanas |
| Fase 3 | ⏳ Pending | 0/120h | 3 semanas |

### Métricas

```
┌─────────────────────────────────────┐
│ Coverage:     0% → 80% (target)     │
│ Performance:  10s → 5s (P95)        │
│ Reliability:  99% → 99.9% (uptime)  │
│ Security:     10 → 0 (vulnerab.)    │
└─────────────────────────────────────┘
```

---

**Última Atualização**: 15 de Outubro de 2025  
**Próxima Review**: A cada Sprint (2 semanas)  
**Owner**: Anderson Nascimento
