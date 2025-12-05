/*
  # Tabela de Controle de Jobs

  1. Nova Tabela
    - `job_control`
      - `job_name` (text, primary key) - Nome único do job
      - `is_running` (boolean) - Flag indicando se está executando
      - `last_start_time` (timestamptz) - Última inicialização
      - `last_end_time` (timestamptz) - Última finalização
      - `last_status` (text) - Status da última execução
      - `execution_count` (integer) - Contador de execuções
      - `created_at` (timestamptz) - Data de criação
      - `updated_at` (timestamptz) - Data de atualização

  2. Segurança
    - Enable RLS na tabela `job_control`
    - Política para permitir todas as operações

  3. Trigger
    - Trigger para atualizar `updated_at` automaticamente
*/

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Criar tabela job_control
CREATE TABLE IF NOT EXISTS job_control (
  job_name TEXT PRIMARY KEY COMMENT 'Nome único identificador do job',
  is_running BOOLEAN DEFAULT FALSE NOT NULL COMMENT 'Flag indicando se o job está executando no momento',
  last_start_time TIMESTAMPTZ COMMENT 'Timestamp da última inicialização do job',
  last_end_time TIMESTAMPTZ COMMENT 'Timestamp da última finalização do job',
  last_status TEXT DEFAULT 'pending' COMMENT 'Status da última execução: success, error, ready',
  execution_count INTEGER DEFAULT 0 NOT NULL COMMENT 'Contador total de execuções do job',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
) COMMENT 'Tabela para controlar execução de jobs agendados e evitar sobreposição';

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_job_control_is_running ON job_control(is_running);
CREATE INDEX IF NOT EXISTS idx_job_control_last_start ON job_control(last_start_time);

-- Habilitar RLS
ALTER TABLE job_control ENABLE ROW LEVEL SECURITY;

-- Política para permitir todas as operações
CREATE POLICY IF NOT EXISTS "Allow all operations on job_control"
  ON job_control
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Trigger para atualizar updated_at
CREATE TRIGGER IF NOT EXISTS update_job_control_updated_at
  BEFORE UPDATE ON job_control
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Inserir registro inicial para o job de integração ERP
INSERT INTO job_control (job_name, is_running, last_status)
VALUES ('erp_integration', FALSE, 'ready')
ON CONFLICT (job_name) DO NOTHING;

-- Verificar se a tabela foi criada corretamente
SELECT 'Tabela job_control criada com sucesso!' as status,
       COUNT(*) as registros_iniciais
FROM job_control;