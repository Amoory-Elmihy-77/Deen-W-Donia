import { Response } from 'express';
import { Task } from '../../models/Task';
import { Goal } from '../../models/Goal';
import { sendSuccess, sendError } from '../../utils/response';
import { AuthenticatedRequest } from '../../types';

function getTodayString(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function getTodayTasks(req: AuthenticatedRequest, res: Response): Promise<void> {
  const date = (req.query.date as string) || getTodayString();
  const tasks = await Task.find({ userId: req.userId, date }).sort({ scheduledStart: 1 });
  sendSuccess(res, tasks);
}

export async function createDailyTask(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { title, date, duration, category, start, goalId, goalProgressDelta } = req.body as { title: string; date: string; duration?: number; category?: string; start?: string; goalId?: string; goalProgressDelta?: number };
    const durationMinutes = duration ?? 0;
    if (!title?.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 1440) { sendError(res, 'Please provide a title, valid date, and duration between 1 and 1440 minutes.', 400, 'INVALID_DAILY_TASK'); return; }
    const scheduledStart = start ? new Date(`${date}T${start}:00`) : undefined;
    if (scheduledStart && Number.isNaN(scheduledStart.getTime())) { sendError(res, 'Invalid task start time.', 400, 'INVALID_TASK_TIME'); return; }
    const task = await Task.create({ userId: req.userId, title: title.trim(), date, duration: durationMinutes, category: category || 'personal', scheduledStart, scheduledEnd: scheduledStart ? new Date(scheduledStart.getTime() + durationMinutes * 60000) : undefined, goalId, goalProgressDelta: goalProgressDelta || 0, source: 'manual', status: 'pending', anchor: 'flexible' });
    sendSuccess(res, task, 201, 'Daily task added');
  } catch (err) { console.error('createDailyTask error:', err); sendError(res, 'Could not save the daily task.', 500, 'DAILY_TASK_SAVE_FAILED'); }
}

export async function updateTask(req: AuthenticatedRequest, res: Response): Promise<void> {
  const allowed = ['title', 'duration', 'scheduledStart', 'scheduledEnd', 'status', 'skipReason'];
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) update[key] = req.body[key];
  }
  const task = await Task.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    update,
    { new: true }
  );
  if (!task) { sendError(res, 'Task not found', 404); return; }
  sendSuccess(res, task);
}

export async function completeTask(req: AuthenticatedRequest, res: Response): Promise<void> {
  const task = await Task.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId, status: { $ne: 'completed' } },
    { status: 'completed', completedAt: new Date() },
    { new: true }
  );
  if (!task) {
    const existing = await Task.findOne({ _id: req.params.id, userId: req.userId });
    if (!existing) { sendError(res, 'Task not found', 404); return; }
    sendSuccess(res, existing, 200, 'Task already completed');
    return;
  }
  if (task.goalId) {
    const goal = await Goal.findOne({ _id: task.goalId, userId: req.userId, status: 'active' });
    if (goal) {
      goal.progress = Math.min(100, goal.progress + (task.goalProgressDelta ?? 0));
      if (goal.progress === 100) goal.status = 'completed';
      await goal.save();
    }
  }
  sendSuccess(res, task, 200, 'Task completed');
}

export async function skipTask(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { reason } = req.body as { reason?: string };
  const task = await Task.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    { status: 'skipped', skipReason: reason },
    { new: true }
  );
  if (!task) { sendError(res, 'Task not found', 404); return; }
  sendSuccess(res, task, 200, 'Task skipped');
}

export async function rescheduleTask(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { newStart, newEnd } = req.body as { newStart: string; newEnd?: string };
  const update: Record<string, unknown> = { status: 'rescheduled' };
  if (newStart) update.scheduledStart = new Date(newStart);
  if (newEnd) update.scheduledEnd = new Date(newEnd);

  const task = await Task.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    update,
    { new: true }
  );
  if (!task) { sendError(res, 'Task not found', 404); return; }
  sendSuccess(res, task, 200, 'Task rescheduled');
}
