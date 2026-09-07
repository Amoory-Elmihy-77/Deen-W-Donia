import { Response } from 'express';

export function sendSuccess(res: Response, data: unknown, statusCode = 200, message?: string) {
  res.status(statusCode).json({
    success: true,
    message: message || 'OK',
    data,
  });
}

export function sendError(res: Response, message: string, statusCode = 400, code?: string) {
  res.status(statusCode).json({
    success: false,
    message,
    code: code || 'ERROR',
  });
}
