export interface SyncLog {
  id: string;
  nunota: string;
  status: 'success' | 'error' | 'not_found';
  pedido_mercos_id?: string;
  pix_data?: string;
  error_message?: string;
  execution_time_ms?: number;
  created_at: string;
}

export interface ApiConfig {
  config_key: string;
  config_value: string;
  updated_at: string;
}

export interface SyncResult {
  total: number;
  success: number;
  error: number;
  not_found: number;
  logs: SyncLog[];
  execution_time_ms: number;
}

export interface ConnectionStatus {
  sankhya: boolean;
  mercos: boolean;
  supabase: boolean;
}

export interface DashboardMetrics {
  total: number;
  success: number;
  error: number;
  not_found: number;
  last_sync?: string;
}

export interface SankhyaAuth {
  jsessionid: string;
  jsessionid2: string;
}

export interface SankhyaFinRecord {
  NUNOTA: string;
  EMVPIX: string;
}

export interface MercosOrder {
  id: string;
  numero_pedido: string;
  cliente_nome: string;
  valor_total: number;
  status: string;
  data_criacao: string;
  observacoes: string;
  referencia_cliente?: string;
  nunota_found?: string;
}

export interface SankhyaPix {
  nunota: string;
  emvpix: string;
  valor: number;
  data_geracao: string;
  dhbaixa?: string;
  status_pix: 'ativo' | 'pago' | 'vencido';
  pedido_mercos_id?: string;
}

export interface CorrelationData {
  nunota: string;
  sankhya_data?: SankhyaPix;
  mercos_data?: MercosOrder;
  correlation_status: 'synced' | 'pending' | 'orphan_sankhya' | 'orphan_mercos' | 'error';
  sync_history: SyncLog[];
  last_sync_attempt?: string;
  error_message?: string;
}

export interface AdvancedLogMetrics {
  total_sankhya_pix: number;
  total_mercos_orders: number;
  synced_count: number;
  pending_count: number;
  orphan_sankhya_count: number;
  orphan_mercos_count: number;
  error_count: number;
  sync_success_rate: number;
}