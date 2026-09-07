import { Router } from 'express';
import { authenticate } from '../../middlewares/auth';
import * as userController from './user.controller';

const router = Router();
router.use(authenticate);

router.get('/', userController.getMe);
router.patch('/', userController.updateMe);
router.get('/settings', userController.getSettings);
router.patch('/settings', userController.updateSettings);
router.post('/ai-key', userController.saveAiKey);
router.post('/ai-key/test', userController.testAiKey);
router.delete('/ai-key', userController.deleteAiKey);

export default router;
