import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check candidate .env paths: process.cwd(), backend root, and project workspace root
const candidateEnvPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(__dirname, '../../.env'),
  path.resolve(__dirname, '../../../.env'),
];

let envLoaded = false;
for (const envPath of candidateEnvPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    envLoaded = true;
    break;
  }
}
if (!envLoaded) {
  dotenv.config();
}

/**
 * Validated Environment Configuration
 * Centralizes all process.env accesses and provides sensible defaults.
 */
export const env = {
  // Server
  PORT: Number(process.env.PORT) || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  CLIENT_URL: process.env.CLIENT_URL || `http://localhost:${process.env.PORT || 3000}`,
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',

  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'dev_super_secret_jwt_key_learning_lab_2026',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',

  // SMTP Configuration
  SMTP: {
    HOST: process.env.SMTP_HOST || '',
    PORT: Number(process.env.SMTP_PORT) || 587,
    SECURE: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
    USER: process.env.SMTP_USER || '',
    PASS: process.env.SMTP_PASS || '',
    FROM: process.env.MAIL_FROM || '"Nodemailer Lab" <no-reply@example.com>',
    OVERRIDE_RECIPIENT: process.env.MAILTRAP_TEST_RECIPIENT || process.env.OVERRIDE_RECIPIENT || '',
  },

  // MSSQL Database Configuration
  DB: {
    SERVER: process.env.SERVER || 'localhost',
    DATABASE: process.env.DATABASE || 'somenewdatabase',
  },

  // ImageKit Configuration
  IMAGEKIT: {
    PUBLIC_KEY: process.env.IMAGEKIT_PUBLIC_KEY || '',
    PRIVATE_KEY: process.env.IMAGEKIT_PRIVATE_KEY || '',
    URL_ENDPOINT: process.env.IMAGEKIT_URL_ENDPOINT || '',
  },

  isDevelopment: (process.env.NODE_ENV || 'development') === 'development',
  isProduction: process.env.NODE_ENV === 'production',
};

/**
 * Validates essential startup configuration and logs warnings for misconfigurations.
 */
export function validateEnv() {
  const warnings = [];

  if (env.isProduction && env.JWT_SECRET.startsWith('dev_')) {
    warnings.push('CRITICAL: JWT_SECRET is using the fallback development key in production mode!');
  }

  if (warnings.length > 0) {
    console.warn('\n[Env Warning] Configuration issues detected:');
    warnings.forEach((w) => console.warn(`  - ${w}`));
    console.warn('');
  }
}
