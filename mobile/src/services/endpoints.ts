import api from '../services/api';

// ─── Auth ───────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data: { name: string; email: string; password: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  refresh: (refreshToken: string) =>
    api.post('/auth/refresh', { refreshToken }),
  logout: () => api.post('/auth/logout'),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data: { email: string; code: string; password: string }) => api.post('/auth/reset-password', data),
  changePassword: (data: { currentPassword: string; newPassword: string }) => api.post('/auth/change-password', data),
};

// ─── User / Settings ─────────────────────────────────────────────────────────
export const userApi = {
  getMe: () => api.get('/me'),
  updateMe: (data: object) => api.patch('/me', data),
  getSettings: () => api.get('/me/settings'),
  updateSettings: (data: object) => api.patch('/me/settings', data),
  saveAiKey: (key: string) => api.post('/me/ai-key', { key }),
  testAiKey: () => api.post('/me/ai-key/test'),
  deleteAiKey: () => api.delete('/me/ai-key'),
};

// ─── Goals ───────────────────────────────────────────────────────────────────
export const goalsApi = {
  list: (params?: { status?: string; category?: string }) =>
    api.get('/goals', { params }),
  get: (id: string) => api.get(`/goals/${id}`),
  create: (data: object) => api.post('/goals', data),
  update: (id: string, data: object) => api.patch(`/goals/${id}`, data),
  delete: (id: string) => api.delete(`/goals/${id}`),
};

// ─── Routines ────────────────────────────────────────────────────────────────
export const routinesApi = {
  list: () => api.get('/routines'),
  create: (data: object) => api.post('/routines', data),
  update: (id: string, data: object) => api.patch(`/routines/${id}`, data),
  delete: (id: string) => api.delete(`/routines/${id}`),
  skip: (id: string) => api.post(`/routines/${id}/skip`),
  pause: (id: string, pauseUntil?: string) =>
    api.post(`/routines/${id}/pause`, { pauseUntil }),
};

// ─── Tasks ───────────────────────────────────────────────────────────────────
export const tasksApi = {
  getToday: (date?: string) => api.get('/tasks/today', { params: { date } }),
  createDaily: (data: { title: string; date: string; duration?: number; category?: string; start?: string; anchor?: string; goalId?: string; goalProgressDelta?: number }) => api.post('/tasks/daily', data),
  update: (id: string, data: object) => api.patch(`/tasks/${id}`, data),
  complete: (id: string) => api.post(`/tasks/${id}/complete`),
  skip: (id: string, reason?: string) =>
    api.post(`/tasks/${id}/skip`, { reason }),
  reschedule: (id: string, newStart: string, newEnd?: string) =>
    api.post(`/tasks/${id}/reschedule`, { newStart, newEnd }),
};

// ─── Planner ─────────────────────────────────────────────────────────────────
export const plannerApi = {
  buildDay: (data: {
    wakeTime: string;
    sleepTime?: string;
    dayMode?: string;
    fixedEvents?: Array<{ title: string; start: string; durationMinutes: number }>;
    routineTasks?: Array<{ routineId: string; title: string; goalProgressDelta: number; anchor: string }>;
    date?: string;
  }) => api.post('/planner/build-day', data),
  reschedule: (data: { delayMinutes?: number; currentTime?: string; date?: string }) =>
    api.post('/planner/reschedule', data),
  rescueDay: (data: { availableMinutes: number; date?: string }) =>
    api.post('/planner/rescue-day', data),
};

// ─── AI ──────────────────────────────────────────────────────────────────────
export const aiApi = {
  smartAdd: (text: string) => api.post('/ai/smart-add', { text }),
  decomposeGoal: (data: { goalTitle: string; goalDescription?: string; goalId?: string }) =>
    api.post('/ai/decompose-goal', data),
  analyzeWeek: () => api.post('/ai/analyze-week', {}),
  suggestFreeTime: (availableMinutes: number) =>
    api.post('/ai/suggest-free-time', { availableMinutes }),
};

// ─── Progress ────────────────────────────────────────────────────────────────
export const progressApi = {
  weekly: () => api.get('/progress/weekly'),
  monthly: () => api.get('/progress/monthly'),
  history: () => api.get('/progress/history'),
};

export const remindersApi = {
  list: () => api.get('/reminders'),
  create: (data: { title: string; date: string; time?: string; duration?: number; category?: string; notes?: string }) => api.post('/reminders', data),
  delete: (id: string) => api.delete(`/reminders/${id}`),
};
