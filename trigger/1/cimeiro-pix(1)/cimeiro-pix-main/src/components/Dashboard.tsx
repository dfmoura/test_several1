import React, { useState, useEffect } from 'react';
import { RefreshCw, Play } from 'lucide-react';
import { StatusCards } from './StatusCards';
import { ConnectionStatusCard } from './ConnectionStatus';
import { LogsTable } from './LogsTable';
import { SupabaseService } from '../services/SupabaseService';
import { REFRESH_INTERVALS } from '../utils/constants';
import type { DashboardMetrics, ConnectionStatus, SyncLog, SyncResult } from '../types';
import toast from 'react-hot-toast';

export function Dashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics>({ total: 0, success: 0, error: 0, not_found: 0 });
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [recentLogs, setRecentLogs] = useState<SyncLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<SyncLog | null>(null);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(true);
  const [isLoadingConnections, setIsLoadingConnections] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const loadMetrics = async () => {
    try {
      const [metricsData, logsData] = await Promise.all([
        SupabaseService.getDashboardMetrics(),
        SupabaseService.getLogs(undefined, 5, 0)
      ]);
      
      setMetrics(metricsData);
      setRecentLogs(logsData.logs);
    } catch (error) {
      console.error('Failed to load metrics:', error);
      toast.error('Erro ao carregar métricas');
    } finally {
      setIsLoadingMetrics(false);
    }
  };

  const testConnections = async () => {
    setIsLoadingConnections(true);
    try {
      const response = await fetch('/.netlify/functions/test-integration');
      const testResult = await response.json();
      
      const status = {
        sankhya: testResult.tests?.sankhya?.status === 'success',
        mercos: testResult.tests?.mercos?.status === 'success',
        supabase: testResult.tests?.supabase?.status === 'success',
      };
      
      setConnectionStatus(status);
      
      if (testResult.overall_status !== 'success') {
        toast.error('Algumas conexões falharam');
      } else {
        toast.success('Todas as conexões estão funcionando');
      }
    } catch (error) {
      console.error('Connection test failed:', error);
      toast.error('Erro ao testar conexões');
    } finally {
      setIsLoadingConnections(false);
    }
  };

  const executeSync = async () => {
    setIsSyncing(true);
    const toastId = toast.loading('Executando sincronização...');
    
    try {
      const response = await fetch('/.netlify/functions/sync-execute');
      const result = await response.json();
      
      toast.success(
        result.success ? result.message : `Erro: ${result.error}`,
        { id: toastId }
      );
      
      // Refresh metrics and logs
      await loadMetrics();
    } catch (error) {
      console.error('Sync failed:', error);
      toast.error('Erro na sincronização', { id: toastId });
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    loadMetrics();
    testConnections();

    const interval = setInterval(loadMetrics, REFRESH_INTERVALS.DASHBOARD);
    return () => clearInterval(interval);
  }, []);

  const formatLastSync = () => {
    if (!metrics.last_sync) return 'Nunca';
    
    const lastSync = new Date(metrics.last_sync);
    const now = new Date();
    const diffMs = now.getTime() - lastSync.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    
    if (diffMinutes < 1) return 'Agora há pouco';
    if (diffMinutes < 60) return `${diffMinutes} minutos atrás`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} horas atrás`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} dias atrás`;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-sm text-gray-600">
            Sistema de integração EMVPIX - Última sincronização: {formatLastSync()}
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button
            onClick={loadMetrics}
            disabled={isLoadingMetrics}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingMetrics ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
          <button
            onClick={executeSync}
            disabled={isSyncing}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
          >
            {isSyncing ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Executar Sincronização
          </button>
        </div>
      </div>

      {/* Connection Status */}
      <ConnectionStatusCard 
        status={connectionStatus} 
        isLoading={isLoadingConnections} 
        onTest={testConnections} 
      />

      {/* Metrics Cards */}
      <StatusCards metrics={metrics} isLoading={isLoadingMetrics} />

      {/* Recent Logs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Últimos Logs</h3>
        <LogsTable 
          logs={recentLogs} 
          isLoading={isLoadingMetrics} 
          onShowDetails={setSelectedLog} 
        />
      </div>

      {/* Log Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Detalhes do Log</h3>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">NUNOTA</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedLog.nunota}</p>
                </div>
                
                {selectedLog.pedido_mercos_id && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">ID Pedido Mercos</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedLog.pedido_mercos_id}</p>
                  </div>
                )}
                
                {selectedLog.pix_data && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Dados PIX</label>
                    <pre className="mt-1 p-3 bg-gray-100 rounded-md text-xs overflow-x-auto">
                      {selectedLog.pix_data}
                    </pre>
                  </div>
                )}
                
                {selectedLog.error_message && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Mensagem de Erro</label>
                    <p className="mt-1 text-sm text-red-600 bg-red-50 p-3 rounded-md">
                      {selectedLog.error_message}
                    </p>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Data/Hora</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {new Date(selectedLog.created_at).toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}