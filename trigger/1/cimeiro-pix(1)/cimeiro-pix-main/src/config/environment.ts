import dotenv from 'dotenv';
import Joi from 'joi';

dotenv.config();

const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3000),
  DEBUG: Joi.boolean().default(false),
  
  DATABASE_URL: Joi.string().default('postgresql://localhost:5432/sankhya_mercos_integration'),
  
  SANKHYA_BASE_URL: Joi.string().uri().required(),
  SANKHYA_TOKEN: Joi.string().required(),
  SANKHYA_API_KEY: Joi.string().required(),
  SANKHYA_USERNAME: Joi.string().email().required(),
  SANKHYA_PASSWORD: Joi.string().required(),
  
  MERCOS_BASE_URL: Joi.string().uri().required(),
  MERCOS_APP_TOKEN: Joi.string().required(),
  MERCOS_COMPANY_TOKEN: Joi.string().required(),
  
  SYNC_INTERVAL_HOURS: Joi.number().default(1),
  MAX_RETRY_ATTEMPTS: Joi.number().default(3),
  RATE_LIMIT_REQUESTS: Joi.number().default(100),
  RATE_LIMIT_WINDOW_MS: Joi.number().default(900000),
  
  SMTP_HOST: Joi.string().default(''),
  SMTP_PORT: Joi.number().default(587),
  SMTP_USER: Joi.string().default(''),
  SMTP_PASS: Joi.string().default(''),
  ALERT_EMAIL: Joi.string().email().default(''),
  
  JWT_SECRET: Joi.string().required(),
}).unknown();

const { error, value: envVars } = envSchema.validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

export const config = {
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  debug: envVars.DEBUG,
  
  database: {
    url: envVars.DATABASE_URL,
  },
  
  sankhya: {
    baseUrl: envVars.SANKHYA_BASE_URL,
    token: envVars.SANKHYA_TOKEN,
    apiKey: envVars.SANKHYA_API_KEY,
    username: envVars.SANKHYA_USERNAME,
    password: envVars.SANKHYA_PASSWORD,
  },
  
  mercos: {
    baseUrl: envVars.MERCOS_BASE_URL,
    appToken: envVars.MERCOS_APP_TOKEN,
    companyToken: envVars.MERCOS_COMPANY_TOKEN,
  },
  
  sync: {
    intervalHours: envVars.SYNC_INTERVAL_HOURS,
    maxRetryAttempts: envVars.MAX_RETRY_ATTEMPTS,
    rateLimitRequests: envVars.RATE_LIMIT_REQUESTS,
    rateLimitWindowMs: envVars.RATE_LIMIT_WINDOW_MS,
  },
  
  smtp: {
    host: envVars.NODE_ENV === 'development' ? '' : envVars.SMTP_HOST,
    port: envVars.SMTP_PORT,
    user: envVars.NODE_ENV === 'development' ? '' : envVars.SMTP_USER,
    pass: envVars.NODE_ENV === 'development' ? '' : envVars.SMTP_PASS,
    alertEmail: envVars.NODE_ENV === 'development' ? '' : envVars.ALERT_EMAIL,
  },
  
  jwt: {
    secret: envVars.JWT_SECRET,
  },
};