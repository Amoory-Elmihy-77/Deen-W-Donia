import { Router } from 'express';
import { authenticate } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import { buildDaySchema, rescheduleSchema, rescueDaySchema } from './planner.validators';
import * as plannerController from './planner.controller';

const router = Router();
router.use(authenticate);

router.post('/build-day', validate(buildDaySchema), plannerController.buildDay);
router.post('/reschedule', validate(rescheduleSchema), plannerController.reschedule);
router.post('/rescue-day', validate(rescueDaySchema), plannerController.rescueDay);

export default router;
