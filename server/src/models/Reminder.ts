import mongoose, { Document, Schema } from 'mongoose';

export interface IReminder extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  date: string;
  time?: string;
  duration: number;
  category: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReminderSchema = new Schema<IReminder>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, trim: true, maxlength: 200 },
  date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  time: { type: String, match: /^\d{2}:\d{2}$/ },
  duration: { type: Number, min: 1, max: 1440, default: 60 },
  category: { type: String, default: 'personal' },
  notes: { type: String, maxlength: 1000 },
}, { timestamps: true });

ReminderSchema.index({ userId: 1, date: 1 });
export const Reminder = mongoose.model<IReminder>('Reminder', ReminderSchema);
