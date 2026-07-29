-- CreateEnum
CREATE TYPE "SerieDocumentoTipo" AS ENUM ('NFE', 'NFSE_DPS');

-- CreateEnum
CREATE TYPE "IndicadorIeDest" AS ENUM ('CONTRIBUINTE', 'ISENTO', 'NAO_CONTRIBUINTE');

-- AlterTable Parceiro — dados fiscais destinatário/tomador
ALTER TABLE "Parceiro" ADD COLUMN IF NOT EXISTS "emailFiscal" TEXT;
ALTER TABLE "Parceiro" ADD COLUMN IF NOT EXISTS "codigoMunicipioIbge" TEXT;
ALTER TABLE "Parceiro" ADD COLUMN IF NOT EXISTS "paisCodigo" TEXT NOT NULL DEFAULT '1058';
ALTER TABLE "Parceiro" ADD COLUMN IF NOT EXISTS "inscricaoEstadual" TEXT;
ALTER TABLE "Parceiro" ADD COLUMN IF NOT EXISTS "inscricaoMunicipal" TEXT;
ALTER TABLE "Parceiro" ADD COLUMN IF NOT EXISTS "indicadorIeDest" "IndicadorIeDest" NOT NULL DEFAULT 'NAO_CONTRIBUINTE';
ALTER TABLE "Parceiro" ADD COLUMN IF NOT EXISTS "contribuinteIcms" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Parceiro" ADD COLUMN IF NOT EXISTS "consumidorFinal" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "Parceiro_codigoMunicipioIbge_idx" ON "Parceiro"("codigoMunicipioIbge");

-- AlterTable Produto — perfil tributário
ALTER TABLE "Produto" ADD COLUMN IF NOT EXISTS "ean" TEXT;
ALTER TABLE "Produto" ADD COLUMN IF NOT EXISTS "naturezaOperacaoId" TEXT;
ALTER TABLE "Produto" ADD COLUMN IF NOT EXISTS "csosn" TEXT;
ALTER TABLE "Produto" ADD COLUMN IF NOT EXISTS "cstIcms" TEXT;
ALTER TABLE "Produto" ADD COLUMN IF NOT EXISTS "cstPis" TEXT;
ALTER TABLE "Produto" ADD COLUMN IF NOT EXISTS "cstCofins" TEXT;
ALTER TABLE "Produto" ADD COLUMN IF NOT EXISTS "tributacaoIss" INTEGER;
ALTER TABLE "Produto" ADD COLUMN IF NOT EXISTS "issRetido" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Produto" ADD COLUMN IF NOT EXISTS "codigoMunicipioPrestacao" TEXT;
ALTER TABLE "Produto" ADD COLUMN IF NOT EXISTS "ibsCbsSituacaoTributaria" TEXT;
ALTER TABLE "Produto" ADD COLUMN IF NOT EXISTS "ibsCbsClassificacaoTributaria" TEXT;
ALTER TABLE "Produto" ADD COLUMN IF NOT EXISTS "infAdProdPadrao" TEXT;

-- AlterTable DocumentoFiscalSaida — auditoria Focus
ALTER TABLE "DocumentoFiscalSaida" ADD COLUMN IF NOT EXISTS "requestJson" JSONB;
ALTER TABLE "DocumentoFiscalSaida" ADD COLUMN IF NOT EXISTS "responseJson" JSONB;

-- CreateTable NaturezaOperacao
CREATE TABLE IF NOT EXISTS "NaturezaOperacao" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "cfopDentroUf" TEXT NOT NULL,
    "cfopForaUf" TEXT NOT NULL,
    "finalidadeEmissao" INTEGER NOT NULL DEFAULT 1,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NaturezaOperacao_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "NaturezaOperacao_empresaId_codigo_key" ON "NaturezaOperacao"("empresaId", "codigo");
CREATE INDEX IF NOT EXISTS "NaturezaOperacao_empresaId_ativo_idx" ON "NaturezaOperacao"("empresaId", "ativo");

