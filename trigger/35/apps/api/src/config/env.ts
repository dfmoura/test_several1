import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default('8h'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  FOCUS_ADAPTER: z.enum(['stub', 'http']).default('stub'),
  FOCUS_BASE_URL: z.string().optional(),
  FOCUS_TOKEN: z.string().optional(),
  BANK_ADAPTER: z.enum(['stub', 'http']).default('stub'),
  BANK_BASE_URL: z.string().optional(),
  BANK_TOKEN: z.string().optional(),
  WA_ADAPTER: z.enum(['stub', 'http']).default('stub'),
  S3_ENDPOINT: z.string().optional(),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),
  S3_BUCKET: z.string().default('erp-rlp'),
  S3_REGION: z.string().default('us-east-1'),
  S3_FORCE_PATH_STYLE: z
    .string()
    .optional()
    .transform((v) => v === 'true' || v === '1'),
});

export const env = schema.parse(process.env);
export type Env = z.infer<typeof schema>;
