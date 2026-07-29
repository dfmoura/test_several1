-- AlterEnum
ALTER TYPE "OrcamentoStatus" ADD VALUE IF NOT EXISTS 'REPROVADO';

-- AlterTable
ALTER TABLE "Orcamento" ADD COLUMN IF NOT EXISTS "enviadoEm" TIMESTAMP(3);
ALTER TABLE "Orcamento" ADD COLUMN IF NOT EXISTS "decididoEm" TIMESTAMP(3);
ALTER TABLE "Orcamento" ADD COLUMN IF NOT EXISTS "decididoPorId" TEXT;
ALTER TABLE "Orcamento" ADD COLUMN IF NOT EXISTS "motivoDecisao" TEXT;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Orcamento_decididoPorId_fkey'
  ) THEN
    ALTER TABLE "Orcamento"
      ADD CONSTRAINT "Orcamento_decididoPorId_fkey"
      FOREIGN KEY ("decididoPorId") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Orcamento_decididoEm_idx" ON "Orcamento"("decididoEm");
