import nodemailer from "nodemailer";
import { pool } from "./db/pool.js";
import { env } from "./lib/env.js";
import { fetchPendingOutboxEvents, markOutboxProcessed } from "./lib/outbox.js";

const POLL_MS = 5000;

function createMailer() {
  if (!env.smtpHost) return null;
  return nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: false,
  });
}

async function processEvent(event: {
  id: string;
  event_type: string;
  aggregate_type: string;
  aggregate_id: string;
  payload: Record<string, unknown>;
}) {
  console.log(`[outbox] ${event.event_type} ${event.aggregate_type}/${event.aggregate_id}`);

  const mailer = createMailer();
  if (mailer && event.event_type.startsWith("quote.")) {
    try {
      await mailer.sendMail({
        from: env.smtpFrom,
        to: env.smtpFrom,
        subject: `[Reta] ${event.event_type}`,
        text: JSON.stringify(event.payload, null, 2),
      });
    } catch (err) {
      console.warn("[outbox] SMTP failed:", err);
    }
  }

  await markOutboxProcessed(event.id);
}

async function tick() {
  const events = await fetchPendingOutboxEvents();
  for (const event of events) {
    try {
      await processEvent(event);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[outbox] failed ${event.id}:`, message);
      await markOutboxProcessed(event.id, message);
    }
  }
}

async function main() {
  console.log("[worker] outbox processor started");
  // Não derruba o processo em falha transitória de DNS/DB no boot.
  const run = () => tick().catch((err) => console.error("[worker] tick error:", err));
  const interval = setInterval(run, POLL_MS);
  await run();

  const shutdown = async () => {
    clearInterval(interval);
    await pool.end();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
