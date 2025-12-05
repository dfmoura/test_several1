import { Handler } from '@netlify/functions';
import { corsHeaders, logIntegration, MERCOS_CONFIG } from './utils/helpers';

interface MercosOrder {
  id: string;
  numero_pedido: string;
  observacoes?: string;
  external_reference?: string;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders(), body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders(),
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const startTime = Date.now();

  try {
    const { nunota, emvpix } = JSON.parse(event.body || '{}');

    if (!nunota || !emvpix) {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({ error: 'NUNOTA e EMVPIX são obrigatórios' }),
      };
    }

    await logIntegration({
      type: 'mercos_update_start',
      message: `Iniciando atualização no Mercos para NUNOTA: ${nunota}`,
      data: { nunota, emvpix_length: emvpix.length },
    });

    // Buscar pedido no Mercos por NUNOTA
    const searchResponse = await fetch(`${MERCOS_CONFIG.baseUrl}/orders?search=${nunota}&limit=10`, {
      headers: {
        'Content-Type': 'application/json',
        'ApplicationToken': MERCOS_CONFIG.applicationToken,
        'CompanyToken': MERCOS_CONFIG.companyToken,
      },
    });

    if (!searchResponse.ok) {
      throw new Error(`Erro ao buscar pedido no Mercos: ${searchResponse.status}`);
    }

    const searchData = await searchResponse.json();
    const orders: MercosOrder[] = searchData.orders || [];

    // Encontrar pedido que contenha o NUNOTA
    const targetOrder = orders.find(order => 
      order.external_reference === nunota ||
      order.observacoes?.includes(nunota) ||
      order.numero_pedido === nunota
    );

    if (!targetOrder) {
      const executionTime = Date.now() - startTime;
      
      await logIntegration({
        type: 'mercos_update_not_found',
        message: `Pedido não encontrado no Mercos para NUNOTA: ${nunota}`,
        data: { nunota, searched_orders: orders.length },
        execution_time_ms: executionTime,
      });

      return {
        statusCode: 404,
        headers: corsHeaders(),
        body: JSON.stringify({
          success: false,
          error: 'Pedido não encontrado no Mercos',
          nunota,
          execution_time_ms: executionTime,
        }),
      };
    }

    // Atualizar observações do pedido com o PIX
    const timestamp = new Date().toLocaleString('pt-BR');
    const pixInfo = `=== DADOS PIX (${timestamp}) ===\nNUNOTA: ${nunota}\n${emvpix}\n${'='.repeat(50)}`;
    
    // Preservar observações existentes
    let observacoesAtualizadas = targetOrder.observacoes || '';
    
    // Remover PIX antigo se existir
    observacoesAtualizadas = observacoesAtualizadas.replace(/=== DADOS PIX.*?={50,}/gs, '').trim();
    
    // Adicionar novo PIX
    observacoesAtualizadas = observacoesAtualizadas 
      ? `${observacoesAtualizadas}\n\n${pixInfo}`
      : pixInfo;

    const updateResponse = await fetch(`${MERCOS_CONFIG.baseUrl}/orders/${targetOrder.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'ApplicationToken': MERCOS_CONFIG.applicationToken,
        'CompanyToken': MERCOS_CONFIG.companyToken,
      },
      body: JSON.stringify({
        observacoes: observacoesAtualizadas,
      }),
    });

    const executionTime = Date.now() - startTime;

    if (!updateResponse.ok) {
      throw new Error(`Erro ao atualizar pedido no Mercos: ${updateResponse.status}`);
    }

    await logIntegration({
      type: 'mercos_update_success',
      message: `Pedido atualizado com sucesso no Mercos`,
      data: { 
        nunota, 
        order_id: targetOrder.id, 
        numero_pedido: targetOrder.numero_pedido 
      },
      summary: { total: 1, success: 1, errors: 0 },
      execution_time_ms: executionTime,
    });

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({
        success: true,
        message: 'Pedido atualizado com sucesso',
        data: {
          nunota,
          order_id: targetOrder.id,
          numero_pedido: targetOrder.numero_pedido,
        },
        execution_time_ms: executionTime,
      }),
    };

  } catch (error) {
    const executionTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';

    await logIntegration({
      type: 'mercos_update_error',
      message: 'Erro ao atualizar pedido no Mercos',
      error: errorMessage,
      execution_time_ms: executionTime,
    });

    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({
        success: false,
        error: errorMessage,
        execution_time_ms: executionTime,
      }
      )
    }
  }
}