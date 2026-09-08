/**
 * The Deterministic Planning Engine
 * Implements the 15-step algorithm from the product spec.
 * No AI involved — pure business logic.
 */

import { IRoutine } from '../../models/Routine';
import { PrayerTimesResult, anchorToTimestamp } from './prayer.service';

export type DayMode = 'normal' | 'busy' | 'study' | 'deep_work' | 'recovery';

export interface FixedEvent {
  title: string;
  start: string; // "HH:mm"
  durationMinutes: number;
  category?: string;
}

export interface PlannedTask {
  routineId?: string;
  goalId?: string;
  goalProgressDelta?: number;
  title: string;
  category: string;
  duration: number;
  scheduledStart: Date;
  scheduledEnd: Date;
  anchor?: string;
  source: 'routine' | 'manual' | 'ai_smart_add' | 'fixed_event';
  priority: string;
}

export interface PlannerConflict {
  taskTitle: string;
  reason: string;
  suggestion?: string;
}

export interface BuildDayInput {
  date: Date;
  wakeTime: string;    // "HH:mm"
  sleepTime: string;   // "HH:mm"
  dayMode: DayMode;
  prayerTimes: PrayerTimesResult;
  routines: IRoutine[];
  fixedEvents: FixedEvent[];
  routineTaskDetails: Record<string, { title: string; goalProgressDelta: number; startTime: string }>;
}

export interface BuildDayOutput {
  tasks: PlannedTask[];
  conflicts: PlannerConflict[];
  availableMinutes: number;
}

// Day mode compression multipliers for each activity priority
const DAY_MODE_COMPRESSION: Record<DayMode, Record<string, number>> = {
  normal: { critical: 1.0, high: 1.0, medium: 1.0, low: 1.0 },
  busy: { critical: 1.0, high: 0.75, medium: 0.5, low: 0.25 },
  study: { critical: 1.0, high: 1.0, medium: 0.75, low: 0.5 },
  deep_work: { critical: 1.0, high: 0.9, medium: 0.75, low: 0.5 },
  recovery: { critical: 0.75, high: 0.5, medium: 0.25, low: 0 },
};

function parseHHMM(hhMm: string, baseDate: Date): Date {
  const [h, m] = hhMm.split(':').map(Number);
  const d = new Date(baseDate);
  d.setHours(h, m, 0, 0);
  return d;
}

function minutesToMs(m: number): number {
  return m * 60 * 1000;
}

function getDayOfWeek(date: Date): number {
  return date.getDay(); // 0 = Sunday
}

function isRoutineActiveOnDay(routine: IRoutine, date: Date): boolean {
  const dow = getDayOfWeek(date);
  if (routine.frequency === 'daily') return true;
  return routine.activeDays.includes(dow);
}

function applyCompression(duration: number, minDuration: number, priority: string, dayMode: DayMode): number {
  const multiplier = DAY_MODE_COMPRESSION[dayMode][priority] ?? 1.0;
  const compressed = Math.round(duration * multiplier);
  return Math.max(compressed, minDuration);
}

function priorityScore(priority: string): number {
  const map: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
  return map[priority] ?? 1;
}

/**
 * Main 15-step planning algorithm
 */
export function buildDayPlan(input: BuildDayInput): BuildDayOutput {
  const { date, wakeTime, sleepTime, dayMode, prayerTimes, routines, fixedEvents, routineTaskDetails } = input;

  const wake = parseHHMM(wakeTime, date);
  const sleep = parseHHMM(sleepTime, date);
  if (sleep <= wake) sleep.setDate(sleep.getDate() + 1);

  const activeRoutines = routines.filter(
    (r) => r.enabled && isRoutineActiveOnDay(r, date)
  );

  const plannedTasks: PlannedTask[] = [];
  const conflicts: PlannerConflict[] = []; // No conflicts generated

  // Add fixed events
  for (const event of fixedEvents) {
    const start = parseHHMM(event.start, date);
    const end = new Date(start.getTime() + minutesToMs(event.durationMinutes));
    plannedTasks.push({
      title: event.title,
      category: event.category || 'other',
      duration: event.durationMinutes,
      scheduledStart: start,
      scheduledEnd: end,
      source: 'fixed_event',
      priority: 'critical',
    });
  }

  // Sequence all active routines simply starting from wakeTime + 30m
  let cursor = new Date(wake.getTime() + 30 * 60 * 1000);

  for (const routine of activeRoutines) {
    const details = routineTaskDetails[routine._id.toString()] || {};
    const effectiveDuration = applyCompression(routine.duration, routine.minimumDuration, routine.priority, dayMode);
    
    // Check if recovery mode skips this
    if (dayMode === 'recovery' && routine.priority === 'low') continue;

    const start = new Date(cursor);
    const end = new Date(start.getTime() + minutesToMs(effectiveDuration));

    plannedTasks.push({
      routineId: (routine._id as unknown as string)?.toString(),
      goalId: routine.goalId?.toString(),
      goalProgressDelta: details.goalProgressDelta ?? routine.goalProgressContribution,
      title: details.title || routine.title,
      category: routine.category,
      duration: effectiveDuration,
      scheduledStart: start,
      scheduledEnd: end,
      anchor: getAnchorLabel(start, prayerTimes, wake),
      source: 'routine',
      priority: routine.priority,
    });

    cursor = new Date(end.getTime() + 5 * 60 * 1000); // 5 minute transition buffer
  }

  // Sort by scheduled start just in case fixed events are placed differently
  plannedTasks.sort((a, b) => a.scheduledStart.getTime() - b.scheduledStart.getTime());

  // Calculate available minutes based on standard day length vs used
  const totalMinutes = (sleep.getTime() - wake.getTime()) / 60000;
  const usedMinutes = plannedTasks.reduce((sum, t) => sum + t.duration, 0);
  const availableMinutes = Math.max(0, totalMinutes - usedMinutes);

  return { tasks: plannedTasks, conflicts, availableMinutes };
}

function getAnchorLabel(time: Date, prayerTimes: PrayerTimesResult, wakeTime: Date): string {
  const t = time.getTime();
  const fajr = prayerTimes.fajr.getTime();
  const dhuhr = prayerTimes.dhuhr.getTime();
  const asr = prayerTimes.asr.getTime();
  const maghrib = prayerTimes.maghrib.getTime();
  const isha = prayerTimes.isha.getTime();

  if (t < fajr) return 'before_fajr';
  if (t < dhuhr) return t < fajr + 90 * 60000 ? 'after_fajr' : 'morning';
  if (t < asr) return t < dhuhr + 90 * 60000 ? 'after_dhuhr' : 'afternoon';
  if (t < maghrib) return t < asr + 90 * 60000 ? 'after_asr' : 'late_afternoon';
  if (t < isha) return 'after_maghrib';
  return 'after_isha';
}

/**
 * Rescue Day algorithm — deterministic fallback (no AI required)
 * Given available minutes, greedily picks highest priority incomplete tasks
 */
export function rescueDayPlan(
  availableMinutes: number,
  incompleteTasks: Array<{ id: string; title: string; category: string; duration: number; priority: string }>
): Array<{ id: string; title: string; category: string; duration: number }> {
  const sorted = [...incompleteTasks].sort((a, b) => priorityScore(b.priority) - priorityScore(a.priority));
  const selected: typeof incompleteTasks = [];
  let remaining = availableMinutes;

  for (const task of sorted) {
    if (task.duration <= remaining) {
      selected.push(task);
      remaining -= task.duration;
    }
    if (remaining <= 0) break;
  }

  return selected;
}
