-- M06 COB stub bancário

CREATE TYPE "StatusCobranca" AS ENUM ('PENDENTE', 'REGISTRADA', 'PAGA', 'CANCELADA', 'VENCIDA');

CREATE TABLE "cobranca" (
    "id" BIGSERIAL NOT NULL,
    "empresa_id" BIGINT NOT NULL,
    "codigo" VARCHAR(30) NOT NULL,
    "titulo_id" BIGINT NOT NULL,
    "status" "StatusCobranca" NOT NULL DEFAULT 'PENDENTE',
    "valor" DECIMAL(18,2) NOT NULL,
    "vencimento_em" DATE NOT NULL,
    "nosso_numero" VARCHAR(40),
    "linha_digitavel" VARCHAR(60),
    "pdf_ref" VARCHAR(400),
    "adapter" VARCHAR(20) NOT NULL DEFAULT 'stub',
    "idempotency_key" VARCHAR(120) NOT NULL,
    "payload_retorno" JSONB,
    "registrado_em" TIMESTAMP(3),
    "criado_por_id" BIGINT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "cobranca_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "cobranca_idempotency_key_key" ON "cobranca"("idempotency_key");
CREATE UNIQUE INDEX "cobranca_empresa_id_codigo_key" ON "cobranca"("empresa_id", "codigo");
CREATE INDEX "cobranca_titulo_id_idx" ON "cobranca"("titulo_id");
CREATE INDEX "cobranca_empresa_id_status_idx" ON "cobranca"("empresa_id", "status");

ALTER TABLE "cobranca" ADD CONSTRAINT "cobranca_titulo_id_fkey" FOREIGN KEY ("titulo_id") REFERENCES "titulo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
