import { Request, Response } from 'express';
import * as authService from './auth.service';
import { sendSuccess, sendError } from '../../utils/response';
import { AuthenticatedRequest } from '../../types';

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { name, email, password, timezone, language } = req.body;
    const result = await authService.registerUser(name, email, password, timezone, language);
    sendSuccess(res, result, 201, 'Registration successful');
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'EMAIL_IN_USE') {
      sendError(res, 'Email already in use', 409, 'EMAIL_IN_USE');
    } else {
      sendError(res, 'Registration failed', 500);
    }
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;
    const result = await authService.loginUser(email, password);
    sendSuccess(res, result, 200, 'Login successful');
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'INVALID_CREDENTIALS') {
      sendError(res, 'Invalid email or password', 401, 'INVALID_CREDENTIALS');
    } else {
      sendError(res, 'Login failed', 500);
    }
  }
}

export async function refresh(req: Request, res: Response): Promise<void> {
  try {
    const { refreshToken } = req.body;
    const tokens = await authService.refreshTokens(refreshToken);
    sendSuccess(res, tokens, 200, 'Token refreshed');
  } catch {
    sendError(res, 'Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
  }
}

export async function logout(_req: Request, res: Response): Promise<void> {
  // Stateless JWT: client should discard tokens
  // For added security, implement token blacklist with Redis in V2
  sendSuccess(res, null, 200, 'Logged out');
}

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  try {
    await authService.requestPasswordReset(req.body.email);
    sendSuccess(res, null, 200, 'If an account exists, a reset code has been sent.');
  } catch (err: unknown) {
    if (err instanceof Error && err.message.startsWith('PASSWORD_RESET_DELIVERY')) {
      sendError(res, 'Password reset email is not available. Please contact support.', 503, 'PASSWORD_RESET_DELIVERY_UNAVAILABLE');
      return;
    }
    sendError(res, 'Could not start password reset', 500);
  }
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  try {
    await authService.resetPassword(req.body.email, req.body.code, req.body.password);
    sendSuccess(res, null, 200, 'Password reset successfully');
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'INVALID_OR_EXPIRED_RESET_CODE') {
      sendError(res, 'The code is invalid or expired.', 400, 'INVALID_OR_EXPIRED_RESET_CODE');
      return;
    }
    sendError(res, 'Could not reset password', 500);
  }
}

export async function changePassword(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    await authService.changePassword(req.userId!, req.body.currentPassword, req.body.newPassword);
    sendSuccess(res, null, 200, 'Password changed successfully');
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'INVALID_CURRENT_PASSWORD') {
      sendError(res, 'Current password is incorrect.', 400, 'INVALID_CURRENT_PASSWORD');
      return;
    }
    sendError(res, 'Could not change password', 500);
  }
}
