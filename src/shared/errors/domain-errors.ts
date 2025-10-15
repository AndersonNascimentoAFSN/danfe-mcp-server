export abstract class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    public readonly retryable: boolean = false,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      retryable: this.retryable,
      details: this.details,
    };
  }
}

function maskChave(chave: string): string {
  if (chave.length < 8) return '***';
  return `${chave.substring(0, 4)}***${chave.slice(-4)}`;
}

// Validation Errors (400)
export class ChaveInvalidaError extends DomainError {
  constructor(chave: string, reason: string) {
    super(
      `Chave de acesso inválida: ${reason}`,
      'CHAVE_INVALIDA',
      400,
      false,
      { chave: maskChave(chave), reason }
    );
  }
}

export class ValidationError extends DomainError {
  constructor(field: string, reason: string) {
    super(
      `Validation failed for ${field}: ${reason}`,
      'VALIDATION_ERROR',
      400,
      false,
      { field, reason }
    );
  }
}

// Browser/Download Errors (503/504)
export class DownloadTimeoutError extends DomainError {
  constructor(chave: string, timeout: number) {
    super(
      `Download timeout após ${timeout}ms`,
      'DOWNLOAD_TIMEOUT',
      504,
      true, // Retryable
      { chave: maskChave(chave), timeout }
    );
  }
}

export class CloudflareBlockedError extends DomainError {
  constructor() {
    super(
      'Acesso bloqueado por Cloudflare',
      'CLOUDFLARE_BLOCKED',
      429,
      true, // Retryable
      { suggestion: 'Aguarde alguns minutos antes de tentar novamente' }
    );
  }
}

export class BrowserError extends DomainError {
  constructor(message: string) {
    super(`Browser error: ${message}`, 'BROWSER_ERROR', 503, true);
  }
}

// Parsing Errors (422)
export class XmlParseError extends DomainError {
  constructor(reason: string) {
    super(
      `Failed to parse XML: ${reason}`,
      'XML_PARSE_ERROR',
      422,
      false,
      { reason }
    );
  }
}

// Session Errors (400)
export class SessionNotFoundError extends DomainError {
  constructor(sessionId: string) {
    super(
      `Session not found: ${sessionId}`,
      'SESSION_NOT_FOUND',
      400,
      false,
      { sessionId }
    );
  }
}

export class InvalidSessionError extends DomainError {
  constructor(reason: string) {
    super(`Invalid session: ${reason}`, 'INVALID_SESSION', 400, false, {
      reason,
    });
  }
}

// Rate Limit (429)
export class RateLimitExceededError extends DomainError {
  constructor(retryAfter: number) {
    super(
      'Too many requests',
      'RATE_LIMIT_EXCEEDED',
      429,
      true,
      { retryAfter }
    );
  }
}
