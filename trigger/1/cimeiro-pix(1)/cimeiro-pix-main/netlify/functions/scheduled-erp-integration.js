const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Configurações das APIs
const SANKHYA_CONFIG = {
  baseUrl: process.env.SANKHYA_BASE_URL,
  token: process.env.SANKHYA_API_TOKEN,
  appKey: process.env.SANKHYA_APP_KEY,
  username: process.env.SANKHYA_USERNAME,
  password: process.env.SANKHYA_PASSWORD,
};

const MERCOS_CONFIG = {
  baseUrl: process.env.MERCOS_BASE_URL,
  applicationToken: process.env.MERCOS_APPLICATION_TOKEN,
  companyToken: process.env.MERCOS_COMPANY_TOKEN,
};

const JOB_NAME = 'erp_integration';

// Função para controlar execução (lock)
async function acquireLock() {
  console.log('🔒 Tentando adquirir lock para execução...');
  
  try {
    // Verificar se já existe uma execução em andamento
    const { data: existingJob, error: selectError } = await supabase
      .from('job_control')
      .select('*')
      .eq('job_name', JOB_NAME)
      .single();

    if (selectError && selectError.code !== 'PGRST116') {
      throw selectError;
    }

    // Se não existe registro, criar um novo
    if (!existingJob) {
      console.log('📝 Criando novo registro de controle de job...');
      const { error: insertError } = await supabase
        .from('job_control')
        .insert([{
          job_name: JOB_NAME,
          is_running: true,
          last_start_time: new Date().toISOString(),
          execution_count: 1
        }]);

      if (insertError) throw insertError;
      console.log('✅ Lock adquirido com sucesso (novo registro)');
      return true;
    }

    // Se já existe e está rodando, não pode executar
    if (existingJob.is_running) {
      const timeDiff = new Date() - new Date(existingJob.last_start_time);
      const minutesDiff = Math.floor(timeDiff / (1000 * 60));
      
      console.log(`⚠️ Execução já em andamento há ${minutesDiff} minutos. Abortando...`);
      
      // Se está rodando há mais de 15 minutos, considerar travado e liberar
      if (minutesDiff > 15) {
        console.log('🔧 Execução travada detectada. Liberando lock...');
        await releaseLock(true);
        return await acquireLock(); // Tentar novamente
      }
      
      return false;
    }

    // Atualizar para indicar que está rodando
    const { error: updateError } = await supabase
      .from('job_control')
      .update({
        is_running: true,
        last_start_time: new Date().toISOString(),
        execution_count: (existingJob.execution_count || 0) + 1
      })
      .eq('job_name', JOB_NAME);

    if (updateError) throw updateError;
    
    console.log('✅ Lock adquirido com sucesso');
    return true;

  } catch (error) {
    console.error('❌ Erro ao adquirir lock:', error);
    return false;
  }
}

// Função para liberar o lock
async function releaseLock(isError = false) {
  console.log('🔓 Liberando lock...');
  
  try {
    const { error } = await supabase
      .from('job_control')
      .update({
        is_running: false,
        last_end_time: new Date().toISOString(),
        last_status: isError ? 'error' : 'success'
      })
      .eq('job_name', JOB_NAME);

    if (error) throw error;
    console.log('✅ Lock liberado com sucesso');
  } catch (error) {
    console.error('❌ Erro ao liberar lock:', error);
  }
}

