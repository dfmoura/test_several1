-- Waves 2-6: Estoque INV, Fiscal cancel/CC-e, Financeiro aging/ambigua, Comercial cenários, M09 webhooks

-- M04: SOBRA_RETALHO
ALTER TYPE "MotivoMovimentoEstoque" ADD VALUE IF NOT EXISTS 'SOBRA_RETALHO';

-- M04: Inventário formal
CREATE TYPE "StatusInventario" AS ENUM (
  'ABERTO',
  'EM_CONTAGEM',
  'AGUARDA_APROVACAO',
  'APROVADO',
  'CANCELADO'
);

CREATE TABLE "inventario" (
  "id" BIGSERIAL NOT NULL,
  "empresa_id" BIGINT NOT NULL,
  "codigo" VARCHAR(30) NOT NULL,
  "status" "StatusInventario" NOT NULL DEFAULT 'ABERTO',
  "criado_por_id" BIGINT NOT NULL,
  "aprovado_por_id" BIGINT,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "inventario_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "inventario_item" (
  "inventario_id" BIGINT NOT NULL,
  "produto_id" BIGINT NOT NULL,
  "qtde_sistema" DECIMAL(18,4) NOT NULL,
  "qtde_contada" DECIMAL(18,4),
  "diferenca" DECIMAL(18,4),

  CONSTRAINT "inventario_item_pkey" PRIMARY KEY ("inventario_id","produto_id")
);

CREATE UNIQUE INDEX "inventario_empresa_id_codigo_key" ON "inventario"("empresa_id", "codigo");
CREATE INDEX "inventario_empresa_id_status_idx" ON "inventario"("empresa_id", "status");

ALTER TABLE "inventario" ADD CONSTRAINT "inventario_empresa_id_fkey"
  FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inventario_item" ADD CONSTRAINT "inventario_item_inventario_id_fkey"
  FOREIGN KEY ("inventario_id") REFERENCES "inventario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inventario_item" ADD CONSTRAINT "inventario_item_produto_id_fkey"
  FOREIGN KEY ("produto_id") REFERENCES "produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- M05: cancelamento / CC-e
ALTER TABLE "documento_fiscal" ADD COLUMN IF NOT EXISTS "cancelado_em" TIMESTAMP(3);
ALTER TABLE "documento_fiscal" ADD COLUMN IF NOT EXISTS "protocolo_cancelamento" VARCHAR(60);
ALTER TABLE "documento_fiscal" ADD COLUMN IF NOT EXISTS "cce_sequencia" INTEGER;

-- M06: Baixa ambígua (webhook bank)
CREATE TYPE "StatusBaixaAmbigua" AS ENUM ('PENDENTE', 'CONCILIADA', 'DESCARTADA');

CREATE TABLE "baixa_ambigua" (
  "id" BIGSERIAL NOT NULL,
  "empresa_id" BIGINT NOT NULL,
  "codigo" VARCHAR(30) NOT NULL,
  "payload_json" JSONB NOT NULL,
  "status" "StatusBaixaAmbigua" NOT NULL DEFAULT 'PENDENTE',
  "titulo_id" BIGINT,
  "valor" DECIMAL(18,2),
  "idempotency_key" VARCHAR(120) NOT NULL,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "baixa_ambigua_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "baixa_ambigua_empresa_id_codigo_key" ON "baixa_ambigua"("empresa_id", "codigo");
CREATE UNIQUE INDEX "baixa_ambigua_idempotency_key_key" ON "baixa_ambigua"("idempotency_key");
CREATE INDEX "baixa_ambigua_empresa_id_status_idx" ON "baixa_ambigua"("empresa_id", "status");

ALTER TABLE "baixa_ambigua" ADD CONSTRAINT "baixa_ambigua_empresa_id_fkey"
  FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "baixa_ambigua" ADD CONSTRAINT "baixa_ambigua_titulo_id_fkey"
  FOREIGN KEY ("titulo_id") REFERENCES "titulo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- M06: TIT sinal (adiantamento) — documento fiscal opcional
CREATE TYPE "OrigemTitulo" AS ENUM ('NF', 'SINAL');

ALTER TABLE "titulo" ADD COLUMN IF NOT EXISTS "origem" "OrigemTitulo" NOT NULL DEFAULT 'NF';
ALTER TABLE "titulo" ALTER COLUMN "documento_fiscal_id" DROP NOT NULL;

-- M02: Cenários de orçamento
CREATE TABLE "orcamento_cenario" (
  "id" BIGSERIAL NOT NULL,
  "orcamento_id" BIGINT NOT NULL,
  "sequencia" INTEGER NOT NULL,
  "ativo" BOOLEAN NOT NULL DEFAULT false,
  "label" VARCHAR(120) NOT NULL,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "orcamento_cenario_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "orcamento_cenario_item" (
  "id" BIGSERIAL NOT NULL,
  "cenario_id" BIGINT NOT NULL,
  "sequencia" INTEGER NOT NULL,
  "produto_id" BIGINT,
  "produto_codigo" VARCHAR(40),
  "descricao" VARCHAR(240) NOT NULL,
  "tipo_item" "TipoItemComercial" NOT NULL,
  "quantidade" DECIMAL(18,4) NOT NULL,
  "unidade_codigo" VARCHAR(10) NOT NULL,
  "preco_unitario" DECIMAL(18,4) NOT NULL,
  "desconto_pct" DECIMAL(8,4) NOT NULL DEFAULT 0,
  "valor_total" DECIMAL(18,2) NOT NULL,

  CONSTRAINT "orcamento_cenario_item_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "orcamento_cenario_orcamento_id_sequencia_key" ON "orcamento_cenario"("orcamento_id", "sequencia");
CREATE UNIQUE INDEX "orcamento_cenario_item_cenario_id_sequencia_key" ON "orcamento_cenario_item"("cenario_id", "sequencia");
CREATE INDEX "orcamento_cenario_orcamento_id_ativo_idx" ON "orcamento_cenario"("orcamento_id", "ativo");

ALTER TABLE "orcamento_cenario" ADD CONSTRAINT "orcamento_cenario_orcamento_id_fkey"
  FOREIGN KEY ("orcamento_id") REFERENCES "orcamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "orcamento_cenario_item" ADD CONSTRAINT "orcamento_cenario_item_cenario_id_fkey"
  FOREIGN KEY ("cenario_id") REFERENCES "orcamento_cenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "orcamento" ADD COLUMN IF NOT EXISTS "faca_id" BIGINT;
ALTER TABLE "orcamento" ADD CONSTRAINT "orcamento_faca_id_fkey"
  FOREIGN KEY ("faca_id") REFERENCES "faca"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- M09: Webhook events (Focus + Bank)
CREATE TABLE "webhook_event" (
  "id" BIGSERIAL NOT NULL,
  "provider" VARCHAR(40) NOT NULL,
  "idempotency_key" VARCHAR(120) NOT NULL,
  "payload" JSONB NOT NULL,
  "processado_em" TIMESTAMP(3),
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "webhook_event_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "webhook_event_idempotency_key_key" ON "webhook_event"("idempotency_key");
CREATE INDEX "webhook_event_provider_criado_em_idx" ON "webhook_event"("provider", "criado_em");
