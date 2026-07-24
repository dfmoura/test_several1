-- =============================================================================
-- Reta Etiquetas — Schema MVP (PostgreSQL 16+)
-- Local e produção usam o mesmo DDL; só muda connection string / secrets.
-- Fora de escopo: NFS-e, importações.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- Schemas
-- -----------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS app_auth;
CREATE SCHEMA IF NOT EXISTS party;
CREATE SCHEMA IF NOT EXISTS catalog;
CREATE SCHEMA IF NOT EXISTS pricing;
CREATE SCHEMA IF NOT EXISTS commercial;
CREATE SCHEMA IF NOT EXISTS pcp;
CREATE SCHEMA IF NOT EXISTS inventory;
CREATE SCHEMA IF NOT EXISTS purchasing;
CREATE SCHEMA IF NOT EXISTS billing;
CREATE SCHEMA IF NOT EXISTS finance;
CREATE SCHEMA IF NOT EXISTS integration;

-- -----------------------------------------------------------------------------
-- Helpers
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =============================================================================
-- app_auth
-- =============================================================================
CREATE TABLE app_auth.users (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email           text NOT NULL,
  password_hash   text NOT NULL,
  full_name       text NOT NULL,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz
);

CREATE UNIQUE INDEX users_email_unique
  ON app_auth.users (lower(email)) WHERE deleted_at IS NULL;

CREATE TABLE app_auth.roles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text NOT NULL UNIQUE, -- vendedor, pcp, estoque, financeiro, faturamento, gerente, admin
  name        text NOT NULL
);

CREATE TABLE app_auth.user_roles (
  user_id uuid NOT NULL REFERENCES app_auth.users(id),
  role_id uuid NOT NULL REFERENCES app_auth.roles(id),
  PRIMARY KEY (user_id, role_id)
);

-- =============================================================================
-- party
-- =============================================================================
CREATE TABLE party.organizations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_name      text NOT NULL,          -- RLP ETIQUETAS AUTO ADESIVOS LTDA
  trade_name      text NOT NULL,          -- RETA ETIQUETAS
  cnpj            char(14) NOT NULL UNIQUE,
  state_ie        text,
  email           text,
  phone           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE party.parties (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES party.organizations(id),
  party_type      text NOT NULL CHECK (party_type IN ('person','company')),
  document        text,                   -- CPF/CNPJ digits
  legal_name      text NOT NULL,
  trade_name      text,
  email           text,
  phone           text,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz,
  UNIQUE (organization_id, document)
);

CREATE TABLE party.customers (
  party_id              uuid PRIMARY KEY REFERENCES party.parties(id),
  salesperson_id        uuid,             -- FK depois
  default_payment_terms text,             -- ex: '28', '14/28', 'à vista'
  credit_limit_cents    bigint NOT NULL DEFAULT 0,
  is_active             boolean NOT NULL DEFAULT true
);

CREATE TABLE party.suppliers (
  party_id              uuid PRIMARY KEY REFERENCES party.parties(id),
  default_payment_terms text,
  lead_time_days        int NOT NULL DEFAULT 0,
  is_active             boolean NOT NULL DEFAULT true
);

CREATE TABLE party.salespeople (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES party.organizations(id),
  user_id         uuid REFERENCES app_auth.users(id),
  name            text NOT NULL,
  default_commission_pct numeric(5,2) NOT NULL DEFAULT 0,
  is_active       boolean NOT NULL DEFAULT true
);

ALTER TABLE party.customers
  ADD CONSTRAINT customers_salesperson_fk
  FOREIGN KEY (salesperson_id) REFERENCES party.salespeople(id);

CREATE TABLE party.addresses (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id        uuid NOT NULL REFERENCES party.parties(id),
  label           text NOT NULL DEFAULT 'principal', -- entrega, cobranca, comercial
  is_default_shipping boolean NOT NULL DEFAULT false,
  is_default_billing  boolean NOT NULL DEFAULT false,
  zip_code        text,
  street          text,
  number          text,
  complement      text,
  district        text,
  city            text,
  state           char(2),
  country         char(2) NOT NULL DEFAULT 'BR',
  ibge_code       text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz
);

CREATE INDEX addresses_party_idx ON party.addresses(party_id);

