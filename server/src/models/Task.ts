import mongoose, { Document, Schema } from 'mongoose';

export interface ITask extends Document {
  userId: mongoose.Types.ObjectId;
  routineId?: mongoose.Types.ObjectId;
  goalId?: mongoose.Types.ObjectId;
  goalProgressDelta?: number;
  date: string; // "YYYY-MM-DD"
  title: string;
  category: string;
  duration: number; // minutes
  scheduledStart?: Date;
  scheduledEnd?: Date;
  anchor?: string; // prayer anchor label for grouping
  source: 'routine' | 'manual' | 'ai_smart_add' | 'fixed_event' | 'reminder';
  status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'rescheduled' | 'cancelled';
  skipReason?: string;
  completedAt?: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new Schema<ITask>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    routineId: { type: Schema.Types.ObjectId, ref: 'Routine' },
    goalId: { type: Schema.Types.ObjectId, ref: 'Goal' },
    goalProgressDelta: { type: Number, min: 0, max: 100, default: 0 },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    category: { type: String, required: true, default: 'dunya' },
    duration: { type: Number, required: true, min: 1 },
    scheduledStart: { type: Date },
    scheduledEnd: { type: Date },
    anchor: { type: String },
    source: {
      type: String,
      enum: ['routine', 'manual', 'ai_smart_add', 'fixed_event', 'reminder'],
      default: 'routine',
    },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'skipped', 'rescheduled', 'cancelled'],
      default: 'pending',
    },
    skipReason: { type: String, maxlength: 500 },
    completedAt: { type: Date },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

TaskSchema.index({ userId: 1, date: 1 });
TaskSchema.index({ userId: 1, status: 1, date: 1 });

export const Task = mongoose.model<ITask>('Task', TaskSchema);
