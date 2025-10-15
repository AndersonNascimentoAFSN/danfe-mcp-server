import pino from 'pino';
import { Config } from '../../config/index.js';

function maskChave(chave: string): string {
  if (chave.length < 8) return '***';
  return `${chave.substring(0, 4)}***${chave.slice(-4)}`;
}

export const logger = pino({
  level: Config.LOG_LEVEL,

  formatters: {
    level: (label) => ({ level: label }),
  },

  // Redact sensitive data
  redact: {
    paths: [
      'chaveAcesso',
      '*.chaveAcesso',
      'password',
      '*.password',
      'apiKey',
      '*.apiKey',
      'chave',
      '*.chave',
    ],
    censor: (value, path) => {
      if ((path.includes('chaveAcesso') || path.includes('chave')) && typeof value === 'string') {
        return maskChave(value);
      }
      return '***REDACTED***';
    },
  },

  timestamp: pino.stdTimeFunctions.isoTime,

  // Pretty print in development
  ...(Config.NODE_ENV === 'development' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss',
        ignore: 'pid,hostname',
      },
    },
  }),
});

export function withRequestId(requestId: string) {
  return logger.child({ requestId });
}

export function withContext(context: Record<string, unknown>) {
  return logger.child(context);
}
