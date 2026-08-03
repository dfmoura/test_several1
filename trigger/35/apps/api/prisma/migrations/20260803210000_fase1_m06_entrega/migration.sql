-- M06 ENT / romaneio mínimo

CREATE TYPE "StatusEntrega" AS ENUM ('DESPACHADA', 'ENTREGUE', 'CANCELADA');

CREATE TABLE "entrega" (
    "id" BIGSERIAL NOT NULL,
    "empresa_id" BIGINT NOT NULL,
    "codigo" VARCHAR(30) NOT NULL,
    "pedido_id" BIGINT NOT NULL,
    "status" "StatusEntrega" NOT NULL DEFAULT 'DESPACHADA',
    "volumes" INTEGER NOT NULL DEFAULT 1,
    "observacoes" VARCHAR(400),
    "despachado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "entregue_em" TIMESTAMP(3),
    "criado_por_id" BIGINT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "entrega_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "entrega_empresa_id_codigo_key" ON "entrega"("empresa_id", "codigo");
CREATE INDEX "entrega_empresa_id_pedido_id_idx" ON "entrega"("empresa_id", "pedido_id");
CREATE INDEX "entrega_empresa_id_status_idx" ON "entrega"("empresa_id", "status");

ALTER TABLE "entrega" ADD CONSTRAINT "entrega_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "entrega" ADD CONSTRAINT "entrega_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedido"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
