import { Handler } from '@netlify/functions';
import { corsHeaders, logIntegration, authenticateSankhya, SANKHYA_CONFIG } from './utils/helpers';

interface SankhyaPixRecord {
  NUNOTA: string;
  EMVPIX: string;
  VLRDESDOB: number;
  DHBAIXA?: string;
  DTNEG: string;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders(), body: '' };
  }

  const startTime = Date.now();

  try {
    await logIntegration({
      type: 'sankhya_pix_fetch_start',
      message: 'Iniciando busca de PIX no Sankhya',
    });

    // Autenticar no Sankhya
    const auth = await authenticateSankhya();

    // Buscar PIX dos últimos 5 minutos
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const dataInicio = fiveMinutesAgo.toISOString().split('T')[0];

    const response = await fetch(`${SANKHYA_CONFIG.baseUrl}/service/crud`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SANKHYA_CONFIG.token}`,
        'AppKey': `(SANKHYA_CONFIG.appKey && { 'AppKey': SANKHYA_CONFIG.appKey })`,
        'Cookie': `JSESSIONID=${auth.jsessionid}; JSESSIONID2=${auth.jsessionid2}`,
        
      },
      body: JSON.stringify({
        serviceName: 'CRUDServiceProvider.loadRecords',
        requestBody: {
          dataSet: {
            rootEntity: 'TGFFIN',
            includeAllFields: false,
            fields: ['NUNOTA', 'EMVPIX', 'VLRDESDOB', 'DHBAIXA', 'DTNEG'],
            criteria: {
              expression: {
                '$and': [
                  { EMVPIX: { '$isNotNull': true } },
                  { EMVPIX: { '$ne': '' } },
                  { DTNEG: { '$gte': dataInicio } }
                ]
              }
            },
            orderBy: [{ field: 'DTNEG', order: 'DESC' }],
            limit: 100,
          },
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Sankhya query failed: ${response.status}`);
    }

    const data = await response.json();
    const pixRecords: SankhyaPixRecord[] = data.responseBody?.entities || [];

    const executionTime = Date.now() - startTime;

    await logIntegration({
      type: 'sankhya_pix_fetch_success',
      message: `PIX encontrados no Sankhya: ${pixRecords.length}`,
      data: { records: pixRecords.length },
      summary: { total: pixRecords.length, success: pixRecords.length, errors: 0 },
      execution_time_ms: executionTime,
      sankhya_records: pixRecords.length,
    });

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({
        success: true,
        records: pixRecords,
        total: pixRecords.length,
        execution_time_ms: executionTime,
      }),
    };

  } catch (error) {
    const executionTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';

    await logIntegration({
      type: 'sankhya_pix_fetch_error',
      message: 'Erro ao buscar PIX no Sankhya',
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