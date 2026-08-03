export interface Supplier {
  id: number;
  cnpj: string;
  razao_social: string;
  nome_fantasia?: string | null;
  ie?: string | null;
  email?: string | null;
  telefone?: string | null;
  cep?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  municipio?: string | null;
  uf?: string | null;
  observacao?: string | null;
  ativo: boolean;
}

export interface Product {
  id: number;
  sku?: string | null;
  descricao: string;
  grupo?: string | null;
  unidade: string;
  largura_mm?: number | null;
  comprimento_m?: number | null;
  gramatura?: string | null;
  ncm?: string | null;
  localizacao?: string | null;
  estoque_minimo: number;
  custo_medio?: number | null;
  observacao?: string | null;
  ativo: boolean;
}

export interface NfeItem {
  id: number;
  n_item: number;
  codigo_fornecedor: string;
  descricao: string;
  ncm?: string | null;
  cfop?: string | null;
  unidade: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  valor_icms?: number | null;
  valor_ipi?: number | null;
  product_id?: number | null;
  product?: Product | null;
}

export interface NfeDuplicata {
  id: number;
  numero: string;
  vencimento: string;
  valor: number;
}

export interface Nfe {
  id: number;
  chave: string;
  numero: string;
  serie?: string | null;
  emitida_em?: string | null;
  emit_cnpj: string;
  emit_nome: string;
  supplier_id?: number | null;
  purchase_order_id?: number | null;
  valor_produtos: number;
  valor_total: number;
  valor_icms?: number | null;
  valor_ipi?: number | null;
  status: string;
  xml_filename?: string | null;
  accepted_at?: string | null;
  created_at: string;
  items: NfeItem[];
  duplicatas: NfeDuplicata[];
}

export interface StockBalance {
  product_id: number;
  sku?: string | null;
  descricao: string;
  grupo?: string | null;
  unidade: string;
  largura_mm?: number | null;
  comprimento_m?: number | null;
  gramatura?: string | null;
  localizacao?: string | null;
  estoque_minimo: number;
  saldo: number;
  saldo_m2?: number | null;
  saldo_ml?: number | null;
  custo_medio?: number | null;
  valor_estoque?: number | null;
}

export interface StockMovement {
  id: number;
  product_id: number;
  product?: Product | null;
  tipo: string;
  quantidade: number;
  qtd_m2?: number | null;
  qtd_ml?: number | null;
  custo_unitario?: number | null;
  referencia?: string | null;
  observacao?: string | null;
  created_at: string;
}

export interface Payable {
  id: number;
  supplier_id?: number | null;
  supplier?: Supplier | null;
  nfe_id?: number | null;
  descricao: string;
  parcela?: string | null;
  vencimento: string;
  valor: number;
  status: string;
  data_programada?: string | null;
  data_pagamento?: string | null;
  valor_pago?: number | null;
  forma_pagamento?: string | null;
  observacao?: string | null;
}

export interface RequisitionItem {
  id: number;
  product_id?: number | null;
  descricao: string;
  quantidade: number;
  unidade: string;
  observacao?: string | null;
}

export interface Requisition {
  id: number;
  solicitante?: string | null;
  status: string;
  observacao?: string | null;
  created_at: string;
  items: RequisitionItem[];
}

export interface PurchaseOrderItem {
  id: number;
  product_id?: number | null;
  descricao: string;
  quantidade: number;
  unidade: string;
  preco_unitario: number;
}

export interface PurchaseOrder {
  id: number;
  supplier_id: number;
  supplier?: Supplier | null;
  requisition_id?: number | null;
  status: string;
  previsao_entrega?: string | null;
  condicao_pagamento?: string | null;
  observacao?: string | null;
  created_at: string;
  items: PurchaseOrderItem[];
}
