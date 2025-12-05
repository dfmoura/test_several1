import nodemailer from 'nodemailer';
import { config } from '../config/environment';
import { logger } from '../utils/logger';

export interface SyncAlert {
  type: 'high_error_rate' | 'critical_failure' | 'connection_failure';
  totalProcessed?: number;
  totalErrors?: number;
  errorRate?: number;
  errors?: string[];
  error?: string;
}

export class NotificationService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    // Disable SMTP in development mode
    if (config.env === 'development') {
      console.log('📧 SMTP disabled in development mode');
      return;
    }

    if (config.smtp.host && config.smtp.user && config.smtp.pass) {
      this.transporter = nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        secure: config.smtp.port === 465,
        auth: {
          user: config.smtp.user,
          pass: config.smtp.pass,
        },
      });

      // Verificar configuração SMTP
      this.transporter.verify((error) => {
        if (error) {
          logger.error('SMTP configuration error', { error: error.message });
          this.transporter = null;
        } else {
          logger.info('SMTP configuration verified successfully');
        }
      });
    } else {
      logger.warn('SMTP not configured, email notifications disabled');
    }
  }

  public async sendSyncAlert(alert: SyncAlert): Promise<boolean> {
    if (!this.transporter || !config.smtp.alertEmail) {
      logger.warn('Cannot send alert: SMTP not configured or alert email not set');
      return false;
    }

    try {
      const subject = this.getAlertSubject(alert);
      const html = this.generateAlertHtml(alert);

      const mailOptions = {
        from: config.smtp.user,
        to: config.smtp.alertEmail,
        subject,
        html,
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      logger.info('Sync alert sent successfully', { 
        messageId: result.messageId,
        alertType: alert.type 
      });
      
      return true;

    } catch (error) {
      logger.error('Failed to send sync alert', { 
        error: (error as Error).message,
        alertType: alert.type 
      });
      return false;
    }
  }

  private getAlertSubject(alert: SyncAlert): string {
    const timestamp = new Date().toLocaleString('pt-BR');
    
    switch (alert.type) {
      case 'high_error_rate':
        return `🚨 SANKHYA-MERCOS: Alta Taxa de Erros (${alert.errorRate?.toFixed(1)}%) - ${timestamp}`;
      case 'critical_failure':
        return `🔥 SANKHYA-MERCOS: Falha Crítica na Sincronização - ${timestamp}`;
      case 'connection_failure':
        return `⚠️ SANKHYA-MERCOS: Falha de Conexão - ${timestamp}`;
      default:
        return `📢 SANKHYA-MERCOS: Alerta de Sincronização - ${timestamp}`;
    }
  }

  private generateAlertHtml(alert: SyncAlert): string {
    const timestamp = new Date().toLocaleString('pt-BR');
    
    let content = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #dc3545; margin: 0;">Sistema de Integração SANKHYA-MERCOS</h2>
          <p style="color: #6c757d; margin: 5px 0 0 0;">Alerta gerado em: ${timestamp}</p>
        </div>
    `;

    switch (alert.type) {
      case 'high_error_rate':
        content += `
          <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
            <h3 style="color: #856404; margin-top: 0;">⚠️ Alta Taxa de Erros Detectada</h3>
            <ul style="color: #856404;">
              <li><strong>Total Processado:</strong> ${alert.totalProcessed}</li>
              <li><strong>Total de Erros:</strong> ${alert.totalErrors}</li>
              <li><strong>Taxa de Erro:</strong> ${alert.errorRate?.toFixed(2)}%</li>
            </ul>
          </div>
        `;
        break;

      case 'critical_failure':
        content += `
          <div style="background: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
            <h3 style="color: #721c24; margin-top: 0;">🔥 Falha Crítica</h3>
            <p style="color: #721c24;"><strong>Erro:</strong> ${alert.error}</p>
            <p style="color: #721c24;"><strong>Registros Processados:</strong> ${alert.totalProcessed || 0}</p>
          </div>
        `;
        break;

      case 'connection_failure':
        content += `
          <div style="background: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
            <h3 style="color: #0c5460; margin-top: 0;">🔌 Falha de Conexão</h3>
            <p style="color: #0c5460;">${alert.error}</p>
          </div>
        `;
        break;
    }

    if (alert.errors && alert.errors.length > 0) {
      content += `
        <div style="background: #ffffff; border: 1px solid #dee2e6; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
          <h4 style="color: #495057; margin-top: 0;">Detalhes dos Erros:</h4>
          <ul style="color: #6c757d;">
      `;
      
      alert.errors.slice(0, 5).forEach(error => {
        content += `<li style="margin-bottom: 5px;">${error}</li>`;
      });
      
      if (alert.errors.length > 5) {
        content += `<li style="font-style: italic;">... e mais ${alert.errors.length - 5} erros</li>`;
      }
      
      content += `
          </ul>
        </div>
      `;
    }

    content += `
        <div style="background: #e9ecef; padding: 15px; border-radius: 5px; text-align: center;">
          <p style="color: #6c757d; margin: 0; font-size: 14px;">
            Este é um alerta automático do Sistema de Integração SANKHYA-MERCOS.<br>
            Verifique os logs da aplicação para mais detalhes.
          </p>
        </div>
      </div>
    `;

    return content;
  }

  public async sendTestNotification(): Promise<boolean> {
    return await this.sendSyncAlert({
      type: 'connection_failure',
      error: 'Esta é uma notificação de teste do sistema de integração.',
    });
  }
}