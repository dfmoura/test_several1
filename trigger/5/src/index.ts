import { env } from "./config/env.js";
import { buildApp } from "./app.js";

async function main(): Promise<void> {
  const app = await buildApp();
  const address = await app.listen({ port: env.PORT, host: "0.0.0.0" });
  app.log.info(`Servidor em ${address}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
