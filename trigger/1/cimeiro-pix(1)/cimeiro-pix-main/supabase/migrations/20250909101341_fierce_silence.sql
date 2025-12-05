-- ⚡ SCRIPT DE CONFIGURAÇÃO SUPABASE
-- Execute este SQL no Supabase SQL Editor para criar todas as tabelas necessárias

-- 1. Criar tabela integration_logs
CREATE TABLE IF NOT EXISTS integration_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type VARCHAR(100) NOT NULL,
  message TEXT,
  data JSONB,
  summary JSONB,
  details JSONB,
  error TEXT,
  execution_time_ms INTEGER,
  sankhya_records INTEGER,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_integration_logs_type ON integration_logs(type);
CREATE INDEX IF NOT EXISTS idx_integration_logs_created_at ON integration_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_integration_logs_timestamp ON integration_logs(timestamp);

-- 3. Criar tabela sync_logs (para compatibilidade)
CREATE TABLE IF NOT EXISTS sync_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nunota VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'error', 'not_found')),
  pedido_mercos_id VARCHAR(100),
  pix_data TEXT,
  error_message TEXT,
  execution_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Criar índices para sync_logs
CREATE INDEX IF NOT EXISTS idx_sync_logs_created_at ON sync_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_logs_nunota_created_at ON sync_logs(nunota, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON sync_logs(status);

-- 5. Criar tabela app_config (para configurações)
CREATE TABLE IF NOT EXISTS app_config (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Habilitar Row Level Security
ALTER TABLE integration_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

-- 7. Criar políticas de acesso (permitir tudo por enquanto)
DROP POLICY IF EXISTS "Allow all operations" ON integration_logs;
CREATE POLICY "Allow all operations" ON integration_logs FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all operations" ON sync_logs;
CREATE POLICY "Allow all operations" ON sync_logs FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all operations" ON app_config;
CREATE POLICY "Allow all operations" ON app_config FOR ALL USING (true);

-- 8. Inserir dados de teste
INSERT INTO integration_logs (type, message, data) 
VALUES 
  ('system_init', 'Sistema inicializado com sucesso!', '{"version": "1.0.0"}'),
  ('test_connection', 'Teste de conexão realizado', '{"status": "ok"}'),
  ('database_setup', 'Tabelas criadas e configuradas', '{"tables": ["integration_logs", "sync_logs", "app_config"]}')
ON CONFLICT DO NOTHING;

INSERT INTO app_config (key, value, description)
VALUES 
  ('system_version', '"1.0.0"', 'Versão do sistema'),
  ('last_setup', to_jsonb(NOW()), 'Data da última configuração'),
  ('features_enabled', '{"pix_sync": true, "auto_retry": true, "notifications": false}', 'Funcionalidades habilitadas')
ON CONFLICT (key) DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = NOW();

-- 9. Verificar se tudo foi criado corretamente
SELECT 
  'Tabelas criadas com sucesso!' as status,
  (SELECT COUNT(*) FROM integration_logs) as integration_logs_count,
  (SELECT COUNT(*) FROM sync_logs) as sync_logs_count,
  (SELECT COUNT(*) FROM app_config) as app_config_count;

-- 10. Mostrar estrutura das tabelas
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name IN ('integration_logs', 'sync_logs', 'app_config')
ORDER BY table_name, ordinal_position;