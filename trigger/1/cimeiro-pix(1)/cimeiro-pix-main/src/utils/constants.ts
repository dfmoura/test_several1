export const API_ENDPOINTS = {
  SYNC_EXECUTE: '/api/sync-execute',
  TEST_CONNECTIONS: '/api/test-connections',
  GET_LOGS: '/api/get-logs',
  GET_MERCOS_ORDERS: '/api/get-mercos-orders',
  GET_SANKHYA_PIX: '/api/get-sankhya-pix',
  CORRELATE_DATA: '/api/correlate-data',
} as const;

export const SYNC_STATUS = {
  SUCCESS: 'success',
  ERROR: 'error',
  NOT_FOUND: 'not_found',
} as const;

export const CORRELATION_STATUS = {
  SYNCED: 'synced',
  PENDING: 'pending',
  ORPHAN_SANKHYA: 'orphan_sankhya',
  ORPHAN_MERCOS: 'orphan_mercos',
  ERROR: 'error',
} as const;

export const REFRESH_INTERVALS = {
  DASHBOARD: 30000, // 30 seconds
  LOGS: 60000, // 1 minute
  ADVANCED_LOGS: 30000, // 30 seconds
} as const;

export const PAGINATION = {
  DEFAULT_LIMIT: 20,
  ADVANCED_LIMIT: 50,
  MAX_LIMIT: 100,
} as const;

export const STATUS_COLORS = {
  success: 'text-green-600 bg-green-50',
  error: 'text-red-600 bg-red-50',
  not_found: 'text-yellow-600 bg-yellow-50',
  synced: 'text-green-600 bg-green-50',
  pending: 'text-yellow-600 bg-yellow-50',
  orphan_sankhya: 'text-orange-600 bg-orange-50',
  orphan_mercos: 'text-purple-600 bg-purple-50',
} as const;

export const STATUS_LABELS = {
  success: 'Sucesso',
  error: 'Erro',
  not_found: 'Não Encontrado',
  synced: 'Sincronizado',
  pending: 'Pendente',
  orphan_sankhya: 'Órfão Sankhya',
  orphan_mercos: 'Órfão Mercos',
} as const;