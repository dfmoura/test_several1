-- Cadastro mestre: Parceiro.codigo obrigatório e único por empresa (padrão ERP).

-- 1) Escopo: parceiros sem empresa herdam a matriz
UPDATE "Parceiro" p
SET "empresaId" = e.id
FROM "Empresa" e
WHERE p."empresaId" IS NULL
  AND e."isMatriz" = true;

UPDATE "Parceiro" p
SET "empresaId" = e.id
FROM (
  SELECT id FROM "Empresa" ORDER BY "createdAt" ASC LIMIT 1
) e
WHERE p."empresaId" IS NULL;

-- 2) Backfill de códigos nulos (sequencial por empresa)
WITH ranked AS (
  SELECT
    id,
    "empresaId",
    ROW_NUMBER() OVER (PARTITION BY "empresaId" ORDER BY "createdAt", id) AS rn
  FROM "Parceiro"
  WHERE "codigo" IS NULL OR TRIM("codigo") = ''
)
UPDATE "Parceiro" p
SET "codigo" = 'PAR-' || LPAD(ranked.rn::text, 4, '0')
FROM ranked
WHERE p.id = ranked.id;

-- 3) Colisões residuais: sufixo pelo id curto
WITH dups AS (
  SELECT id,
         "codigo",
         ROW_NUMBER() OVER (
           PARTITION BY "empresaId", UPPER(TRIM("codigo"))
           ORDER BY "createdAt", id
         ) AS rn
  FROM "Parceiro"
  WHERE "codigo" IS NOT NULL
)
UPDATE "Parceiro" p
SET "codigo" = LEFT(UPPER(TRIM(p."codigo")) || '-' || UPPER(SUBSTRING(p.id FROM 1 FOR 6)), 40)
FROM dups
WHERE p.id = dups.id AND dups.rn > 1;

-- 4) Normaliza existentes
UPDATE "Parceiro"
SET "codigo" = UPPER(TRIM(REPLACE("codigo", ' ', '-')))
WHERE "codigo" IS NOT NULL;

-- 5) Remove unique global antigo (se existir)
ALTER TABLE "Parceiro" DROP CONSTRAINT IF EXISTS "Parceiro_codigo_key";
DROP INDEX IF EXISTS "Parceiro_codigo_key";

-- 6) Torna obrigatório
ALTER TABLE "Parceiro" ALTER COLUMN "codigo" SET NOT NULL;

-- 7) Unique por empresa + índice de busca
CREATE UNIQUE INDEX IF NOT EXISTS "Parceiro_empresaId_codigo_key"
  ON "Parceiro"("empresaId", "codigo");
CREATE INDEX IF NOT EXISTS "Parceiro_codigo_idx" ON "Parceiro"("codigo");
