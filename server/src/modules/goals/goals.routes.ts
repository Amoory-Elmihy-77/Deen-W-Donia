import { Router } from 'express';
import { authenticate } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import { createGoalSchema, updateGoalSchema } from './goals.validators';
import * as goalsController from './goals.controller';

const router = Router();
router.use(authenticate);

router.get('/', goalsController.listGoals);
router.post('/', validate(createGoalSchema), goalsController.createGoal);
router.get('/:id', goalsController.getGoal);
router.patch('/:id', validate(updateGoalSchema), goalsController.updateGoal);
router.delete('/:id', goalsController.deleteGoal);

export default router;
