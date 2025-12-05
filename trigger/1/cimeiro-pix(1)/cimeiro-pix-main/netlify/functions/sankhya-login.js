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

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  const startTime = Date.now();

  try {
    console.log('🔄 Testando autenticação Sankhya Gateway API...');
    
    // Primeiro fazer login sem Bearer token
    const loginResponse = await fetch(`${SANKHYA_CONFIG.baseUrl}/mge/service.sbr`, {
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

    const executionTime = Date.now() - startTime;

    if (!loginResponse.ok) {
      const errorText = await loginResponse.text();
      throw new Error(`HTTP ${loginResponse.status}: ${errorText}`);
    }

    const data = await loginResponse.json();
    
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        message: 'Autenticação Sankhya Gateway API realizada com sucesso',
        data: {
          session_id: data.responseBody?.jsessionid ? 'Válido' : 'Inválido',
          jsessionid: data.responseBody?.jsessionid,
          jsessionid2: data.responseBody?.jsessionid2,
          authenticated: true,
        },
        execution_time_ms: executionTime,
      }),
    };

  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error('❌ Erro na autenticação Sankhya Gateway API:', error);
    
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        message: `Erro na autenticação Sankhya Gateway API: ${error.message}`,
        execution_time_ms: executionTime,
      }),
    };
  }
};