-- V003: Configurações editáveis via console (sobrescrevem .env em runtime)

CREATE TABLE IF NOT EXISTS system_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  inscricao_municipal VARCHAR(20),
  codigo_municipio VARCHAR(7),
  dps_serie VARCHAR(5),
  razao_social VARCHAR(255),
  sync_interval_sec INTEGER,
  cadastro_enabled BOOLEAN,
  cadastro_cache_ttl_sec INTEGER,
  log_level VARCHAR(10),
  web_password_hash VARCHAR(128),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO system_settings (id) VALUES (1) ON CONFLICT DO NOTHING;
