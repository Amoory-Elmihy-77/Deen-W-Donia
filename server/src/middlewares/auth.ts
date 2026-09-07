import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { sendError } from '../utils/response';
import { AuthenticatedRequest } from '../types';

interface JwtPayload {
  userId: string;
  email: string;
}

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    sendError(res, 'No token provided', 401, 'UNAUTHORIZED');
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    next();
  } catch {
    sendError(res, 'Invalid or expired token', 401, 'UNAUTHORIZED');
  }
}
