-- CreateSchema
CREATE EXTENSION IF NOT EXISTS "citext";

-- CreateEnum
CREATE TYPE "UsuarioStatus" AS ENUM ('ATIVO', 'BLOQUEADO', 'INATIVO');

-- CreateEnum
CREATE TYPE "ParametroStatusRatificacao" AS ENUM ('PENDENTE_RATIFICACAO', 'RATIFICADO', 'FIXO');

-- CreateEnum
CREATE TYPE "OutboxStatus" AS ENUM ('PENDENTE', 'PUBLICADO', 'ERRO');

-- CreateTable
CREATE TABLE "empresa" (
    "id" BIGSERIAL NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "razao_social" VARCHAR(200) NOT NULL,
    "nome_fantasia" VARCHAR(200),
    "cnpj" VARCHAR(14) NOT NULL,
    "uf" CHAR(2) NOT NULL,
    "regime_tributario" VARCHAR(40) NOT NULL DEFAULT 'SIMPLES_NACIONAL',
    "venda_ativa" BOOLEAN NOT NULL DEFAULT true,
    "estoque_ativo" BOOLEAN NOT NULL DEFAULT true,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "empresa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuario" (
    "id" BIGSERIAL NOT NULL,
    "email" CITEXT NOT NULL,
    "nome" VARCHAR(160) NOT NULL,
    "senha_hash" VARCHAR(255) NOT NULL,
    "status" "UsuarioStatus" NOT NULL DEFAULT 'ATIVO',
    "mfa_obrigatorio" BOOLEAN NOT NULL DEFAULT false,
    "ultimo_login_em" TIMESTAMP(3),
    "falhas_login" INTEGER NOT NULL DEFAULT 0,
    "bloqueado_ate" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    "inativado_em" TIMESTAMP(3),

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "perfil" (
    "id" BIGSERIAL NOT NULL,
    "codigo" VARCHAR(40) NOT NULL,
    "nome" VARCHAR(120) NOT NULL,
    "descricao" VARCHAR(400),
    "sistema" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "perfil_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissao" (
    "id" BIGSERIAL NOT NULL,
    "codigo" VARCHAR(80) NOT NULL,
    "modulo" VARCHAR(40) NOT NULL,
    "descricao" VARCHAR(200) NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "perfil_permissao" (
    "perfil_id" BIGINT NOT NULL,
    "permissao_id" BIGINT NOT NULL,

    CONSTRAINT "perfil_permissao_pkey" PRIMARY KEY ("perfil_id","permissao_id")
);

-- CreateTable
CREATE TABLE "usuario_perfil" (
    "usuario_id" BIGINT NOT NULL,
    "perfil_id" BIGINT NOT NULL,

    CONSTRAINT "usuario_perfil_pkey" PRIMARY KEY ("usuario_id","perfil_id")
);

-- CreateTable
CREATE TABLE "usuario_empresa" (
    "usuario_id" BIGINT NOT NULL,
    "empresa_id" BIGINT NOT NULL,
    "padrao" BOOLEAN NOT NULL DEFAULT false,
    "acesso_ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "usuario_empresa_pkey" PRIMARY KEY ("usuario_id","empresa_id")
);

-- CreateTable
CREATE TABLE "sod_par" (
    "id" BIGSERIAL NOT NULL,
    "perfil_a_id" BIGINT NOT NULL,
    "perfil_b_id" BIGINT NOT NULL,
    "motivo" VARCHAR(400) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "sod_par_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessao" (
    "id" BIGSERIAL NOT NULL,
    "usuario_id" BIGINT NOT NULL,
    "empresa_id" BIGINT NOT NULL,
    "token_jti" VARCHAR(64) NOT NULL,
    "ip" VARCHAR(64),
    "user_agent" VARCHAR(400),
    "criada_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expira_em" TIMESTAMP(3) NOT NULL,
    "revogada_em" TIMESTAMP(3),

    CONSTRAINT "sessao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parametro_empresa" (
    "id" BIGSERIAL NOT NULL,
    "empresa_id" BIGINT NOT NULL,
    "chave" VARCHAR(80) NOT NULL,
    "valor" TEXT NOT NULL,
    "tipo" VARCHAR(20) NOT NULL DEFAULT 'STRING',
    "descricao" VARCHAR(400),
    "status_ratificacao" "ParametroStatusRatificacao" NOT NULL DEFAULT 'PENDENTE_RATIFICACAO',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parametro_empresa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" BIGSERIAL NOT NULL,
    "ocorrido_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "empresa_id" BIGINT,
    "usuario_id" BIGINT,
    "acao" VARCHAR(80) NOT NULL,
    "entidade" VARCHAR(80) NOT NULL,
    "entidade_id" VARCHAR(64),
    "de_json" JSONB,
    "para_json" JSONB,
    "ip" VARCHAR(64),
    "correlation_id" VARCHAR(64),
    "sucesso" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_event" (
    "id" BIGSERIAL NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "empresa_id" BIGINT,
    "tipo" VARCHAR(120) NOT NULL,
    "agregado_tipo" VARCHAR(80) NOT NULL,
    "agregado_id" VARCHAR(64) NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "OutboxStatus" NOT NULL DEFAULT 'PENDENTE',
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "publicado_em" TIMESTAMP(3),
    "ultimo_erro" TEXT,
    "idempotency_key" VARCHAR(120),

    CONSTRAINT "outbox_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "empresa_codigo_key" ON "empresa"("codigo");
CREATE UNIQUE INDEX "empresa_cnpj_key" ON "empresa"("cnpj");
CREATE UNIQUE INDEX "usuario_email_key" ON "usuario"("email");
CREATE UNIQUE INDEX "perfil_codigo_key" ON "perfil"("codigo");
CREATE UNIQUE INDEX "permissao_codigo_key" ON "permissao"("codigo");
CREATE UNIQUE INDEX "sod_par_perfil_a_id_perfil_b_id_key" ON "sod_par"("perfil_a_id", "perfil_b_id");
CREATE UNIQUE INDEX "sessao_token_jti_key" ON "sessao"("token_jti");
CREATE INDEX "sessao_usuario_id_revogada_em_idx" ON "sessao"("usuario_id", "revogada_em");
CREATE UNIQUE INDEX "parametro_empresa_empresa_id_chave_key" ON "parametro_empresa"("empresa_id", "chave");
CREATE INDEX "audit_log_empresa_id_ocorrido_em_idx" ON "audit_log"("empresa_id", "ocorrido_em");
CREATE INDEX "audit_log_entidade_entidade_id_idx" ON "audit_log"("entidade", "entidade_id");
CREATE INDEX "outbox_event_status_criado_em_idx" ON "outbox_event"("status", "criado_em");
CREATE UNIQUE INDEX "outbox_event_idempotency_key_key" ON "outbox_event"("idempotency_key");

-- AddForeignKey
ALTER TABLE "perfil_permissao" ADD CONSTRAINT "perfil_permissao_perfil_id_fkey" FOREIGN KEY ("perfil_id") REFERENCES "perfil"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "perfil_permissao" ADD CONSTRAINT "perfil_permissao_permissao_id_fkey" FOREIGN KEY ("permissao_id") REFERENCES "permissao"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "usuario_perfil" ADD CONSTRAINT "usuario_perfil_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "usuario_perfil" ADD CONSTRAINT "usuario_perfil_perfil_id_fkey" FOREIGN KEY ("perfil_id") REFERENCES "perfil"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "usuario_empresa" ADD CONSTRAINT "usuario_empresa_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "usuario_empresa" ADD CONSTRAINT "usuario_empresa_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sod_par" ADD CONSTRAINT "sod_par_perfil_a_id_fkey" FOREIGN KEY ("perfil_a_id") REFERENCES "perfil"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sod_par" ADD CONSTRAINT "sod_par_perfil_b_id_fkey" FOREIGN KEY ("perfil_b_id") REFERENCES "perfil"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sessao" ADD CONSTRAINT "sessao_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sessao" ADD CONSTRAINT "sessao_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "parametro_empresa" ADD CONSTRAINT "parametro_empresa_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
