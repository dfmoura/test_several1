import React, { useState, useEffect } from 'react';
import { RefreshCw, Filter } from 'lucide-react';
import { LogsTable } from './LogsTable';
import { ApiService } from '../services/ApiService';
import { PAGINATION } from '../utils/constants';
import type { SyncLog } from '../types';
import toast from 'react-hot-toast';

export function LogsPage() {
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<SyncLog | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);

  const loadLogs = async (page: number = 1, status: string = statusFilter) => {
    setIsLoading(true);
    try {
      const offset = (page - 1) * PAGINATION.DEFAULT_LIMIT;
      const { logs: logsData, total } = await ApiService.getLogs(
        status === 'all' ? undefined : status,
        PAGINATION.DEFAULT_LIMIT,
        offset
      );
      
      setLogs(logsData);
      setTotalLogs(total);
      setCurrentPage(page);
    } catch (error) {
      console.error('Failed to load logs:', error);
      toast.error('Erro ao carregar logs');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusFilter = (newStatus: string) => {
    setStatusFilter(newStatus);
    setCurrentPage(1);
    loadLogs(1, newStatus);
  };

  const totalPages = Math.ceil(totalLogs / PAGINATION.DEFAULT_LIMIT);

  useEffect(() => {
    loadLogs();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Logs de Sincronização</h1>
          <p className="mt-2 text-sm text-gray-600">
            Histórico completo das operações de sincronização
          </p>
        </div>
        <button
          onClick={() => loadLogs(currentPage, statusFilter)}
          disabled={isLoading}
          className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Filtrar por status:</span>
          </div>
          <div className="flex space-x-2">
            {[
              { value: 'all', label: 'Todos' },
              { value: 'success', label: 'Sucessos' },
              { value: 'error', label: 'Erros' },
              { value: 'not_found', label: 'Não Encontrados' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => handleStatusFilter(option.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  statusFilter === option.value
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <LogsTable 
        logs={logs} 
        isLoading={isLoading} 
        onShowDetails={setSelectedLog} 
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Mostrando {((currentPage - 1) * PAGINATION.DEFAULT_LIMIT) + 1} até {Math.min(currentPage * PAGINATION.DEFAULT_LIMIT, totalLogs)} de {totalLogs} registros
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => loadLogs(currentPage - 1, statusFilter)}
                disabled={currentPage === 1 || isLoading}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Anterior
              </button>
              <span className="px-3 py-2 text-sm font-medium text-gray-700">
                Página {currentPage} de {totalPages}
              </span>
              <button
                onClick={() => loadLogs(currentPage + 1, statusFilter)}
                disabled={currentPage === totalPages || isLoading}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Próxima
              </button>
            </div>
          </div>
        </div>
      )}

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
                    <pre className="mt-1 p-3 bg-gray-100 rounded-md text-xs overflow-x-auto whitespace-pre-wrap">
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
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}