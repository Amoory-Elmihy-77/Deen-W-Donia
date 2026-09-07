import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';

import authRoutes from './modules/auth/auth.routes';
import userRoutes from './modules/user/user.routes';
import goalsRoutes from './modules/goals/goals.routes';
import routinesRoutes from './modules/routines/routines.routes';
import tasksRoutes from './modules/tasks/tasks.routes';
import plannerRoutes from './modules/planner/planner.routes';
import aiRoutes from './modules/ai/ai.routes';
import progressRoutes from './modules/progress/progress.routes';
import remindersRoutes from './modules/reminders/reminders.routes';

const app = express();

// Security
app.use(helmet());
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:8081', 'exp://'],
    credentials: true,
  })
);

// Global rate limit
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500,
    message: { success: false, message: 'Too many requests', code: 'RATE_LIMITED' },
  })
);

// Stricter limit on auth routes
app.use(
  '/api/v1/auth',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { success: false, message: 'Too many auth attempts', code: 'RATE_LIMITED' },
  })
);

// Body parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false }));

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/me', userRoutes);
app.use('/api/v1/goals', goalsRoutes);
app.use('/api/v1/routines', routinesRoutes);
app.use('/api/v1/tasks', tasksRoutes);
app.use('/api/v1/planner', plannerRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/progress', progressRoutes);
app.use('/api/v1/reminders', remindersRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found', code: 'NOT_FOUND' });
});

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Internal server error', code: 'INTERNAL_ERROR' });
});

export default app;
