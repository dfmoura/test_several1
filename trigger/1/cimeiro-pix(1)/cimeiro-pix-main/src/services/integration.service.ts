import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { SankhyaService } from './sankhya.service';
import { MercosService } from './mercos.service';
import { NotificationService } from './notification.service';
import { SyncLog, SyncLogStatus, SyncLogType } from '../models/SyncLog';
import { SyncStatus, SyncStatusType } from '../models/SyncStatus';
import { logger } from '../utils/logger';
import { retry } from '../utils/retry';
import { config } from '../config/environment';

export interface SyncResult {
  success: boolean;
  totalProcessed: number;
  totalSuccess: number;
  totalErrors: number;
  totalWarnings: number;
  executionTimeMs: number;
  errors: string[];
  summary: any;
}

export interface SyncOptions {
  type: SyncLogType;
  dataInicio?: Date;
  dataFim?: Date;
  forceSync?: boolean;
  specificNunota?: string;
}

export class IntegrationService {
  private sankhyaService: SankhyaService;
  private mercosService: MercosService;
  private notificationService: NotificationService;
  private syncLogRepository: Repository<SyncLog>;
  private syncStatusRepository: Repository<SyncStatus>;

  constructor() {
    this.sankhyaService = new SankhyaService();
    this.mercosService = new MercosService();
    this.notificationService = new NotificationService();
    this.syncLogRepository = AppDataSource.getRepository(SyncLog);
    this.syncStatusRepository = AppDataSource.getRepository(SyncStatus);
  }

