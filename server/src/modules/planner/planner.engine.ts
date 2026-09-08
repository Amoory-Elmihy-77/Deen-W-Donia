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
  routineTaskDetails: Record<string, { title: string; goalProgressDelta: number; anchor: string }>;
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

  // Step 1-2: Parse wake and sleep times
  const wake = parseHHMM(wakeTime, date);
  const sleep = parseHHMM(sleepTime, date);
  // Handle past-midnight sleep
  if (sleep <= wake) sleep.setDate(sleep.getDate() + 1);

  // Step 3: Prayer times already computed (passed as input)

  // Step 4: Filter active routines for today
  const activeRoutines = routines.filter(
    (r) => r.enabled && isRoutineActiveOnDay(r, date)
  );

  // Step 5: Fixed events from input (already parsed)

  // Step 6-7: Convert prayer anchors to timestamps for each prayer-anchored routine
  // Build a time-slot availability map
  const totalMinutes = (sleep.getTime() - wake.getTime()) / 60000;

  // Step 8: Reserve fixed event blocks
  const reservedSlots: Array<{ start: Date; end: Date; title: string; category: string; source: 'fixed_event' | 'routine' }> = [];

  for (const event of fixedEvents) {
    const start = parseHHMM(event.start, date);
    const end = new Date(start.getTime() + minutesToMs(event.durationMinutes));
    // Events are commitments, not optional planner suggestions. Keep them visible
    // even when their time falls outside the selected wake/sleep window.
    reservedSlots.push({ start, end, title: event.title, category: event.category || 'other', source: 'fixed_event' });
  }

  // Step 9: Reserve prayer anchor windows (30 min around each prayer)
  const PRAYER_BUFFER_MS = 15 * 60 * 1000; // 15 min buffer
  const prayers = [
    { name: 'Fajr', time: prayerTimes.fajr },
    { name: 'Dhuhr', time: prayerTimes.dhuhr },
    { name: 'Asr', time: prayerTimes.asr },
    { name: 'Maghrib', time: prayerTimes.maghrib },
    { name: 'Isha', time: prayerTimes.isha },
  ];

  // Step 10: Sort routines by priority weighting
  const sortedRoutines = [...activeRoutines].sort((a, b) => {
    const aScore = priorityScore(a.priority);
    const bScore = priorityScore(b.priority);
    if (bScore !== aScore) return bScore - aScore;
    // Prayer-anchored routines first
    if (a.schedulingType === 'prayer_anchor' && b.schedulingType !== 'prayer_anchor') return -1;
    if (b.schedulingType === 'prayer_anchor' && a.schedulingType !== 'prayer_anchor') return 1;
    return 0;
  });

  // Step 11: Greedily fit tasks into available slots
  const plannedTasks: PlannedTask[] = [];
  const conflicts: PlannerConflict[] = [];

  // The user chooses a prayer window for each routine while starting the day.
  // These are placed first and are never silently shifted by the planner.
  for (const routine of sortedRoutines) {
    const details = routineTaskDetails[routine._id.toString()];
    if (!details?.anchor) continue;
    const effectiveDuration = applyCompression(routine.duration, routine.minimumDuration, routine.priority, dayMode);
    if (dayMode === 'recovery' && routine.priority === 'low') continue;
    const start = anchorToTimestamp(details.anchor, prayerTimes, wake, sleep);
    const end = new Date(start.getTime() + minutesToMs(effectiveDuration));
    const hasConflict = start < wake || end > sleep || plannedTasks.some((task) => start < task.scheduledEnd && end > task.scheduledStart) || reservedSlots.some((slot) => start < slot.end && end > slot.start);
    if (hasConflict) {
      conflicts.push({ taskTitle: details.title || routine.title, reason: 'The selected prayer window conflicts with another event or is outside your day', suggestion: 'Choose another prayer window for this routine.' });
      continue;
    }
    plannedTasks.push({ routineId: routine._id.toString(), goalId: routine.goalId?.toString(), goalProgressDelta: details.goalProgressDelta ?? routine.goalProgressContribution, title: details.title || routine.title, category: routine.category, duration: effectiveDuration, scheduledStart: start, scheduledEnd: end, anchor: details.anchor, source: 'routine', priority: routine.priority });
  }

  // First, place prayer-anchored tasks
  for (const routine of sortedRoutines) {
    if (routineTaskDetails[routine._id.toString()]?.anchor) continue;
    if (routine.schedulingType !== 'prayer_anchor' || !routine.anchor) continue;

    const anchorTime = anchorToTimestamp(routine.anchor, prayerTimes, wake, sleep);
    const effectiveDuration = applyCompression(
      routine.duration,
      routine.minimumDuration,
      routine.priority,
      dayMode
    );

    // Step 13: Skip low priority tasks in recovery mode
    if (dayMode === 'recovery' && routine.priority === 'low') continue;

    const start = anchorTime;
    const end = new Date(start.getTime() + minutesToMs(effectiveDuration));

    // Check for conflicts with already placed tasks
    const hasConflict = plannedTasks.some(
      (t) => start < t.scheduledEnd && end > t.scheduledStart
    ) || reservedSlots.some(
      (s) => start < s.end && end > s.start
    );

    if (hasConflict) {
      // Try to find next available slot after anchor
      const shifted = findNextSlot(start, effectiveDuration, plannedTasks, reservedSlots, sleep);
      if (shifted) {
        plannedTasks.push({
          routineId: routine._id?.toString(),
          goalId: routine.goalId?.toString(),
          goalProgressDelta: routineTaskDetails[routine._id.toString()]?.goalProgressDelta ?? routine.goalProgressContribution,
          title: routineTaskDetails[routine._id.toString()]?.title || routine.title,
          category: routine.category,
          duration: effectiveDuration,
          scheduledStart: shifted.start,
          scheduledEnd: shifted.end,
          anchor: routine.anchor,
          source: 'routine',
          priority: routine.priority,
        });
      } else {
        // Step 12: Conflict detected — collect it
        conflicts.push({
          taskTitle: routine.title,
          reason: 'Not enough time in this slot',
          suggestion: 'Consider reducing duration or moving to another time',
        });
      }
    } else {
      plannedTasks.push({
        routineId: (routine._id as unknown as string)?.toString(),
        goalId: routine.goalId?.toString(),
        goalProgressDelta: routineTaskDetails[routine._id.toString()]?.goalProgressDelta ?? routine.goalProgressContribution,
        title: routineTaskDetails[routine._id.toString()]?.title || routine.title,
        category: routine.category,
        duration: effectiveDuration,
        scheduledStart: start,
        scheduledEnd: end,
        anchor: routine.anchor,
        source: 'routine',
        priority: routine.priority,
      });
    }
  }

  // Then, place flexible and relative tasks
  let cursor = new Date(wake.getTime() + 30 * 60 * 1000); // Start 30 min after wake

  for (const routine of sortedRoutines) {
    if (routineTaskDetails[routine._id.toString()]?.anchor) continue;
    if (routine.schedulingType === 'prayer_anchor') continue;

    const effectiveDuration = applyCompression(
      routine.duration,
      routine.minimumDuration,
      routine.priority,
      dayMode
    );

    if (dayMode === 'recovery' && routine.priority === 'low') continue;

    let start: Date | null = null;

    if (routine.schedulingType === 'fixed' && routine.preferredTime) {
      start = parseHHMM(routine.preferredTime, date);
    } else if (routine.schedulingType === 'relative' && routine.relativeRule) {
      const base = routine.relativeRule.base === 'wake' ? wake : sleep;
      start = new Date(base.getTime() + minutesToMs(routine.relativeRule.offsetMinutes));
    } else {
      // Flexible: find next free slot from cursor
      start = cursor;
    }

    if (!start) { start = cursor; }

    const slot = findNextSlot(start, effectiveDuration, plannedTasks, reservedSlots, sleep);
    if (slot) {
      plannedTasks.push({
        routineId: routine._id?.toString(),
        goalId: routine.goalId?.toString(),
        goalProgressDelta: routineTaskDetails[routine._id.toString()]?.goalProgressDelta ?? routine.goalProgressContribution,
        title: routineTaskDetails[routine._id.toString()]?.title || routine.title,
        category: routine.category,
        duration: effectiveDuration,
        scheduledStart: slot.start,
        scheduledEnd: slot.end,
        anchor: getAnchorLabel(slot.start, prayerTimes, wake),
        source: 'routine',
        priority: routine.priority,
      });
      cursor = new Date(slot.end.getTime() + 10 * 60 * 1000); // 10 min break
    } else {
      conflicts.push({
        taskTitle: routine.title,
        reason: 'No available time slot for this routine today',
        suggestion: 'Consider a Busy Day mode or skip this routine',
      });
    }
  }

  // Add fixed events to planned tasks
  for (const slot of reservedSlots) {
    plannedTasks.push({
      title: slot.title,
      category: slot.category,
      duration: (slot.end.getTime() - slot.start.getTime()) / 60000,
      scheduledStart: slot.start,
      scheduledEnd: slot.end,
      source: slot.source,
      priority: 'critical',
    });
  }

  // Step 14: Sort by scheduled start
  plannedTasks.sort((a, b) => a.scheduledStart.getTime() - b.scheduledStart.getTime());

  // Calculate available minutes
  const usedMinutes = plannedTasks.reduce((sum, t) => sum + t.duration, 0);
  const availableMinutes = Math.max(0, totalMinutes - usedMinutes);

  return { tasks: plannedTasks, conflicts, availableMinutes };
}

function findNextSlot(
  preferredStart: Date,
  durationMinutes: number,
  existing: PlannedTask[],
  reserved: Array<{ start: Date; end: Date }>,
  sleepTime: Date
): { start: Date; end: Date } | null {
  let start = new Date(preferredStart);
  const all = [
    ...existing.map((t) => ({ start: t.scheduledStart, end: t.scheduledEnd })),
    ...reserved,
  ].sort((a, b) => a.start.getTime() - b.start.getTime());

  for (let attempt = 0; attempt < 20; attempt++) {
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
    if (end > sleepTime) return null;

    const overlapping = all.find((slot) => start < slot.end && end > slot.start);
    if (!overlapping) {
      return { start, end };
    }
    // Move start to after the conflicting slot
    start = new Date(overlapping.end.getTime() + 5 * 60 * 1000);
  }
  return null;
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
