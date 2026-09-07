import { z } from 'zod';

export const createGoalSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  category: z.string().min(1).default('dunya'),
  type: z.string().max(50).optional(),
  priority: z.enum(['critical', 'high', 'medium', 'low']).default('medium'),
  target: z.union([z.string(), z.number()]).optional(),
  deadline: z.string().datetime().optional(),
  milestones: z
    .array(z.object({ title: z.string().max(200), done: z.boolean().default(false), order: z.number().default(0) }))
    .optional()
    .default([]),
});

export const updateGoalSchema = createGoalSchema.partial().extend({
  status: z.enum(['active', 'paused', 'completed', 'archived']).optional(),
  progress: z.number().min(0).max(100).optional(),
});