-- CreateTable SerieDocumentoFiscal
CREATE TABLE IF NOT EXISTS "SerieDocumentoFiscal" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "tipo" "SerieDocumentoTipo" NOT NULL,
    "serie" INTEGER NOT NULL,
    "proximoNumero" INTEGER NOT NULL DEFAULT 1,
    "ambiente" "AmbienteFiscal" NOT NULL DEFAULT 'HOMOLOGACAO',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SerieDocumentoFiscal_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SerieDocumentoFiscal_empresaId_tipo_serie_ambiente_key"
  ON "SerieDocumentoFiscal"("empresaId", "tipo", "serie", "ambiente");
CREATE INDEX IF NOT EXISTS "SerieDocumentoFiscal_empresaId_tipo_ativo_idx"
  ON "SerieDocumentoFiscal"("empresaId", "tipo", "ativo");

-- CreateTable ParametroFiscalEmpresa
CREATE TABLE IF NOT EXISTS "ParametroFiscalEmpresa" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "opSimpNac" INTEGER NOT NULL DEFAULT 3,
    "regApTribSN" INTEGER NOT NULL DEFAULT 1,
    "regEspTrib" INTEGER NOT NULL DEFAULT 0,
    "pTotTribSN" DECIMAL(6,2) NOT NULL DEFAULT 11.81,
    "pTotTribFederal" DECIMAL(6,2),
    "pTotTribEstadual" DECIMAL(6,2),
    "pTotTribMunicipal" DECIMAL(6,2),
    "csosnPadrao" TEXT NOT NULL DEFAULT '102',
    "cstPisPadrao" TEXT NOT NULL DEFAULT '49',
    "cstCofinsPadrao" TEXT NOT NULL DEFAULT '49',
    "serieDpsPadrao" INTEGER NOT NULL DEFAULT 70000,
    "serieNfePadrao" INTEGER NOT NULL DEFAULT 1,
    "naturezaMercadoriaId" TEXT,
    "modalidadeFretePadrao" INTEGER NOT NULL DEFAULT 9,
    "presencaCompradorPadrao" INTEGER NOT NULL DEFAULT 1,
    "infCplPadrao" TEXT,
    "textoCreditoSn" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParametroFiscalEmpresa_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ParametroFiscalEmpresa_empresaId_key" ON "ParametroFiscalEmpresa"("empresaId");

-- FKs
ALTER TABLE "NaturezaOperacao"
  DROP CONSTRAINT IF EXISTS "NaturezaOperacao_empresaId_fkey";
ALTER TABLE "NaturezaOperacao"
  ADD CONSTRAINT "NaturezaOperacao_empresaId_fkey"
  FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SerieDocumentoFiscal"
  DROP CONSTRAINT IF EXISTS "SerieDocumentoFiscal_empresaId_fkey";
ALTER TABLE "SerieDocumentoFiscal"
  ADD CONSTRAINT "SerieDocumentoFiscal_empresaId_fkey"
  FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ParametroFiscalEmpresa"
  DROP CONSTRAINT IF EXISTS "ParametroFiscalEmpresa_empresaId_fkey";
ALTER TABLE "ParametroFiscalEmpresa"
  ADD CONSTRAINT "ParametroFiscalEmpresa_empresaId_fkey"
  FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ParametroFiscalEmpresa"
  DROP CONSTRAINT IF EXISTS "ParametroFiscalEmpresa_naturezaMercadoriaId_fkey";
ALTER TABLE "ParametroFiscalEmpresa"
  ADD CONSTRAINT "ParametroFiscalEmpresa_naturezaMercadoriaId_fkey"
  FOREIGN KEY ("naturezaMercadoriaId") REFERENCES "NaturezaOperacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Produto"
  DROP CONSTRAINT IF EXISTS "Produto_naturezaOperacaoId_fkey";
ALTER TABLE "Produto"
  ADD CONSTRAINT "Produto_naturezaOperacaoId_fkey"
  FOREIGN KEY ("naturezaOperacaoId") REFERENCES "NaturezaOperacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "Produto_naturezaOperacaoId_idx" ON "Produto"("naturezaOperacaoId");
