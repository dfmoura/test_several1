/*
  # Tabela de Controle de Jobs Agendados

  1. Nova Tabela
    - `job_control`
      - `job_name` (text, primary key) - Nome único do job
      - `is_running` (boolean) - Indica se o job está executando
      - `last_start_time` (timestamptz) - Última vez que o job iniciou
      - `last_end_time` (timestamptz) - Última vez que o job terminou
      - `last_status` (text) - Status da última execução (success/error)
      - `execution_count` (integer) - Contador de execuções
      - `created_at` (timestamptz) - Data de criação do registro
      - `updated_at` (timestamptz) - Data da última atualização

  2. Segurança
    - Enable RLS na tabela `job_control`
    - Política para permitir todas as operações (para functions)

  3. Índices
    - Índice no campo `job_name` para consultas rápidas
    - Índice no campo `is_running` para verificações de status
*/

-- Criar tabela de controle de jobs
CREATE TABLE IF NOT EXISTS job_control (
  job_name TEXT PRIMARY KEY,
  is_running BOOLEAN DEFAULT FALSE NOT NULL,
  last_start_time TIMESTAMPTZ,
  last_end_time TIMESTAMPTZ,
  last_status TEXT DEFAULT 'pending',
  execution_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_job_control_is_running ON job_control(is_running);
CREATE INDEX IF NOT EXISTS idx_job_control_last_start ON job_control(last_start_time);

-- Habilitar RLS
ALTER TABLE job_control ENABLE ROW LEVEL SECURITY;

-- Política para permitir todas as operações (necessário para functions)
DROP POLICY IF EXISTS "Allow all operations on job_control" ON job_control;
CREATE POLICY "Allow all operations on job_control" 
  ON job_control 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- Inserir registro inicial para o job de integração ERP
INSERT INTO job_control (job_name, is_running, last_status) 
VALUES ('erp_integration', FALSE, 'ready')
ON CONFLICT (job_name) DO NOTHING;

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_job_control_updated_at ON job_control;
CREATE TRIGGER update_job_control_updated_at
    BEFORE UPDATE ON job_control
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comentários para documentação
COMMENT ON TABLE job_control IS 'Tabela para controlar execução de jobs agendados e evitar sobreposição';
COMMENT ON COLUMN job_control.job_name IS 'Nome único identificador do job';
COMMENT ON COLUMN job_control.is_running IS 'Flag indicando se o job está executando no momento';
COMMENT ON COLUMN job_control.last_start_time IS 'Timestamp da última inicialização do job';
COMMENT ON COLUMN job_control.last_end_time IS 'Timestamp da última finalização do job';
COMMENT ON COLUMN job_control.last_status IS 'Status da última execução: success, error, ready';
COMMENT ON COLUMN job_control.execution_count IS 'Contador total de execuções do job';