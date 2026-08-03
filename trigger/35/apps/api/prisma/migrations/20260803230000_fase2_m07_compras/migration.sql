-- M07 Compras: ENTRADA_COMPRA, AGUARDANDO_MATERIAL, COT/OC/XML entrada

ALTER TYPE "MotivoMovimentoEstoque" ADD VALUE IF NOT EXISTS 'ENTRADA_COMPRA';
ALTER TYPE "OrdemStatus" ADD VALUE IF NOT EXISTS 'AGUARDANDO_MATERIAL';

CREATE TYPE "StatusCotacaoCompra" AS ENUM ('ABERTA', 'DECIDIDA', 'CANCELADA');
CREATE TYPE "StatusOrdemCompra" AS ENUM ('RASCUNHO', 'AGUARDA_ALCADA', 'ABERTA', 'PARCIAL', 'RECEBIDA', 'CANCELADA');
CREATE TYPE "StatusNfeCompra" AS ENUM ('IMPORTADA', 'CONFERIDA', 'ESTORNADA');

ALTER TABLE "ordem_producao"
  ADD COLUMN IF NOT EXISTS "material_falta_produto_id" BIGINT,
  ADD COLUMN IF NOT EXISTS "material_falta_qtde" DECIMAL(18,4),
  ADD COLUMN IF NOT EXISTS "material_falta_obs" VARCHAR(400);

