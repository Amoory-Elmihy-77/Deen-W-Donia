import { z } from 'zod';

export const buildDaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  wakeTime: z.string().regex(/^\d{2}:\d{2}$/),
  sleepTime: z.string().regex(/^\d{2}:\d{2}$/).optional().default('23:00'),
  dayMode: z.enum(['normal', 'busy', 'study', 'deep_work', 'recovery']).optional().default('normal'),
  fixedEvents: z
    .array(
      z.object({
        title: z.string().max(200),
        start: z.string().regex(/^\d{2}:\d{2}$/),
        durationMinutes: z.number().int().min(1).max(720),
        category: z.string().optional(),
      })
    )
    .optional()
    .default([]),
  routineTasks: z.array(z.object({
    routineId: z.string(),
    title: z.string().trim().min(1).max(200),
    goalProgressDelta: z.number().min(0).max(100).default(0),
    anchor: z.enum(['after_fajr', 'after_dhuhr', 'before_asr', 'after_asr', 'after_maghrib', 'after_isha', 'before_sleep']),
  })).optional().default([]),
});

export const rescheduleSchema = z.object({
  delayMinutes: z.number().int().min(1).optional(),
  currentTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const rescueDaySchema = z.object({
  availableMinutes: z.number().int().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
