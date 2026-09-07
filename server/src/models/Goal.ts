import mongoose, { Document, Schema } from 'mongoose';

export interface IMilestone {
  title: string;
  done: boolean;
  order: number;
}

export interface IGoal extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  category: string; // 'deen' | 'dunya' | custom
  type?: string; // 'learning', 'worship', 'fitness', etc.
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'active' | 'paused' | 'completed' | 'archived';
  target?: string | number;
  progress: number; // 0-100
  deadline?: Date;
  milestones: IMilestone[];
  createdAt: Date;
  updatedAt: Date;
}

const MilestoneSchema = new Schema<IMilestone>(
  {
    title: { type: String, required: true, maxlength: 200 },
    done: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
  },
  { _id: true }
);

const GoalSchema = new Schema<IGoal>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, maxlength: 1000 },
    category: { type: String, required: true, default: 'dunya' },
    type: { type: String, maxlength: 50 },
    priority: { type: String, enum: ['critical', 'high', 'medium', 'low'], default: 'medium' },
    status: {
      type: String,
      enum: ['active', 'paused', 'completed', 'archived'],
      default: 'active',
    },
    target: { type: Schema.Types.Mixed },
    progress: { type: Number, min: 0, max: 100, default: 0 },
    deadline: { type: Date },
    milestones: { type: [MilestoneSchema], default: [] },
  },
  { timestamps: true }
);

GoalSchema.index({ userId: 1, status: 1 });

export const Goal = mongoose.model<IGoal>('Goal', GoalSchema);
