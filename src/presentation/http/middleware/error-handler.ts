import { Request, Response, NextFunction } from 'express';
import { DomainError } from '../../../shared/errors/domain-errors.js';
import { logger } from '../../../shared/logger/index.js';

export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Domain error (expected)
  if (error instanceof DomainError) {
    logger.warn(
      {
        error: error.toJSON(),
        req: {
          id: (req as any).id,
          method: req.method,
          url: req.url,
        },
      },
      'Domain error'
    );

    return res.status(error.statusCode).json({
      jsonrpc: '2.0',
      error: {
        code: error.code,
        message: error.message,
        data: {
          retryable: error.retryable,
          ...(error.details && typeof error.details === 'object' ? error.details : {}),
        },
      },
      id: null,
    });
  }

  // Unexpected error
  logger.error(
    {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      req: {
        id: (req as any).id,
        method: req.method,
        url: req.url,
      },
    },
    'Unexpected error'
  );

  // Don't leak internal errors
  return res.status(500).json({
    jsonrpc: '2.0',
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
    },
    id: null,
  });
}
