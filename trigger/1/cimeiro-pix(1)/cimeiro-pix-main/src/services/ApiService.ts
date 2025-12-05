import { API_ENDPOINTS } from '../utils/constants';
import type { SyncResult, ConnectionStatus, SyncLog, MercosOrder, SankhyaPix, CorrelationData, AdvancedLogMetrics } from '../types';

export class ApiService {
  static async executSync(): Promise<SyncResult> {
    try {
      const response = await fetch(API_ENDPOINTS.SYNC_EXECUTE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Sync execution failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        total: 0,
        success: 0,
        error: 1,
        not_found: 0,
        logs: [],
        execution_time_ms: 0,
        message: errorMessage,
      };
    }
  }

  static async testConnections(): Promise<ConnectionStatus> {
    try {
      const response = await fetch(API_ENDPOINTS.TEST_CONNECTIONS);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to test connections:', error);
      return {
        sankhya: false,
        mercos: false,
        supabase: false,
      };
    }
  }

  static async getLogs(
    status?: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ logs: SyncLog[]; total: number }> {
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      });

      if (status && status !== 'all') {
        params.append('status', status);
      }

      const response = await fetch(`${API_ENDPOINTS.GET_LOGS}?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get logs:', error);
      return { logs: [], total: 0 };
    }
  }

  static async getMercosOrders(
    page: number = 1,
    limit: number = 50,
    search?: string
  ): Promise<{ orders: MercosOrder[]; total: number }> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (search) {
        params.append('search', search);
      }

      const response = await fetch(`${API_ENDPOINTS.GET_MERCOS_ORDERS}?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Failed to get Mercos orders:', errorMessage);
      return { orders: [], total: 0 };
    }
  }

  static async getSankhyaPix(
    page: number = 1,
    limit: number = 50,
    search?: string
  ): Promise<{ pixData: SankhyaPix[]; total: number }> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (search) {
        params.append('search', search);
      }

      const response = await fetch(`${API_ENDPOINTS.GET_SANKHYA_PIX}?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Failed to get Sankhya PIX data:', errorMessage);
      return { pixData: [], total: 0 };
    }
  }

  static async correlateData(): Promise<{ correlations: CorrelationData[]; metrics: AdvancedLogMetrics }> {
    try {
      const response = await fetch(API_ENDPOINTS.CORRELATE_DATA, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Failed to correlate data:', errorMessage);
      return {
        correlations: [],
        metrics: {
          total_sankhya_pix: 0,
          total_mercos_orders: 0,
          synced_count: 0,
          pending_count: 0,
          orphan_sankhya_count: 0,
          orphan_mercos_count: 0,
          error_count: 0,
          sync_success_rate: 0,
        },
      };
    }
  }
}