-- =============================================================================
-- catalog
-- =============================================================================
CREATE TABLE catalog.uoms (
  code text PRIMARY KEY, -- un, m2, m, rolo, h, kg
  name text NOT NULL
);

CREATE TABLE catalog.items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES party.organizations(id),
  sku             text NOT NULL,
  name            text NOT NULL,
  item_type       text NOT NULL CHECK (item_type IN (
                    'papel','tinta','verniz','tubete','caixa','acabamento',
                    'matriz','servico','embalagem','outro'
                  )),
  uom_code        text NOT NULL REFERENCES catalog.uoms(code),
  is_stockable    boolean NOT NULL DEFAULT true,
  is_active       boolean NOT NULL DEFAULT true,
  attrs           jsonb NOT NULL DEFAULT '{}'::jsonb, -- ex: {"tubete_size":"3\""}
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz,
  UNIQUE (organization_id, sku)
);

CREATE TABLE catalog.machines (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES party.organizations(id),
  code            text NOT NULL,
  name            text NOT NULL,
  cost_group      text, -- ex: 'BETA / 160 / 250 / ETIRAMA' | 'MODULAR'
  rpm_default     numeric(12,2),
  is_active       boolean NOT NULL DEFAULT true,
  UNIQUE (organization_id, code)
);

CREATE TABLE catalog.dies (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES party.organizations(id),
  code            text NOT NULL,
  label_measure   text NOT NULL,          -- ex: 5,0X2,5
  width_cm        numeric(12,4),
  height_cm       numeric(12,4),
  pull_cm         numeric(12,4),          -- puxada
  repeat_z        numeric(12,4),
  columns_default int,
  die_kind        text,                   -- ESPECIAL, PADRAO...
  attrs           jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active       boolean NOT NULL DEFAULT true,
  UNIQUE (organization_id, code)
);

-- =============================================================================
-- pricing (tabelas da planilha, versionadas)
-- =============================================================================
CREATE TABLE pricing.price_table_versions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES party.organizations(id),
  name            text NOT NULL,          -- 'OFICIAL 2026-07-17'
  effective_from  date NOT NULL,
  effective_to    date,
  is_current      boolean NOT NULL DEFAULT false,
  source_file     text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE pricing.paper_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id uuid NOT NULL REFERENCES pricing.price_table_versions(id),
  item_id uuid REFERENCES catalog.items(id),
  name text NOT NULL,
  price_per_m2 numeric(14,4) NOT NULL
);

CREATE TABLE pricing.finish_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id uuid NOT NULL REFERENCES pricing.price_table_versions(id),
  name text NOT NULL,
  price numeric(14,4) NOT NULL,
  kind text -- acabamento | rebobinacao
);

CREATE TABLE pricing.tube_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id uuid NOT NULL REFERENCES pricing.price_table_versions(id),
  size_label text NOT NULL, -- 1" | 1" 1/2 | 3"
  unit_price numeric(14,4) NOT NULL
);

CREATE TABLE pricing.ink_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id uuid NOT NULL REFERENCES pricing.price_table_versions(id),
  threshold_m2 numeric(14,4) NOT NULL, -- 30
  price_under numeric(14,4) NOT NULL,  -- 10 por cor se <= threshold
  price_per_m2_over numeric(14,4) NOT NULL -- 0.4
);

CREATE TABLE pricing.machine_hour_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id uuid NOT NULL REFERENCES pricing.price_table_versions(id),
  cost_group text NOT NULL,
  colors_key text NOT NULL, -- 0,1,2,3,4,4V,5...
  hourly_rate numeric(14,4) NOT NULL
);

CREATE TABLE pricing.waste_paper_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id uuid NOT NULL REFERENCES pricing.price_table_versions(id),
  colors int NOT NULL,
  waste_m2 numeric(14,4) NOT NULL
);

CREATE TABLE pricing.waste_finish_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id uuid NOT NULL REFERENCES pricing.price_table_versions(id),
  finish_name text NOT NULL,
  waste_m2 numeric(14,4) NOT NULL
);

CREATE TABLE pricing.box_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id uuid NOT NULL REFERENCES pricing.price_table_versions(id),
  tube_size text NOT NULL,
  rolls int NOT NULL,
  boxes int NOT NULL,
  UNIQUE (version_id, tube_size, rolls)
);

