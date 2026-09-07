import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../../config';
import { User } from '../../models/User';
import { UserSettings } from '../../models/UserSettings';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

function generateTokens(userId: string, email: string): TokenPair {
  const accessToken = jwt.sign({ userId, email }, config.jwtSecret, {
    expiresIn: config.jwtExpiry,
  } as jwt.SignOptions);

  const refreshToken = jwt.sign({ userId, email }, config.jwtRefreshSecret, {
    expiresIn: config.jwtRefreshExpiry,
  } as jwt.SignOptions);

  return { accessToken, refreshToken };
}

export async function registerUser(
  name: string,
  email: string,
  password: string,
  timezone: string,
  language: 'ar' | 'en'
) {
  const existing = await User.findOne({ email });
  if (existing) {
    throw new Error('EMAIL_IN_USE');
  }

  const passwordHash = await bcrypt.hash(password, config.bcryptRounds);
  const user = await User.create({ name, email, passwordHash, timezone, language });

  // Create default settings for new user
  await UserSettings.create({ userId: user._id });

  const tokens = generateTokens(user.id, user.email);
  return { user: { id: user.id, name: user.name, email: user.email }, ...tokens };
}

export async function loginUser(email: string, password: string) {
  const user = await User.findOne({ email });
  if (!user) throw new Error('INVALID_CREDENTIALS');

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new Error('INVALID_CREDENTIALS');

  const tokens = generateTokens(user.id, user.email);
  return { user: { id: user.id, name: user.name, email: user.email }, ...tokens };
}

export async function refreshTokens(token: string) {
  try {
    const decoded = jwt.verify(token, config.jwtRefreshSecret) as { userId: string; email: string };
    return generateTokens(decoded.userId, decoded.email);
  } catch {
    throw new Error('INVALID_REFRESH_TOKEN');
  }
}

const RESET_CODE_TTL_MS = 15 * 60 * 1000;

async function deliverResetCode(email: string, code: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.PASSWORD_RESET_FROM;
  if (!apiKey || !from) {
    if (config.nodeEnv === 'production') throw new Error('PASSWORD_RESET_DELIVERY_UNAVAILABLE');
    console.info(`[development only] Password reset code for ${email}: ${code}`);
    return;
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [email],
      subject: 'رمز إعادة تعيين كلمة مرور دين ودنيا',
      text: `رمز إعادة تعيين كلمة المرور هو: ${code}. ينتهي خلال 15 دقيقة.`,
    }),
  });
  if (!response.ok) throw new Error('PASSWORD_RESET_DELIVERY_FAILED');
}

export async function requestPasswordReset(email: string): Promise<void> {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordResetCodeHash +passwordResetExpiresAt');
  // Do not reveal whether an account exists.
  if (!user) return;

  const code = crypto.randomInt(100000, 1000000).toString();
  user.passwordResetCodeHash = await bcrypt.hash(code, config.bcryptRounds);
  user.passwordResetExpiresAt = new Date(Date.now() + RESET_CODE_TTL_MS);
  await user.save();
  await deliverResetCode(user.email, code);
}

export async function resetPassword(email: string, code: string, password: string): Promise<void> {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordResetCodeHash +passwordResetExpiresAt');
  const isExpired = !user?.passwordResetExpiresAt || user.passwordResetExpiresAt.getTime() < Date.now();
  const isValid = Boolean(user?.passwordResetCodeHash) && await bcrypt.compare(code, user!.passwordResetCodeHash!);
  if (!user || isExpired || !isValid) throw new Error('INVALID_OR_EXPIRED_RESET_CODE');

  user.passwordHash = await bcrypt.hash(password, config.bcryptRounds);
  user.passwordResetCodeHash = undefined;
  user.passwordResetExpiresAt = undefined;
  await user.save();
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
  const user = await User.findById(userId);
  if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
    throw new Error('INVALID_CURRENT_PASSWORD');
  }
  user.passwordHash = await bcrypt.hash(newPassword, config.bcryptRounds);
  user.passwordResetCodeHash = undefined;
  user.passwordResetExpiresAt = undefined;
  await user.save();
}
