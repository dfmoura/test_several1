import { supabase } from '../lib/supabase';
import type { SyncLog, ApiConfig, DashboardMetrics } from '../types';

export class SupabaseService {
  static async testConnection(): Promise<boolean> {
    try {
      const { error } = await supabase.from('sync_logs').select('id').limit(1);
      return !error;
    } catch {
      return false;
    }
  }

  static async saveSyncLog(log: Omit<SyncLog, 'id' | 'created_at'>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('sync_logs')
        .insert([log]);
      return !error;
    } catch {
      return false;
    }
  }

  static async getLogs(
    status?: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ logs: SyncLog[]; total: number }> {
    try {
      let query = supabase
        .from('integration_logs')
        .select('*', { count: 'exact' })
        .order('timestamp', { ascending: false })
        .range(offset, offset + limit - 1);

      if (status && status !== 'all') {
        query = query.eq('type', status);
      }

      const { data, count, error } = await query;

      if (error) throw error;

      return {
        logs: data || [],
        total: count || 0,
      };
    } catch (error) {
      console.error('Failed to get logs:', error);
      return { logs: [], total: 0 };
    }
  }

  static async getDashboardMetrics(): Promise<DashboardMetrics> {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const { data, error } = await supabase
        .from('integration_logs')
        .select('type, timestamp')
        .gte('timestamp', yesterday.toISOString());

      if (error) throw error;

      const metrics = {
        total: data?.length || 0,
        success: data?.filter(log => log.type.includes('success')).length || 0,
        error: data?.filter(log => log.type.includes('error')).length || 0,
        not_found: data?.filter(log => log.type.includes('not_found')).length || 0,
      };

      // Get last sync timestamp
      const { data: lastSync } = await supabase
        .from('integration_logs')
        .select('timestamp')
        .order('timestamp', { ascending: false })
        .limit(1);

      return {
        ...metrics,
        last_sync: lastSync?.[0]?.timestamp,
      };
    } catch (error) {
      console.error('Failed to get dashboard metrics:', error);
      return { total: 0, success: 0, error: 0, not_found: 0 };
    }
  }

  static async saveConfig(key: string, value: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('integration_logs')
        .upsert([{ key: key, value: value, updated_at: new Date().toISOString() }]);
      return !error;
    } catch (error) {
      console.error('Failed to save config:', error);
      return false;
    }
  }

  static async getConfig(key: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('integration_logs')
        .select('value')
        .eq('key', key)
        .limit(1);

      if (error) return null;
      return data && data.length > 0 ? data[0].value : null;
    } catch (error) {
      console.error('Failed to get config:', error);
      return null;
    }
  }
}