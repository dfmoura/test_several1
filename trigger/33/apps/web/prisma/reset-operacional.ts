/**
 * CLI: limpa dados operacionais preservando cadastros.
 *
 *   npm run db:reset-ops -w web
 */
import { resetOperacional } from "../src/lib/reset-operacional";

async function main() {
  const result = await resetOperacional();
  console.log("Reset operacional concluído.");
  console.log("Apagados:", JSON.stringify(result.deleted, null, 2));
  console.log("Preservados:", result.preserved.join(", "));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    const { prisma } = await import("../src/lib/db");
    await prisma.$disconnect();
  });
