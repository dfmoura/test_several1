-- M01 Cadastros

CREATE TYPE "TipoPessoa" AS ENUM ('PJ', 'PF', 'ESTRANGEIRO');
CREATE TYPE "SituacaoCadastro" AS ENUM ('ATIVO', 'INATIVO', 'BLOQUEADO');
CREATE TYPE "IndIEDest" AS ENUM ('CONTRIBUINTE', 'ISENTO', 'NAO_CONTRIBUINTE');
CREATE TYPE "TipoEnderecoParceiro" AS ENUM ('FISCAL', 'ENTREGA', 'COBRANCA');
CREATE TYPE "FamiliaProduto" AS ENUM ('MP', 'EMB', 'REV', 'PA', 'SVC');

CREATE TABLE "sequencia_codigo" (
    "id" BIGSERIAL NOT NULL,
    "empresa_id" BIGINT,
    "prefixo" VARCHAR(20) NOT NULL,
    "proximo" BIGINT NOT NULL DEFAULT 1,
    CONSTRAINT "sequencia_codigo_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "parceiro" (
    "id" BIGSERIAL NOT NULL,
    "empresa_id" BIGINT NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "tipo_pessoa" "TipoPessoa" NOT NULL DEFAULT 'PJ',
    "cnpj_cpf" VARCHAR(14),
    "razao_social" VARCHAR(200) NOT NULL,
    "nome_fantasia" VARCHAR(200),
    "inscricao_estadual" VARCHAR(30),
    "inscricao_municipal" VARCHAR(30),
    "ind_ie_dest" "IndIEDest",
    "situacao" "SituacaoCadastro" NOT NULL DEFAULT 'ATIVO',
    "eh_prospect" BOOLEAN NOT NULL DEFAULT false,
    "cadastro_fiscal_completo" BOOLEAN NOT NULL DEFAULT false,
    "papel_cliente" BOOLEAN NOT NULL DEFAULT false,
    "papel_fornecedor" BOOLEAN NOT NULL DEFAULT false,
    "papel_transportadora" BOOLEAN NOT NULL DEFAULT false,
    "papel_colaborador" BOOLEAN NOT NULL DEFAULT false,
    "papel_banco" BOOLEAN NOT NULL DEFAULT false,
    "papel_contador" BOOLEAN NOT NULL DEFAULT false,
    "condicao_pagamento_padrao" VARCHAR(80),
    "forma_pagamento_preferida" VARCHAR(40),
    "observacoes" TEXT,
    "motivo_bloqueio" VARCHAR(400),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    "inativado_em" TIMESTAMP(3),
    CONSTRAINT "parceiro_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "parceiro_endereco" (
    "id" BIGSERIAL NOT NULL,
    "parceiro_id" BIGINT NOT NULL,
    "tipo" "TipoEnderecoParceiro" NOT NULL DEFAULT 'FISCAL',
    "logradouro" VARCHAR(200) NOT NULL,
    "numero" VARCHAR(20) NOT NULL,
    "complemento" VARCHAR(80),
    "bairro" VARCHAR(80) NOT NULL,
    "municipio" VARCHAR(80) NOT NULL,
    "codigo_ibge" VARCHAR(7),
    "uf" CHAR(2) NOT NULL,
    "cep" VARCHAR(8) NOT NULL,
    "principal" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "parceiro_endereco_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "parceiro_contato" (
    "id" BIGSERIAL NOT NULL,
    "parceiro_id" BIGINT NOT NULL,
    "nome" VARCHAR(120) NOT NULL,
    "funcao" VARCHAR(80),
    "telefone" VARCHAR(30),
    "whatsapp" VARCHAR(30),
    "email" VARCHAR(160),
    "email_xml" VARCHAR(160),
    "principal" BOOLEAN NOT NULL DEFAULT false,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "parceiro_contato_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "parceiro_dado_bancario" (
    "id" BIGSERIAL NOT NULL,
    "parceiro_id" BIGINT NOT NULL,
    "banco_codigo" VARCHAR(10) NOT NULL,
    "banco_nome" VARCHAR(120),
    "agencia" VARCHAR(20) NOT NULL,
    "conta" VARCHAR(30) NOT NULL,
    "tipo_conta" VARCHAR(20) NOT NULL DEFAULT 'CORRENTE',
    "pix_chave" VARCHAR(120),
    "pix_tipo" VARCHAR(20),
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "parceiro_dado_bancario_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "unidade_medida" (
    "id" BIGSERIAL NOT NULL,
    "codigo" VARCHAR(10) NOT NULL,
    "nome" VARCHAR(80) NOT NULL,
    "casas_decimais" INTEGER NOT NULL DEFAULT 4,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "unidade_medida_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "produto" (
    "id" BIGSERIAL NOT NULL,
    "empresa_id" BIGINT NOT NULL,
    "codigo" VARCHAR(40) NOT NULL,
    "familia" "FamiliaProduto" NOT NULL,
    "descricao" VARCHAR(240) NOT NULL,
    "ncm" VARCHAR(8),
    "cest" VARCHAR(10),
    "origem" VARCHAR(1) NOT NULL DEFAULT '0',
    "unidade_estoque_id" BIGINT NOT NULL,
    "unidade_comercial_id" BIGINT NOT NULL,
    "controla_estoque" BOOLEAN NOT NULL DEFAULT true,
    "mascara_json" JSONB,
    "csosn_padrao" VARCHAR(4),
    "cfop_padrao_dentro" VARCHAR(4),
    "cfop_padrao_fora" VARCHAR(4),
    "preco_tabela" DECIMAL(18,4),
    "situacao" "SituacaoCadastro" NOT NULL DEFAULT 'ATIVO',
    "observacoes" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    "inativado_em" TIMESTAMP(3),
    CONSTRAINT "produto_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "fator_conversao" (
    "id" BIGSERIAL NOT NULL,
    "produto_id" BIGINT NOT NULL,
    "unidade_de_id" BIGINT NOT NULL,
    "unidade_para_id" BIGINT NOT NULL,
    "fator" DECIMAL(24,10) NOT NULL,
    "vigencia_inicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vigencia_fim" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fator_conversao_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "faca" (
    "id" BIGSERIAL NOT NULL,
    "empresa_id" BIGINT NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "descricao" VARCHAR(200) NOT NULL,
    "modelo_ref" VARCHAR(120),
    "parceiro_cliente_id" BIGINT,
    "ja_cobrado" BOOLEAN NOT NULL DEFAULT false,
    "situacao" "SituacaoCadastro" NOT NULL DEFAULT 'ATIVO',
    "observacoes" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    "inativado_em" TIMESTAMP(3),
    CONSTRAINT "faca_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "sequencia_codigo_empresa_id_prefixo_key" ON "sequencia_codigo"("empresa_id", "prefixo");
CREATE UNIQUE INDEX "parceiro_empresa_id_codigo_key" ON "parceiro"("empresa_id", "codigo");
CREATE UNIQUE INDEX "parceiro_empresa_id_cnpj_cpf_key" ON "parceiro"("empresa_id", "cnpj_cpf");
CREATE INDEX "parceiro_empresa_id_razao_social_idx" ON "parceiro"("empresa_id", "razao_social");
CREATE INDEX "parceiro_empresa_id_situacao_idx" ON "parceiro"("empresa_id", "situacao");
CREATE INDEX "parceiro_endereco_parceiro_id_idx" ON "parceiro_endereco"("parceiro_id");
CREATE INDEX "parceiro_contato_parceiro_id_idx" ON "parceiro_contato"("parceiro_id");
CREATE INDEX "parceiro_dado_bancario_parceiro_id_idx" ON "parceiro_dado_bancario"("parceiro_id");
CREATE UNIQUE INDEX "unidade_medida_codigo_key" ON "unidade_medida"("codigo");
CREATE UNIQUE INDEX "produto_empresa_id_codigo_key" ON "produto"("empresa_id", "codigo");
CREATE INDEX "produto_empresa_id_familia_situacao_idx" ON "produto"("empresa_id", "familia", "situacao");
CREATE INDEX "produto_empresa_id_descricao_idx" ON "produto"("empresa_id", "descricao");
CREATE INDEX "fator_conversao_produto_id_vigencia_inicio_idx" ON "fator_conversao"("produto_id", "vigencia_inicio");
CREATE UNIQUE INDEX "faca_empresa_id_codigo_key" ON "faca"("empresa_id", "codigo");
CREATE INDEX "faca_empresa_id_parceiro_cliente_id_modelo_ref_idx" ON "faca"("empresa_id", "parceiro_cliente_id", "modelo_ref");

ALTER TABLE "sequencia_codigo" ADD CONSTRAINT "sequencia_codigo_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "parceiro" ADD CONSTRAINT "parceiro_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "parceiro_endereco" ADD CONSTRAINT "parceiro_endereco_parceiro_id_fkey" FOREIGN KEY ("parceiro_id") REFERENCES "parceiro"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "parceiro_contato" ADD CONSTRAINT "parceiro_contato_parceiro_id_fkey" FOREIGN KEY ("parceiro_id") REFERENCES "parceiro"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "parceiro_dado_bancario" ADD CONSTRAINT "parceiro_dado_bancario_parceiro_id_fkey" FOREIGN KEY ("parceiro_id") REFERENCES "parceiro"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "produto" ADD CONSTRAINT "produto_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "produto" ADD CONSTRAINT "produto_unidade_estoque_id_fkey" FOREIGN KEY ("unidade_estoque_id") REFERENCES "unidade_medida"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "produto" ADD CONSTRAINT "produto_unidade_comercial_id_fkey" FOREIGN KEY ("unidade_comercial_id") REFERENCES "unidade_medida"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fator_conversao" ADD CONSTRAINT "fator_conversao_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produto"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "fator_conversao" ADD CONSTRAINT "fator_conversao_unidade_de_id_fkey" FOREIGN KEY ("unidade_de_id") REFERENCES "unidade_medida"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fator_conversao" ADD CONSTRAINT "fator_conversao_unidade_para_id_fkey" FOREIGN KEY ("unidade_para_id") REFERENCES "unidade_medida"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "faca" ADD CONSTRAINT "faca_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "faca" ADD CONSTRAINT "faca_parceiro_cliente_id_fkey" FOREIGN KEY ("parceiro_cliente_id") REFERENCES "parceiro"("id") ON DELETE SET NULL ON UPDATE CASCADE;