// Função para autenticar no Sankhya
async function authenticateSankhya() {
  console.log('🔐 Autenticando no Sankhya...');
  
  try {
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
      const errorText = await response.text();
      throw new Error(`Sankhya auth failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const auth = {
      jsessionid: data.responseBody?.jsessionid,
      jsessionid2: data.responseBody?.jsessionid2,
      cookie: data.responseBody?.cookie,
    };

    console.log('✅ Autenticação Sankhya realizada com sucesso');
    return auth;

  } catch (error) {
    console.error('❌ Erro na autenticação Sankhya:', error);
    throw error;
  }
}

// Função para buscar pedidos PIX no Sankhya
async function getSankhyaPixOrders(auth) {
  console.log('📋 Buscando pedidos PIX no Sankhya...');
  
  try {
    // Buscar PIX dos últimos 15 minutos
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    const dateFilter = fifteenMinutesAgo.toISOString().split('T')[0];

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
                { 'EMVPIX': { '$ne': '' } },
                { 'DTNEG': { '$gte': dateFilter } }
              ]
            }
          },
          orderBy: [{ field: 'DTNEG', order: 'DESC' }],
          limit: 50
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

    if (!response.ok) {
      throw new Error(`Sankhya query failed: ${response.status}`);
    }

    const data = await response.json();
    const orders = data.responseBody?.entities || [];

    console.log(`✅ Encontrados ${orders.length} pedidos PIX no Sankhya`);
    return orders;

  } catch (error) {
    console.error('❌ Erro ao buscar pedidos Sankhya:', error);
    throw error;
  }
}

// Função para buscar pedido no Mercos por NUNOTA
async function findMercosOrderByNunota(nunota) {
  console.log(`🔍 Buscando pedido no Mercos para NUNOTA: ${nunota}`);
  
  try {
    const response = await fetch(`${MERCOS_CONFIG.baseUrl}/pedidos?search=${nunota}&limit=10`, {
      headers: {
        'Content-Type': 'application/json',
        'ApplicationToken': MERCOS_CONFIG.applicationToken,
        'CompanyToken': MERCOS_CONFIG.companyToken,
      },
    });

    if (!response.ok) {
      throw new Error(`Mercos search failed: ${response.status}`);
    }

    const data = await response.json();
    const orders = data.pedidos || [];

    // Procurar pedido que contenha o NUNOTA
    const targetOrder = orders.find(order => 
      order.external_reference === nunota ||
      order.observacoes?.includes(nunota) ||
      order.numero_pedido === nunota
    );

    if (targetOrder) {
      console.log(`✅ Pedido encontrado no Mercos: ${targetOrder.id}`);
    } else {
      console.log(`⚠️ Pedido não encontrado no Mercos para NUNOTA: ${nunota}`);
    }

    return targetOrder;

  } catch (error) {
    console.error(`❌ Erro ao buscar pedido Mercos para NUNOTA ${nunota}:`, error);
    return null;
  }
}

// Função para atualizar pedido no Mercos com dados PIX
async function updateMercosOrderWithPix(orderId, nunota, emvpix) {
  console.log(`📝 Atualizando pedido ${orderId} no Mercos com dados PIX...`);
  
  try {
    // Primeiro, buscar o pedido atual para preservar observações
    const getResponse = await fetch(`${MERCOS_CONFIG.baseUrl}/pedidos/${orderId}`, {
      headers: {
        'Content-Type': 'application/json',
        'ApplicationToken': MERCOS_CONFIG.applicationToken,
        'CompanyToken': MERCOS_CONFIG.companyToken,
      },
    });

    if (!getResponse.ok) {
      throw new Error(`Failed to get order: ${getResponse.status}`);
    }

    const currentOrder = await getResponse.json();

    // Construir novas observações com PIX
    const timestamp = new Date().toLocaleString('pt-BR');
    const pixInfo = `=== DADOS PIX (${timestamp}) ===\nNUNOTA: ${nunota}\n${emvpix}\n${'='.repeat(50)}`;
    
    let observacoesAtualizadas = currentOrder.observacoes || '';
    
    // Remover PIX antigo se existir
    observacoesAtualizadas = observacoesAtualizadas.replace(/=== DADOS PIX.*?={50,}/gs, '').trim();
    
    // Adicionar novo PIX
    observacoesAtualizadas = observacoesAtualizadas 
      ? `${observacoesAtualizadas}\n\n${pixInfo}`
      : pixInfo;

    // Atualizar o pedido
    const updateResponse = await fetch(`${MERCOS_CONFIG.baseUrl}/pedidos/${orderId}`, {
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

    if (!updateResponse.ok) {
      throw new Error(`Failed to update order: ${updateResponse.status}`);
    }

    console.log(`✅ Pedido ${orderId} atualizado com sucesso`);
    return true;

  } catch (error) {
    console.error(`❌ Erro ao atualizar pedido ${orderId}:`, error);
    return false;
  }
}

// Função para registrar log da execução
async function logExecution(type, message, data = {}) {
  try {
    await supabase.from('integration_logs').insert([{
      type: `scheduled_${type}`,
      message,
      data,
      timestamp: new Date().toISOString(),
      created_at: new Date().toISOString(),
    }]);
  } catch (error) {
    console.error('Erro ao salvar log:', error);
  }
}

// Função principal da integração
async function runIntegration() {
  const startTime = Date.now();
  let processedCount = 0;
  let successCount = 0;
  let errorCount = 0;

  console.log('🚀 Iniciando integração ERP agendada...');
  
  try {
    await logExecution('start', 'Iniciando integração ERP agendada');

    // 1. Autenticar no Sankhya
    const sankhyaAuth = await authenticateSankhya();

    // 2. Buscar pedidos PIX no Sankhya
    const sankhyaOrders = await getSankhyaPixOrders(sankhyaAuth);

    if (sankhyaOrders.length === 0) {
      console.log('ℹ️ Nenhum pedido PIX encontrado para processar');
      await logExecution('info', 'Nenhum pedido PIX encontrado para processar');
      return { success: true, processed: 0, message: 'Nenhum pedido para processar' };
    }

    // 3. Processar cada pedido
    for (const order of sankhyaOrders) {
      processedCount++;
      
      try {
        console.log(`📦 Processando NUNOTA: ${order.NUNOTA}`);

        // Buscar pedido correspondente no Mercos
        const mercosOrder = await findMercosOrderByNunota(order.NUNOTA);

        if (!mercosOrder) {
          console.log(`⚠️ Pedido não encontrado no Mercos para NUNOTA: ${order.NUNOTA}`);
          continue;
        }

        // Atualizar pedido no Mercos com dados PIX
        const updateSuccess = await updateMercosOrderWithPix(
          mercosOrder.id,
          order.NUNOTA,
          order.EMVPIX
        );

        if (updateSuccess) {
          successCount++;
          console.log(`✅ NUNOTA ${order.NUNOTA} processado com sucesso`);
        } else {
          errorCount++;
          console.log(`❌ Erro ao processar NUNOTA ${order.NUNOTA}`);
        }

        // Pequena pausa entre processamentos
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        errorCount++;
        console.error(`❌ Erro ao processar NUNOTA ${order.NUNOTA}:`, error);
      }
    }

    const executionTime = Date.now() - startTime;
    const summary = {
      processed: processedCount,
      success: successCount,
      errors: errorCount,
      executionTimeMs: executionTime
    };

    console.log(`🎯 Integração concluída: ${successCount}/${processedCount} sucessos em ${executionTime}ms`);
    
    await logExecution('completed', 'Integração ERP concluída', summary);

    return {
      success: errorCount === 0,
      ...summary,
      message: `Processados: ${processedCount}, Sucessos: ${successCount}, Erros: ${errorCount}`
    };

  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error('❌ Erro crítico na integração:', error);
    
    await logExecution('error', 'Erro crítico na integração ERP', {
      error: error.message,
      processed: processedCount,
      success: successCount,
      errors: errorCount + 1,
      executionTimeMs: executionTime
    });

    return {
      success: false,
      processed: processedCount,
      success: successCount,
      errors: errorCount + 1,
      executionTimeMs: executionTime,
      message: `Erro crítico: ${error.message}`
    };
  }
}

// Handler principal da função Netlify
exports.handler = async (event, context) => {
  console.log('⏰ Função agendada executada:', new Date().toISOString());
  
  let lockAcquired = false;
  
  try {
    // Tentar adquirir lock
    lockAcquired = await acquireLock();
    
    if (!lockAcquired) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: 'Execução já em andamento, pulando...',
          skipped: true
        })
      };
    }

    // Executar integração
    const result = await runIntegration();

    return {
      statusCode: result.success ? 200 : 500,
      body: JSON.stringify(result)
    };

  } catch (error) {
    console.error('❌ Erro na função agendada:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message,
        message: 'Erro na execução da função agendada'
      })
    };

  } finally {
    // Sempre liberar o lock
    if (lockAcquired) {
      await releaseLock(!lockAcquired);
    }
  }
};