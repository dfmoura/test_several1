-- V004: Pré-cadastro de tomadores para emissão de NFS-e

CREATE TABLE IF NOT EXISTS tomador_cadastro (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apelido VARCHAR(120) NOT NULL,
  tipo VARCHAR(2) NOT NULL CHECK (tipo IN ('PF', 'PJ')),
  cpf_cnpj VARCHAR(14) NOT NULL,
  razao_social VARCHAR(255),
  email VARCHAR(255),
  telefone VARCHAR(30),
  inscricao_municipal VARCHAR(20),
  endereco JSONB,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (cpf_cnpj)
);

CREATE INDEX idx_tomador_cadastro_ativo ON tomador_cadastro (ativo) WHERE ativo = TRUE;
CREATE INDEX idx_tomador_cadastro_apelido ON tomador_cadastro (apelido);