CREATE TABLE pricing.matrix_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id uuid NOT NULL REFERENCES pricing.price_table_versions(id),
  price_per_cm2 numeric(14,6) NOT NULL,
  notes text
);

-- =============================================================================
-- commercial
-- =============================================================================
CREATE TABLE commercial.doc_sequences (
  organization_id uuid NOT NULL REFERENCES party.organizations(id),
  doc_type text NOT NULL, -- quote, order, wo, invoice
  year int NOT NULL,
  last_value bigint NOT NULL DEFAULT 0,
  PRIMARY KEY (organization_id, doc_type, year)
);

CREATE TABLE commercial.quotes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES party.organizations(id),
  number          text NOT NULL,
  customer_id     uuid NOT NULL REFERENCES party.customers(party_id),
  salesperson_id  uuid REFERENCES party.salespeople(id),
  status          text NOT NULL CHECK (status IN (
                    'rascunho','enviado','aprovado','reprovado','expirado','cancelado'
                  )),
  quote_date      date NOT NULL DEFAULT CURRENT_DATE,
  valid_until     date,
  price_version_id uuid NOT NULL REFERENCES pricing.price_table_versions(id),
  tax_percent     numeric(6,3) NOT NULL DEFAULT 0,
  commission_percent numeric(6,3) NOT NULL DEFAULT 0,
  machine_id      uuid REFERENCES catalog.machines(id),
  machine_cost_group text,
  uses_matrix     boolean NOT NULL DEFAULT false,
  first_order_matrix boolean NOT NULL DEFAULT true,
  notes           text,
  snapshot        jsonb NOT NULL DEFAULT '{}'::jsonb, -- inputs + engine meta
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz,
  version         int NOT NULL DEFAULT 1,
  UNIQUE (organization_id, number)
);

CREATE TABLE commercial.quote_lines (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id        uuid NOT NULL REFERENCES commercial.quotes(id) ON DELETE CASCADE,
  line_no         int NOT NULL,
  description     text,
  die_id          uuid REFERENCES catalog.dies(id),
  measure_label   text,
  paper_width_cm  numeric(12,4),
  pull_cm         numeric(12,4),
  colors          int NOT NULL DEFAULT 0,
  paper_item_id   uuid REFERENCES catalog.items(id),
  paper_name      text,
  finish_name     text,
  models_qty      int NOT NULL DEFAULT 1,
  columns_qty     int NOT NULL DEFAULT 1,
  labels_per_roll int,
  tube_size       text,
  die_kind        text,
  repeat_z        numeric(12,4),
  rewind_columns  int DEFAULT 1,
  changeover_mode text, -- SEM PARADA | ...
  rpm             numeric(12,2),
  UNIQUE (quote_id, line_no)
);

CREATE TABLE commercial.quote_price_tiers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_line_id   uuid NOT NULL REFERENCES commercial.quote_lines(id) ON DELETE CASCADE,
  quantity        bigint NOT NULL,
  linear_meters   numeric(14,4),
  area_m2         numeric(14,4),
  waste_setup_m2  numeric(14,4),
  waste_finish_m2 numeric(14,4),
  waste_reel_m2   numeric(14,4),
  rolls           numeric(14,4),
  boxes           numeric(14,4),
  machine_hours   numeric(14,6),
  cost_paper      numeric(14,4),
  cost_machine    numeric(14,4),
  cost_changeover numeric(14,4),
  cost_reel_change numeric(14,4),
  cost_ink        numeric(14,4),
  cost_finish     numeric(14,4),
  cost_rewind     numeric(14,4),
  cost_tube       numeric(14,4),
  cost_box        numeric(14,4),
  cost_service    numeric(14,4),
  commission_amount numeric(14,4),
  tax_amount      numeric(14,4),
  total_before_round numeric(14,4),
  label_price     numeric(14,2),          -- ceiling política comercial
  matrix_price    numeric(14,2),
  total_price     numeric(14,2),
  breakdown       jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (quote_line_id, quantity)
);

