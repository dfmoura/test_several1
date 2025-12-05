import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

interface CorrelationData {
  nunota: string;
  sankhya_data?: any;
  mercos_data?: any;
  correlation_status: 'synced' | 'pending' | 'orphan_sankhya' | 'orphan_mercos' | 'error';
  sync_history: any[];
  last_sync_attempt?: string;
  error_message?: string;
}

interface AdvancedLogMetrics {
  total_sankhya_pix: number;
  total_mercos_orders: number;
  synced_count: number;
  pending_count: number;
  orphan_sankhya_count: number;
  orphan_mercos_count: number;
  error_count: number;
  sync_success_rate: number;
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables. Check Netlify config.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

const MERCOS_CONFIG = {
  baseUrl: process.env.MERCOS_BASE_URL,
  applicationToken: process.env.MERCOS_APPLICATION_TOKEN,
  companyToken: process.env.MERCOS_COMPANY_TOKEN,
};

const SANKHYA_CONFIG = {
  baseUrl: process.env.SANKHYA_BASE_URL,
  token: process.env.SANKHYA_API_TOKEN,
  appKey: process.env.SANKHYA_APP_KEY,
  username: process.env.SANKHYA_USERNAME,
  password: process.env.SANKHYA_PASSWORD,
};

class CorrelationService {
  static async correlateData(): Promise<{ correlations: CorrelationData[], metrics: AdvancedLogMetrics }> {
    try {
      // Get data from both systems
      const [sankhyaData, mercosData, syncLogs] = await Promise.all([
        this.getSankhyaData(),
        this.getMercosData(),
        this.getSyncLogs(),
      ]);

      // Create correlation map
      const correlations: CorrelationData[] = [];
      const processedNunotas = new Set<string>();

      // Process Sankhya PIX data
      for (const pixData of sankhyaData) {
        const nunota = pixData.nunota;
        processedNunotas.add(nunota);

        // Find corresponding Mercos order
        const mercosOrder = mercosData.find(order => 
          order.nunota_found === nunota ||
          order.referencia_cliente === nunota ||
          order.observacoes?.includes(nunota)
        );

        // Get sync history for this NUNOTA
        const history = syncLogs.filter(log => log.nunota === nunota);
        const lastSync = history.length > 0 ? history[0].created_at : undefined;
        const hasSuccessfulSync = history.some(log => log.status === 'success');

        let status: CorrelationData['correlation_status'] = 'orphan_sankhya';
        let errorMessage: string | undefined;

        if (mercosOrder) {
          if (hasSuccessfulSync) {
            status = 'synced';
          } else {
            status = 'pending';
          }
        } else {
          const hasError = history.some(log => log.status === 'error');
          if (hasError) {
            status = 'error';
            errorMessage = history.find(log => log.status === 'error')?.error_message;
          }
        }

        correlations.push({
          nunota,
          sankhya_data: pixData,
          mercos_data: mercosOrder,
          correlation_status: status,
          sync_history: history,
          last_sync_attempt: lastSync,
          error_message: errorMessage,
        });
      }

      // Process orphan Mercos orders (orders with NUNOTA but no PIX data)
      for (const order of mercosData) {
        if (order.nunota_found && !processedNunotas.has(order.nunota_found)) {
          correlations.push({
            nunota: order.nunota_found,
            mercos_data: order,
            correlation_status: 'orphan_mercos',
            sync_history: [],
          });
        }
      }

      // Calculate metrics
      const metrics: AdvancedLogMetrics = {
        total_sankhya_pix: sankhyaData.length,
        total_mercos_orders: mercosData.length,
        synced_count: correlations.filter(c => c.correlation_status === 'synced').length,
        pending_count: correlations.filter(c => c.correlation_status === 'pending').length,
        orphan_sankhya_count: correlations.filter(c => c.correlation_status === 'orphan_sankhya').length,
        orphan_mercos_count: correlations.filter(c => c.correlation_status === 'orphan_mercos').length,
        error_count: correlations.filter(c => c.correlation_status === 'error').length,
        sync_success_rate: 0,
      };

      if (metrics.total_sankhya_pix > 0) {
        metrics.sync_success_rate = (metrics.synced_count / metrics.total_sankhya_pix) * 100;
      }

      return { correlations, metrics };

    } catch (error) {
      console.error('Correlation failed:', error);
      throw error;
    }
  }

  static async getSankhyaData(): Promise<any[]> {
    try {
      // This would normally call the get-sankhya-pix function
      // For now, return mock data or make direct API call
      const response = await fetch(`${process.env.URL}/.netlify/functions/get-sankhya-pix?limit=100`);
      if (response.ok) {
        const data = await response.json();
        return data.pixData || [];
      }
      return [];
    } catch (error) {
      console.error('Error getting Sankhya data:', error);
      return [];
    }
  }

  static async getMercosData(): Promise<any[]> {
    try {
      // This would normally call the get-mercos-orders function
      const response = await fetch(`${process.env.URL}/.netlify/functions/get-mercos-orders?limit=100`);
      if (response.ok) {
        const data = await response.json();
        return data.orders || [];
      }
      return [];
    } catch (error) {
      console.error('Error getting Mercos data:', error);
      return [];
    }
  }

  static async getSyncLogs(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('sync_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting sync logs:', error);
      return [];
    }
  }
}

export const handler: Handler = async (event, context) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const result = await CorrelationService.correlateData();

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(result),
    };

  } catch (error) {
    console.error('Failed to correlate data:', error);
    
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Failed to correlate data',
        message: error instanceof Error ? error.message : 'Unknown error',
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
      }),
    };
  }
};