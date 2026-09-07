import mongoose, { Document, Schema } from 'mongoose';

export interface IUserSettings extends Document {
  userId: mongoose.Types.ObjectId;
  dayStructure: 'prayer' | 'time' | 'hybrid';
  defaultDayMode: 'normal' | 'busy' | 'study' | 'deep_work' | 'recovery';
  prayerSettings: {
    city: string;
    country: string;
    latitude: number;
    longitude: number;
    calculationMethod: string;
  };
  preferredDurations: Record<string, number>;
  notificationSettings: {
    enabled: boolean;
    reminderMinutesBefore: number;
    quietHoursStart?: string;
    quietHoursEnd?: string;
  };
  theme: 'light' | 'dark' | 'system';
  aiSettings: {
    groqKeyCiphertext: string | null;
    groqKeyIv: string | null;
    groqKeyAuthTag: string | null;
    groqKeyLast4: string | null;
    connectedAt: Date | null;
    modelTier: 'fast' | 'balanced' | 'best';
  };
  createdAt: Date;
  updatedAt: Date;
}

const UserSettingsSchema = new Schema<IUserSettings>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    dayStructure: { type: String, enum: ['prayer', 'time', 'hybrid'], default: 'prayer' },
    defaultDayMode: {
      type: String,
      enum: ['normal', 'busy', 'study', 'deep_work', 'recovery'],
      default: 'normal',
    },
    prayerSettings: {
      city: { type: String, default: 'Cairo' },
      country: { type: String, default: 'EG' },
      latitude: { type: Number, default: 30.0444 },
      longitude: { type: Number, default: 31.2357 },
      calculationMethod: { type: String, default: 'Egypt' },
    },
    preferredDurations: { type: Map, of: Number, default: {} },
    notificationSettings: {
      enabled: { type: Boolean, default: true },
      reminderMinutesBefore: { type: Number, default: 10 },
      quietHoursStart: { type: String, default: '23:00' },
      quietHoursEnd: { type: String, default: '06:00' },
    },
    theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
    aiSettings: {
      groqKeyCiphertext: { type: String, default: null },
      groqKeyIv: { type: String, default: null },
      groqKeyAuthTag: { type: String, default: null },
      groqKeyLast4: { type: String, default: null },
      connectedAt: { type: Date, default: null },
      modelTier: { type: String, enum: ['fast', 'balanced', 'best'], default: 'balanced' },
    },
  },
  { timestamps: true }
);

export const UserSettings = mongoose.model<IUserSettings>('UserSettings', UserSettingsSchema);