DO $$ BEGIN
  ALTER TABLE "ordem_producao"
    ADD CONSTRAINT "ordem_producao_material_falta_produto_id_fkey"
    FOREIGN KEY ("material_falta_produto_id") REFERENCES "produto"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE "cotacao_compra" (
    "id" BIGSERIAL NOT NULL,
    "empresa_id" BIGINT NOT NULL,
    "codigo" VARCHAR(30) NOT NULL,
    "status" "StatusCotacaoCompra" NOT NULL DEFAULT 'ABERTA',
    "urgente" BOOLEAN NOT NULL DEFAULT false,
    "ordem_producao_id" BIGINT,
    "observacoes" VARCHAR(400),
    "criado_por_id" BIGINT,
    "decidido_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cotacao_compra_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cotacao_compra_item" (
    "id" BIGSERIAL NOT NULL,
    "cotacao_id" BIGINT NOT NULL,
    "produto_id" BIGINT NOT NULL,
    "quantidade" DECIMAL(18,4) NOT NULL,
    "observacoes" VARCHAR(200),

    CONSTRAINT "cotacao_compra_item_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cotacao_proposta" (
    "id" BIGSERIAL NOT NULL,
    "cotacao_id" BIGINT NOT NULL,
    "fornecedor_id" BIGINT NOT NULL,
    "preco_unitario" DECIMAL(18,4) NOT NULL,
    "prazo_dias" INTEGER NOT NULL DEFAULT 7,
    "frete" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "vencedora" BOOLEAN NOT NULL DEFAULT false,
    "observacoes" VARCHAR(200),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cotacao_proposta_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ordem_compra" (
    "id" BIGSERIAL NOT NULL,
    "empresa_id" BIGINT NOT NULL,
    "codigo" VARCHAR(30) NOT NULL,
    "status" "StatusOrdemCompra" NOT NULL DEFAULT 'RASCUNHO',
    "fornecedor_id" BIGINT NOT NULL,
    "cotacao_id" BIGINT,
    "ordem_producao_id" BIGINT,
    "urgente" BOOLEAN NOT NULL DEFAULT false,
    "valor_total" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "aprovado_por_id" BIGINT,
    "aprovado_em" TIMESTAMP(3),
    "observacoes" VARCHAR(400),
    "criado_por_id" BIGINT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ordem_compra_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ordem_compra_item" (
    "id" BIGSERIAL NOT NULL,
    "ordem_compra_id" BIGINT NOT NULL,
    "produto_id" BIGINT NOT NULL,
    "quantidade" DECIMAL(18,4) NOT NULL,
    "preco_unitario" DECIMAL(18,4) NOT NULL,
    "valor_total" DECIMAL(18,2) NOT NULL,
    "qtde_recebida" DECIMAL(18,4) NOT NULL DEFAULT 0,

    CONSTRAINT "ordem_compra_item_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "nfe_compra_entrada" (
    "id" BIGSERIAL NOT NULL,
    "empresa_id" BIGINT NOT NULL,
    "codigo" VARCHAR(30) NOT NULL,
    "status" "StatusNfeCompra" NOT NULL DEFAULT 'IMPORTADA',
    "chave44" VARCHAR(44) NOT NULL,
    "numero" VARCHAR(20),
    "serie" VARCHAR(10),
    "emitente_cnpj" VARCHAR(14) NOT NULL,
    "fornecedor_id" BIGINT,
    "ordem_compra_id" BIGINT,
    "valor_total" DECIMAL(18,2) NOT NULL,
    "emitida_em" TIMESTAMP(3),
    "xml_ref" VARCHAR(400),
    "idempotency_key" VARCHAR(120) NOT NULL,
    "conferido_por_id" BIGINT,
    "conferido_em" TIMESTAMP(3),
    "criado_por_id" BIGINT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nfe_compra_entrada_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "nfe_compra_item" (
    "id" BIGSERIAL NOT NULL,
    "nfe_compra_id" BIGINT NOT NULL,
    "sequencia" INTEGER NOT NULL,
    "c_prod" VARCHAR(60) NOT NULL,
    "descricao" VARCHAR(240) NOT NULL,
    "ncm" VARCHAR(8),
    "unidade" VARCHAR(10) NOT NULL,
    "quantidade" DECIMAL(18,4) NOT NULL,
    "valor_unitario" DECIMAL(18,4) NOT NULL,
    "valor_total" DECIMAL(18,2) NOT NULL,
    "produto_id" BIGINT,
    "movimento_id" BIGINT,

    CONSTRAINT "nfe_compra_item_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "cotacao_compra_empresa_id_codigo_key" ON "cotacao_compra"("empresa_id", "codigo");
CREATE INDEX "cotacao_compra_empresa_id_status_idx" ON "cotacao_compra"("empresa_id", "status");
CREATE INDEX "cotacao_compra_item_cotacao_id_idx" ON "cotacao_compra_item"("cotacao_id");
CREATE INDEX "cotacao_proposta_cotacao_id_idx" ON "cotacao_proposta"("cotacao_id");

CREATE UNIQUE INDEX "ordem_compra_empresa_id_codigo_key" ON "ordem_compra"("empresa_id", "codigo");
CREATE INDEX "ordem_compra_empresa_id_status_idx" ON "ordem_compra"("empresa_id", "status");
CREATE INDEX "ordem_compra_item_ordem_compra_id_idx" ON "ordem_compra_item"("ordem_compra_id");

CREATE UNIQUE INDEX "nfe_compra_entrada_chave44_key" ON "nfe_compra_entrada"("chave44");
CREATE UNIQUE INDEX "nfe_compra_entrada_idempotency_key_key" ON "nfe_compra_entrada"("idempotency_key");
CREATE UNIQUE INDEX "nfe_compra_entrada_empresa_id_codigo_key" ON "nfe_compra_entrada"("empresa_id", "codigo");
CREATE INDEX "nfe_compra_entrada_empresa_id_status_idx" ON "nfe_compra_entrada"("empresa_id", "status");
CREATE UNIQUE INDEX "nfe_compra_item_nfe_compra_id_sequencia_key" ON "nfe_compra_item"("nfe_compra_id", "sequencia");

ALTER TABLE "cotacao_compra" ADD CONSTRAINT "cotacao_compra_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cotacao_compra" ADD CONSTRAINT "cotacao_compra_ordem_producao_id_fkey" FOREIGN KEY ("ordem_producao_id") REFERENCES "ordem_producao"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cotacao_compra_item" ADD CONSTRAINT "cotacao_compra_item_cotacao_id_fkey" FOREIGN KEY ("cotacao_id") REFERENCES "cotacao_compra"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cotacao_compra_item" ADD CONSTRAINT "cotacao_compra_item_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cotacao_proposta" ADD CONSTRAINT "cotacao_proposta_cotacao_id_fkey" FOREIGN KEY ("cotacao_id") REFERENCES "cotacao_compra"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cotacao_proposta" ADD CONSTRAINT "cotacao_proposta_fornecedor_id_fkey" FOREIGN KEY ("fornecedor_id") REFERENCES "parceiro"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ordem_compra" ADD CONSTRAINT "ordem_compra_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ordem_compra" ADD CONSTRAINT "ordem_compra_fornecedor_id_fkey" FOREIGN KEY ("fornecedor_id") REFERENCES "parceiro"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ordem_compra" ADD CONSTRAINT "ordem_compra_cotacao_id_fkey" FOREIGN KEY ("cotacao_id") REFERENCES "cotacao_compra"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ordem_compra" ADD CONSTRAINT "ordem_compra_ordem_producao_id_fkey" FOREIGN KEY ("ordem_producao_id") REFERENCES "ordem_producao"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ordem_compra_item" ADD CONSTRAINT "ordem_compra_item_ordem_compra_id_fkey" FOREIGN KEY ("ordem_compra_id") REFERENCES "ordem_compra"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ordem_compra_item" ADD CONSTRAINT "ordem_compra_item_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "nfe_compra_entrada" ADD CONSTRAINT "nfe_compra_entrada_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "nfe_compra_entrada" ADD CONSTRAINT "nfe_compra_entrada_fornecedor_id_fkey" FOREIGN KEY ("fornecedor_id") REFERENCES "parceiro"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "nfe_compra_entrada" ADD CONSTRAINT "nfe_compra_entrada_ordem_compra_id_fkey" FOREIGN KEY ("ordem_compra_id") REFERENCES "ordem_compra"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "nfe_compra_item" ADD CONSTRAINT "nfe_compra_item_nfe_compra_id_fkey" FOREIGN KEY ("nfe_compra_id") REFERENCES "nfe_compra_entrada"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "nfe_compra_item" ADD CONSTRAINT "nfe_compra_item_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produto"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "nfe_compra_item" ADD CONSTRAINT "nfe_compra_item_movimento_id_fkey" FOREIGN KEY ("movimento_id") REFERENCES "movimento_estoque"("id") ON DELETE SET NULL ON UPDATE CASCADE;
