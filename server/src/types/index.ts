import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  userEmail?: string;
}

export type DayMode = 'normal' | 'busy' | 'study' | 'deep_work' | 'recovery';
export type DayStructure = 'prayer' | 'time' | 'hybrid';
export type Priority = 'critical' | 'high' | 'medium' | 'low';
export type SchedulingType = 'fixed' | 'flexible' | 'prayer_anchor' | 'relative';
export type PrayerAnchor =
  | 'after_fajr'
  | 'after_dhuhr'
  | 'before_asr'
  | 'after_asr'
  | 'after_maghrib'
  | 'after_isha'
  | 'before_sleep';

export type TaskStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'skipped'
  | 'rescheduled'
  | 'cancelled';

export type GoalStatus = 'active' | 'paused' | 'completed' | 'archived';
export type GoalCategory = 'deen' | 'dunya' | string;

export interface PrayerTimes {
  fajr: Date;
  dhuhr: Date;
  asr: Date;
  maghrib: Date;
  isha: Date;
}

export interface DailyConflict {
  taskTitle: string;
  reason: string;
  suggestion?: string;
}