  public async sincronizarPedidos(options: SyncOptions = { type: SyncLogType.AUTOMATIC }): Promise<SyncResult> {
    const startTime = Date.now();
    let totalProcessed = 0;
    let totalSuccess = 0;
    let totalErrors = 0;
    let totalWarnings = 0;
    const errors: string[] = [];

    logger.info('Starting order synchronization', { options });

    // Criar registro de status da sincronização
    const syncStatus = this.syncStatusRepository.create({
      status: SyncStatusType.RUNNING,
      last_sync_start: new Date(),
      total_processed: 0,
      total_success: 0,
      total_errors: 0,
      total_warnings: 0,
    });
    await this.syncStatusRepository.save(syncStatus);

    try {
      // Verificar conexões antes de iniciar
      const [sankhyaOk, mercosOk] = await Promise.all([
        this.sankhyaService.testConnection(),
        this.mercosService.testConnection(),
      ]);

      if (!sankhyaOk) {
        throw new Error('Sankhya connection failed');
      }
      if (!mercosOk) {
        throw new Error('Mercos connection failed');
      }

      let pixDataList;

      if (options.specificNunota) {
        // Sincronização específica por NUNOTA
        const pixData = await this.sankhyaService.consultarPixPorNunota(options.specificNunota);
        pixDataList = pixData ? [pixData] : [];
      } else {
        // Sincronização por período
        const dataInicio = options.dataInicio || new Date(Date.now() - 24 * 60 * 60 * 1000); // Últimas 24h
        const dataFim = options.dataFim || new Date();
        pixDataList = await this.sankhyaService.consultarMultiplosPixPorData(dataInicio, dataFim);
      }

      logger.info('PIX data retrieved from Sankhya', { count: pixDataList.length });

      // Processar cada registro PIX
      for (const pixData of pixDataList) {
        totalProcessed++;
        
        try {
          const result = await this.processarPixData(pixData, options);
          
          if (result.success) {
            totalSuccess++;
          } else if (result.isWarning) {
            totalWarnings++;
          } else {
            totalErrors++;
            errors.push(result.error || 'Unknown error');
          }

          // Rate limiting para não sobrecarregar as APIs
          await new Promise(resolve => setTimeout(resolve, 500));

        } catch (error) {
          totalErrors++;
          const errorMessage = `Error processing NUNOTA ${pixData.NUNOTA}: ${(error as Error).message}`;
          errors.push(errorMessage);
          
          await this.logSyncOperation({
            type: options.type,
            status: SyncLogStatus.ERROR,
            operation: 'process_pix_data',
            message: errorMessage,
            nunota: pixData.NUNOTA,
            error_details: { error: (error as Error).message },
          });
        }
      }

      // Atualizar status final
      const executionTimeMs = Date.now() - startTime;
      syncStatus.status = totalErrors > 0 ? SyncStatusType.FAILED : SyncStatusType.COMPLETED;
      syncStatus.last_sync_end = new Date();
      syncStatus.total_processed = totalProcessed;
      syncStatus.total_success = totalSuccess;
      syncStatus.total_errors = totalErrors;
      syncStatus.total_warnings = totalWarnings;
      syncStatus.sync_summary = {
        executionTimeMs,
        options,
        errors: errors.slice(0, 10), // Primeiros 10 erros
      };

      await this.syncStatusRepository.save(syncStatus);

      const result: SyncResult = {
        success: totalErrors === 0,
        totalProcessed,
        totalSuccess,
        totalErrors,
        totalWarnings,
        executionTimeMs,
        errors,
        summary: {
          pixDataFound: pixDataList.length,
          successRate: totalProcessed > 0 ? (totalSuccess / totalProcessed) * 100 : 0,
        },
      };

      logger.info('Order synchronization completed', result);

      // Enviar notificação se houver muitos erros
      if (totalErrors > 0 && totalErrors / totalProcessed > 0.1) {
        await this.notificationService.sendSyncAlert({
          type: 'high_error_rate',
          totalProcessed,
          totalErrors,
          errorRate: (totalErrors / totalProcessed) * 100,
          errors: errors.slice(0, 5),
        });
      }

      return result;

    } catch (error) {
      const executionTimeMs = Date.now() - startTime;
      const errorMessage = `Synchronization failed: ${(error as Error).message}`;
      
      logger.error('Order synchronization failed', { error: errorMessage });

      // Atualizar status com falha
      syncStatus.status = SyncStatusType.FAILED;
      syncStatus.last_sync_end = new Date();
      syncStatus.last_error_message = errorMessage;
      syncStatus.total_processed = totalProcessed;
      syncStatus.total_success = totalSuccess;
      syncStatus.total_errors = totalErrors + 1;
      syncStatus.total_warnings = totalWarnings;
      await this.syncStatusRepository.save(syncStatus);

      // Enviar notificação de falha crítica
      await this.notificationService.sendSyncAlert({
        type: 'critical_failure',
        error: errorMessage,
        totalProcessed,
      });

      return {
        success: false,
        totalProcessed,
        totalSuccess,
        totalErrors: totalErrors + 1,
        totalWarnings,
        executionTimeMs,
        errors: [...errors, errorMessage],
        summary: { criticalFailure: true },
      };
    }
  }

