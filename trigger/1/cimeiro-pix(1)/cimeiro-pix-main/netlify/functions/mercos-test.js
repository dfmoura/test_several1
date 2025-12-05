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

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  const startTime = Date.now();

  try {
    console.log('🔄 Testando conexão Mercos...');
    
    // Testar endpoint simples primeiro
    const testResponse = await fetch(`${MERCOS_CONFIG.baseUrl}/orders?limit=1`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'ApplicationToken': MERCOS_CONFIG.applicationToken,
        'CompanyToken': MERCOS_CONFIG.companyToken,
      },
    });

    const executionTime = Date.now() - startTime;

    if (!testResponse.ok) {
      let errorText;
      try {
        errorText = await testResponse.text();
      } catch (e) {
        errorText = `HTTP ${testResponse.status} - ${testResponse.statusText}`;
      }
      throw new Error(`API test failed - ${errorText}`);
    }


    let ordersData;
    try {
      ordersData = await testResponse.json();
    } catch (e) {
      ordersData = { orders: [] };
    }
    
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        message: `Conexão OK! ${ordersData?.orders?.length || 0} pedidos encontrados`,
        data: {
          api_accessible: true,
          company_token: MERCOS_CONFIG.companyToken,
          orders_count: ordersData?.orders?.length || 0,
          response_status: testResponse.status,
          connected: true,
        },
        execution_time_ms: executionTime,
      }),
    };

  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error('❌ Erro na conexão Mercos:', error);
    
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        message: `Erro na conexão Mercos: ${error.message}`,
        execution_time_ms: executionTime,
      }),
    };
  }
};