import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { sendError } from '../utils/response';

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const flat = result.error.flatten();
      const msgs = Object.entries(flat.fieldErrors)
        .map(([field, errs]) => `${field}: ${((errs as string[]) ?? []).join(', ')}`)
        .join('; ');
      sendError(res, `Validation error: ${msgs || 'Invalid input'}`, 400, 'VALIDATION_ERROR');
      return;
    }
    req.body = result.data;
    next();
  };
}
