import { Response } from 'express';
import { Reminder } from '../../models/Reminder';
import { AuthenticatedRequest } from '../../types';
import { sendError, sendSuccess } from '../../utils/response';

export async function listReminders(req: AuthenticatedRequest, res: Response): Promise<void> {
  const reminders = await Reminder.find({ userId: req.userId, date: { $gte: (req.query.from as string) || new Date().toISOString().slice(0, 10) } }).sort({ date: 1, time: 1 });
  sendSuccess(res, reminders);
}
export async function createReminder(req: AuthenticatedRequest, res: Response): Promise<void> {
  const reminder = await Reminder.create({ ...req.body, userId: req.userId });
  sendSuccess(res, reminder, 201, 'Reminder saved');
}
export async function deleteReminder(req: AuthenticatedRequest, res: Response): Promise<void> {
  const reminder = await Reminder.findOneAndDelete({ _id: req.params.id, userId: req.userId });
  if (!reminder) { sendError(res, 'Reminder not found', 404); return; }
  sendSuccess(res, null, 200, 'Reminder deleted');
}
