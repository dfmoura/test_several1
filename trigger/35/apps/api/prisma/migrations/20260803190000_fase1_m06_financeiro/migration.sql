-- M06 Financeiro dia-1: TIT + BX manual

CREATE TYPE "TipoTitulo" AS ENUM ('RECEBER', 'PAGAR');
CREATE TYPE "StatusTitulo" AS ENUM ('ABERTO', 'COBRADO', 'PARCIALMENTE_BAIXADO', 'BAIXADO', 'PERDA', 'CANCELADO');

CREATE TABLE "titulo" (
    "id" BIGSERIAL NOT NULL,
    "empresa_id" BIGINT NOT NULL,
    "codigo" VARCHAR(30) NOT NULL,
    "tipo" "TipoTitulo" NOT NULL DEFAULT 'RECEBER',
    "status" "StatusTitulo" NOT NULL DEFAULT 'ABERTO',
    "pedido_id" BIGINT NOT NULL,
    "documento_fiscal_id" BIGINT NOT NULL,
    "parceiro_id" BIGINT NOT NULL,
    "natureza_gerencial" VARCHAR(20) NOT NULL,
    "valor_original" DECIMAL(18,2) NOT NULL,
    "valor_aberto" DECIMAL(18,2) NOT NULL,
    "valor_baixado" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "vencimento_em" DATE NOT NULL,
    "observacoes" VARCHAR(400),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "titulo_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "baixa_titulo" (
    "id" BIGSERIAL NOT NULL,
    "empresa_id" BIGINT NOT NULL,
    "codigo" VARCHAR(30) NOT NULL,
    "titulo_id" BIGINT NOT NULL,
    "valor" DECIMAL(18,2) NOT NULL,
    "baixado_em" DATE NOT NULL,
    "forma" VARCHAR(40) NOT NULL DEFAULT 'MANUAL',
    "idempotency_key" VARCHAR(120) NOT NULL,
    "observacoes" VARCHAR(400),
    "criado_por_id" BIGINT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "baixa_titulo_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "titulo_documento_fiscal_id_key" ON "titulo"("documento_fiscal_id");
CREATE UNIQUE INDEX "titulo_empresa_id_codigo_key" ON "titulo"("empresa_id", "codigo");
CREATE INDEX "titulo_empresa_id_status_idx" ON "titulo"("empresa_id", "status");
CREATE INDEX "titulo_empresa_id_parceiro_id_idx" ON "titulo"("empresa_id", "parceiro_id");
CREATE INDEX "titulo_empresa_id_vencimento_em_idx" ON "titulo"("empresa_id", "vencimento_em");

CREATE UNIQUE INDEX "baixa_titulo_idempotency_key_key" ON "baixa_titulo"("idempotency_key");
CREATE UNIQUE INDEX "baixa_titulo_empresa_id_codigo_key" ON "baixa_titulo"("empresa_id", "codigo");
CREATE INDEX "baixa_titulo_titulo_id_idx" ON "baixa_titulo"("titulo_id");

ALTER TABLE "titulo" ADD CONSTRAINT "titulo_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "titulo" ADD CONSTRAINT "titulo_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedido"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "titulo" ADD CONSTRAINT "titulo_documento_fiscal_id_fkey" FOREIGN KEY ("documento_fiscal_id") REFERENCES "documento_fiscal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "titulo" ADD CONSTRAINT "titulo_parceiro_id_fkey" FOREIGN KEY ("parceiro_id") REFERENCES "parceiro"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "baixa_titulo" ADD CONSTRAINT "baixa_titulo_titulo_id_fkey" FOREIGN KEY ("titulo_id") REFERENCES "titulo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
