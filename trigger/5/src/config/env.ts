import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  MOCK_OPEN_FINANCE: z
    .string()
    .optional()
    .transform((v) => v === "true" || v === "1"),
  OF_TOKEN_URL: z.string().optional().default(""),
  OF_CLIENT_ID: z.string().optional(),
  OF_CLIENT_SECRET: z.string().optional(),
  OF_SCOPE: z.string().default("loans"),
  OF_API_BASE_URL: z.string().optional().default(""),
  OF_LOANS_RESOURCE_PATH: z.string().default("/open-banking/loans/v1/contracts"),
  OF_HTTP_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const msg = parsed.error.flatten().fieldErrors;
    throw new Error(`Invalid environment: ${JSON.stringify(msg)}`);
  }
  return parsed.data;
}

export const env = loadEnv();