CREATE TABLE commercial.sales_orders (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES party.organizations(id),
  number          text NOT NULL,
  quote_id        uuid REFERENCES commercial.quotes(id),
  customer_id     uuid NOT NULL REFERENCES party.customers(party_id),
  salesperson_id  uuid REFERENCES party.salespeople(id),
  status          text NOT NULL CHECK (status IN (
                    'aberto','em_producao','faturado','entregue','encerrado','cancelado'
                  )),
  order_date      date NOT NULL DEFAULT CURRENT_DATE,
  payment_terms   text NOT NULL,
  expected_receipt_date date,             -- para ciclo de caixa
  shipping_address_id uuid REFERENCES party.addresses(id),
  billing_address_id  uuid REFERENCES party.addresses(id),
  currency        char(3) NOT NULL DEFAULT 'BRL',
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz,
  version         int NOT NULL DEFAULT 1,
  UNIQUE (organization_id, number)
);

CREATE TABLE commercial.sales_order_lines (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_order_id  uuid NOT NULL REFERENCES commercial.sales_orders(id) ON DELETE CASCADE,
  quote_line_id   uuid REFERENCES commercial.quote_lines(id),
  quote_tier_id   uuid REFERENCES commercial.quote_price_tiers(id),
  line_no         int NOT NULL,
  description     text NOT NULL,
  quantity        bigint NOT NULL,
  unit_price      numeric(14,2) NOT NULL, -- preço congelado
  matrix_price    numeric(14,2) NOT NULL DEFAULT 0,
  line_total      numeric(14,2) NOT NULL,
  spec_snapshot   jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (sales_order_id, line_no)
);

-- =============================================================================
-- pcp
-- =============================================================================
CREATE TABLE pcp.work_orders (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES party.organizations(id),
  number          text NOT NULL,
  sales_order_line_id uuid NOT NULL REFERENCES commercial.sales_order_lines(id),
  machine_id      uuid REFERENCES catalog.machines(id),
  die_id          uuid REFERENCES catalog.dies(id),
  status          text NOT NULL CHECK (status IN (
                    'planejada','liberada','em_execucao','pausada','concluida','cancelada'
                  )),
  planned_start   timestamptz,
  planned_end     timestamptz,
  actual_start    timestamptz,
  actual_end      timestamptz,
  priority        int NOT NULL DEFAULT 100,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, number)
);

CREATE TABLE pcp.work_order_materials (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id   uuid NOT NULL REFERENCES pcp.work_orders(id) ON DELETE CASCADE,
  item_id         uuid NOT NULL REFERENCES catalog.items(id),
  uom_code        text NOT NULL REFERENCES catalog.uoms(code),
  qty_planned     numeric(14,4) NOT NULL,
  qty_consumed    numeric(14,4) NOT NULL DEFAULT 0
);

-- =============================================================================
-- inventory
-- =============================================================================
CREATE TABLE inventory.warehouses (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES party.organizations(id),
  code            text NOT NULL,
  name            text NOT NULL,
  UNIQUE (organization_id, code)
);

CREATE TABLE inventory.stock_balances (
  warehouse_id    uuid NOT NULL REFERENCES inventory.warehouses(id),
  item_id         uuid NOT NULL REFERENCES catalog.items(id),
  qty_on_hand     numeric(14,4) NOT NULL DEFAULT 0,
  qty_reserved    numeric(14,4) NOT NULL DEFAULT 0,
  PRIMARY KEY (warehouse_id, item_id),
  CHECK (qty_on_hand >= 0),
  CHECK (qty_reserved >= 0),
  CHECK (qty_reserved <= qty_on_hand)
);

CREATE TABLE inventory.stock_reservations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id   uuid NOT NULL REFERENCES pcp.work_orders(id),
  warehouse_id    uuid NOT NULL REFERENCES inventory.warehouses(id),
  item_id         uuid NOT NULL REFERENCES catalog.items(id),
  qty             numeric(14,4) NOT NULL,
  status          text NOT NULL CHECK (status IN ('ativa','consumida','cancelada')),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE inventory.stock_movements (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES party.organizations(id),
  warehouse_id    uuid NOT NULL REFERENCES inventory.warehouses(id),
  item_id         uuid NOT NULL REFERENCES catalog.items(id),
  movement_type   text NOT NULL CHECK (movement_type IN (
                    'entrada_compra','saida_consumo_os','ajuste','transferencia',
                    'entrada_devolucao','saida_outro'
                  )),
  qty             numeric(14,4) NOT NULL, -- sinal + entrada / - saida OU abs + type
  unit_cost       numeric(14,4),
  ref_type        text, -- purchase_receipt, work_order...
  ref_id          uuid,
  notes           text,
  moved_at        timestamptz NOT NULL DEFAULT now(),
  created_by      uuid REFERENCES app_auth.users(id)
);

