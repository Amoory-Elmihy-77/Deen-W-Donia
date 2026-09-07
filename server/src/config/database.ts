import mongoose from 'mongoose';
import { config } from './index';

export async function connectDB(): Promise<void> {
  const MAX_RETRIES = 5;
  let retries = 0;

  while (retries < MAX_RETRIES) {
    try {
      await mongoose.connect(config.mongoUri);
      console.log('✅ MongoDB connected successfully');
      return;
    } catch (err) {
      retries++;
      console.error(`❌ MongoDB connection attempt ${retries} failed:`, err);
      if (retries === MAX_RETRIES) {
        console.error('💀 Max retries reached. Exiting...');
        process.exit(1);
      }
      // Wait before retrying
      await new Promise((res) => setTimeout(res, 3000 * retries));
    }
  }
}
