import rateLimit from 'express-rate-limit';
import { Config } from '../../../config/index.js';
import { logger } from '../../../shared/logger/index.js';

export const rateLimitMiddleware = rateLimit({
  windowMs: Config.RATE_LIMIT_WINDOW_MS,
  max: Config.RATE_LIMIT_MAX_REQUESTS,
  message: {
    jsonrpc: '2.0',
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later',
    },
    id: null,
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => !Config.ENABLE_RATE_LIMIT,
  handler: (req, res) => {
    logger.warn(
      {
        ip: req.ip,
        path: req.path,
      },
      'Rate limit exceeded'
    );
    
    res.status(429).json({
      jsonrpc: '2.0',
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later',
      },
      id: null,
    });
  },
});
