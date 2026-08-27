-- V001: Schema inicial NF-e MG (modelo 55 · multi-tenant)
-- Layout: NF-e 4.00 / PL_009 · Autorizadora: SEFAZ-MG

CREATE TABLE IF NOT EXISTS emitente (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apelido VARCHAR(120) NOT NULL,
  cnpj VARCHAR(14) NOT NULL UNIQUE,
  inscricao_estadual VARCHAR(14) NOT NULL,
  razao_social VARCHAR(255) NOT NULL,
  nome_fantasia VARCHAR(255),
  crt VARCHAR(1) NOT NULL DEFAULT '1',
  cnae VARCHAR(7),
  endereco JSONB NOT NULL DEFAULT '{}',
  telefone VARCHAR(20),
  email VARCHAR(255),
  ambiente VARCHAR(10) NOT NULL DEFAULT 'homolog',
  serie_padrao INTEGER NOT NULL DEFAULT 1,
  ultimo_numero INTEGER NOT NULL DEFAULT 0,
  credenciado_siare BOOLEAN NOT NULL DEFAULT FALSE,
  credenciado_siare_em TIMESTAMPTZ,
  cert_storage_key TEXT,
  cert_password_enc TEXT,
  cert_cnpj VARCHAR(14),
  cert_validade TIMESTAMPTZ,
  cert_subject TEXT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_emitente_cnpj ON emitente(cnpj);
CREATE INDEX idx_emitente_ativo ON emitente(ativo);

CREATE TABLE IF NOT EXISTS serie_numeracao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  emitente_id UUID NOT NULL REFERENCES emitente(id),
  serie INTEGER NOT NULL,
  ultimo_numero INTEGER NOT NULL DEFAULT 0,
  ambiente VARCHAR(10) NOT NULL DEFAULT 'homolog',
  UNIQUE(emitente_id, serie, ambiente)
);

CREATE TABLE IF NOT EXISTS destinatario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  emitente_id UUID NOT NULL REFERENCES emitente(id),
  apelido VARCHAR(120) NOT NULL,
  tipo VARCHAR(2) NOT NULL,
  cpf_cnpj VARCHAR(14) NOT NULL,
  razao_social VARCHAR(255),
  inscricao_estadual VARCHAR(14),
  ind_ie_dest VARCHAR(1) NOT NULL DEFAULT '9',
  email VARCHAR(255),
  telefone VARCHAR(20),
  endereco JSONB,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(emitente_id, cpf_cnpj)
);

CREATE INDEX idx_destinatario_emitente ON destinatario(emitente_id);

CREATE TABLE IF NOT EXISTS produto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  emitente_id UUID NOT NULL REFERENCES emitente(id),
  codigo VARCHAR(60) NOT NULL,
  descricao VARCHAR(120) NOT NULL,
  ncm VARCHAR(8) NOT NULL,
  cfop VARCHAR(4) NOT NULL,
  unidade VARCHAR(6) NOT NULL DEFAULT 'UN',
  valor_unitario NUMERIC(15,4) NOT NULL DEFAULT 0,
  origem VARCHAR(1) NOT NULL DEFAULT '0',
  csosn VARCHAR(3),
  cst VARCHAR(3),
  cest VARCHAR(7),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(emitente_id, codigo)
);

CREATE INDEX idx_produto_emitente ON produto(emitente_id);

CREATE TABLE IF NOT EXISTS nfe (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  emitente_id UUID NOT NULL REFERENCES emitente(id),
  chave_acesso VARCHAR(44) NOT NULL UNIQUE,
  situacao VARCHAR(24) NOT NULL DEFAULT 'RASCUNHO',
  modelo VARCHAR(2) NOT NULL DEFAULT '55',
  serie INTEGER NOT NULL,
  numero INTEGER NOT NULL,
  natureza_operacao VARCHAR(60) NOT NULL,
  tp_nf VARCHAR(1) NOT NULL DEFAULT '1',
  id_dest VARCHAR(1) NOT NULL DEFAULT '1',
  fin_nfe VARCHAR(1) NOT NULL DEFAULT '1',
  ind_final VARCHAR(1) NOT NULL DEFAULT '1',
  ind_pres VARCHAR(1) NOT NULL DEFAULT '1',
  tp_emis VARCHAR(1) NOT NULL DEFAULT '1',
  tp_amb VARCHAR(1) NOT NULL,
  destinatario_id UUID REFERENCES destinatario(id),
  dest_cpf_cnpj VARCHAR(14) NOT NULL,
  dest_razao_social VARCHAR(255) NOT NULL,
  valor_produtos NUMERIC(15,2) NOT NULL DEFAULT 0,
  valor_nf NUMERIC(15,2) NOT NULL DEFAULT 0,
  xml_storage_key TEXT,
  proc_nfe_storage_key TEXT,
  n_rec VARCHAR(15),
  n_prot VARCHAR(15),
  c_stat VARCHAR(3),
  x_motivo TEXT,
  dh_emi TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  dh_autorizacao TIMESTAMPTZ,
  payload_hash VARCHAR(64),
  correlation_id VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(emitente_id, serie, numero, tp_amb)
);

