import { Response } from 'express';
import { Routine } from '../../models/Routine';
import { Task } from '../../models/Task';
import { DailyPlan } from '../../models/DailyPlan';
import { UserSettings } from '../../models/UserSettings';
import { Reminder } from '../../models/Reminder';
import { calculatePrayerTimes } from './prayer.service';
import { buildDayPlan, rescueDayPlan } from './planner.engine';
import { sendSuccess, sendError } from '../../utils/response';
import { AuthenticatedRequest } from '../../types';

function getTodayString(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function buildDay(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { wakeTime, sleepTime, dayMode, fixedEvents, routineTasks } = req.body;
    const dateStr = req.body.date || getTodayString();
    const date = new Date(dateStr);

    // Load user settings for prayer times
    const settings = await UserSettings.findOne({ userId: req.userId });
    const prayerSettings = settings?.prayerSettings || {
      latitude: 30.0444,
      longitude: 31.2357,
      calculationMethod: 'Egypt',
    };

    const prayerTimes = calculatePrayerTimes(
      prayerSettings.latitude,
      prayerSettings.longitude,
      date,
      prayerSettings.calculationMethod
    );

    // Load active routines
    const routines = await Routine.find({
      userId: req.userId,
      enabled: true,
    });

    // Run planning engine
    const { tasks, conflicts, availableMinutes } = buildDayPlan({
      date,
      wakeTime,
      sleepTime: sleepTime || '23:00',
      dayMode: dayMode || 'normal',
      prayerTimes,
      routines,
      fixedEvents: fixedEvents || [],
      routineTaskDetails: Object.fromEntries((routineTasks || []).map((task: { routineId: string; title: string; goalProgressDelta: number; anchor: string }) => [task.routineId, task])),
    });

    // Delete existing tasks for this day to avoid duplicates
    await Task.deleteMany({ userId: req.userId, date: dateStr, source: { $in: ['routine', 'fixed_event', 'reminder'] } });

    const reminders = await Reminder.find({ userId: req.userId, date: dateStr });
    const reminderTasks = reminders.map((reminder) => {
      const scheduledStart = reminder.time ? new Date(`${dateStr}T${reminder.time}:00`) : undefined;
      return { userId: req.userId, date: dateStr, title: reminder.title, category: reminder.category, duration: reminder.duration, scheduledStart, scheduledEnd: scheduledStart ? new Date(scheduledStart.getTime() + reminder.duration * 60000) : undefined, anchor: 'reminder', source: 'reminder', status: 'pending' };
    });

    // Create task documents
    const taskDocs = await Task.insertMany(
      [...tasks.map((t) => ({
        userId: req.userId,
        routineId: t.routineId,
        goalId: t.goalId,
        goalProgressDelta: t.goalProgressDelta ?? 0,
        date: dateStr,
        title: t.title,
        category: t.category,
        duration: t.duration,
        scheduledStart: t.scheduledStart,
        scheduledEnd: t.scheduledEnd,
        anchor: t.anchor,
        source: t.source,
        status: 'pending',
        priority: t.priority,
      })), ...reminderTasks]
    );

    // Persist DailyPlan (upsert)
    const dailyPlan = await DailyPlan.findOneAndUpdate(
      { userId: req.userId, date: dateStr },
      {
        wakeTime,
        sleepTime: sleepTime || '23:00',
        dayMode: dayMode || 'normal',
        prayerTimes,
        availableMinutes,
        generatedTaskIds: taskDocs.map((t) => t._id),
        conflicts,
        planningVersion: 1,
        generatedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    sendSuccess(res, {
      plan: dailyPlan,
      tasks: taskDocs,
      prayerTimes,
      conflicts,
    }, 200, 'Day planned successfully');
  } catch (err) {
    console.error('buildDay error:', err);
    sendError(res, 'Failed to build day plan', 500);
  }
}

export async function reschedule(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const dateStr = req.body.date || getTodayString();
    const { delayMinutes, currentTime } = req.body;

    // Get incomplete tasks for today
    const incompleteTasks = await Task.find({
      userId: req.userId,
      date: dateStr,
      status: { $in: ['pending', 'in_progress'] },
    }).sort({ scheduledStart: 1 });

    const now = currentTime
      ? (() => {
          const [h, m] = currentTime.split(':').map(Number);
          const d = new Date();
          d.setHours(h, m, 0, 0);
          return d;
        })()
      : new Date();

    const delay = delayMinutes || 0;

    // Shift all remaining tasks by the delay
    const updates = incompleteTasks.map((task) => {
      const newStart = task.scheduledStart
        ? new Date(task.scheduledStart.getTime() + delay * 60000)
        : new Date(now.getTime() + 5 * 60000);
      const newEnd = new Date(newStart.getTime() + task.duration * 60000);

      return Task.findByIdAndUpdate(task._id, {
        scheduledStart: newStart,
        scheduledEnd: newEnd,
        status: 'rescheduled',
      }, { new: true });
    });

    const updatedTasks = await Promise.all(updates);

    sendSuccess(res, { tasks: updatedTasks }, 200, 'Day rescheduled');
  } catch (err) {
    console.error('reschedule error:', err);
    sendError(res, 'Reschedule failed', 500);
  }
}

export async function rescueDay(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const dateStr = req.body.date || getTodayString();
    const { availableMinutes } = req.body;

    // Get pending tasks for today
    const pendingTasks = await Task.find({
      userId: req.userId,
      date: dateStr,
      status: 'pending',
    });

    const candidates = pendingTasks.map((t) => ({
      id: t.id,
      title: t.title,
      category: t.category,
      duration: t.duration,
      priority: (t.metadata?.priority as string) || 'medium',
    }));

    const selected = rescueDayPlan(availableMinutes, candidates);

    sendSuccess(res, {
      suggested: selected,
      availableMinutes,
      message: selected.length === 0
        ? 'Not enough time for any pending tasks'
        : `Found ${selected.length} tasks that fit in ${availableMinutes} minutes`,
    });
  } catch (err) {
    console.error('rescueDay error:', err);
    sendError(res, 'Rescue day failed', 500);
  }
}
