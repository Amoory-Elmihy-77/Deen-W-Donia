import mongoose, { Document, Schema } from 'mongoose';

export interface IRoutine extends Document {
  userId: mongoose.Types.ObjectId;
  goalId?: mongoose.Types.ObjectId;
  goalProgressContribution: number;
  title: string;
  category: string;
  duration: number; // minutes
  minimumDuration: number; // minutes (for busy-day compression)
  frequency: 'daily' | 'weekly' | 'custom';
  activeDays: number[]; // 0 (Sunday) - 6 (Saturday)
  schedulingType: 'fixed' | 'flexible' | 'prayer_anchor' | 'relative';
  anchor?:
    | 'after_fajr'
    | 'after_dhuhr'
    | 'before_asr'
    | 'after_asr'
    | 'after_maghrib'
    | 'after_isha'
    | 'before_sleep';
  relativeRule?: {
    base: 'wake' | 'sleep' | 'work';
    offsetMinutes: number;
  };
  preferredTime?: string; // "HH:mm"
  priority: 'critical' | 'high' | 'medium' | 'low';
  enabled: boolean;
  pausedUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const RoutineSchema = new Schema<IRoutine>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    goalId: { type: Schema.Types.ObjectId, ref: 'Goal' },
    goalProgressContribution: { type: Number, min: 0, max: 100, default: 0 },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    category: { type: String, required: true, default: 'dunya' },
    duration: { type: Number, required: true, min: 1, max: 720 },
    minimumDuration: { type: Number, default: function (this: IRoutine) { return Math.round(this.duration * 0.5); } },
    frequency: { type: String, enum: ['daily', 'weekly', 'custom'], default: 'daily' },
    activeDays: { type: [Number], default: [0, 1, 2, 3, 4, 5, 6] },
    schedulingType: {
      type: String,
      enum: ['fixed', 'flexible', 'prayer_anchor', 'relative'],
      default: 'flexible',
    },
    anchor: {
      type: String,
      enum: [
        'after_fajr',
        'after_dhuhr',
        'before_asr',
        'after_asr',
        'after_maghrib',
        'after_isha',
        'before_sleep',
      ],
    },
    relativeRule: {
      base: { type: String, enum: ['wake', 'sleep', 'work'] },
      offsetMinutes: { type: Number },
    },
    preferredTime: { type: String, match: /^\d{2}:\d{2}$/ },
    priority: { type: String, enum: ['critical', 'high', 'medium', 'low'], default: 'medium' },
    enabled: { type: Boolean, default: true },
    pausedUntil: { type: Date },
  },
  { timestamps: true }
);

RoutineSchema.index({ userId: 1, enabled: 1 });

export const Routine = mongoose.model<IRoutine>('Routine', RoutineSchema);
