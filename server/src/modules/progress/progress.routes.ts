import { Router } from 'express';
import { authenticate } from '../../middlewares/auth';
import * as progressController from './progress.controller';

const router = Router();
router.use(authenticate);

router.get('/weekly', progressController.getWeeklyProgress);
router.get('/monthly', progressController.getMonthlyProgress);
router.get('/history', progressController.getHistory);

export default router;
