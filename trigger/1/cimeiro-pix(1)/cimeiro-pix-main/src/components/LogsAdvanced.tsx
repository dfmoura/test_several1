import React, { useState, useEffect } from 'react';
import { RefreshCw, Search, Download, Eye, FolderSync as Sync, AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { ApiService } from '../services/ApiService';
import { REFRESH_INTERVALS, PAGINATION, STATUS_COLORS, STATUS_LABELS } from '../utils/constants';
import type { CorrelationData, AdvancedLogMetrics, SankhyaPix, MercosOrder } from '../types';
import toast from 'react-hot-toast';

export function LogsAdvanced() {
  const [correlations, setCorrelations] = useState<CorrelationData[]>([]);
  const [metrics, setMetrics] = useState<AdvancedLogMetrics>({
    total_sankhya_pix: 0,
    total_mercos_orders: 0,
    synced_count: 0,
    pending_count: 0,
    orphan_sankhya_count: 0,
    orphan_mercos_count: 0,
    error_count: 0,
    sync_success_rate: 0,
  });
  const [selectedItem, setSelectedItem] = useState<CorrelationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const result = await ApiService.correlateData();
      setCorrelations(result.correlations);
      setMetrics(result.metrics);
    } catch (error) {
      console.error('Failed to load correlation data:', error);
      toast.error('Erro ao carregar dados de correlação');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCorrelations = correlations.filter(item => {
    const matchesStatus = statusFilter === 'all' || item.correlation_status === statusFilter;
    const matchesSearch = !searchTerm || 
      item.nunota.includes(searchTerm) ||
      item.mercos_data?.cliente_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.mercos_data?.numero_pedido.includes(searchTerm);
    
    return matchesStatus && matchesSearch;
  });

  const paginatedCorrelations = filteredCorrelations.slice(
    (currentPage - 1) * PAGINATION.ADVANCED_LIMIT,
    currentPage * PAGINATION.ADVANCED_LIMIT
  );

  const totalPages = Math.ceil(filteredCorrelations.length / PAGINATION.ADVANCED_LIMIT);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'synced':
        return <CheckCircle className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'error':
        return <XCircle className="h-4 w-4" />;
      case 'orphan_sankhya':
      case 'orphan_mercos':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const exportData = () => {
    const csvContent = [
      ['NUNOTA', 'Status', 'Cliente', 'Valor Sankhya', 'Valor Mercos', 'Data Geração', 'Última Sincronização'].join(','),
      ...filteredCorrelations.map(item => [
        item.nunota,
        STATUS_LABELS[item.correlation_status as keyof typeof STATUS_LABELS] || item.correlation_status,
        item.mercos_data?.cliente_nome || '',
        item.sankhya_data?.valor || 0,
        item.mercos_data?.valor_total || 0,
        item.sankhya_data?.data_geracao || '',
        item.last_sync_attempt || '',
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `correlacao_emvpix_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, REFRESH_INTERVALS.ADVANCED_LOGS);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Logs Avançados</h1>
          <p className="mt-2 text-sm text-gray-600">
            Correlação completa entre dados Sankhya e Mercos
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button
            onClick={exportData}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </button>
          <button
            onClick={loadData}
            disabled={isLoading}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        {[
          { label: 'PIX Sankhya', value: metrics.total_sankhya_pix, color: 'bg-blue-50 text-blue-600' },
          { label: 'Pedidos Mercos', value: metrics.total_mercos_orders, color: 'bg-purple-50 text-purple-600' },
          { label: 'Sincronizados', value: metrics.synced_count, color: 'bg-green-50 text-green-600' },
          { label: 'Pendentes', value: metrics.pending_count, color: 'bg-yellow-50 text-yellow-600' },
          { label: 'Órfãos Sankhya', value: metrics.orphan_sankhya_count, color: 'bg-orange-50 text-orange-600' },
          { label: 'Órfãos Mercos', value: metrics.orphan_mercos_count, color: 'bg-pink-50 text-pink-600' },
          { label: 'Erros', value: metrics.error_count, color: 'bg-red-50 text-red-600' },
          { label: 'Taxa Sucesso', value: `${metrics.sync_success_rate.toFixed(1)}%`, color: 'bg-indigo-50 text-indigo-600' },
        ].map((metric, index) => (
          <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${metric.color} mb-2`}>
              {metric.label}
            </div>
            <p className="text-2xl font-bold text-gray-900">{isLoading ? '...' : metric.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por NUNOTA, cliente ou pedido..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex space-x-2">
            {[
              { value: 'all', label: 'Todos' },
              { value: 'synced', label: 'Sincronizados' },
              { value: 'pending', label: 'Pendentes' },
              { value: 'orphan_sankhya', label: 'Órfãos Sankhya' },
              { value: 'orphan_mercos', label: 'Órfãos Mercos' },
              { value: 'error', label: 'Erros' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setStatusFilter(option.value)}
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

      {/* Correlation Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8">
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        ) : paginatedCorrelations.length === 0 ? (
          <div className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium text-gray-900">Nenhum dado encontrado</p>
            <p className="text-sm text-gray-500">Ajuste os filtros ou execute uma sincronização</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    NUNOTA
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pedido Mercos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Última Sync
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedCorrelations.map((item) => (
                  <tr key={item.nunota} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center space-x-2 px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[item.correlation_status as keyof typeof STATUS_COLORS]}`}>
                        {getStatusIcon(item.correlation_status)}
                        <span>{STATUS_LABELS[item.correlation_status as keyof typeof STATUS_LABELS]}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.nunota}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.mercos_data?.numero_pedido || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.mercos_data?.cliente_nome || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.sankhya_data ? formatCurrency(item.sankhya_data.valor) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.last_sync_attempt ? formatDate(item.last_sync_attempt) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setSelectedItem(item)}
                          className="text-blue-600 hover:text-blue-900 transition-colors"
                          title="Ver detalhes"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {item.correlation_status === 'pending' && (
                          <button
                            className="text-green-600 hover:text-green-900 transition-colors"
                            title="Forçar sincronização"
                          >
                            <Sync className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Mostrando {((currentPage - 1) * PAGINATION.ADVANCED_LIMIT) + 1} até {Math.min(currentPage * PAGINATION.ADVANCED_LIMIT, filteredCorrelations.length)} de {filteredCorrelations.length} registros
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Anterior
              </button>
              <span className="px-3 py-2 text-sm font-medium text-gray-700">
                Página {currentPage} de {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Próxima
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  Detalhes da Correlação - NUNOTA {selectedItem.nunota}
                </h3>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Sankhya Data */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="text-md font-semibold text-blue-900 mb-3">Dados Sankhya</h4>
                  {selectedItem.sankhya_data ? (
                    <div className="space-y-2 text-sm">
                      <div><span className="font-medium">NUNOTA:</span> {selectedItem.sankhya_data.nunota}</div>
                      <div><span className="font-medium">Valor:</span> {formatCurrency(selectedItem.sankhya_data.valor)}</div>
                      <div><span className="font-medium">Data Geração:</span> {formatDate(selectedItem.sankhya_data.data_geracao)}</div>
                      <div><span className="font-medium">Status PIX:</span> {selectedItem.sankhya_data.status_pix}</div>
                      {selectedItem.sankhya_data.dhbaixa && (
                        <div><span className="font-medium">Data Baixa:</span> {formatDate(selectedItem.sankhya_data.dhbaixa)}</div>
                      )}
                      <div className="mt-3">
                        <span className="font-medium">Código PIX:</span>
                        <pre className="mt-1 p-2 bg-white rounded text-xs overflow-x-auto">
                          {selectedItem.sankhya_data.emvpix}
                        </pre>
                      </div>
                    </div>
                  ) : (
                    <p className="text-blue-700">Nenhum dado PIX encontrado</p>
                  )}
                </div>

                {/* Mercos Data */}
                <div className="bg-purple-50 rounded-lg p-4">
                  <h4 className="text-md font-semibold text-purple-900 mb-3">Dados Mercos</h4>
                  {selectedItem.mercos_data ? (
                    <div className="space-y-2 text-sm">
                      <div><span className="font-medium">ID Pedido:</span> {selectedItem.mercos_data.id}</div>
                      <div><span className="font-medium">Número:</span> {selectedItem.mercos_data.numero_pedido}</div>
                      <div><span className="font-medium">Cliente:</span> {selectedItem.mercos_data.cliente_nome}</div>
                      <div><span className="font-medium">Valor:</span> {formatCurrency(selectedItem.mercos_data.valor_total)}</div>
                      <div><span className="font-medium">Status:</span> {selectedItem.mercos_data.status}</div>
                      <div><span className="font-medium">Data Criação:</span> {formatDate(selectedItem.mercos_data.data_criacao)}</div>
                      {selectedItem.mercos_data.referencia_cliente && (
                        <div><span className="font-medium">Referência:</span> {selectedItem.mercos_data.referencia_cliente}</div>
                      )}
                      {selectedItem.mercos_data.observacoes && (
                        <div className="mt-3">
                          <span className="font-medium">Observações:</span>
                          <pre className="mt-1 p-2 bg-white rounded text-xs overflow-x-auto max-h-32">
                            {selectedItem.mercos_data.observacoes}
                          </pre>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-purple-700">Nenhum pedido encontrado</p>
                  )}
                </div>
              </div>

              {/* Sync History */}
              {selectedItem.sync_history.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-md font-semibold text-gray-900 mb-3">Histórico de Sincronização</h4>
                  <div className="bg-gray-50 rounded-lg p-4 max-h-40 overflow-y-auto">
                    <div className="space-y-2">
                      {selectedItem.sync_history.map((log, index) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                          <div className="flex items-center space-x-2">
                            <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[log.status as keyof typeof STATUS_COLORS]}`}>
                              {getStatusIcon(log.status)}
                              <span>{STATUS_LABELS[log.status as keyof typeof STATUS_LABELS]}</span>
                            </span>
                            {log.error_message && (
                              <span className="text-red-600 text-xs">{log.error_message}</span>
                            )}
                          </div>
                          <span className="text-gray-500 text-xs">{formatDate(log.created_at)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}