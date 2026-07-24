function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Variável de ambiente obrigatória ausente: ${name}`);
  }
  return value;
}

export const env = {
  appEnv: process.env.APP_ENV ?? "local",
  appSecret: required("APP_SECRET", "change-me-local-dev-secret-32chars"),
  port: Number(process.env.APP_PORT ?? "3001"),
  databaseUrl: required("DATABASE_URL", "postgres://reta:reta@localhost:5432/reta"),
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379/0",
  orgId: process.env.ORG_ID,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "8h",
  billingProvider: process.env.BILLING_PROVIDER ?? "fake",
  nfeProvider: process.env.NFE_PROVIDER ?? "fake",
  cnpjProvider: process.env.CNPJ_PROVIDER ?? "brasilapi",
  cepProvider: process.env.CEP_PROVIDER ?? "viacep",
  smtpHost: process.env.SMTP_HOST,
  smtpPort: Number(process.env.SMTP_PORT ?? "1025"),
  smtpFrom: process.env.SMTP_FROM ?? "gestao@retaetiquetas.local",
};
