import { MercosService, MercosOrder } from './MercosService';
import { SankhyaService, SankhyaPixData } from './SankhyaService';
import { supabase } from '../lib/supabase';

export interface SyncResult {
  success: boolean;
  totalProcessed: number;
  totalSuccess: number;
  totalErrors: number;
  executionTimeMs: number;
  details: string[];
  errors: string[];
}

export class IntegrationService {
  private mercosService: MercosService;
  private sankhyaService: SankhyaService;

  constructor() {
    this.mercosService = new MercosService();
    this.sankhyaService = new SankhyaService();
  }

  async testAllConnections(): Promise<{ sankhya: any; mercos: any; supabase: any }> {
    console.log('🔄 Testando todas as conexões...');

    const [sankhyaResult, mercosResult, supabaseResult] = await Promise.all([
      this.sankhyaService.testConnection(),
      this.mercosService.testConnection(),
      this.testSupabaseConnection()
    ]);

    await this.logOperation('integration_test_all', 'success', 'Teste completo de conexões realizado', {
      sankhya: sankhyaResult.success,
      mercos: mercosResult.success,
      supabase: supabaseResult.success
    });

    return {
      sankhya: sankhyaResult,
      mercos: mercosResult,
      supabase: supabaseResult
    };
  }

  async syncPixData(nunota?: string): Promise<SyncResult> {
    const startTime = Date.now();

    try {
      console.log('🔄 Iniciando sincronização PIX...', { nunota });

      // Usar a function de sincronização com URL correta
      const baseUrl = import.meta.env.DEV ? 'http://localhost:8888' : '';
      const response = await fetch(`${baseUrl}/.netlify/functions/sync-integration`);
      const result = await response.json();

      const executionTimeMs = Date.now() - startTime;

      await this.logOperation('integration_sync_complete', result.success ? 'success' : 'error', 
        `Sincronização concluída: ${result.totalSuccess} sucessos, ${result.totalErrors} erros`, {
          totalProcessed: result.totalProcessed,
          totalSuccess: result.totalSuccess,
          totalErrors: result.totalErrors,
          executionTimeMs,
          nunota_filter: nunota
        });

      return {
        success: result.success,
        totalProcessed: result.totalProcessed,
        totalSuccess: result.totalSuccess,
        totalErrors: result.totalErrors,
        executionTimeMs,
        details: result.details || [],
        errors: result.errors || []
      };

    } catch (error) {
      const executionTimeMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      await this.logOperation('integration_sync_error', 'error', 'Erro crítico na sincronização', {
        error: errorMessage,
        totalProcessed: 0,
        executionTimeMs
      });

      return {
        success: false,
        totalProcessed: 0,
        totalSuccess: 0,
        totalErrors: 1,
        executionTimeMs,
        details: [],
        errors: [errorMessage]
      };
    }
  }

  private async processPixRecord(pixData: SankhyaPixData): Promise<{ success: boolean; message: string }> {
    try {
      // 1. Buscar pedidos no Mercos que correspondam ao NUNOTA
      const mercosResult = await this.mercosService.getOrders(10, pixData.nunota);
      
      if (!mercosResult.success) {
        throw new Error(`Erro ao buscar pedidos Mercos: ${mercosResult.message}`);
      }

      // 2. Filtrar pedidos que realmente correspondem
      const matchingOrders = mercosResult.orders.filter(order => 
        order.nunota_found === pixData.nunota ||
        order.referencia_cliente === pixData.nunota ||
        order.observacoes?.includes(pixData.nunota) ||
        this.isValueMatch(order.valor_total, pixData.valor)
      );

      if (matchingOrders.length === 0) {
        return {
          success: false,
          message: 'Nenhum pedido correspondente encontrado no Mercos'
        };
      }

      // 3. Atualizar cada pedido encontrado
      let updatedCount = 0;
      for (const order of matchingOrders) {
        const updateResult = await this.mercosService.updateOrderObservations(
          order.id, 
          pixData.emvpix, 
          pixData.nunota
        );

        if (updateResult.success) {
          updatedCount++;
        }
      }

      return {
        success: updatedCount > 0,
        message: `${updatedCount} de ${matchingOrders.length} pedidos atualizados`
      };

    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  private isValueMatch(mercosValue: number, sankhyaValue: number): boolean {
    // Tolerância de 1% para diferenças de valor
    const tolerance = Math.abs(mercosValue - sankhyaValue) / sankhyaValue;
    return tolerance < 0.01;
  }

  private async testSupabaseConnection(): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      const { data, error } = await supabase.from('integration_logs').select('id').limit(1);
      
      if (error) {
        throw error;
      }

      return {
        success: true,
        message: 'Conectado com sucesso!',
        data: { logs_available: true }
      };

    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  private async logOperation(type: string, status: 'success' | 'error', message: string, data?: any) {
    try {
      if (!supabase) {
        console.log('Log (Supabase não disponível):', { type, status, message, data });
        return;
      }
      
      await supabase.from('integration_logs').insert([{
        type,
        message,
        data,
        timestamp: new Date().toISOString(),
        created_at: new Date().toISOString(),
      }]);
    } catch (error) {
      console.error('Erro ao salvar log:', error);
    }
  }
}