import { Response } from 'express';
import { Routine } from '../../models/Routine';
import { sendSuccess, sendError } from '../../utils/response';
import { AuthenticatedRequest } from '../../types';

export async function listRoutines(req: AuthenticatedRequest, res: Response): Promise<void> {
  const routines = await Routine.find({ userId: req.userId }).sort({ createdAt: -1 });
  sendSuccess(res, routines);
}

export async function createRoutine(req: AuthenticatedRequest, res: Response): Promise<void> {
  const routine = await Routine.create({ ...req.body, userId: req.userId });
  sendSuccess(res, routine, 201, 'Routine created');
}

export async function updateRoutine(req: AuthenticatedRequest, res: Response): Promise<void> {
  const update: Record<string, unknown> = { ...req.body };
  if (update.anchor === null) {
    delete update.anchor;
    update.$unset = { anchor: 1 };
  }
  const routine = await Routine.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    update,
    { new: true }
  );
  if (!routine) { sendError(res, 'Routine not found', 404); return; }
  sendSuccess(res, routine);
}

export async function deleteRoutine(req: AuthenticatedRequest, res: Response): Promise<void> {
  const routine = await Routine.findOneAndDelete({ _id: req.params.id, userId: req.userId });
  if (!routine) { sendError(res, 'Routine not found', 404); return; }
  sendSuccess(res, null, 200, 'Routine deleted');
}

export async function skipRoutineToday(req: AuthenticatedRequest, res: Response): Promise<void> {
  // Skip is a task-level operation; routines themselves don't store skip state
  // This just confirms the routine exists
  const routine = await Routine.findOne({ _id: req.params.id, userId: req.userId });
  if (!routine) { sendError(res, 'Routine not found', 404); return; }
  sendSuccess(res, { skippedToday: true, routineId: routine.id });
}

export async function pauseRoutine(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { pauseUntil } = req.body as { pauseUntil?: string };
  const update: Record<string, unknown> = { enabled: false };
  if (pauseUntil) update.pausedUntil = new Date(pauseUntil);

  const routine = await Routine.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    update,
    { new: true }
  );
  if (!routine) { sendError(res, 'Routine not found', 404); return; }
  sendSuccess(res, routine, 200, 'Routine paused');
}
