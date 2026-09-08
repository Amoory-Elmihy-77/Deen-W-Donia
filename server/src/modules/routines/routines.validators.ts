import { z } from 'zod';

const anchorEnum = z.enum([
  'after_fajr', 'after_dhuhr', 'before_asr', 'after_asr',
  'after_maghrib', 'after_isha', 'before_sleep',
]);

export const createRoutineSchema = z.object({
  title: z.string().min(1).max(200),
  category: z.string().min(1).default('dunya'),
  goalId: z.string().optional(),
  goalProgressContribution: z.number().min(0).max(100).default(0),
  duration: z.number().int().min(1).max(720),
  minimumDuration: z.number().int().min(1).optional(),
  frequency: z.enum(['daily', 'weekly', 'custom']).default('daily'),
  activeDays: z.array(z.number().int().min(0).max(6)).default([0, 1, 2, 3, 4, 5, 6]),
  schedulingType: z.enum(['fixed', 'flexible', 'prayer_anchor', 'relative']).default('flexible'),
  anchor: anchorEnum.nullable().optional(),
  relativeRule: z.object({
    base: z.enum(['wake', 'sleep', 'work']),
    offsetMinutes: z.number().int(),
  }).optional(),
  preferredTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  priority: z.enum(['critical', 'high', 'medium', 'low']).default('medium'),
  enabled: z.boolean().default(true),
});

export const updateRoutineSchema = createRoutineSchema.partial();
