const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const SANKHYA_CONFIG = {
  baseUrl: process.env.SANKHYA_BASE_URL || 'https://api.sandbox.sankhya.com.br',
  token: process.env.SANKHYA_API_TOKEN,
  appKey: process.env.SANKHYA_APP_KEY,
  username: process.env.SANKHYA_USERNAME,
  password: process.env.SANKHYA_PASSWORD,
};

async function authenticateSankhya() {
  const response = await fetch(`${SANKHYA_CONFIG.baseUrl}/mge/service.sbr`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'AppKey': SANKHYA_CONFIG.appKey,
    },
    body: JSON.stringify({
      serviceName: 'MobileLoginSP.login',
      requestBody: {
        NOMUSU: SANKHYA_CONFIG.username,
        INTERNO: SANKHYA_CONFIG.password,
        KEEPCONNECTED: 'S',
        AUTHKEY: SANKHYA_CONFIG.token
      }
    }),
  });

  if (!response.ok) {
    throw new Error(`Sankhya Gateway auth failed: ${response.status}`);
  }

  const data = await response.json();
  return {
    jsessionid: data.responseBody?.jsessionid,
    cookie: data.responseBody?.cookie,
  };
}

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  const startTime = Date.now();

  try {
    console.log('🔄 Buscando dados PIX no Sankhya Gateway API...');
    
    // Autenticar
    const auth = await authenticateSankhya();
    
    // Buscar PIX dos últimos 30 dias
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateFilter = thirtyDaysAgo.toISOString().split('T')[0];

    const requestBody = {
      serviceName: 'CRUDServiceProvider.loadRecords',
      requestBody: {
        dataSet: {
          rootEntity: 'TGFFIN',
          fields: ['NUNOTA', 'EMVPIX', 'VLRDESDOB', 'DHBAIXA', 'DTNEG'],
          criteria: {
            expression: {
              '$and': [
                { 'EMVPIX': { '$ne': null } },
                { 'EMVPIX': { '$ne': '' } }
              ]
            }
          },
          orderBy: [{ field: 'DTNEG', order: 'DESC' }],
          limit: 100
        }
      }
    };

    const response = await fetch(`${SANKHYA_CONFIG.baseUrl}/mge/service.sbr`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'AppKey': SANKHYA_CONFIG.appKey,
        'Cookie': auth.cookie || `JSESSIONID=${auth.jsessionid}`,
      },
      body: JSON.stringify(requestBody),
    });

    const executionTime = Date.now() - startTime;

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const entities = data.responseBody?.entities || data.entities || [];

    const pixData = entities.map(entity => ({
      nunota: entity.NUNOTA,
      emvpix: entity.EMVPIX,
      valor: parseFloat(entity.VLRDESDOB || 0),
      data_geracao: entity.DTNEG,
      dhbaixa: entity.DHBAIXA,
      status_pix: entity.DHBAIXA ? 'pago' : 'ativo'
    }));

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        pixData,
        total: pixData.length,
        message: `${pixData.length} registros PIX encontrados`,
        execution_time_ms: executionTime,
      }),
    };

  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error('❌ Erro ao buscar PIX Sankhya Gateway API:', error);
    
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        message: `Erro Gateway API: ${error.message}`,
        pixData: [],
        total: 0,
        execution_time_ms: executionTime,
      }),
    };
  }
};