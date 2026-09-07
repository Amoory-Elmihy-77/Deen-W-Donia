import mongoose, { Document, Schema } from 'mongoose';

export interface IDailyPlan extends Document {
  userId: mongoose.Types.ObjectId;
  date: string; // "YYYY-MM-DD"
  wakeTime: string; // "HH:mm"
  sleepTime: string; // "HH:mm"
  dayMode: 'normal' | 'busy' | 'study' | 'deep_work' | 'recovery';
  prayerTimes: {
    fajr: Date;
    dhuhr: Date;
    asr: Date;
    maghrib: Date;
    isha: Date;
  };
  availableMinutes: number;
  generatedTaskIds: mongoose.Types.ObjectId[];
  conflicts: Array<{
    taskTitle: string;
    reason: string;
    suggestion?: string;
  }>;
  planningVersion: number;
  generatedAt: Date;
}

const DailyPlanSchema = new Schema<IDailyPlan>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    wakeTime: { type: String, required: true },
    sleepTime: { type: String, default: '23:00' },
    dayMode: {
      type: String,
      enum: ['normal', 'busy', 'study', 'deep_work', 'recovery'],
      default: 'normal',
    },
    prayerTimes: {
      fajr: { type: Date },
      dhuhr: { type: Date },
      asr: { type: Date },
      maghrib: { type: Date },
      isha: { type: Date },
    },
    availableMinutes: { type: Number, default: 0 },
    generatedTaskIds: [{ type: Schema.Types.ObjectId, ref: 'Task' }],
    conflicts: [
      {
        taskTitle: String,
        reason: String,
        suggestion: String,
      },
    ],
    planningVersion: { type: Number, default: 1 },
    generatedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

// One plan per user per day
DailyPlanSchema.index({ userId: 1, date: 1 }, { unique: true });

export const DailyPlan = mongoose.model<IDailyPlan>('DailyPlan', DailyPlanSchema);
