import { Handler } from '@netlify/functions';

interface MercosOrder {
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

const MERCOS_CONFIG = {
  baseUrl: process.env.MERCOS_BASE_URL || 'https://sandbox.mercos.com/api/v1',
  applicationToken: process.env.MERCOS_APPLICATION_TOKEN,
  companyToken: process.env.MERCOS_COMPANY_TOKEN,
};

class MercosService {
  static async getOrders(page: number = 1, limit: number = 50, search?: string): Promise<{ orders: MercosOrder[], total: number }> {
    const headers = {
      'Content-Type': 'application/json',
      'ApplicationToken': MERCOS_CONFIG.applicationToken,
      'CompanyToken': MERCOS_CONFIG.companyToken,
    };

    try {
      let url = `${MERCOS_CONFIG.baseUrl}/orders?page=${page}&page_size=${limit}`;
      
      if (search) {
        url += `&search=${encodeURIComponent(search)}`;
      }

      const response = await fetch(url, { headers });

      if (!response.ok) {
        throw new Error(`Mercos API error: ${response.status}`);
      }

      const data = await response.json();
      
      const orders: MercosOrder[] = (data.orders || []).map((order: any) => ({
        id: order.id,
        numero_pedido: order.numero_pedido || order.id,
        cliente_nome: order.cliente?.nome || 'Cliente não informado',
        valor_total: parseFloat(order.valor_total || 0),
        status: order.status || 'unknown',
        data_criacao: order.created_at || new Date().toISOString(),
        observacoes: order.observacoes || '',
        referencia_cliente: order.external_reference,
        nunota_found: this.extractNunotaFromOrder(order),
      }));

      return {
        orders,
        total: data.count || orders.length,
      };
    } catch (error) {
      console.error('Error fetching Mercos orders:', error);
      return { orders: [], total: 0 };
    }
  }

  static extractNunotaFromOrder(order: any): string | undefined {
    // Try to extract NUNOTA from various fields
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
}

export const handler: Handler = async (event, context) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const params = event.queryStringParameters || {};
    const page = parseInt(params.page || '1');
    const limit = Math.min(parseInt(params.limit || '50'), 100);
    const search = params.search;

    const result = await MercosService.getOrders(page, limit, search);

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(result),
    };

  } catch (error) {
    console.error('Failed to get Mercos orders:', error);
    
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Failed to get Mercos orders',
        message: error instanceof Error ? error.message : 'Unknown error',
        orders: [],
        total: 0,
      }),
    };
  }
};