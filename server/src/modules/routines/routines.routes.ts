import { Router } from 'express';
import { authenticate } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import { createRoutineSchema, updateRoutineSchema } from './routines.validators';
import * as routinesController from './routines.controller';

const router = Router();
router.use(authenticate);

router.get('/', routinesController.listRoutines);
router.post('/', validate(createRoutineSchema), routinesController.createRoutine);
router.patch('/:id', validate(updateRoutineSchema), routinesController.updateRoutine);
router.delete('/:id', routinesController.deleteRoutine);
router.post('/:id/skip', routinesController.skipRoutineToday);
router.post('/:id/pause', routinesController.pauseRoutine);

export default router;
