import { Router } from 'express';
import { validate } from '../../middlewares/validate';
import { registerSchema, loginSchema, refreshSchema, forgotPasswordSchema, resetPasswordSchema, changePasswordSchema } from './auth.validators';
import * as authController from './auth.controller';
import { authenticate } from '../../middlewares/auth';

const router = Router();

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/refresh', validate(refreshSchema), authController.refresh);
router.post('/logout', authController.logout);
router.post('/forgot-password', validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);
router.post('/change-password', authenticate, validate(changePasswordSchema), authController.changePassword);

export default router;
