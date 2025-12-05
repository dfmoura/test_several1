import { IntegrationService } from '../services/integration.service';
import { SankhyaService } from '../services/sankhya.service';
import { MercosService } from '../services/mercos.service';
import { SyncLogType } from '../models/SyncLog';

// Mock the services
jest.mock('../services/sankhya.service');
jest.mock('../services/mercos.service');

const mockSankhyaService = SankhyaService as jest.Mocked<typeof SankhyaService>;
const mockMercosService = MercosService as jest.Mocked<typeof MercosService>;

describe('IntegrationService', () => {
  let integrationService: IntegrationService;

  beforeEach(() => {
    integrationService = new IntegrationService();
    jest.clearAllMocks();
  });

  describe('sincronizarPedidos', () => {
    it('should successfully synchronize orders', async () => {
      // Mock Sankhya PIX data
      const mockPixData = [
        {
          NUNOTA: '123456',
          EMVPIX: 'mock-pix-code-123',
          VLRDESDOB: 100.50,
          NOSSONUMERO: 'NOSSO123',
        },
      ];

      // Mock Mercos orders
      const mockMercosOrders = [
        {
          id: 'mercos-123',
          numero_pedido: '123456',
          cliente: { nome: 'Cliente Teste', id: 'cliente-1' },
          valor_total: 100.50,
          status: 'pending',
          observacoes: 'NUNOTA: 123456',
          data_criacao: '2024-01-01T10:00:00Z',
          data_alteracao: '2024-01-01T10:00:00Z',
          nunota: '123456',
        },
      ];

      // Setup mocks
      mockSankhyaService.prototype.testConnection = jest.fn().mockResolvedValue(true);
      mockSankhyaService.prototype.consultarMultiplosPixPorData = jest.fn().mockResolvedValue(mockPixData);
      
      mockMercosService.prototype.testConnection = jest.fn().mockResolvedValue(true);
      mockMercosService.prototype.buscarPedidosPorNunota = jest.fn().mockResolvedValue(mockMercosOrders);
      mockMercosService.prototype.atualizarObservacoesPedido = jest.fn().mockResolvedValue(true);

      // Execute synchronization
      const result = await integrationService.sincronizarPedidos({
        type: SyncLogType.MANUAL,
      });

      // Assertions
      expect(result.success).toBe(true);
      expect(result.totalProcessed).toBe(1);
      expect(result.totalSuccess).toBe(1);
      expect(result.totalErrors).toBe(0);
      expect(mockSankhyaService.prototype.consultarMultiplosPixPorData).toHaveBeenCalled();
      expect(mockMercosService.prototype.buscarPedidosPorNunota).toHaveBeenCalledWith('123456');
      expect(mockMercosService.prototype.atualizarObservacoesPedido).toHaveBeenCalledWith(
        'mercos-123',
        'mock-pix-code-123',
        '123456'
      );
    });

    it('should handle connection failures', async () => {
      // Mock connection failure
      mockSankhyaService.prototype.testConnection = jest.fn().mockResolvedValue(false);
      mockMercosService.prototype.testConnection = jest.fn().mockResolvedValue(true);

      // Execute synchronization
      const result = await integrationService.sincronizarPedidos({
        type: SyncLogType.MANUAL,
      });

      // Assertions
      expect(result.success).toBe(false);
      expect(result.totalErrors).toBeGreaterThan(0);
      expect(result.errors).toContain(expect.stringContaining('Sankhya connection failed'));
    });

    it('should handle orders not found in Mercos', async () => {
      // Mock Sankhya PIX data
      const mockPixData = [
        {
          NUNOTA: '999999',
          EMVPIX: 'mock-pix-code-999',
          VLRDESDOB: 200.00,
          NOSSONUMERO: 'NOSSO999',
        },
      ];

      // Setup mocks
      mockSankhyaService.prototype.testConnection = jest.fn().mockResolvedValue(true);
      mockSankhyaService.prototype.consultarMultiplosPixPorData = jest.fn().mockResolvedValue(mockPixData);
      
      mockMercosService.prototype.testConnection = jest.fn().mockResolvedValue(true);
      mockMercosService.prototype.buscarPedidosPorNunota = jest.fn().mockResolvedValue([]);
      mockMercosService.prototype.buscarPedidosAtualizados = jest.fn().mockResolvedValue([]);

      // Execute synchronization
      const result = await integrationService.sincronizarPedidos({
        type: SyncLogType.MANUAL,
      });

      // Assertions
      expect(result.totalProcessed).toBe(1);
      expect(result.totalWarnings).toBe(1);
      expect(mockMercosService.prototype.buscarPedidosPorNunota).toHaveBeenCalledWith('999999');
    });
  });

  describe('testConnections', () => {
    it('should test both service connections', async () => {
      // Setup mocks
      mockSankhyaService.prototype.testConnection = jest.fn().mockResolvedValue(true);
      mockMercosService.prototype.testConnection = jest.fn().mockResolvedValue(true);

      // Execute test
      const result = await integrationService.testConnections();

      // Assertions
      expect(result.sankhya).toBe(true);
      expect(result.mercos).toBe(true);
      expect(mockSankhyaService.prototype.testConnection).toHaveBeenCalled();
      expect(mockMercosService.prototype.testConnection).toHaveBeenCalled();
    });
  });
});