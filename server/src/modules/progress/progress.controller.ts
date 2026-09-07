import { Response } from 'express';
import { Task } from '../../models/Task';
import { sendSuccess } from '../../utils/response';
import { AuthenticatedRequest } from '../../types';

function getDateRange(daysBack: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysBack);
  return d.toISOString().slice(0, 10);
}

function computeStats(tasks: Array<{ status: string; category: string; duration: number; date: string }>) {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === 'completed').length;
  const skipped = tasks.filter((t) => t.status === 'skipped').length;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  const byCategory: Record<string, { planned: number; completed: number; totalMinutes: number }> = {};
  for (const t of tasks) {
    if (!byCategory[t.category]) byCategory[t.category] = { planned: 0, completed: 0, totalMinutes: 0 };
    byCategory[t.category].planned++;
    if (t.status === 'completed') {
      byCategory[t.category].completed++;
      byCategory[t.category].totalMinutes += t.duration;
    }
  }

  const byDate: Record<string, { planned: number; completed: number }> = {};
  for (const t of tasks) {
    if (!byDate[t.date]) byDate[t.date] = { planned: 0, completed: 0 };
    byDate[t.date].planned++;
    if (t.status === 'completed') byDate[t.date].completed++;
  }

  return { total, completed, skipped, completionRate, byCategory, byDate };
}

export async function getWeeklyProgress(req: AuthenticatedRequest, res: Response): Promise<void> {
  const from = getDateRange(7);
  const tasks = await Task.find({
    userId: req.userId,
    date: { $gte: from },
  });

  const stats = computeStats(tasks.map((t) => ({
    status: t.status,
    category: t.category,
    duration: t.duration,
    date: t.date,
  })));

  sendSuccess(res, { period: 'weekly', from, stats });
}

export async function getMonthlyProgress(req: AuthenticatedRequest, res: Response): Promise<void> {
  const from = getDateRange(30);
  const tasks = await Task.find({
    userId: req.userId,
    date: { $gte: from },
  });

  const stats = computeStats(tasks.map((t) => ({
    status: t.status,
    category: t.category,
    duration: t.duration,
    date: t.date,
  })));

  sendSuccess(res, { period: 'monthly', from, stats });
}
