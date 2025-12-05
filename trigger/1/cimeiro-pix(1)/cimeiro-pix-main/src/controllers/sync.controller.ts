import { Request, Response } from 'express';
import { IntegrationService } from '../services/integration.service';
import { NotificationService } from '../services/notification.service';
import { SyncLogType } from '../models/SyncLog';
import { logger } from '../utils/logger';
import Joi from 'joi';

export class SyncController {
  private integrationService: IntegrationService;
  private notificationService: NotificationService;

  constructor() {
    this.integrationService = new IntegrationService();
    this.notificationService = new NotificationService();
  }

  /**
   * @swagger
   * /api/sync/manual:
   *   post:
   *     summary: Execute manual synchronization
   *     tags: [Sync]
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               dataInicio:
   *                 type: string
   *                 format: date-time
   *                 description: Start date for sync (ISO format)
   *               dataFim:
   *                 type: string
   *                 format: date-time
   *                 description: End date for sync (ISO format)
   *               nunota:
   *                 type: string
   *                 description: Specific NUNOTA to sync
   *               forceSync:
   *                 type: boolean
   *                 description: Force sync even if already processed
   *     responses:
   *       200:
   *         description: Sync completed successfully
   *       400:
   *         description: Invalid request parameters
   *       500:
   *         description: Sync failed
   */
  public manualSync = async (req: Request, res: Response): Promise<void> => {
    try {
      const schema = Joi.object({
        dataInicio: Joi.date().iso().optional(),
        dataFim: Joi.date().iso().optional(),
        nunota: Joi.string().pattern(/^\d+$/).optional(),
        forceSync: Joi.boolean().default(false),
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        res.status(400).json({
          success: false,
          error: 'Invalid request parameters',
          details: error.details.map(d => d.message),
        });
        return;
      }

      const { dataInicio, dataFim, nunota, forceSync } = value;

      logger.info('Manual sync requested', { 
        dataInicio, 
        dataFim, 
        nunota, 
        forceSync,
        userAgent: req.get('User-Agent'),
        ip: req.ip 
      });

      const result = await this.integrationService.sincronizarPedidos({
        type: SyncLogType.MANUAL,
        dataInicio: dataInicio ? new Date(dataInicio) : undefined,
        dataFim: dataFim ? new Date(dataFim) : undefined,
        specificNunota: nunota,
        forceSync,
      });

      res.json({
        success: result.success,
        message: result.success ? 'Synchronization completed successfully' : 'Synchronization completed with errors',
        data: {
          totalProcessed: result.totalProcessed,
          totalSuccess: result.totalSuccess,
          totalErrors: result.totalErrors,
          totalWarnings: result.totalWarnings,
          executionTimeMs: result.executionTimeMs,
          successRate: result.totalProcessed > 0 ? (result.totalSuccess / result.totalProcessed) * 100 : 0,
          summary: result.summary,
        },
        errors: result.errors.slice(0, 10), // Limitar erros retornados
      });

    } catch (error) {
      logger.error('Manual sync failed', { error: (error as Error).message });
      res.status(500).json({
        success: false,
        error: 'Synchronization failed',
        message: (error as Error).message,
      });
    }
  };

  /**
   * @swagger
   * /api/sync/status:
   *   get:
   *     summary: Get last synchronization status
   *     tags: [Sync]
   *     responses:
   *       200:
   *         description: Sync status retrieved successfully
   */
  public getSyncStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const lastSync = await this.integrationService.getLastSyncStatus();
      const connections = await this.integrationService.testConnections();

      res.json({
        success: true,
        data: {
          lastSync,
          connections,
          timestamp: new Date().toISOString(),
        },
      });

    } catch (error) {
      logger.error('Failed to get sync status', { error: (error as Error).message });
      res.status(500).json({
        success: false,
        error: 'Failed to get sync status',
        message: (error as Error).message,
      });
    }
  };

  /**
   * @swagger
   * /api/logs:
   *   get:
   *     summary: Get synchronization logs
   *     tags: [Logs]
   *     parameters:
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 50
   *         description: Number of logs to retrieve
   *       - in: query
   *         name: offset
   *         schema:
   *           type: integer
   *           minimum: 0
   *           default: 0
   *         description: Number of logs to skip
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *           enum: [success, error, warning, info]
   *         description: Filter by log status
   *     responses:
   *       200:
   *         description: Logs retrieved successfully
   */
  public getLogs = async (req: Request, res: Response): Promise<void> => {
    try {
      const schema = Joi.object({
        limit: Joi.number().integer().min(1).max(100).default(50),
        offset: Joi.number().integer().min(0).default(0),
        status: Joi.string().valid('success', 'error', 'warning', 'info').optional(),
      });

      const { error, value } = schema.validate(req.query);
      if (error) {
        res.status(400).json({
          success: false,
          error: 'Invalid query parameters',
          details: error.details.map(d => d.message),
        });
        return;
      }

      const { limit, offset } = value;
      const logs = await this.integrationService.getSyncLogs(limit, offset);

      res.json({
        success: true,
        data: {
          logs,
          pagination: {
            limit,
            offset,
            total: logs.length,
          },
        },
      });

    } catch (error) {
      logger.error('Failed to get logs', { error: (error as Error).message });
      res.status(500).json({
        success: false,
        error: 'Failed to get logs',
        message: (error as Error).message,
      });
    }
  };

  /**
   * @swagger
   * /api/health:
   *   get:
   *     summary: Health check endpoint
   *     tags: [Health]
   *     responses:
   *       200:
   *         description: Service is healthy
   */
  public healthCheck = async (req: Request, res: Response): Promise<void> => {
    try {
      const connections = await this.integrationService.testConnections();
      const isHealthy = connections.sankhya && connections.mercos;

      res.status(isHealthy ? 200 : 503).json({
        success: isHealthy,
        status: isHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        connections,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
      });

    } catch (error) {
      logger.error('Health check failed', { error: (error as Error).message });
      res.status(503).json({
        success: false,
        status: 'unhealthy',
        error: (error as Error).message,
        timestamp: new Date().toISOString(),
      });
    }
  };

  /**
   * @swagger
   * /api/webhook/mercos:
   *   post:
   *     summary: Webhook endpoint for Mercos updates
   *     tags: [Webhook]
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *     responses:
   *       200:
   *         description: Webhook processed successfully
   */
  public mercosWebhook = async (req: Request, res: Response): Promise<void> => {
    try {
      logger.info('Mercos webhook received', { 
        body: req.body,
        headers: req.headers,
        ip: req.ip 
      });

      // Processar webhook do Mercos
      // Aqui você pode implementar a lógica específica baseada no tipo de evento
      const { event_type, data } = req.body;

      if (event_type === 'order.updated' && data?.id) {
        // Sincronizar pedido específico
        logger.info('Processing order update webhook', { orderId: data.id });
        
        // Implementar lógica de sincronização específica para o pedido
        // Por exemplo, verificar se há PIX associado e atualizar
      }

      res.json({
        success: true,
        message: 'Webhook processed successfully',
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      logger.error('Webhook processing failed', { error: (error as Error).message });
      res.status(500).json({
        success: false,
        error: 'Webhook processing failed',
        message: (error as Error).message,
      });
    }
  };

  /**
   * @swagger
   * /api/test/notification:
   *   post:
   *     summary: Send test notification
   *     tags: [Test]
   *     responses:
   *       200:
   *         description: Test notification sent
   */
  public testNotification = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.notificationService.sendTestNotification();

      res.json({
        success: result,
        message: result ? 'Test notification sent successfully' : 'Failed to send test notification',
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      logger.error('Test notification failed', { error: (error as Error).message });
      res.status(500).json({
        success: false,
        error: 'Test notification failed',
        message: (error as Error).message,
      });
    }
  };
}