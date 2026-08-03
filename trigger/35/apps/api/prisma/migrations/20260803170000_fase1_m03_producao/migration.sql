-- M03 Produção dia-1: OP / OS + apontamento; motivos MOV CONSUMO_OP / RETORNO_PA

ALTER TYPE "MotivoMovimentoEstoque" ADD VALUE IF NOT EXISTS 'CONSUMO_OP';
ALTER TYPE "MotivoMovimentoEstoque" ADD VALUE IF NOT EXISTS 'RETORNO_PA';

CREATE TYPE "OrdemStatus" AS ENUM ('ABERTA', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA');

CREATE TABLE "ordem_producao" (
    "id" BIGSERIAL NOT NULL,
    "empresa_id" BIGINT NOT NULL,
    "codigo" VARCHAR(30) NOT NULL,
    "pedido_id" BIGINT NOT NULL,
    "pedido_item_id" BIGINT NOT NULL,
    "status" "OrdemStatus" NOT NULL DEFAULT 'ABERTA',
    "quantidade_planejada" DECIMAL(18,4) NOT NULL,
    "quantidade_apontada" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "quantidade_pa_retornada" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "snapshot_json" JSONB NOT NULL,
    "criado_por_id" BIGINT,
    "iniciado_em" TIMESTAMP(3),
    "concluido_em" TIMESTAMP(3),
    "cancelado_em" TIMESTAMP(3),
    "motivo_cancelamento" VARCHAR(400),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ordem_producao_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ordem_servico" (
    "id" BIGSERIAL NOT NULL,
    "empresa_id" BIGINT NOT NULL,
    "codigo" VARCHAR(30) NOT NULL,
    "pedido_id" BIGINT NOT NULL,
    "pedido_item_id" BIGINT NOT NULL,
    "status" "OrdemStatus" NOT NULL DEFAULT 'ABERTA',
    "quantidade_planejada" DECIMAL(18,4) NOT NULL,
    "quantidade_apontada" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "snapshot_json" JSONB NOT NULL,
    "criado_por_id" BIGINT,
    "iniciado_em" TIMESTAMP(3),
    "concluido_em" TIMESTAMP(3),
    "cancelado_em" TIMESTAMP(3),
    "motivo_cancelamento" VARCHAR(400),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ordem_servico_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "apontamento_ordem" (
    "id" BIGSERIAL NOT NULL,
    "ordem_producao_id" BIGINT,
    "ordem_servico_id" BIGINT,
    "quantidade" DECIMAL(18,4) NOT NULL,
    "observacao" VARCHAR(400),
    "criado_por_id" BIGINT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "apontamento_ordem_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "movimento_estoque" ADD COLUMN "ordem_producao_id" BIGINT;

CREATE UNIQUE INDEX "ordem_producao_pedido_item_id_key" ON "ordem_producao"("pedido_item_id");
CREATE UNIQUE INDEX "ordem_producao_empresa_id_codigo_key" ON "ordem_producao"("empresa_id", "codigo");
CREATE INDEX "ordem_producao_empresa_id_status_idx" ON "ordem_producao"("empresa_id", "status");
CREATE INDEX "ordem_producao_empresa_id_pedido_id_idx" ON "ordem_producao"("empresa_id", "pedido_id");

CREATE UNIQUE INDEX "ordem_servico_pedido_item_id_key" ON "ordem_servico"("pedido_item_id");
CREATE UNIQUE INDEX "ordem_servico_empresa_id_codigo_key" ON "ordem_servico"("empresa_id", "codigo");
CREATE INDEX "ordem_servico_empresa_id_status_idx" ON "ordem_servico"("empresa_id", "status");
CREATE INDEX "ordem_servico_empresa_id_pedido_id_idx" ON "ordem_servico"("empresa_id", "pedido_id");

CREATE INDEX "apontamento_ordem_ordem_producao_id_idx" ON "apontamento_ordem"("ordem_producao_id");
CREATE INDEX "apontamento_ordem_ordem_servico_id_idx" ON "apontamento_ordem"("ordem_servico_id");
CREATE INDEX "movimento_estoque_ordem_producao_id_idx" ON "movimento_estoque"("ordem_producao_id");

ALTER TABLE "ordem_producao" ADD CONSTRAINT "ordem_producao_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ordem_producao" ADD CONSTRAINT "ordem_producao_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedido"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ordem_producao" ADD CONSTRAINT "ordem_producao_pedido_item_id_fkey" FOREIGN KEY ("pedido_item_id") REFERENCES "pedido_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ordem_servico" ADD CONSTRAINT "ordem_servico_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ordem_servico" ADD CONSTRAINT "ordem_servico_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedido"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ordem_servico" ADD CONSTRAINT "ordem_servico_pedido_item_id_fkey" FOREIGN KEY ("pedido_item_id") REFERENCES "pedido_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "apontamento_ordem" ADD CONSTRAINT "apontamento_ordem_ordem_producao_id_fkey" FOREIGN KEY ("ordem_producao_id") REFERENCES "ordem_producao"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "apontamento_ordem" ADD CONSTRAINT "apontamento_ordem_ordem_servico_id_fkey" FOREIGN KEY ("ordem_servico_id") REFERENCES "ordem_servico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "movimento_estoque" ADD CONSTRAINT "movimento_estoque_ordem_producao_id_fkey" FOREIGN KEY ("ordem_producao_id") REFERENCES "ordem_producao"("id") ON DELETE SET NULL ON UPDATE CASCADE;
