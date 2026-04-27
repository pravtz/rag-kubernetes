import { ErrorRequestHandler, NextFunction, Request, RequestHandler, Response } from 'express';
import multer from 'multer';
import { config } from '../config/config';
import { AppError } from '../utils/appError';

function normalizeError(err: unknown): AppError {
  if (err instanceof AppError) {
    return err;
  }

  if (err instanceof multer.MulterError) {
    return new AppError(err.message, 400, 'UPLOAD_ERROR', { multerCode: err.code });
  }

  if (err instanceof SyntaxError && 'body' in err) {
    return new AppError('Invalid JSON payload', 400, 'INVALID_JSON');
  }

  return new AppError('Internal server error', 500, 'INTERNAL_ERROR');
}

export const notFoundHandler: RequestHandler = (_req: Request, res: Response) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found',
    },
  });
};

export const errorHandler: ErrorRequestHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  const normalizedError = normalizeError(err);

  if (normalizedError.statusCode >= 500) {
    console.error('Unhandled API error:', {
      code: normalizedError.code,
      message: normalizedError.message,
      details: normalizedError.details,
      stack: normalizedError.stack,
    });
  }

  const payload: {
    error: {
      code: string;
      message: string;
      details?: unknown;
      stack?: string;
    };
  } = {
    error: {
      code: normalizedError.code,
      message: normalizedError.message,
    },
  };

  if (normalizedError.details) {
    payload.error.details = normalizedError.details;
  }

  if (config.nodeEnv !== 'production') {
    payload.error.stack = normalizedError.stack;
  }

  res.status(normalizedError.statusCode).json(payload);
};
