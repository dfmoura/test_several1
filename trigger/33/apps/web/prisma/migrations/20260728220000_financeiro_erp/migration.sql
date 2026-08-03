-- Financeiro ERP: ContaBancaria, TituloPagar, MovimentoBancario, Conciliacao + enhancements AR

-- TituloReceber: parcial + valorPago + observacao + FK empresa
ALTER TYPE "TituloReceberStatus" ADD VALUE IF NOT EXISTS 'PARCIAL';

CREATE TYPE "TituloPagarStatus" AS ENUM ('ABERTO', 'PAGO', 'VENCIDO', 'CANCELADO', 'PARCIAL');
CREATE TYPE "ContaBancariaTipo" AS ENUM ('CORRENTE', 'POUPANCA', 'PAGAMENTO');
CREATE TYPE "MovimentoBancarioTipo" AS ENUM ('CREDITO', 'DEBITO');
CREATE TYPE "MovimentoBancarioOrigem" AS ENUM ('EXTRATO_INTER', 'BAIXA_RECEBER', 'BAIXA_PAGAR', 'MANUAL', 'AJUSTE');
CREATE TYPE "ConciliacaoStatus" AS ENUM ('PENDENTE', 'CONCILIADO', 'IGNORADO');

ALTER TABLE "TituloReceber" ADD COLUMN IF NOT EXISTS "valorPago" DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE "TituloReceber" ADD COLUMN IF NOT EXISTS "observacao" TEXT;

