-- M05 Fiscal dia-1: DocumentoFiscal + itens (sem TIT)

CREATE TYPE "TipoDocumentoFiscal" AS ENUM ('NFE', 'NFSE');
CREATE TYPE "StatusDocumentoFiscal" AS ENUM ('PROCESSANDO', 'AUTORIZADA', 'REJEITADA', 'CANCELADA');

CREATE TABLE "documento_fiscal" (
    "id" BIGSERIAL NOT NULL,
    "empresa_id" BIGINT NOT NULL,
    "codigo" VARCHAR(30) NOT NULL,
    "tipo" "TipoDocumentoFiscal" NOT NULL,
    "status" "StatusDocumentoFiscal" NOT NULL DEFAULT 'PROCESSANDO',
    "pedido_id" BIGINT NOT NULL,
    "serie" VARCHAR(10),
    "numero" VARCHAR(20),
    "chave44" VARCHAR(44),
    "protocolo" VARCHAR(60),
    "valor_total" DECIMAL(18,2) NOT NULL,
    "natureza_operacao" VARCHAR(120) NOT NULL DEFAULT 'VENDA',
    "idempotency_key" VARCHAR(120) NOT NULL,
    "focus_ref" VARCHAR(80),
    "adapter" VARCHAR(20) NOT NULL DEFAULT 'stub',
    "xml_ref" VARCHAR(400),
    "pdf_ref" VARCHAR(400),
    "rejeicao_codigo" VARCHAR(40),
    "rejeicao_motivo" VARCHAR(400),
    "payload_envio" JSONB,
    "payload_retorno" JSONB,
    "emitido_por_id" BIGINT,
    "autorizado_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "documento_fiscal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "documento_fiscal_item" (
    "id" BIGSERIAL NOT NULL,
    "documento_fiscal_id" BIGINT NOT NULL,
    "pedido_item_id" BIGINT NOT NULL,
    "sequencia" INTEGER NOT NULL,
    "produto_codigo" VARCHAR(40),
    "descricao" VARCHAR(240) NOT NULL,
    "tipo_item" "TipoItemComercial" NOT NULL,
    "quantidade" DECIMAL(18,4) NOT NULL,
    "unidade_codigo" VARCHAR(10) NOT NULL,
    "valor_unitario" DECIMAL(18,4) NOT NULL,
    "valor_total" DECIMAL(18,2) NOT NULL,
    "cfop" VARCHAR(4),
    "csosn" VARCHAR(4),
    CONSTRAINT "documento_fiscal_item_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "documento_fiscal_chave44_key" ON "documento_fiscal"("chave44");
CREATE UNIQUE INDEX "documento_fiscal_idempotency_key_key" ON "documento_fiscal"("idempotency_key");
CREATE UNIQUE INDEX "documento_fiscal_empresa_id_codigo_key" ON "documento_fiscal"("empresa_id", "codigo");
CREATE INDEX "documento_fiscal_empresa_id_status_idx" ON "documento_fiscal"("empresa_id", "status");
CREATE INDEX "documento_fiscal_empresa_id_pedido_id_idx" ON "documento_fiscal"("empresa_id", "pedido_id");

CREATE UNIQUE INDEX "documento_fiscal_item_documento_fiscal_id_sequencia_key" ON "documento_fiscal_item"("documento_fiscal_id", "sequencia");
CREATE INDEX "documento_fiscal_item_pedido_item_id_idx" ON "documento_fiscal_item"("pedido_item_id");

ALTER TABLE "documento_fiscal" ADD CONSTRAINT "documento_fiscal_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "documento_fiscal" ADD CONSTRAINT "documento_fiscal_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedido"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "documento_fiscal_item" ADD CONSTRAINT "documento_fiscal_item_documento_fiscal_id_fkey" FOREIGN KEY ("documento_fiscal_id") REFERENCES "documento_fiscal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "documento_fiscal_item" ADD CONSTRAINT "documento_fiscal_item_pedido_item_id_fkey" FOREIGN KEY ("pedido_item_id") REFERENCES "pedido_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
