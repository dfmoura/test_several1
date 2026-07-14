-- Metadados extraídos do XML ADN (prestador, tomador, valores)
ALTER TABLE dfe_recebido
  ADD COLUMN IF NOT EXISTS metadata JSONB;

CREATE INDEX IF NOT EXISTS idx_dfe_recebido_tomador_cnpj
  ON dfe_recebido ((metadata->>'tomadorCnpj'));

CREATE INDEX IF NOT EXISTS idx_dfe_recebido_prestador_cnpj
  ON dfe_recebido ((metadata->>'prestadorCnpj'));
