import { Handler } from '@netlify/functions';
import { corsHeaders, logIntegration } from './utils/helpers';

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders(), body: '' };
  }

  const startTime = Date.now();
  let totalRecords = 0;
  let successCount = 0;
  let errorCount = 0;

  try {
    await logIntegration({
      type: 'pix_sync_start',
      message: 'Iniciando sincronização PIX Sankhya → Mercos',
    });

    // 1. Buscar PIX no Sankhya
    const sankhyaResponse = await fetch(`${process.env.URL}/.netlify/functions/get-sankhya-pix`);
    
    if (!sankhyaResponse.ok) {
      throw new Error(`Erro ao buscar PIX no Sankhya: ${sankhyaResponse.status}`);
    }

    const sankhyaData = await sankhyaResponse.json();
    const pixRecords = sankhyaData.records || [];
    totalRecords = pixRecords.length;

    if (totalRecords === 0) {
      const executionTime = Date.now() - startTime;
      
      await logIntegration({
        type: 'pix_sync_completed',
        message: 'Sincronização concluída - Nenhum PIX novo encontrado',
        summary: { total: 0, success: 0, errors: 0 },
        execution_time_ms: executionTime,
        sankhya_records: 0,
      });

      return {
        statusCode: 200,
        headers: corsHeaders(),
        body: JSON.stringify({
          success: true,
          message: 'Nenhum PIX novo encontrado',
          summary: { total: 0, success: 0, errors: 0 },
          execution_time_ms: executionTime,
        }),
      };
    }

    // 2. Processar cada PIX encontrado
    for (const record of pixRecords) {
      try {
        const updateResponse = await fetch(`${process.env.URL}/.netlify/functions/update-mercos-pix`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nunota: record.NUNOTA,
            emvpix: record.EMVPIX,
          }),
        });

        if (updateResponse.ok) {
          successCount++;
        } else {
          errorCount++;
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        errorCount++;
        console.error(`Erro ao processar NUNOTA ${record.NUNOTA}:`, error);
      }
    }

    const executionTime = Date.now() - startTime;

    await logIntegration({
      type: 'pix_sync_completed',
      message: `Sincronização concluída: ${successCount} sucessos, ${errorCount} erros`,
      summary: { 
        total: totalRecords, 
        success: successCount, 
        errors: errorCount,
        success_rate: totalRecords > 0 ? (successCount / totalRecords * 100).toFixed(2) : 0
      },
      execution_time_ms: executionTime,
      sankhya_records: totalRecords,
    });

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({
        success: true,
        message: `Sincronização concluída: ${successCount} sucessos, ${errorCount} erros`,
        summary: {
          total: totalRecords,
          success: successCount,
          errors: errorCount,
          success_rate: totalRecords > 0 ? (successCount / totalRecords * 100).toFixed(2) : 0,
        },
        execution_time_ms: executionTime,
      }),
    };

  } catch (error) {
    const executionTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';

    await logIntegration({
      type: 'pix_sync_error',
      message: 'Erro crítico na sincronização',
      error: errorMessage,
      summary: { total: totalRecords, success: successCount, errors: errorCount + 1 },
      execution_time_ms: executionTime,
    });

    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({
        success: false,
        errorMessage: 'Sincronização falhou',
        error: errorMessage,
        summary: { total: totalRecords, success: successCount, errors: errorCount + 1 },
        execution_time_ms: executionTime,
      }),
    };
  }
};