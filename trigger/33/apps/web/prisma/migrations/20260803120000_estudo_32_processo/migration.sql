-- Estudo 32: processo comercial (link aprovação, crédito, OP, multi-título AR, baixas)

-- ─── Enums novos ─────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE "CreditoPedidoFlag" AS ENUM ('OK', 'BLOQUEADO', 'AGUARDA_ADIANTAMENTO', 'LIBERADO_MANUAL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "SituacaoCreditoCliente" AS ENUM ('NORMAL', 'ATENCAO', 'BLOQUEADO', 'BLOQUEIO_MANUAL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CanalAprovacao" AS ENUM ('LINK', 'MANUAL_GERENTE', 'INTERNO');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "OrdemProducaoStatus" AS ENUM (
    'PLANEJADA', 'EMPENHADA', 'EM_SETUP', 'EM_PRODUCAO',
    'PAUSADA', 'AGUARDA_INSUMO', 'CONCLUIDA', 'CANCELADA'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "TipoBaixaReceber" AS ENUM (
    'TOTAL', 'PARCIAL', 'JUROS', 'DESCONTO', 'ADIANTAMENTO', 'PERDA', 'CANCELAMENTO'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "NecessidadeItemTipo" AS ENUM ('PRODUCAO', 'REVENDA', 'SERVICO');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── Enums existentes: novos valores ─────────────────────────────────────────

ALTER TYPE "OrcamentoStatus" ADD VALUE IF NOT EXISTS 'VISUALIZADO';

ALTER TYPE "PedidoVendaStatus" ADD VALUE IF NOT EXISTS 'AGUARDA_CREDITO';
ALTER TYPE "PedidoVendaStatus" ADD VALUE IF NOT EXISTS 'AGUARDA_ADIANTAMENTO';
ALTER TYPE "PedidoVendaStatus" ADD VALUE IF NOT EXISTS 'LIBERADO';
ALTER TYPE "PedidoVendaStatus" ADD VALUE IF NOT EXISTS 'PRODUZIDO';

-- ─── Orcamento: link / aceite cliente ────────────────────────────────────────

ALTER TABLE "Orcamento" ADD COLUMN IF NOT EXISTS "visualizadoEm" TIMESTAMP(3);
ALTER TABLE "Orcamento" ADD COLUMN IF NOT EXISTS "canalAprovacao" "CanalAprovacao";
ALTER TABLE "Orcamento" ADD COLUMN IF NOT EXISTS "aceiteNomeCliente" TEXT;
ALTER TABLE "Orcamento" ADD COLUMN IF NOT EXISTS "aceiteFaixaIndex" INTEGER;
ALTER TABLE "Orcamento" ADD COLUMN IF NOT EXISTS "aceiteIp" TEXT;
ALTER TABLE "Orcamento" ADD COLUMN IF NOT EXISTS "aceiteUserAgent" TEXT;

-- ─── OrcamentoLinkAprovacao ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "OrcamentoLinkAprovacao" (
  "id" TEXT NOT NULL,
  "orcamentoId" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "expiraEm" TIMESTAMP(3) NOT NULL,
  "enviadoEm" TIMESTAMP(3),
  "canalEnvio" TEXT,
  "destinoEnvio" TEXT,
  "visualizacoes" INTEGER NOT NULL DEFAULT 0,
  "usadoEm" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrcamentoLinkAprovacao_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "OrcamentoLinkAprovacao_orcamentoId_key"
  ON "OrcamentoLinkAprovacao"("orcamentoId");
CREATE UNIQUE INDEX IF NOT EXISTS "OrcamentoLinkAprovacao_token_key"
  ON "OrcamentoLinkAprovacao"("token");
CREATE INDEX IF NOT EXISTS "OrcamentoLinkAprovacao_token_idx"
  ON "OrcamentoLinkAprovacao"("token");
CREATE INDEX IF NOT EXISTS "OrcamentoLinkAprovacao_expiraEm_idx"
  ON "OrcamentoLinkAprovacao"("expiraEm");

DO $$ BEGIN
  ALTER TABLE "OrcamentoLinkAprovacao"
    ADD CONSTRAINT "OrcamentoLinkAprovacao_orcamentoId_fkey"
    FOREIGN KEY ("orcamentoId") REFERENCES "Orcamento"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── Parceiro: motor de crédito ─────────────────────────────────────────────

ALTER TABLE "Parceiro" ADD COLUMN IF NOT EXISTS "limiteCredito" DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE "Parceiro" ADD COLUMN IF NOT EXISTS "condicaoPagamentoMax" TEXT;
ALTER TABLE "Parceiro" ADD COLUMN IF NOT EXISTS "creditoValidoAte" TIMESTAMP(3);

DO $$ BEGIN
  ALTER TABLE "Parceiro" ADD COLUMN "situacaoCredito" "SituacaoCreditoCliente" NOT NULL DEFAULT 'NORMAL';
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "Parceiro_situacaoCredito_idx" ON "Parceiro"("situacaoCredito");

-- ─── PedidoVenda: crédito / sinal ────────────────────────────────────────────

ALTER TABLE "PedidoVenda" ADD COLUMN IF NOT EXISTS "creditoFlag" "CreditoPedidoFlag" NOT NULL DEFAULT 'OK';
ALTER TABLE "PedidoVenda" ADD COLUMN IF NOT EXISTS "creditoMotivo" TEXT;
ALTER TABLE "PedidoVenda" ADD COLUMN IF NOT EXISTS "percentualSinal" DECIMAL(5,2) NOT NULL DEFAULT 0;
ALTER TABLE "PedidoVenda" ADD COLUMN IF NOT EXISTS "tituloSinalId" TEXT;
ALTER TABLE "PedidoVenda" ADD COLUMN IF NOT EXISTS "liberadoCreditoEm" TIMESTAMP(3);
ALTER TABLE "PedidoVenda" ADD COLUMN IF NOT EXISTS "liberadoCreditoPorId" TEXT;
ALTER TABLE "PedidoVenda" ADD COLUMN IF NOT EXISTS "canalOrigem" TEXT;
ALTER TABLE "PedidoVenda" ADD COLUMN IF NOT EXISTS "dataPrevista" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "PedidoVenda_creditoFlag_idx" ON "PedidoVenda"("creditoFlag");

-- ─── PedidoItem: tipo de necessidade ─────────────────────────────────────────

DO $$ BEGIN
  ALTER TABLE "PedidoItem" ADD COLUMN "necessidadeTipo" "NecessidadeItemTipo" NOT NULL DEFAULT 'PRODUCAO';
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- ─── TituloReceber: multi-título (parcelas / sinal) ──────────────────────────

ALTER TABLE "TituloReceber" DROP CONSTRAINT IF EXISTS "TituloReceber_pedidoVendaId_key";

ALTER TABLE "TituloReceber" ADD COLUMN IF NOT EXISTS "numero" INTEGER;
CREATE SEQUENCE IF NOT EXISTS "TituloReceber_numero_seq";
SELECT setval(
  '"TituloReceber_numero_seq"',
  COALESCE((SELECT MAX("numero") FROM "TituloReceber"), 0) + 1,
  false
);
ALTER TABLE "TituloReceber" ALTER COLUMN "numero" SET DEFAULT nextval('"TituloReceber_numero_seq"');
ALTER SEQUENCE "TituloReceber_numero_seq" OWNED BY "TituloReceber"."numero";
UPDATE "TituloReceber" SET "numero" = nextval('"TituloReceber_numero_seq"') WHERE "numero" IS NULL;
ALTER TABLE "TituloReceber" ALTER COLUMN "numero" SET NOT NULL;
ALTER TABLE "TituloReceber" ADD COLUMN IF NOT EXISTS "parcela" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "TituloReceber" ADD COLUMN IF NOT EXISTS "isAdiantamento" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "TituloReceber" ADD COLUMN IF NOT EXISTS "clienteParceiroId" TEXT;
ALTER TABLE "TituloReceber" ADD COLUMN IF NOT EXISTS "juros" DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE "TituloReceber" ADD COLUMN IF NOT EXISTS "desconto" DECIMAL(14,2) NOT NULL DEFAULT 0;

ALTER TABLE "TituloReceber" ALTER COLUMN "pedidoVendaId" DROP NOT NULL;

CREATE INDEX IF NOT EXISTS "TituloReceber_pedidoVendaId_idx" ON "TituloReceber"("pedidoVendaId");
CREATE INDEX IF NOT EXISTS "TituloReceber_numero_idx" ON "TituloReceber"("numero");

DO $$ BEGIN
  ALTER TABLE "TituloReceber"
    ADD CONSTRAINT "TituloReceber_clienteParceiroId_fkey"
    FOREIGN KEY ("clienteParceiroId") REFERENCES "Parceiro"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Migra legado: título único existente vira parcela 1
UPDATE "TituloReceber" SET "parcela" = 1 WHERE "parcela" IS NULL OR "parcela" = 0 AND "isAdiantamento" = false;

-- ─── BaixaReceber ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "BaixaReceber" (
  "id" TEXT NOT NULL,
  "empresaId" TEXT NOT NULL,
  "numero" SERIAL NOT NULL,
  "tituloReceberId" TEXT NOT NULL,
  "tipo" "TipoBaixaReceber" NOT NULL DEFAULT 'TOTAL',
  "valor" DECIMAL(14,2) NOT NULL,
  "juros" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "desconto" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "dataCredito" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "contaBancariaId" TEXT,
  "forma" TEXT,
  "via" TEXT,
  "observacao" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BaixaReceber_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "BaixaReceber_empresaId_idx" ON "BaixaReceber"("empresaId");
CREATE INDEX IF NOT EXISTS "BaixaReceber_tituloReceberId_idx" ON "BaixaReceber"("tituloReceberId");
CREATE INDEX IF NOT EXISTS "BaixaReceber_dataCredito_idx" ON "BaixaReceber"("dataCredito");
CREATE INDEX IF NOT EXISTS "BaixaReceber_numero_idx" ON "BaixaReceber"("numero");

DO $$ BEGIN
  ALTER TABLE "BaixaReceber"
    ADD CONSTRAINT "BaixaReceber_tituloReceberId_fkey"
    FOREIGN KEY ("tituloReceberId") REFERENCES "TituloReceber"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "BaixaReceber"
    ADD CONSTRAINT "BaixaReceber_empresaId_fkey"
    FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── OrdemProducao ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "OrdemProducao" (
  "id" TEXT NOT NULL,
  "empresaId" TEXT NOT NULL,
  "numero" SERIAL NOT NULL,
  "pedidoVendaId" TEXT NOT NULL,
  "pedidoItemId" TEXT,
  "ordemServicoId" TEXT,
  "status" "OrdemProducaoStatus" NOT NULL DEFAULT 'PLANEJADA',
  "maquinaId" TEXT,
  "prioridade" INTEGER NOT NULL DEFAULT 100,
  "qtdPlanejada" DECIMAL(14,4) NOT NULL,
  "qtdBoa" DECIMAL(14,4) NOT NULL DEFAULT 0,
  "qtdRefugo" DECIMAL(14,4) NOT NULL DEFAULT 0,
  "sobraMetros" DECIMAL(14,4),
  "tecnicoSnapshot" JSONB,
  "previstoEm" TIMESTAMP(3),
  "iniciadoEm" TIMESTAMP(3),
  "concluidoEm" TIMESTAMP(3),
  "responsavelId" TEXT,
  "observacoes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrdemProducao_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "OrdemProducao_empresaId_status_idx" ON "OrdemProducao"("empresaId", "status");
CREATE INDEX IF NOT EXISTS "OrdemProducao_pedidoVendaId_idx" ON "OrdemProducao"("pedidoVendaId");
CREATE INDEX IF NOT EXISTS "OrdemProducao_pedidoItemId_idx" ON "OrdemProducao"("pedidoItemId");
CREATE INDEX IF NOT EXISTS "OrdemProducao_ordemServicoId_idx" ON "OrdemProducao"("ordemServicoId");
CREATE INDEX IF NOT EXISTS "OrdemProducao_prioridade_idx" ON "OrdemProducao"("prioridade");

DO $$ BEGIN
  ALTER TABLE "OrdemProducao"
    ADD CONSTRAINT "OrdemProducao_pedidoVendaId_fkey"
    FOREIGN KEY ("pedidoVendaId") REFERENCES "PedidoVenda"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "OrdemProducao"
    ADD CONSTRAINT "OrdemProducao_pedidoItemId_fkey"
    FOREIGN KEY ("pedidoItemId") REFERENCES "PedidoItem"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "OrdemProducao"
    ADD CONSTRAINT "OrdemProducao_ordemServicoId_fkey"
    FOREIGN KEY ("ordemServicoId") REFERENCES "OrdemServico"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── Estoque: sobra / refugo ─────────────────────────────────────────────────

ALTER TYPE "EstoqueMovimentoTipo" ADD VALUE IF NOT EXISTS 'RETORNO_SOBRA';
ALTER TYPE "EstoqueMovimentoTipo" ADD VALUE IF NOT EXISTS 'REFUGO_PRODUCAO';

-- ─── Entrega: confirmação cliente + código ENT- ──────────────────────────────

ALTER TABLE "EntregaPedido" ADD COLUMN IF NOT EXISTS "numero" INTEGER;
CREATE SEQUENCE IF NOT EXISTS "EntregaPedido_numero_seq";
SELECT setval(
  '"EntregaPedido_numero_seq"',
  COALESCE((SELECT MAX("numero") FROM "EntregaPedido"), 0) + 1,
  false
);
ALTER TABLE "EntregaPedido" ALTER COLUMN "numero" SET DEFAULT nextval('"EntregaPedido_numero_seq"');
ALTER SEQUENCE "EntregaPedido_numero_seq" OWNED BY "EntregaPedido"."numero";
UPDATE "EntregaPedido" SET "numero" = nextval('"EntregaPedido_numero_seq"') WHERE "numero" IS NULL;
ALTER TABLE "EntregaPedido" ALTER COLUMN "numero" SET NOT NULL;

ALTER TABLE "EntregaPedido" ADD COLUMN IF NOT EXISTS "confirmadoClienteEm" TIMESTAMP(3);
ALTER TABLE "EntregaPedido" ADD COLUMN IF NOT EXISTS "confirmadoPorNome" TEXT;
ALTER TABLE "EntregaPedido" ADD COLUMN IF NOT EXISTS "canhotoUrl" TEXT;

