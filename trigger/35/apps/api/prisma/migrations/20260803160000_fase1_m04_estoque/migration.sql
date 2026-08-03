-- M04 Estoque dia-1: MOV imutável + saldo materializado

CREATE TYPE "TipoMovimentoEstoque" AS ENUM ('ENTRADA', 'SAIDA');
CREATE TYPE "MotivoMovimentoEstoque" AS ENUM ('ENTRADA_INICIAL', 'AJUSTE_INVENTARIO', 'SEPARACAO_PEDIDO');

CREATE TABLE "movimento_estoque" (
    "id" BIGSERIAL NOT NULL,
    "empresa_id" BIGINT NOT NULL,
    "codigo" VARCHAR(30) NOT NULL,
    "produto_id" BIGINT NOT NULL,
    "tipo" "TipoMovimentoEstoque" NOT NULL,
    "motivo" "MotivoMovimentoEstoque" NOT NULL,
    "quantidade" DECIMAL(18,4) NOT NULL,
    "custo_unitario" DECIMAL(18,4) NOT NULL,
    "custo_total" DECIMAL(18,4) NOT NULL,
    "saldo_apos" DECIMAL(18,4) NOT NULL,
    "custo_medio_apos" DECIMAL(18,4) NOT NULL,
    "pedido_id" BIGINT,
    "pedido_item_id" BIGINT,
    "motivo_texto" VARCHAR(400),
    "criado_por_id" BIGINT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimento_estoque_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "saldo_estoque" (
    "id" BIGSERIAL NOT NULL,
    "empresa_id" BIGINT NOT NULL,
    "produto_id" BIGINT NOT NULL,
    "quantidade" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "custo_medio" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saldo_estoque_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "movimento_estoque_empresa_id_codigo_key" ON "movimento_estoque"("empresa_id", "codigo");
CREATE INDEX "movimento_estoque_empresa_id_produto_id_criado_em_idx" ON "movimento_estoque"("empresa_id", "produto_id", "criado_em");
CREATE INDEX "movimento_estoque_empresa_id_pedido_id_idx" ON "movimento_estoque"("empresa_id", "pedido_id");
CREATE INDEX "movimento_estoque_pedido_item_id_idx" ON "movimento_estoque"("pedido_item_id");

CREATE UNIQUE INDEX "saldo_estoque_empresa_id_produto_id_key" ON "saldo_estoque"("empresa_id", "produto_id");
CREATE INDEX "saldo_estoque_empresa_id_quantidade_idx" ON "saldo_estoque"("empresa_id", "quantidade");

ALTER TABLE "movimento_estoque" ADD CONSTRAINT "movimento_estoque_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "movimento_estoque" ADD CONSTRAINT "movimento_estoque_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "movimento_estoque" ADD CONSTRAINT "movimento_estoque_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedido"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "movimento_estoque" ADD CONSTRAINT "movimento_estoque_pedido_item_id_fkey" FOREIGN KEY ("pedido_item_id") REFERENCES "pedido_item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "saldo_estoque" ADD CONSTRAINT "saldo_estoque_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "saldo_estoque" ADD CONSTRAINT "saldo_estoque_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produto"("id") ON DELETE CASCADE ON UPDATE CASCADE;