CREATE INDEX stock_movements_item_idx ON inventory.stock_movements(item_id, moved_at DESC);

-- =============================================================================
-- purchasing (sem importação)
-- =============================================================================
CREATE TABLE purchasing.purchase_orders (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES party.organizations(id),
  number          text NOT NULL,
  supplier_id     uuid NOT NULL REFERENCES party.suppliers(party_id),
  status          text NOT NULL CHECK (status IN (
                    'rascunho','enviado','parcial','recebido','cancelado'
                  )),
  order_date      date NOT NULL DEFAULT CURRENT_DATE,
  expected_date   date,
  payment_terms   text,
  payment_due_date date,                  -- ciclo de caixa
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, number)
);

CREATE TABLE purchasing.purchase_order_lines (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid NOT NULL REFERENCES purchasing.purchase_orders(id) ON DELETE CASCADE,
  item_id         uuid NOT NULL REFERENCES catalog.items(id),
  qty_ordered     numeric(14,4) NOT NULL,
  qty_received    numeric(14,4) NOT NULL DEFAULT 0,
  unit_price      numeric(14,4) NOT NULL,
  line_no         int NOT NULL
);

CREATE TABLE purchasing.goods_receipts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid NOT NULL REFERENCES purchasing.purchase_orders(id),
  warehouse_id    uuid NOT NULL REFERENCES inventory.warehouses(id),
  received_at     timestamptz NOT NULL DEFAULT now(),
  notes           text,
  -- anexo XML NF-e entrada futuro (sem parsing fiscal completo nesta fase)
  attachment_key  text
);

CREATE TABLE purchasing.goods_receipt_lines (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goods_receipt_id uuid NOT NULL REFERENCES purchasing.goods_receipts(id) ON DELETE CASCADE,
  purchase_order_line_id uuid NOT NULL REFERENCES purchasing.purchase_order_lines(id),
  item_id         uuid NOT NULL REFERENCES catalog.items(id),
  qty             numeric(14,4) NOT NULL,
  unit_price      numeric(14,4) NOT NULL
);

-- =============================================================================
-- billing (NF-e saída + cobrança Inter) — sem NFS-e
-- =============================================================================
CREATE TABLE billing.invoices (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES party.organizations(id),
  number          text NOT NULL,
  sales_order_id  uuid NOT NULL REFERENCES commercial.sales_orders(id),
  status          text NOT NULL CHECK (status IN (
                    'rascunho','pronta','faturada','cancelada'
                  )),
  issue_date      date,
  total_amount    numeric(14,2) NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, number)
);

