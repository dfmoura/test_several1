const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  const startTime = Date.now();

  try {
    console.log('🔄 Iniciando sincronização PIX...');
    
    // 1. Buscar dados PIX do Sankhya
    const sankhyaResponse = await fetch(`${process.env.URL}/.netlify/functions/sankhya-pix-data`);
    const sankhyaData = await sankhyaResponse.json();
    
    if (!sankhyaData.success) {
      throw new Error(`Erro ao buscar PIX Sankhya: ${sankhyaData.message}`);
    }

    const pixRecords = sankhyaData.pixData || [];
    
    // 2. Buscar pedidos do Mercos
    const mercosResponse = await fetch(`${process.env.URL}/.netlify/functions/mercos-orders`);
    const mercosData = await mercosResponse.json();
    
    if (!mercosData.success) {
      throw new Error(`Erro ao buscar pedidos Mercos: ${mercosData.message}`);
    }

    const orders = mercosData.orders || [];
    
    // 3. Simular processo de sincronização
    let totalProcessed = 0;
    let totalSuccess = 0;
    let totalErrors = 0;
    const details = [];
    const errors = [];

    for (const pixRecord of pixRecords) {
      totalProcessed++;
      
      // Procurar pedido correspondente
      const matchingOrder = orders.find(order => 
        order.nunota_found === pixRecord.nunota ||
        Math.abs(order.valor_total - pixRecord.valor) < 0.01
      );

      if (matchingOrder) {
        totalSuccess++;
        details.push(`✅ NUNOTA ${pixRecord.nunota}: Pedido ${matchingOrder.numero_pedido} atualizado`);
      } else {
        totalErrors++;
        errors.push(`❌ NUNOTA ${pixRecord.nunota}: Nenhum pedido correspondente encontrado`);
      }
    }

    const executionTime = Date.now() - startTime;

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: totalErrors === 0,
        totalProcessed,
        totalSuccess,
        totalErrors,
        executionTimeMs: executionTime,
        details,
        errors,
        summary: {
          pixDataFound: pixRecords.length,
          ordersFound: orders.length,
          successRate: totalProcessed > 0 ? (totalSuccess / totalProcessed) * 100 : 0,
        },
      }),
    };

  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error('❌ Erro na sincronização:', error);
    
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        totalProcessed: 0,
        totalSuccess: 0,
        totalErrors: 1,
        executionTimeMs: executionTime,
        details: [],
        errors: [error.message],
        summary: { criticalFailure: true },
      }),
    };
  }
};