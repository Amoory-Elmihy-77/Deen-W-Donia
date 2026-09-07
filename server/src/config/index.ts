import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/deen_w_donya',
  jwtSecret: process.env.JWT_SECRET || 'fallback_jwt_secret',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret',
  jwtExpiry: '15m',
  jwtRefreshExpiry: '7d',
  encryptionKey: process.env.ENCRYPTION_KEY || 'fallback_encryption_key_32_bytes!',
  aiServiceUrl: process.env.AI_SERVICE_URL || 'http://localhost:8000',
  aiServiceSecret: process.env.AI_SERVICE_SECRET || 'fallback_ai_secret',
  nodeEnv: process.env.NODE_ENV || 'development',
  bcryptRounds: 10,
};
