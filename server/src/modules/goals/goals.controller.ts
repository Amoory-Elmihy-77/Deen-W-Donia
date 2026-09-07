import { Response } from 'express';
import { Goal } from '../../models/Goal';
import { Routine } from '../../models/Routine';
import { Task } from '../../models/Task';
import { sendSuccess, sendError } from '../../utils/response';
import { AuthenticatedRequest } from '../../types';

export async function listGoals(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { status, category } = req.query;
  const filter: Record<string, unknown> = { userId: req.userId };
  if (status) filter.status = status;
  if (category) filter.category = category;

  const goals = await Goal.find(filter).sort({ createdAt: -1 });
  sendSuccess(res, goals);
}

export async function getGoal(req: AuthenticatedRequest, res: Response): Promise<void> {
  const goal = await Goal.findOne({ _id: req.params.id, userId: req.userId });
  if (!goal) { sendError(res, 'Goal not found', 404); return; }
  sendSuccess(res, goal);
}

export async function createGoal(req: AuthenticatedRequest, res: Response): Promise<void> {
  const goal = await Goal.create({ ...req.body, userId: req.userId });
  sendSuccess(res, goal, 201, 'Goal created');
}

export async function updateGoal(req: AuthenticatedRequest, res: Response): Promise<void> {
  const goal = await Goal.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    req.body,
    { new: true }
  );
  if (!goal) { sendError(res, 'Goal not found', 404); return; }
  sendSuccess(res, goal);
}

export async function deleteGoal(req: AuthenticatedRequest, res: Response): Promise<void> {
  const goal = await Goal.findOneAndDelete({ _id: req.params.id, userId: req.userId });
  if (!goal) { sendError(res, 'Goal not found', 404); return; }
  // Keep the user's routines and history, but detach the deleted goal cleanly.
  await Promise.all([
    Routine.updateMany({ userId: req.userId, goalId: goal._id }, { $unset: { goalId: 1 } }),
    Task.updateMany({ userId: req.userId, goalId: goal._id }, { $unset: { goalId: 1 } }),
  ]);
  sendSuccess(res, null, 200, 'Goal deleted');
}