DO $$ BEGIN
  ALTER TABLE "TituloReceber"
    ADD CONSTRAINT "TituloReceber_empresaId_fkey"
    FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "ContaBancaria" (
  "id" TEXT NOT NULL,
  "empresaId" TEXT NOT NULL,
  "bancoCodigo" TEXT NOT NULL DEFAULT '077',
  "bancoNome" TEXT NOT NULL DEFAULT 'Banco Inter',
  "agencia" TEXT,
  "conta" TEXT,
  "tipo" "ContaBancariaTipo" NOT NULL DEFAULT 'CORRENTE',
  "apelido" TEXT NOT NULL DEFAULT 'Conta Inter PJ',
  "principal" BOOLEAN NOT NULL DEFAULT true,
  "ativa" BOOLEAN NOT NULL DEFAULT true,
  "saldoDisponivel" DECIMAL(14,2),
  "saldoBloqueado" DECIMAL(14,2),
  "saldoConsultadoEm" TIMESTAMP(3),
  "simulado" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ContaBancaria_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TituloPagar" (
  "id" TEXT NOT NULL,
  "empresaId" TEXT NOT NULL,
  "pedidoCompraId" TEXT,
  "documentoEntradaId" TEXT,
  "fornecedorId" TEXT,
  "fornecedorNome" TEXT NOT NULL,
  "fornecedorDoc" TEXT,
  "descricao" TEXT NOT NULL,
  "valor" DECIMAL(14,2) NOT NULL,
  "valorPago" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "vencimento" TIMESTAMP(3) NOT NULL,
  "status" "TituloPagarStatus" NOT NULL DEFAULT 'ABERTO',
  "pagoEm" TIMESTAMP(3),
  "observacao" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TituloPagar_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "MovimentoBancario" (
  "id" TEXT NOT NULL,
  "empresaId" TEXT NOT NULL,
  "contaBancariaId" TEXT NOT NULL,
  "dataEntrada" TIMESTAMP(3) NOT NULL,
  "tipoOperacao" "MovimentoBancarioTipo" NOT NULL,
  "tipoTransacao" TEXT NOT NULL,
  "valor" DECIMAL(14,2) NOT NULL,
  "titulo" TEXT NOT NULL,
  "descricao" TEXT NOT NULL,
  "hashExterno" TEXT,
  "origem" "MovimentoBancarioOrigem" NOT NULL DEFAULT 'EXTRATO_INTER',
  "simulado" BOOLEAN NOT NULL DEFAULT false,
  "detalhesJson" JSONB,
  "tituloReceberId" TEXT,
  "tituloPagarId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MovimentoBancario_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ConciliacaoBancaria" (
  "id" TEXT NOT NULL,
  "movimentoBancarioId" TEXT NOT NULL,
  "tituloReceberId" TEXT,
  "tituloPagarId" TEXT,
  "status" "ConciliacaoStatus" NOT NULL DEFAULT 'PENDENTE',
  "matchedAt" TIMESTAMP(3),
  "matchedById" TEXT,
  "observacao" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ConciliacaoBancaria_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TituloPagar_documentoEntradaId_key" ON "TituloPagar"("documentoEntradaId");
CREATE UNIQUE INDEX IF NOT EXISTS "MovimentoBancario_contaBancariaId_hashExterno_key" ON "MovimentoBancario"("contaBancariaId", "hashExterno");
CREATE UNIQUE INDEX IF NOT EXISTS "ConciliacaoBancaria_movimentoBancarioId_key" ON "ConciliacaoBancaria"("movimentoBancarioId");

CREATE INDEX IF NOT EXISTS "ContaBancaria_empresaId_ativa_idx" ON "ContaBancaria"("empresaId", "ativa");
CREATE INDEX IF NOT EXISTS "ContaBancaria_empresaId_principal_idx" ON "ContaBancaria"("empresaId", "principal");
CREATE INDEX IF NOT EXISTS "TituloPagar_empresaId_status_idx" ON "TituloPagar"("empresaId", "status");
CREATE INDEX IF NOT EXISTS "TituloPagar_vencimento_idx" ON "TituloPagar"("vencimento");
CREATE INDEX IF NOT EXISTS "TituloPagar_empresaId_vencimento_idx" ON "TituloPagar"("empresaId", "vencimento");
CREATE INDEX IF NOT EXISTS "TituloPagar_pedidoCompraId_idx" ON "TituloPagar"("pedidoCompraId");
CREATE INDEX IF NOT EXISTS "TituloPagar_fornecedorId_idx" ON "TituloPagar"("fornecedorId");
CREATE INDEX IF NOT EXISTS "TituloReceber_empresaId_vencimento_idx" ON "TituloReceber"("empresaId", "vencimento");
CREATE INDEX IF NOT EXISTS "MovimentoBancario_empresaId_dataEntrada_idx" ON "MovimentoBancario"("empresaId", "dataEntrada");
CREATE INDEX IF NOT EXISTS "MovimentoBancario_contaBancariaId_dataEntrada_idx" ON "MovimentoBancario"("contaBancariaId", "dataEntrada");
CREATE INDEX IF NOT EXISTS "MovimentoBancario_tituloReceberId_idx" ON "MovimentoBancario"("tituloReceberId");
CREATE INDEX IF NOT EXISTS "MovimentoBancario_tituloPagarId_idx" ON "MovimentoBancario"("tituloPagarId");
CREATE INDEX IF NOT EXISTS "ConciliacaoBancaria_status_idx" ON "ConciliacaoBancaria"("status");
CREATE INDEX IF NOT EXISTS "ConciliacaoBancaria_tituloReceberId_idx" ON "ConciliacaoBancaria"("tituloReceberId");
CREATE INDEX IF NOT EXISTS "ConciliacaoBancaria_tituloPagarId_idx" ON "ConciliacaoBancaria"("tituloPagarId");

DO $$ BEGIN
  ALTER TABLE "ContaBancaria" ADD CONSTRAINT "ContaBancaria_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "TituloPagar" ADD CONSTRAINT "TituloPagar_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "TituloPagar" ADD CONSTRAINT "TituloPagar_pedidoCompraId_fkey" FOREIGN KEY ("pedidoCompraId") REFERENCES "PedidoCompra"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "TituloPagar" ADD CONSTRAINT "TituloPagar_documentoEntradaId_fkey" FOREIGN KEY ("documentoEntradaId") REFERENCES "DocumentoFiscalEntrada"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "MovimentoBancario" ADD CONSTRAINT "MovimentoBancario_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "MovimentoBancario" ADD CONSTRAINT "MovimentoBancario_contaBancariaId_fkey" FOREIGN KEY ("contaBancariaId") REFERENCES "ContaBancaria"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "MovimentoBancario" ADD CONSTRAINT "MovimentoBancario_tituloReceberId_fkey" FOREIGN KEY ("tituloReceberId") REFERENCES "TituloReceber"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "MovimentoBancario" ADD CONSTRAINT "MovimentoBancario_tituloPagarId_fkey" FOREIGN KEY ("tituloPagarId") REFERENCES "TituloPagar"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ConciliacaoBancaria" ADD CONSTRAINT "ConciliacaoBancaria_movimentoBancarioId_fkey" FOREIGN KEY ("movimentoBancarioId") REFERENCES "MovimentoBancario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ConciliacaoBancaria" ADD CONSTRAINT "ConciliacaoBancaria_tituloReceberId_fkey" FOREIGN KEY ("tituloReceberId") REFERENCES "TituloReceber"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ConciliacaoBancaria" ADD CONSTRAINT "ConciliacaoBancaria_tituloPagarId_fkey" FOREIGN KEY ("tituloPagarId") REFERENCES "TituloPagar"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
