import { Handler } from '@netlify/functions';
import { corsHeaders, logIntegration, supabase, authenticateSankhya, SANKHYA_CONFIG, MERCOS_CONFIG } from './utils/helpers';

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders(), body: '' };
  }

  const startTime = Date.now();
  const testResults: any = {
    timestamp: new Date().toISOString(),
    tests: {},
    overall_status: 'success',
  };

  try {
    await logIntegration({
      type: 'integration_test_start',
      message: 'Iniciando teste completo da integração',
    });

    // 1. Teste Supabase
    try {
      const { data, error } = await supabase.from('integration_logs').select('id').limit(1);
      testResults.tests.supabase = {
        status: error ? 'error' : 'success',
        message: error ? error.message : 'Conexão OK',
        response_time: Date.now() - startTime,
      };
    } catch (error) {
      testResults.tests.supabase = {
        status: 'error',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
        response_time: Date.now() - startTime,
      };
      testResults.overall_status = 'error';
    }

    // 2. Teste Sankhya
    try {
      const auth = await authenticateSankhya();
      testResults.tests.sankhya = {
        status: 'success',
        message: 'Autenticação OK',
        session_id: auth.jsessionid ? 'Válido' : 'Inválido',
        response_time: Date.now() - startTime,
      };
    } catch (error) {
      testResults.tests.sankhya = {
        status: 'error',
        message: error instanceof Error ? error.message : 'Erro de autenticação',
        response_time: Date.now() - startTime,
      };
      testResults.overall_status = 'error';
    }

    // 3. Teste Mercos
    try {
      const mercosResponse = await fetch(`${MERCOS_CONFIG.baseUrl}/orders?limit=1`, {
        headers: {
          'Content-Type': 'application/json',
          'ApplicationToken': MERCOS_CONFIG.applicationToken,
          'CompanyToken': MERCOS_CONFIG.companyToken,
        },
      });

      testResults.tests.mercos = {
        status: mercosResponse.ok ? 'success' : 'error',
        message: mercosResponse.ok ? 'API OK' : `HTTP ${mercosResponse.status}`,
        response_time: Date.now() - startTime,
      };

      if (!mercosResponse.ok) {
        testResults.overall_status = 'error';
      }
    } catch (error) {
      testResults.tests.mercos = {
        status: 'error',
        message: error instanceof Error ? error.message : 'Erro de conexão',
        response_time: Date.now() - startTime,
      };
      testResults.overall_status = 'error';
    }

    // 4. Teste das Functions
    const functionTests = [
      'get-sankhya-pix',
      'update-mercos-pix',
      'sync-execute',
    ];

    testResults.tests.functions = {};

    for (const funcName of functionTests) {
      try {
        const funcResponse = await fetch(`${process.env.URL}/.netlify/functions/${funcName}`, {
          method: 'GET',
        });

        testResults.tests.functions[funcName] = {
          status: funcResponse.status < 500 ? 'success' : 'error',
          http_status: funcResponse.status,
          message: funcResponse.status < 500 ? 'Function OK' : 'Function Error',
        };
      } catch (error) {
        testResults.tests.functions[funcName] = {
          status: 'error',
          message: 'Function não acessível',
        };
        testResults.overall_status = 'error';
      }
    }

    const executionTime = Date.now() - startTime;
    testResults.execution_time_ms = executionTime;

    // Log do resultado
    await logIntegration({
      type: testResults.overall_status === 'success' ? 'integration_test_success' : 'integration_test_error',
      message: `Teste de integração concluído: ${testResults.overall_status}`,
      data: testResults,
      summary: {
        total_tests: Object.keys(testResults.tests).length,
        passed: Object.values(testResults.tests).filter((t: any) => t.status === 'success').length,
        failed: Object.values(testResults.tests).filter((t: any) => t.status === 'error').length,
      },
      execution_time_ms: executionTime,
    });

    return {
      statusCode: testResults.overall_status === 'success' ? 200 : 500,
      headers: corsHeaders(),
      body: JSON.stringify(testResults),
    };

  } catch (error) {
    const executionTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';

    await logIntegration({
      type: 'integration_test_critical_error',
      message: 'Erro crítico no teste de integração',
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
      }),
    };
  }
};