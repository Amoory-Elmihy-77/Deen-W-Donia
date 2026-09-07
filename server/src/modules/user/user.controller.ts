import { Response } from 'express';
import { User } from '../../models/User';
import { UserSettings } from '../../models/UserSettings';
import { encrypt, decrypt } from '../../utils/encryption';
import { sendSuccess, sendError } from '../../utils/response';
import { AuthenticatedRequest } from '../../types';
import { config } from '../../config';
import axios from 'axios';

async function validateGroqKey(key: string): Promise<void> {
  // Listing models validates authentication without relying on a model that may be
  // unavailable for a user's Groq project or account tier.
  await axios.get('https://api.groq.com/openai/v1/models', {
    headers: { Authorization: `Bearer ${key}` },
    timeout: 10000,
  });
}

export async function getMe(req: AuthenticatedRequest, res: Response): Promise<void> {
  const user = await User.findById(req.userId).select('-passwordHash');
  if (!user) { sendError(res, 'User not found', 404); return; }
  sendSuccess(res, user);
}

export async function updateMe(req: AuthenticatedRequest, res: Response): Promise<void> {
  const allowed = ['name', 'timezone', 'language'];
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) update[key] = req.body[key];
  }
  const user = await User.findByIdAndUpdate(req.userId, update, { new: true }).select('-passwordHash');
  sendSuccess(res, user);
}

export async function getSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
  let settings = await UserSettings.findOne({ userId: req.userId });
  if (!settings) settings = await UserSettings.create({ userId: req.userId });

  // Never send raw key fields to client
  const safeSettings = settings.toObject();
  const ai = safeSettings.aiSettings as Record<string, unknown>;
  delete ai.groqKeyCiphertext;
  delete ai.groqKeyIv;
  delete ai.groqKeyAuthTag;
  sendSuccess(res, safeSettings);
}

export async function updateSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
  const allowed = ['dayStructure', 'defaultDayMode', 'prayerSettings', 'preferredDurations', 'notificationSettings', 'theme'];
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) update[key] = req.body[key];
  }
  const settings = await UserSettings.findOneAndUpdate({ userId: req.userId }, update, { new: true, upsert: true });
  sendSuccess(res, settings);
}

export async function saveAiKey(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { key } = req.body as { key: string };
  if (!key || !key.startsWith('gsk_')) {
    sendError(res, 'Invalid Groq API key format. Must start with gsk_', 400, 'INVALID_KEY_FORMAT');
    return;
  }

  // Validate the credential before persisting it.
  try {
    await validateGroqKey(key);
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 401) {
      sendError(res, 'Groq API key is invalid or revoked', 401, 'AI_KEY_INVALID');
      return;
    }
    sendError(res, 'Groq could not validate this key. Check your network and Groq project permissions.', 502, 'AI_KEY_VALIDATION_FAILED');
    return;
  }

  const encrypted = encrypt(key);
  const last4 = key.slice(-4);

  await UserSettings.findOneAndUpdate(
    { userId: req.userId },
    {
      'aiSettings.groqKeyCiphertext': encrypted.ciphertext,
      'aiSettings.groqKeyIv': encrypted.iv,
      'aiSettings.groqKeyAuthTag': encrypted.authTag,
      'aiSettings.groqKeyLast4': last4,
      'aiSettings.connectedAt': new Date(),
    },
    { upsert: true }
  );

  sendSuccess(res, { connected: true, last4 }, 200, 'Groq API key saved');
}

export async function testAiKey(req: AuthenticatedRequest, res: Response): Promise<void> {
  const settings = await UserSettings.findOne({ userId: req.userId });
  if (!settings?.aiSettings?.groqKeyCiphertext) {
    sendError(res, 'No AI key connected', 404, 'AI_KEY_MISSING');
    return;
  }

  const key = decrypt({
    ciphertext: settings.aiSettings.groqKeyCiphertext!,
    iv: settings.aiSettings.groqKeyIv!,
    authTag: settings.aiSettings.groqKeyAuthTag!,
  });

  try {
    await validateGroqKey(key);
    sendSuccess(res, { valid: true, last4: settings.aiSettings.groqKeyLast4 });
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 401) {
      sendError(res, 'Groq key is no longer valid', 401, 'AI_KEY_INVALID');
    } else {
      sendError(res, 'Groq could not validate this key. Check your network and Groq project permissions.', 502, 'AI_KEY_VALIDATION_FAILED');
    }
  }
}

export async function deleteAiKey(req: AuthenticatedRequest, res: Response): Promise<void> {
  await UserSettings.findOneAndUpdate(
    { userId: req.userId },
    {
      'aiSettings.groqKeyCiphertext': null,
      'aiSettings.groqKeyIv': null,
      'aiSettings.groqKeyAuthTag': null,
      'aiSettings.groqKeyLast4': null,
      'aiSettings.connectedAt': null,
    }
  );
  sendSuccess(res, { connected: false }, 200, 'Groq API key removed');
}
