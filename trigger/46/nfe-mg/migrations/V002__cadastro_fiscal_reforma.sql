-- V002: Cadastro fiscal completo — regime atual + reforma (IBS/CBS/IS)
-- Estratégia: parametrizar agora, emitir depois (XML PL_009 inalterado).
-- Destinatário evolui para parceiro multi-papel sem quebrar FK/nfe.

-- ---------------------------------------------------------------------------
-- PRODUTO — classificação, PIS/COFINS, reforma IBS/CBS + Imposto Seletivo
-- ---------------------------------------------------------------------------
ALTER TABLE produto
  ADD COLUMN IF NOT EXISTS descricao_fiscal VARCHAR(120),
  ADD COLUMN IF NOT EXISTS gtin VARCHAR(14),
  ADD COLUMN IF NOT EXISTS tipo_item_sped VARCHAR(2) NOT NULL DEFAULT '00',
  ADD COLUMN IF NOT EXISTS cfop_entrada_padrao VARCHAR(4),
  ADD COLUMN IF NOT EXISTS cst_pis VARCHAR(2),
  ADD COLUMN IF NOT EXISTS cst_cofins VARCHAR(2),
  ADD COLUMN IF NOT EXISTS aliquota_pis NUMERIC(7,4),
  ADD COLUMN IF NOT EXISTS aliquota_cofins NUMERIC(7,4),
  ADD COLUMN IF NOT EXISTS cst_ibs_cbs VARCHAR(3),
  ADD COLUMN IF NOT EXISTS cclass_trib VARCHAR(6),
  ADD COLUMN IF NOT EXISTS aliquota_ibs NUMERIC(7,4),
  ADD COLUMN IF NOT EXISTS aliquota_cbs NUMERIC(7,4),
  ADD COLUMN IF NOT EXISTS cst_is VARCHAR(3),
  ADD COLUMN IF NOT EXISTS cclass_trib_is VARCHAR(6),
  ADD COLUMN IF NOT EXISTS aliquota_is NUMERIC(7,4),
  ADD COLUMN IF NOT EXISTS sujeito_is BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS cbenef VARCHAR(10);

COMMENT ON COLUMN produto.cst_ibs_cbs IS 'CST compartilhado IBS+CBS (IT NF-e 2025.002 / LC 214) — cadastro-only até layout reforma';
COMMENT ON COLUMN produto.cclass_trib IS 'cClassTrib IBS/CBS (6 dígitos; 3 primeiros = CST)';
COMMENT ON COLUMN produto.cst_is IS 'CST Imposto Seletivo — cadastro-only';
COMMENT ON COLUMN produto.sujeito_is IS 'Produto sujeito a Imposto Seletivo (IS)';

CREATE INDEX IF NOT EXISTS idx_produto_ncm ON produto(ncm);
CREATE INDEX IF NOT EXISTS idx_produto_cclass_trib ON produto(cclass_trib) WHERE cclass_trib IS NOT NULL;

-- ---------------------------------------------------------------------------
-- DESTINATARIO (= parceiro) — papéis + aptidão fiscal para todas as apurações
-- ---------------------------------------------------------------------------
ALTER TABLE destinatario
  ADD COLUMN IF NOT EXISTS papel_cliente BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS papel_fornecedor BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS papel_transportadora BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS inscricao_municipal VARCHAR(20),
  ADD COLUMN IF NOT EXISTS email_xml VARCHAR(255),
  ADD COLUMN IF NOT EXISTS finalidade VARCHAR(20),
  ADD COLUMN IF NOT EXISTS consumidor_final BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS regime VARCHAR(20),
  ADD COLUMN IF NOT EXISTS ie_status VARCHAR(20) NOT NULL DEFAULT 'NAO_VERIFICADA',
  ADD COLUMN IF NOT EXISTS suframa VARCHAR(20),
  ADD COLUMN IF NOT EXISTS area_incentivada BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS cnae VARCHAR(7),
  ADD COLUMN IF NOT EXISTS tipo_fornecimento VARCHAR(20),
  ADD COLUMN IF NOT EXISTS cfop_entrada_padrao VARCHAR(4),
  ADD COLUMN IF NOT EXISTS emite_documento_fiscal BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS id_estrangeiro VARCHAR(20);

COMMENT ON COLUMN destinatario.finalidade IS 'REVENDA | INDUSTRIALIZACAO | USO_CONSUMO — orquestra CFOP/DIFAL';
COMMENT ON COLUMN destinatario.regime IS 'Regime do parceiro (crédito entrada / Lucro Real)';
COMMENT ON COLUMN destinatario.ie_status IS 'NAO_VERIFICADA | OK | BAIXADA | NAO_HABILITADA | ISENTA';

CREATE INDEX IF NOT EXISTS idx_destinatario_papeis
  ON destinatario(emitente_id, papel_cliente, papel_fornecedor)
  WHERE ativo = TRUE;

-- Snapshot opcional nos itens (não quebra emissão clássica)
ALTER TABLE nfe_item
  ADD COLUMN IF NOT EXISTS cst_ibs_cbs VARCHAR(3),
  ADD COLUMN IF NOT EXISTS cclass_trib VARCHAR(6),
  ADD COLUMN IF NOT EXISTS cst_pis VARCHAR(2),
  ADD COLUMN IF NOT EXISTS cst_cofins VARCHAR(2);