CREATE INDEX idx_nfe_emitente ON nfe(emitente_id);
CREATE INDEX idx_nfe_situacao ON nfe(situacao);
CREATE INDEX idx_nfe_dh_emi ON nfe(dh_emi DESC);
CREATE INDEX idx_nfe_n_rec ON nfe(n_rec) WHERE n_rec IS NOT NULL;

CREATE TABLE IF NOT EXISTS nfe_item (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nfe_id UUID NOT NULL REFERENCES nfe(id) ON DELETE CASCADE,
  n_item INTEGER NOT NULL,
  produto_id UUID REFERENCES produto(id),
  codigo VARCHAR(60) NOT NULL,
  descricao VARCHAR(120) NOT NULL,
  ncm VARCHAR(8) NOT NULL,
  cfop VARCHAR(4) NOT NULL,
  unidade VARCHAR(6) NOT NULL,
  quantidade NUMERIC(15,4) NOT NULL,
  valor_unitario NUMERIC(15,4) NOT NULL,
  valor_total NUMERIC(15,2) NOT NULL,
  origem VARCHAR(1) NOT NULL DEFAULT '0',
  csosn VARCHAR(3),
  cst VARCHAR(3),
  cest VARCHAR(7),
  UNIQUE(nfe_id, n_item)
);

CREATE TABLE IF NOT EXISTS evento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nfe_id UUID NOT NULL REFERENCES nfe(id),
  chave_acesso VARCHAR(44) NOT NULL,
  tipo VARCHAR(6) NOT NULL,
  sequencial INTEGER NOT NULL,
  status_registro VARCHAR(20) NOT NULL,
  n_prot VARCHAR(15),
  xml_storage_key TEXT,
  motivo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(chave_acesso, tipo, sequencial)
);

CREATE TABLE IF NOT EXISTS inutilizacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  emitente_id UUID NOT NULL REFERENCES emitente(id),
  serie INTEGER NOT NULL,
  numero_ini INTEGER NOT NULL,
  numero_fim INTEGER NOT NULL,
  ano INTEGER NOT NULL,
  tp_amb VARCHAR(1) NOT NULL,
  motivo TEXT NOT NULL,
  n_prot VARCHAR(15),
  c_stat VARCHAR(3),
  xml_storage_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inutilizacao_emitente ON inutilizacao(emitente_id);

CREATE TABLE IF NOT EXISTS lote (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  emitente_id UUID NOT NULL REFERENCES emitente(id),
  id_lote VARCHAR(15) NOT NULL,
  n_rec VARCHAR(15),
  nfe_id UUID REFERENCES nfe(id),
  status VARCHAR(20) NOT NULL DEFAULT 'ENVIADO',
  tentativas INTEGER NOT NULL DEFAULT 0,
  proximo_poll_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lote_pendente ON lote(status, proximo_poll_em) WHERE status = 'PROCESSANDO';

CREATE TABLE IF NOT EXISTS idempotency (
  key VARCHAR(64) PRIMARY KEY,
  response JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_idempotency_expires ON idempotency(expires_at);

CREATE TABLE IF NOT EXISTS outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(50) NOT NULL,
  payload JSONB NOT NULL,
  published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_outbox_pending ON outbox(published) WHERE published = FALSE;

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action VARCHAR(50) NOT NULL,
  entity VARCHAR(50) NOT NULL,
  entity_id VARCHAR(64) NOT NULL,
  emitente_id UUID,
  metadata JSONB,
  ip VARCHAR(45),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_entity ON audit_log(entity, entity_id);
CREATE INDEX idx_audit_created ON audit_log(created_at DESC);
CREATE INDEX idx_audit_emitente ON audit_log(emitente_id);

CREATE TABLE IF NOT EXISTS system_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  emitente_padrao_id UUID REFERENCES emitente(id),
  log_level VARCHAR(10),
  web_password_hash VARCHAR(128),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO system_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

-- Emitente piloto de desenvolvimento (sem certificado — modo mock)
INSERT INTO emitente (
  apelido, cnpj, inscricao_estadual, razao_social, nome_fantasia,
  crt, endereco, ambiente, serie_padrao, credenciado_siare
) VALUES (
  'Emitente piloto (dev)',
  '12345678000199',
  '0623079040081',
  'EMPRESA PILOTO HOMOLOGACAO LTDA',
  'Piloto NF-e MG',
  '1',
  '{"logradouro":"AV AFONSO PENA","numero":"1000","bairro":"CENTRO","codigoMunicipio":"3106200","municipio":"BELO HORIZONTE","uf":"MG","cep":"30130000"}',
  'homolog',
  1,
  FALSE
) ON CONFLICT (cnpj) DO NOTHING;

INSERT INTO serie_numeracao (emitente_id, serie, ultimo_numero, ambiente)
SELECT id, 1, 0, 'homolog' FROM emitente WHERE cnpj = '12345678000199'
ON CONFLICT DO NOTHING;
