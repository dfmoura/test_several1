-- V001: Schema inicial NFS-e Nacional
-- Versão XSD referência: 1.00 (Manual Integrado SNNFSe)

CREATE TABLE IF NOT EXISTS dps_numero_seq (
  id INTEGER PRIMARY KEY DEFAULT 1,
  ultimo_numero INTEGER NOT NULL DEFAULT 0
);

INSERT INTO dps_numero_seq (id, ultimo_numero) VALUES (1, 0) ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS dps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_dps VARCHAR(43) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'RASCUNHO',
  numero_dps VARCHAR(15) NOT NULL,
  serie VARCHAR(5) NOT NULL,
  xml_storage_key TEXT,
  payload_hash VARCHAR(64),
  correlation_id VARCHAR(64),
  chave_substituida VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dps_status ON dps(status);
CREATE INDEX idx_dps_correlation ON dps(correlation_id);

CREATE TABLE IF NOT EXISTS nfse (
  chave_acesso VARCHAR(50) PRIMARY KEY,
  id_dps VARCHAR(43) NOT NULL REFERENCES dps(id_dps),
  situacao VARCHAR(20) NOT NULL DEFAULT 'AUTORIZADA',
  valor_servico NUMERIC(15,2) NOT NULL,
  xml_storage_key TEXT,
  chave_substituida VARCHAR(50),
  chave_substituta VARCHAR(50),
  emitida_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_nfse_situacao ON nfse(situacao);
CREATE INDEX idx_nfse_emitida ON nfse(emitida_em DESC);

CREATE TABLE IF NOT EXISTS evento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chave_acesso VARCHAR(50) NOT NULL REFERENCES nfse(chave_acesso),
  tipo VARCHAR(10) NOT NULL,
  sequencial INTEGER NOT NULL,
  status_registro VARCHAR(20) NOT NULL,
  xml_storage_key TEXT,
  motivo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(chave_acesso, tipo, sequencial)
);

CREATE TABLE IF NOT EXISTS dfe_recebido (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nsu VARCHAR(20) NOT NULL UNIQUE,
  tipo_dfe VARCHAR(10) NOT NULL,
  chave VARCHAR(50) NOT NULL,
  xml_storage_key TEXT,
  processado BOOLEAN NOT NULL DEFAULT FALSE,
  recebido_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dfe_processado ON dfe_recebido(processado);

CREATE TABLE IF NOT EXISTS nsu_controle (
  id INTEGER PRIMARY KEY DEFAULT 1,
  ultimo_nsu VARCHAR(20) NOT NULL DEFAULT '0',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO nsu_controle (id, ultimo_nsu) VALUES (1, '0') ON CONFLICT DO NOTHING;

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
  metadata JSONB,
  ip VARCHAR(45),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_entity ON audit_log(entity, entity_id);
CREATE INDEX idx_audit_created ON audit_log(created_at DESC);

CREATE TABLE IF NOT EXISTS parametros_municipio (
  codigo_ibge VARCHAR(7) PRIMARY KEY,
  convenio_ativo BOOLEAN NOT NULL,
  aliquotas JSONB NOT NULL DEFAULT '{}',
  cached_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);
