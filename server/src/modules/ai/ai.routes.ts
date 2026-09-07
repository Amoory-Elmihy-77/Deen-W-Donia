import { Router } from 'express';
import { authenticate } from '../../middlewares/auth';
import rateLimit from 'express-rate-limit';
import * as aiController from './ai.controller';

const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // max 10 AI requests per minute per IP
  message: { success: false, message: 'Too many AI requests, please slow down', code: 'RATE_LIMITED' },
});

const router = Router();
router.use(authenticate);
router.use(aiLimiter);

router.post('/smart-add', aiController.smartAdd);
router.post('/decompose-goal', aiController.decomposeGoal);
router.post('/analyze-week', aiController.analyzeWeek);
router.post('/suggest-free-time', aiController.suggestFreeTime);

export default router;
