-- M02 Comercial: ORC → aceite → PED

CREATE TYPE "OrcamentoStatus" AS ENUM ('RASCUNHO', 'ENVIADO', 'APROVADO', 'RECUSADO', 'EXPIRADO', 'CANCELADO');
CREATE TYPE "PedidoStatus" AS ENUM ('NOVO', 'AGUARDA_CREDITO', 'AGUARDA_ADIANTAMENTO', 'LIBERADO', 'EM_PRODUCAO', 'EM_SEPARACAO', 'FATURADO_PARCIAL', 'FATURADO', 'ENTREGUE', 'ENCERRADO', 'CANCELADO');
CREATE TYPE "TipoItemComercial" AS ENUM ('PRODUCAO', 'SERVICO', 'REVENDA');
CREATE TYPE "AceiteAcao" AS ENUM ('APROVAR', 'RECUSAR');

CREATE TABLE "orcamento" (
    "id" BIGSERIAL NOT NULL,
    "empresa_id" BIGINT NOT NULL,
    "codigo" VARCHAR(30) NOT NULL,
    "versao" INTEGER NOT NULL DEFAULT 1,
    "parceiro_id" BIGINT NOT NULL,
    "status" "OrcamentoStatus" NOT NULL DEFAULT 'RASCUNHO',
    "condicao_pagamento" VARCHAR(80),
    "prazo_dias" INTEGER NOT NULL DEFAULT 7,
    "observacoes_cliente" TEXT,
    "observacoes_internas" TEXT,
    "gordura_pct" DECIMAL(8,4) NOT NULL DEFAULT 0,
    "desconto_pct" DECIMAL(8,4) NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "valor_imposto_estimado" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "valor_total" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "snapshot_parametros" JSONB,
    "enviado_em" TIMESTAMP(3),
    "aprovado_em" TIMESTAMP(3),
    "recusado_em" TIMESTAMP(3),
    "criado_por_id" BIGINT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "orcamento_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "orcamento_item" (
    "id" BIGSERIAL NOT NULL,
    "orcamento_id" BIGINT NOT NULL,
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
    "custo_interno_unitario" DECIMAL(18,4),
    "spec_json" JSONB,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "orcamento_item_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "aceite_orcamento" (
    "id" BIGSERIAL NOT NULL,
    "orcamento_id" BIGINT NOT NULL,
    "token" VARCHAR(64) NOT NULL,
    "expira_em" TIMESTAMP(3) NOT NULL,
    "usado_em" TIMESTAMP(3),
    "acao" "AceiteAcao",
    "ip" VARCHAR(64),
    "user_agent" VARCHAR(400),
    "motivo_recusa" VARCHAR(400),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "aceite_orcamento_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pedido" (
    "id" BIGSERIAL NOT NULL,
    "empresa_id" BIGINT NOT NULL,
    "codigo" VARCHAR(30) NOT NULL,
    "parceiro_id" BIGINT NOT NULL,
    "orcamento_id" BIGINT NOT NULL,
    "orcamento_codigo" VARCHAR(30) NOT NULL,
    "orcamento_versao" INTEGER NOT NULL,
    "status" "PedidoStatus" NOT NULL DEFAULT 'NOVO',
    "condicao_pagamento" VARCHAR(80),
    "prazo_dias" INTEGER NOT NULL,
    "subtotal" DECIMAL(18,2) NOT NULL,
    "valor_imposto_estimado" DECIMAL(18,2) NOT NULL,
    "valor_total" DECIMAL(18,2) NOT NULL,
    "snapshot_json" JSONB NOT NULL,
    "credito_liberado_em" TIMESTAMP(3),
    "credito_liberado_por_id" BIGINT,
    "credito_motivo" VARCHAR(400),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "pedido_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pedido_item" (
    "id" BIGSERIAL NOT NULL,
    "pedido_id" BIGINT NOT NULL,
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
    "spec_json" JSONB,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pedido_item_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "limite_credito_parceiro" (
    "id" BIGSERIAL NOT NULL,
    "empresa_id" BIGINT NOT NULL,
    "parceiro_id" BIGINT NOT NULL,
    "limite" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "bloqueado" BOOLEAN NOT NULL DEFAULT false,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "limite_credito_parceiro_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "orcamento_empresa_id_codigo_versao_key" ON "orcamento"("empresa_id", "codigo", "versao");
CREATE INDEX "orcamento_empresa_id_status_idx" ON "orcamento"("empresa_id", "status");
CREATE INDEX "orcamento_empresa_id_parceiro_id_idx" ON "orcamento"("empresa_id", "parceiro_id");
CREATE UNIQUE INDEX "orcamento_item_orcamento_id_sequencia_key" ON "orcamento_item"("orcamento_id", "sequencia");
CREATE UNIQUE INDEX "aceite_orcamento_token_key" ON "aceite_orcamento"("token");
CREATE INDEX "aceite_orcamento_orcamento_id_idx" ON "aceite_orcamento"("orcamento_id");
CREATE UNIQUE INDEX "pedido_orcamento_id_key" ON "pedido"("orcamento_id");
CREATE UNIQUE INDEX "pedido_empresa_id_codigo_key" ON "pedido"("empresa_id", "codigo");
CREATE INDEX "pedido_empresa_id_status_idx" ON "pedido"("empresa_id", "status");
CREATE UNIQUE INDEX "pedido_item_pedido_id_sequencia_key" ON "pedido_item"("pedido_id", "sequencia");
CREATE UNIQUE INDEX "limite_credito_parceiro_parceiro_id_key" ON "limite_credito_parceiro"("parceiro_id");
CREATE UNIQUE INDEX "limite_credito_parceiro_empresa_id_parceiro_id_key" ON "limite_credito_parceiro"("empresa_id", "parceiro_id");

ALTER TABLE "orcamento" ADD CONSTRAINT "orcamento_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "orcamento" ADD CONSTRAINT "orcamento_parceiro_id_fkey" FOREIGN KEY ("parceiro_id") REFERENCES "parceiro"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "orcamento_item" ADD CONSTRAINT "orcamento_item_orcamento_id_fkey" FOREIGN KEY ("orcamento_id") REFERENCES "orcamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "aceite_orcamento" ADD CONSTRAINT "aceite_orcamento_orcamento_id_fkey" FOREIGN KEY ("orcamento_id") REFERENCES "orcamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pedido" ADD CONSTRAINT "pedido_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pedido" ADD CONSTRAINT "pedido_parceiro_id_fkey" FOREIGN KEY ("parceiro_id") REFERENCES "parceiro"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pedido" ADD CONSTRAINT "pedido_orcamento_id_fkey" FOREIGN KEY ("orcamento_id") REFERENCES "orcamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pedido_item" ADD CONSTRAINT "pedido_item_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedido"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "limite_credito_parceiro" ADD CONSTRAINT "limite_credito_parceiro_parceiro_id_fkey" FOREIGN KEY ("parceiro_id") REFERENCES "parceiro"("id") ON DELETE CASCADE ON UPDATE CASCADE;
