import type { ErrorRequestHandler } from 'express';
import multer from 'multer';

import { AppError } from '../errors/AppError';

type ErrorResponse = {
  readonly success: false;
  readonly error: {
    readonly message: string;
    readonly details?: unknown;
  };
};

export const errorMiddleware: ErrorRequestHandler = (err: unknown, _req, res, _next): void => {
  const appError = toAppError(err);
  const response: ErrorResponse = {
    success: false,
    error: {
      message: appError.message,
      details: appError.details
    }
  };

  res.status(appError.statusCode).json(response);
};

function toAppError(err: unknown): AppError {
  if (err instanceof AppError) {
    return err;
  }

  if (err instanceof multer.MulterError) {
    return new AppError(err.message, err.code === 'LIMIT_FILE_SIZE' ? 413 : 400);
  }

  if (err instanceof Error) {
    if (err.message === 'Only PDF files are allowed') {
      return new AppError(err.message, 415);
    }

    if (
      err.message === 'file_ijazah is required' ||
      err.message.startsWith('Missing required fields:') ||
      err.message.endsWith('must use YYYY-MM-DD format')
    ) {
      return new AppError(err.message, 400);
    }

    if (err.message.startsWith('certificateNumber already exists:')) {
      return new AppError(err.message, 409);
    }

    return new AppError(err.message || 'Internal server error', 500);
  }

  return new AppError('Internal server error', 500);
}
