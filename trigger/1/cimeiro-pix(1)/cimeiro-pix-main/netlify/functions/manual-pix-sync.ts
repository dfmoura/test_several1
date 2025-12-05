import { Handler } from '@netlify/functions';
import { corsHeaders, logIntegration } from './utils/helpers';

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders(), body: '' };
  }

  const startTime = Date.now();

  try {
    await logIntegration({
      type: 'manual_sync_start',
      message: 'Iniciando sincronização manual PIX (via cron externo)',
      data: { trigger: 'external_cron', source: 'cron-job.org' },
    });

    // Executar sincronização
    const syncResponse = await fetch(`${process.env.URL}/.netlify/functions/sync-execute`, {
      method: 'GET',
    });

    const syncResult = await syncResponse.json();
    const executionTime = Date.now() - startTime;

    if (syncResponse.ok && syncResult.success) {
      await logIntegration({
        type: 'manual_sync_success',
        message: 'Sincronização manual concluída com sucesso',
        data: syncResult,
        summary: syncResult.summary,
        execution_time_ms: executionTime,
      });

      return {
        statusCode: 200,
        headers: corsHeaders(),
        body: JSON.stringify({
          success: true,
          message: 'Sincronização manual executada com sucesso',
          result: syncResult,
          execution_time_ms: executionTime,
        }),
      };
    } else {
      throw new Error(syncResult.error || 'Sincronização falhou');
    }

  } catch (error) {
    const executionTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';

    await logIntegration({
      type: 'manual_sync_error',
      message: 'Erro na sincronização manual',
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