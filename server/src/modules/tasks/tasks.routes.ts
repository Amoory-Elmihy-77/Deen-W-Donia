import { Router } from 'express';
import { authenticate } from '../../middlewares/auth';
import * as tasksController from './tasks.controller';

const router = Router();
router.use(authenticate);

router.get('/today', tasksController.getTodayTasks);
router.post('/daily', tasksController.createDailyTask);
router.patch('/:id', tasksController.updateTask);
router.delete('/:id', tasksController.deleteTask);
router.post('/:id/complete', tasksController.completeTask);
router.post('/:id/skip', tasksController.skipTask);
router.post('/:id/reschedule', tasksController.rescheduleTask);

export default router;