CREATE TABLE billing.fiscal_documents (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id      uuid NOT NULL REFERENCES billing.invoices(id),
  doc_model       text NOT NULL DEFAULT 'nfe' CHECK (doc_model IN ('nfe')), -- só NF-e agora
  status          text NOT NULL CHECK (status IN (
                    'pendente','autorizada','rejeitada','cancelada','denegada'
                  )),
  access_key      text,
  protocol        text,
  hub_provider    text, -- focusnfe | outro
  hub_ref         text,
  xml_object_key  text,
  pdf_object_key  text,
  payload         jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE billing.charges (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id      uuid NOT NULL REFERENCES billing.invoices(id),
  provider        text NOT NULL DEFAULT 'inter',
  status          text NOT NULL CHECK (status IN (
                    'pendente','emitida','paga','vencida','cancelada','baixa_manual'
                  )),
  our_number      text,
  pix_txid        text,
  due_date        date,
  amount          numeric(14,2) NOT NULL,
  paid_amount     numeric(14,2),
  paid_at         timestamptz,
  pdf_object_key  text,
  provider_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key text UNIQUE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE billing.shipments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_order_id  uuid NOT NULL REFERENCES commercial.sales_orders(id),
  status          text NOT NULL CHECK (status IN (
                    'aguardando','expedida','em_transito','entregue','recusada','extravio'
                  )),
  carrier_name    text,
  tracking_code   text,
  shipped_at      timestamptz,
  delivered_at    timestamptz,
  address_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE billing.delivery_confirmations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id     uuid NOT NULL REFERENCES billing.shipments(id),
  confirmed_at    timestamptz NOT NULL DEFAULT now(),
  confirmed_by_name text,
  notes           text,
  evidence_object_key text,
  validated       boolean NOT NULL DEFAULT false,
  validated_by    uuid REFERENCES app_auth.users(id),
  validated_at    timestamptz
);

-- =============================================================================
-- finance
-- =============================================================================
CREATE TABLE finance.receivables (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES party.organizations(id),
  invoice_id      uuid REFERENCES billing.invoices(id),
  charge_id       uuid REFERENCES billing.charges(id),
  customer_id     uuid NOT NULL REFERENCES party.customers(party_id),
  description     text,
  due_date        date NOT NULL,
  amount          numeric(14,2) NOT NULL,
  amount_open     numeric(14,2) NOT NULL,
  status          text NOT NULL CHECK (status IN ('aberta','parcial','paga','cancelada')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE finance.payables (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES party.organizations(id),
  purchase_order_id uuid REFERENCES purchasing.purchase_orders(id),
  supplier_id     uuid NOT NULL REFERENCES party.suppliers(party_id),
  description     text,
  due_date        date NOT NULL,
  amount          numeric(14,2) NOT NULL,
  amount_open     numeric(14,2) NOT NULL,
  status          text NOT NULL CHECK (status IN ('aberta','parcial','paga','cancelada')),
  -- pagamento manual no banco; sistema só controla
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE finance.payment_allocations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  direction       text NOT NULL CHECK (direction IN ('in','out')),
  receivable_id   uuid REFERENCES finance.receivables(id),
  payable_id      uuid REFERENCES finance.payables(id),
  amount          numeric(14,2) NOT NULL,
  paid_at         date NOT NULL DEFAULT CURRENT_DATE,
  method          text, -- pix, boleto, transferencia, dinheiro, outro
  external_ref    text, -- id Inter / comprovante
  notes           text,
  created_by      uuid REFERENCES app_auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (direction = 'in'  AND receivable_id IS NOT NULL AND payable_id IS NULL) OR
    (direction = 'out' AND payable_id IS NOT NULL AND receivable_id IS NULL)
  )
);

-- =============================================================================
-- integration
-- =============================================================================
CREATE TABLE integration.outbox_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type      text NOT NULL,
  aggregate_type  text NOT NULL,
  aggregate_id    uuid NOT NULL,
  payload         jsonb NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  processed_at    timestamptz,
  attempts        int NOT NULL DEFAULT 0,
  last_error      text
);

CREATE TABLE integration.webhook_inbox (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider        text NOT NULL,
  event_id        text,
  payload         jsonb NOT NULL,
  received_at     timestamptz NOT NULL DEFAULT now(),
  processed_at    timestamptz,
  UNIQUE (provider, event_id)
);

CREATE TABLE integration.audit_log (
  id              bigserial PRIMARY KEY,
  organization_id uuid,
  actor_user_id   uuid,
  action          text NOT NULL,
  entity_type     text NOT NULL,
  entity_id       uuid,
  before_data     jsonb,
  after_data      jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- =============================================================================
-- Seeds mínimos
-- =============================================================================
INSERT INTO catalog.uoms(code, name) VALUES
  ('un','Unidade'),
  ('m2','Metro quadrado'),
  ('m','Metro linear'),
  ('rolo','Rolo'),
  ('h','Hora'),
  ('kg','Quilograma')
ON CONFLICT DO NOTHING;

INSERT INTO app_auth.roles(code, name) VALUES
  ('admin','Administrador'),
  ('gerente','Gerente'),
  ('vendedor','Vendedor'),
  ('pcp','PCP / Produção'),
  ('estoque','Estoque'),
  ('financeiro','Financeiro'),
  ('faturamento','Faturamento')
ON CONFLICT DO NOTHING;
