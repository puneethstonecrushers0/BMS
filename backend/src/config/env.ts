import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || '',
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'bms_default_access_secret_for_development_must_change_in_prod_1234567890',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'bms_default_refresh_secret_for_development_must_change_in_prod_0987654321',
  JWT_ACCESS_EXPIRY: '15m',
  JWT_REFRESH_EXPIRY_DAYS: 7,
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  COOKIE_DOMAIN: process.env.COOKIE_DOMAIN || undefined,
  COOKIE_SECURE: process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production',
  TIMEZONE: 'Asia/Kolkata',
  REDIS_URL: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
};
