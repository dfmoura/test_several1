import { supabase } from '../lib/supabase';

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

export interface MercosConfig {
  baseUrl: string;
  applicationToken: string;
  companyToken: string;
}

export class MercosService {
  private config: MercosConfig;

  constructor() {
    this.config = {
      baseUrl: import.meta.env.VITE_MERCOS_BASE_URL,
      applicationToken: import.meta.env.VITE_MERCOS_APPLICATION_TOKEN,
      companyToken: import.meta.env.VITE_MERCOS_COMPANY_TOKEN,
    };
  }

  async testConnection(): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      console.log('🔄 Testando conexão Mercos...');
      
      const baseUrl = import.meta.env.DEV ? 'http://localhost:8888' : '';
      const response = await fetch(`${baseUrl}/.netlify/functions/mercos-test`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      this.supabase && await this.logOperation('mercos_connection_test', 'success', 'Conexão Mercos testada com sucesso', {
        orders_count: result.data?.orders_count || 0,
        response_status: result.data?.response_status || 0
      });

      return {
        success: result.success,
        message: result.message,
        data: result.data
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      this.supabase && await this.logOperation('mercos_connection_test', 'error', 'Falha na conexão Mercos', {
        error: errorMessage
      });

      return {
        success: false,
        message: `Erro na conexão: ${errorMessage}`
      };
    }
  }

  async getOrders(limit: number = 50, search?: string): Promise<{ success: boolean; orders: MercosOrder[]; total: number; message?: string }> {
    try {
      console.log('🔄 Buscando pedidos Mercos...');
      
      const baseUrl = import.meta.env.DEV ? 'http://localhost:8888' : '';
      let url = `${baseUrl}/.netlify/functions/mercos-orders?limit=${limit}`;
      if (search) {
        url += `&search=${encodeURIComponent(search)}`;
      }

      const response = await fetch(url);
      const result = await response.json();

      this.supabase && await this.logOperation('mercos_get_orders', 'success', `${result.orders?.length || 0} pedidos recuperados do Mercos`, {
        orders_count: result.orders?.length || 0,
        search_term: search
      });

      return {
        success: result.success,
        orders: result.orders || [],
        total: result.total || 0,
        message: result.message
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      this.supabase && await this.logOperation('mercos_get_orders', 'error', 'Erro ao buscar pedidos Mercos', {
        error: errorMessage
      });

      return {
        success: false,
        orders: [],
        total: 0,
        message: errorMessage
      };
    }
  }

  async updateOrderObservations(orderId: string, pixData: string, nunota: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🔄 Atualizando observações do pedido...', orderId);

      // Buscar pedido atual
      const currentOrderResponse = await fetch(`${this.config.baseUrl}/orders/${orderId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'ApplicationToken': this.config.applicationToken,
          'CompanyToken': this.config.companyToken,
        },
      });

      if (!currentOrderResponse.ok) {
        throw new Error(`Pedido não encontrado: ${currentOrderResponse.status}`);
      }

      const currentOrder = await currentOrderResponse.json();

      // Construir novas observações
      const timestamp = new Date().toLocaleString('pt-BR');
      const pixInfo = `=== DADOS PIX (${timestamp}) ===\nNUNOTA: ${nunota}\n${pixData}\n${'='.repeat(50)}`;
      
      // Preservar observações existentes, removendo PIX antigo
      let observacoesAtualizadas = currentOrder.observacoes || '';
      observacoesAtualizadas = observacoesAtualizadas.replace(/=== DADOS PIX.*?={50,}/gs, '').trim();
      
      // Adicionar novo PIX
      observacoesAtualizadas = observacoesAtualizadas 
        ? `${observacoesAtualizadas}\n\n${pixInfo}`
        : pixInfo;

      // Atualizar pedido
      const updateResponse = await fetch(`${this.config.baseUrl}/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'ApplicationToken': this.config.applicationToken,
          'CompanyToken': this.config.companyToken,
        },
        body: JSON.stringify({
          observacoes: observacoesAtualizadas,
        }),
      });

      if (!updateResponse.ok) {
        throw new Error(`Erro ao atualizar: ${updateResponse.status}`);
      }

      this.supabase && await this.logOperation('mercos_update_order', 'success', `Pedido ${orderId} atualizado com PIX`, {
        order_id: orderId,
        nunota,
        pix_length: pixData.length
      });

      return {
        success: true,
        message: `Pedido ${orderId} atualizado com sucesso`
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      this.supabase && await this.logOperation('mercos_update_order', 'error', `Erro ao atualizar pedido ${orderId}`, {
        order_id: orderId,
        nunota,
        error: errorMessage
      });

      return {
        success: false,
        message: errorMessage
      };
    }
  }

  private extractNunotaFromOrder(order: any): string | undefined {
    // Tentar extrair NUNOTA de vários campos
    if (order.external_reference && /^\d+$/.test(order.external_reference)) {
      return order.external_reference;
    }

    if (order.observacoes) {
      const nunotaMatch = order.observacoes.match(/NUNOTA[:\s]*(\d+)/i);
      if (nunotaMatch) {
        return nunotaMatch[1];
      }
    }

    return undefined;
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