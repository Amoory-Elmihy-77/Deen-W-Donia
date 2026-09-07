import { Response } from 'express';
import axios from 'axios';
import { UserSettings } from '../../models/UserSettings';
import { Task } from '../../models/Task';
import { Goal } from '../../models/Goal';
import { Routine } from '../../models/Routine';
import { decrypt } from '../../utils/encryption';
import { sendSuccess, sendError } from '../../utils/response';
import { AuthenticatedRequest } from '../../types';
import { config } from '../../config';
import { z } from 'zod';

const SMART_ADD_OUTPUT_SCHEMA = z.object({
  title: z.string().min(1).max(200),
  category: z.string(),
  type: z.enum(['goal', 'routine', 'task']),
  durationMinutes: z.number().nullable().optional(),
  frequency: z.enum(['daily', 'weekly', 'once']).nullable().optional(),
  activeDays: z.array(z.number().int().min(0).max(6)).nullable().optional(),
  schedulingType: z.enum(['fixed', 'flexible', 'prayer_anchor', 'relative']),
  anchor: z.enum([
    'after_fajr', 'after_dhuhr', 'before_asr', 'after_asr',
    'after_maghrib', 'after_isha', 'before_sleep',
  ]).nullable().optional(),
  preferredTime: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  confidence: z.number().min(0).max(1),
});

async function getDecryptedGroqKey(userId: string): Promise<string | null> {
  const settings = await UserSettings.findOne({ userId });
  if (!settings?.aiSettings?.groqKeyCiphertext) return null;

  return decrypt({
    ciphertext: settings.aiSettings.groqKeyCiphertext!,
    iv: settings.aiSettings.groqKeyIv!,
    authTag: settings.aiSettings.groqKeyAuthTag!,
  });
}

async function callAiService(
  endpoint: string,
  payload: Record<string, unknown>,
  groqKey: string
): Promise<unknown> {
  const response = await axios.post(
    `${config.aiServiceUrl}/internal/${endpoint}`,
    payload,
    {
      headers: {
        'X-Internal-Secret': config.aiServiceSecret,
        'X-Groq-Key': groqKey,
        'Content-Type': 'application/json',
      },
      timeout: 20000,
    }
  );
  return response.data;
}

export async function smartAdd(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { text } = req.body as { text: string };
  if (!text || text.length > 500) {
    sendError(res, 'Text is required and must be under 500 characters', 400);
    return;
  }

  const groqKey = await getDecryptedGroqKey(req.userId!);
  if (!groqKey) {
    sendError(res, 'No Groq API key connected. Please connect your key in Settings → AI.', 424, 'AI_KEY_MISSING');
    return;
  }

  try {
    const result = await callAiService('smart-add', { text }, groqKey);
    const validated = SMART_ADD_OUTPUT_SCHEMA.safeParse(result);

    if (!validated.success) {
      sendError(res, 'AI returned invalid structure. Please try again.', 422, 'AI_INVALID_OUTPUT');
      return;
    }

    const parsed = validated.data;

    if (parsed.confidence < 0.5) {
      sendSuccess(res, {
        preview: null,
        needsClarification: true,
        message: 'Could you be more specific? (e.g., add duration, frequency, or timing)',
      });
      return;
    }

    sendSuccess(res, { preview: parsed, needsClarification: false });
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 401) {
      sendError(res, 'Groq key is no longer valid', 401, 'AI_KEY_INVALID');
    } else if (status === 429) {
      sendError(res, 'Groq rate limit reached. Try again shortly.', 429, 'AI_RATE_LIMITED');
    } else {
      sendError(res, 'AI service unavailable', 502, 'AI_UPSTREAM_ERROR');
    }
  }
}

export async function decomposeGoal(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { goalId, goalTitle, goalDescription } = req.body as {
    goalId?: string;
    goalTitle: string;
    goalDescription?: string;
  };

  const groqKey = await getDecryptedGroqKey(req.userId!);
  if (!groqKey) {
    sendError(res, 'No Groq API key connected', 424, 'AI_KEY_MISSING');
    return;
  }

  try {
    const result = await callAiService('decompose-goal', {
      title: goalTitle,
      description: goalDescription || '',
    }, groqKey) as { milestones?: Array<{ title: string; order: number }> };

    sendSuccess(res, { milestones: result.milestones || [], goalId });
  } catch (err: unknown) {
    sendError(res, 'AI goal decomposition failed', 502, 'AI_UPSTREAM_ERROR');
  }
}

export async function analyzeWeek(req: AuthenticatedRequest, res: Response): Promise<void> {
  const groqKey = await getDecryptedGroqKey(req.userId!);

  // Compute stats deterministically (works even without AI key)
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const weekAgoStr = oneWeekAgo.toISOString().slice(0, 10);

  const tasks = await Task.find({
    userId: req.userId,
    date: { $gte: weekAgoStr },
  });

  const stats = {
    total: tasks.length,
    completed: tasks.filter((t) => t.status === 'completed').length,
    skipped: tasks.filter((t) => t.status === 'skipped').length,
    byCategory: tasks.reduce((acc, t) => {
      if (!acc[t.category]) acc[t.category] = { planned: 0, completed: 0 };
      acc[t.category].planned++;
      if (t.status === 'completed') acc[t.category].completed++;
      return acc;
    }, {} as Record<string, { planned: number; completed: number }>),
  };

  if (!groqKey) {
    sendSuccess(res, {
      stats,
      insight: null,
      message: 'Connect Groq to get personalized AI insights',
    });
    return;
  }

  try {
    const result = await callAiService('analyze-week', { stats }, groqKey) as { insight?: string };
    sendSuccess(res, { stats, insight: result.insight || null });
  } catch {
    sendSuccess(res, { stats, insight: null, message: 'AI insight unavailable' });
  }
}

export async function suggestFreeTime(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { availableMinutes } = req.body as { availableMinutes: number };
  const groqKey = await getDecryptedGroqKey(req.userId!);

  const todayStr = new Date().toISOString().slice(0, 10);
  const pending = await Task.find({
    userId: req.userId,
    date: todayStr,
    status: 'pending',
  });

  if (!groqKey) {
    // Deterministic fallback: sort by priority, fit what fits
    const sorted = pending
      .filter((t) => t.duration <= availableMinutes)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 3);
    sendSuccess(res, { suggestions: sorted.map((t) => ({ title: t.title, duration: t.duration })) });
    return;
  }

  try {
    const result = await callAiService('suggest-free-time', {
      availableMinutes,
      pendingTasks: pending.map((t) => ({ title: t.title, duration: t.duration, category: t.category })),
    }, groqKey) as { suggestions?: Array<{ title: string; duration: number; reason: string }> };

    sendSuccess(res, { suggestions: result.suggestions || [] });
  } catch {
    const fallback = pending.filter((t) => t.duration <= availableMinutes).slice(0, 3);
    sendSuccess(res, { suggestions: fallback.map((t) => ({ title: t.title, duration: t.duration })) });
  }
}
