const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const MERCOS_CONFIG = {
  baseUrl: process.env.MERCOS_BASE_URL || 'https://sandbox.mercos.com/api/v1',
  applicationToken: process.env.MERCOS_APPLICATION_TOKEN,
  companyToken: process.env.MERCOS_COMPANY_TOKEN,
};

function extractNunotaFromOrder(order) {
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

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  const startTime = Date.now();

  try {
    console.log('🔄 Buscando pedidos no Mercos...');
    
    const params = event.queryStringParameters || {};
    const limit = Math.min(parseInt(params.limit || '50'), 100);
    const search = params.search;

    let url = `${MERCOS_CONFIG.baseUrl}/orders?limit=${limit}`;
    if (search) {
      url += `&search=${encodeURIComponent(search)}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'ApplicationToken': MERCOS_CONFIG.applicationToken,
        'CompanyToken': MERCOS_CONFIG.companyToken,
      },
    });

    const executionTime = Date.now() - startTime;

    if (!response.ok) {
      let errorText;
      try {
        errorText = await response.text();
      } catch (e) {
        errorText = `HTTP ${response.status} - ${response.statusText}`;
      }
      throw new Error(errorText);
    }

    let data;
    try {
      data = await response.json();
    } catch (e) {
      throw new Error('Invalid JSON response from Mercos API');
    }
    
    const orders = (data.orders || []).map(order => ({
      id: order.id,
      numero_pedido: order.numero_pedido || order.id,
      cliente_nome: order.cliente?.nome || 'Cliente não informado',
      valor_total: parseFloat(order.valor_total || 0),
      status: order.status || 'unknown',
      data_criacao: order.created_at || new Date().toISOString(),
      observacoes: order.observacoes || '',
      referencia_cliente: order.external_reference,
      nunota_found: extractNunotaFromOrder(order),
    }));

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        orders,
        total: data.count || orders.length,
        execution_time_ms: executionTime,
      }),
    };

  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error('❌ Erro ao buscar pedidos Mercos:', error);
    
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        message: error.message,
        orders: [],
        total: 0,
        execution_time_ms: executionTime,
      }),
    };
  }
};