  private async processarPixData(pixData: any, options: SyncOptions): Promise<{ success: boolean; isWarning?: boolean; error?: string }> {
    const startTime = Date.now();
    
    try {
      // Buscar pedidos no Mercos que possam corresponder a este NUNOTA
      let pedidosMercos = await this.mercosService.buscarPedidosPorNunota(pixData.NUNOTA);

      // Se não encontrou por NUNOTA nas observações, tentar buscar pedidos recentes
      if (pedidosMercos.length === 0) {
        const dataInicio = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Últimos 7 dias
        const pedidosRecentes = await this.mercosService.buscarPedidosAtualizados(dataInicio, 100);
        
        // Procurar por pedidos que possam corresponder (por valor, data, etc.)
        pedidosMercos = pedidosRecentes.filter(pedido => {
          // Lógica de correspondência por valor (com tolerância de 1%)
          const valorTolerance = Math.abs(pedido.valor_total - pixData.VLRDESDOB) / pixData.VLRDESDOB;
          return valorTolerance < 0.01;
        });
      }

      if (pedidosMercos.length === 0) {
        await this.logSyncOperation({
          type: options.type,
          status: SyncLogStatus.WARNING,
          operation: 'find_mercos_order',
          message: `No corresponding Mercos order found for NUNOTA ${pixData.NUNOTA}`,
          nunota: pixData.NUNOTA,
          request_data: { pixData },
          execution_time_ms: Date.now() - startTime,
        });

        return { success: false, isWarning: true, error: 'No corresponding order found' };
      }

      // Processar cada pedido encontrado
      let successCount = 0;
      for (const pedido of pedidosMercos) {
        try {
          const updateSuccess = await retry(
            () => this.mercosService.atualizarObservacoesPedido(
              pedido.id, 
              pixData.EMVPIX, 
              pixData.NUNOTA
            ),
            {
              maxAttempts: config.sync.maxRetryAttempts,
              delay: 1000,
              onRetry: (error, attempt) => {
                logger.warn(`Retry updating order ${pedido.id}`, { attempt, error: error.message });
              },
            }
          );

          if (updateSuccess) {
            successCount++;
            
            await this.logSyncOperation({
              type: options.type,
              status: SyncLogStatus.SUCCESS,
              operation: 'update_mercos_order',
              message: `Successfully updated order ${pedido.id} with PIX data`,
              nunota: pixData.NUNOTA,
              pedido_id: pedido.id,
              request_data: { pixData },
              response_data: { pedidoId: pedido.id, updated: true },
              execution_time_ms: Date.now() - startTime,
            });
          } else {
            throw new Error('Update returned false');
          }

        } catch (error) {
          await this.logSyncOperation({
            type: options.type,
            status: SyncLogStatus.ERROR,
            operation: 'update_mercos_order',
            message: `Failed to update order ${pedido.id}`,
            nunota: pixData.NUNOTA,
            pedido_id: pedido.id,
            request_data: { pixData },
            error_details: { error: (error as Error).message },
            execution_time_ms: Date.now() - startTime,
          });
        }
      }

      return { 
        success: successCount > 0, 
        error: successCount === 0 ? 'Failed to update any orders' : undefined 
      };

    } catch (error) {
      await this.logSyncOperation({
        type: options.type,
        status: SyncLogStatus.ERROR,
        operation: 'process_pix_data',
        message: `Error processing PIX data for NUNOTA ${pixData.NUNOTA}`,
        nunota: pixData.NUNOTA,
        request_data: { pixData },
        error_details: { error: (error as Error).message },
        execution_time_ms: Date.now() - startTime,
      });

      return { success: false, error: (error as Error).message };
    }
  }

  private async logSyncOperation(logData: Partial<SyncLog>): Promise<void> {
    try {
      const syncLog = this.syncLogRepository.create(logData);
      await this.syncLogRepository.save(syncLog);
    } catch (error) {
      logger.error('Failed to save sync log', { error: (error as Error).message });
    }
  }

  public async getLastSyncStatus(): Promise<SyncStatus | null> {
    try {
      return await this.syncStatusRepository.findOne({
        order: { created_at: 'DESC' },
      });
    } catch (error) {
      logger.error('Failed to get last sync status', { error: (error as Error).message });
      return null;
    }
  }

  public async getSyncLogs(limit: number = 50, offset: number = 0): Promise<SyncLog[]> {
    try {
      return await this.syncLogRepository.find({
        order: { created_at: 'DESC' },
        take: limit,
        skip: offset,
      });
    } catch (error) {
      logger.error('Failed to get sync logs', { error: (error as Error).message });
      return [];
    }
  }

  public async testConnections(): Promise<{ sankhya: boolean; mercos: boolean }> {
    const [sankhya, mercos] = await Promise.all([
      this.sankhyaService.testConnection(),
      this.mercosService.testConnection(),
    ]);

    return { sankhya, mercos };
  }
}