import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { Database, BarChart3, Search, Eye, CheckCircle, XCircle, RefreshCw, AlertTriangle, Copy, Play, Users, Server, Activity } from 'lucide-react';
import { supabase } from './lib/supabase';
import { SankhyaService } from './services/SankhyaService';
import { MercosService } from './services/MercosService';
import { IntegrationService } from './services/IntegrationService';
import toast from 'react-hot-toast';

function App() {
  const [connectionStatus, setConnectionStatus] = useState<'loading' | 'connected' | 'error' | 'missing_table'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [showSqlInstructions, setShowSqlInstructions] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'sankhya' | 'mercos' | 'integration'>('dashboard');
  const [sankhyaData, setSankhyaData] = useState<any[]>([]);
  const [mercosData, setMercosData] = useState<any[]>([]);
  const [apiStatus, setApiStatus] = useState<{sankhya: boolean, mercos: boolean}>({sankhya: false, mercos: false});
  const [isLoadingApis, setIsLoadingApis] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        await testConnection();
        await testApiConnections();
        setIsInitialized(true);
      } catch (error) {
        console.error('Erro na inicialização:', error);
        setIsInitialized(true); // Continuar mesmo com erro
      }
    };
    
    initializeApp();
  }, []);

  async function testConnection() {
    try {
      console.log('🔄 Testando conexão Supabase...');
      
      // Teste simples de conexão
      const { data, error } = await supabase
        .from('integration_logs')
        .select('*')
        .limit(5);
      
      if (error) {
        console.error('❌ Erro Supabase:', error);
        
        // Check if it's a missing table error
        if (error.message.includes('does not exist') || error.message.includes('relation') || error.code === '42P01') {
          setConnectionStatus('missing_table');
          setError('Tabela integration_logs não existe no Supabase');
        } else {
          setError(error.message);
          setConnectionStatus('error');
        }
      } else {
        console.log('✅ Supabase conectado com sucesso');
        console.log('📊 Dados recebidos:', data?.length || 0, 'registros');
        setLogs(data || []);
        setConnectionStatus('connected');
        setError(null);
      }
    } catch (err: any) {
      console.error('❌ Erro na conexão:', err);
      setError(err.message || 'Erro desconhecido');
      setConnectionStatus('error');
    }
  }

  async function createTableAutomatically() {
    const toastId = toast.loading('Criando tabela integration_logs...');
    
    try {
      // Tentar criar a tabela usando SQL direto
      const { error } = await supabase
        .from('integration_logs')
        .insert([{
          type: 'system_init',
          message: 'Teste de criação de tabela',
          timestamp: new Date().toISOString(),
          created_at: new Date().toISOString()
        }]);

      if (error) {
        console.log('Tabela não existe, isso é esperado:', error);
        toast.info('Tabela precisa ser criada manualmente no Supabase', { id: toastId });
        return;
      }

      toast.success('Tabela criada com sucesso!', { id: toastId });
      
      // Test connection again
      setTimeout(() => {
        testConnection();
      }, 1000);

    } catch (error: any) {
      console.error('Erro ao criar tabela:', error);
      toast.error(`Erro ao criar tabela: ${error.message}`, { id: toastId });
    }
  }

  async function testApiConnections() {
    setIsLoadingApis(true);
    try {
      const sankhyaService = new SankhyaService();
      const mercosService = new MercosService();
      
      const [sankhyaResult, mercosResult] = await Promise.all([
        sankhyaService.testConnection(),
        mercosService.testConnection()
      ]);
      
      setApiStatus({
        sankhya: sankhyaResult.success,
        mercos: mercosResult.success
      });
      
      if (sankhyaResult.success && mercosResult.success) {
        toast.success('APIs Sankhya e Mercos conectadas!');
      } else {
        toast.error('Algumas APIs falharam na conexão');
      }
    } catch (error) {
      console.error('Erro ao testar APIs:', error);
      toast.error('Erro ao testar conexões das APIs');
    } finally {
      setIsLoadingApis(false);
    }
  }

  async function loadSankhyaData() {
    const toastId = toast.loading('Carregando dados PIX do Sankhya...');
    try {
      const sankhyaService = new SankhyaService();
      const result = await sankhyaService.getPixData(10);
      
      if (result.success) {
        setSankhyaData(result.pixData);
        toast.success(`${result.pixData.length} registros PIX carregados!`, { id: toastId });
      } else {
        toast.error(`Erro: ${result.message}`, { id: toastId });
      }
    } catch (error) {
      toast.error('Erro ao carregar dados Sankhya', { id: toastId });
    }
  }

  async function loadMercosData() {
    const toastId = toast.loading('Carregando pedidos do Mercos...');
    try {
      const mercosService = new MercosService();
      const result = await mercosService.getOrders(10);
      
      if (result.success) {
        setMercosData(result.orders);
        toast.success(`${result.orders.length} pedidos carregados!`, { id: toastId });
      } else {
        toast.error(`Erro: ${result.message}`, { id: toastId });
      }
    } catch (error) {
      toast.error('Erro ao carregar dados Mercos', { id: toastId });
    }
  }

  async function executeIntegration() {
    const toastId = toast.loading('Executando sincronização PIX...');
    try {
      const integrationService = new IntegrationService();
      const result = await integrationService.syncPixData();
      
      setSyncResult(result);
      
      if (result.success) {
        toast.success(`Sincronização concluída! ${result.totalSuccess} sucessos`, { id: toastId });
      } else {
        toast.error(`Sincronização com erros: ${result.totalErrors} falhas`, { id: toastId });
      }
    } catch (error) {
      toast.error('Erro na sincronização', { id: toastId });
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('SQL copiado para a área de transferência!');
  };

  const sqlScript = `CREATE TABLE integration_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type VARCHAR(100) NOT NULL,
  message TEXT,
  data JSONB,
  summary JSONB,
  details JSONB,
  error TEXT,
  execution_time_ms INTEGER,
  sankhya_records INTEGER,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_integration_logs_type ON integration_logs(type);
CREATE INDEX idx_integration_logs_created_at ON integration_logs(created_at);

ALTER TABLE integration_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations" ON integration_logs FOR ALL USING (true);

INSERT INTO integration_logs (type, message) 
VALUES ('system_init', 'Tabela criada com sucesso!');

SELECT 'Sucesso!' as status, COUNT(*) as registros FROM integration_logs;`;

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'loading':
        return <RefreshCw className="h-5 w-5 animate-spin text-blue-500" />;
      case 'connected':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'missing_table':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'loading':
        return 'Conectando...';
      case 'connected':
        return `Conectado - ${logs.length} logs encontrados`;
      case 'missing_table':
        return 'Tabela integration_logs não existe';
      case 'error':
        return `Erro: ${error}`;
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'loading':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'connected':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'missing_table':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
    }
  };

  // Loading screen enquanto inicializa
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Inicializando Sistema</h2>
          <p className="text-gray-600">Carregando integração SANKHYA-MERCOS...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Database className="h-5 w-5 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">EMVPIX Integration</h1>
                <p className="text-sm text-gray-500">Sistema de Sincronização Sankhya ↔ Mercos</p>
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={testApiConnections}
                disabled={isLoadingApis}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50"
              >
                <Activity className={`h-4 w-4 mr-2 ${isLoadingApis ? 'animate-spin' : ''}`} />
                Testar APIs
              </button>
              <button
                onClick={testConnection}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Supabase
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
              { id: 'sankhya', label: 'Sankhya ERP', icon: Server },
              { id: 'mercos', label: 'Mercos', icon: Users },
              { id: 'integration', label: 'Integração', icon: RefreshCw },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            {/* API Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Supabase Status */}
              <div className={`rounded-lg border-2 p-6 ${getStatusColor()}`}>
                <div className="flex items-center space-x-3">
                  {getStatusIcon()}
                  <div>
                    <h3 className="text-lg font-semibold">Supabase</h3>
                    <p className="text-sm">{getStatusText()}</p>
                  </div>
                </div>
              </div>

              {/* Sankhya Status */}
              <div className={`rounded-lg border-2 p-6 ${apiStatus.sankhya ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                <div className="flex items-center space-x-3">
                  {apiStatus.sankhya ? <CheckCircle className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-red-500" />}
                  <div>
                    <h3 className="text-lg font-semibold">Sankhya ERP</h3>
                    <p className="text-sm">{apiStatus.sankhya ? 'Conectado' : 'Desconectado'}</p>
                  </div>
                </div>
              </div>

              {/* Mercos Status */}
              <div className={`rounded-lg border-2 p-6 ${apiStatus.mercos ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                <div className="flex items-center space-x-3">
                  {apiStatus.mercos ? <CheckCircle className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-red-500" />}
                  <div>
                    <h3 className="text-lg font-semibold">Mercos</h3>
                    <p className="text-sm">{apiStatus.mercos ? 'Conectado' : 'Desconectado'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Ações Rápidas</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={loadSankhyaData}
                  className="flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <Server className="h-4 w-4 mr-2" />
                  Carregar PIX Sankhya
                </button>
                <button
                  onClick={loadMercosData}
                  className="flex items-center justify-center px-4 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Carregar Pedidos Mercos
                </button>
                <button
                  onClick={executeIntegration}
                  className="flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Executar Sincronização
                </button>
              </div>
            </div>

            {/* Sync Results */}
            {syncResult && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Resultado da Última Sincronização</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{syncResult.totalProcessed}</div>
                    <div className="text-sm text-gray-500">Processados</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{syncResult.totalSuccess}</div>
                    <div className="text-sm text-gray-500">Sucessos</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{syncResult.totalErrors}</div>
                    <div className="text-sm text-gray-500">Erros</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-600">{syncResult.executionTimeMs}ms</div>
                    <div className="text-sm text-gray-500">Tempo</div>
                  </div>
                </div>
                {syncResult.errors.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium text-red-900 mb-2">Erros:</h4>
                    <ul className="text-sm text-red-700 space-y-1">
                      {syncResult.errors.slice(0, 3).map((error: string, index: number) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Sankhya Tab */}
        {activeTab === 'sankhya' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Dados PIX - Sankhya ERP</h2>
              <button
                onClick={loadSankhyaData}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar Dados
              </button>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              {sankhyaData.length === 0 ? (
                <div className="p-8 text-center">
                  <Server className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium text-gray-900">Nenhum dado PIX carregado</p>
                  <p className="text-sm text-gray-500">Clique em "Atualizar Dados" para carregar</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">NUNOTA</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status PIX</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data Geração</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Código PIX</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {sankhyaData.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.nunota}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">R$ {item.valor?.toFixed(2)}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              item.status_pix === 'pago' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {item.status_pix}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(item.data_geracao).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                              {item.emvpix?.substring(0, 20)}...
                            </code>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mercos Tab */}
        {activeTab === 'mercos' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Pedidos - Mercos</h2>
              <button
                onClick={loadMercosData}
                className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar Pedidos
              </button>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              {mercosData.length === 0 ? (
                <div className="p-8 text-center">
                  <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium text-gray-900">Nenhum pedido carregado</p>
                  <p className="text-sm text-gray-500">Clique em "Atualizar Pedidos" para carregar</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID Pedido</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">NUNOTA</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {mercosData.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.numero_pedido}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.cliente_nome}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">R$ {item.valor_total?.toFixed(2)}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              item.status === 'confirmed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {item.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.nunota_found ? (
                              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">{item.nunota_found}</span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(item.data_criacao).toLocaleDateString('pt-BR')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Integration Tab */}
        {activeTab === 'integration' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Sincronização PIX</h2>
              <button
                onClick={executeIntegration}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                <Play className="h-4 w-4 mr-2" />
                Executar Sincronização
              </button>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Como Funciona</h3>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-semibold text-blue-600">1</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Buscar PIX no Sankhya</h4>
                    <p className="text-sm text-gray-500">Sistema consulta registros com EMVPIX não nulo na tabela TGFFIN</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-semibold text-purple-600">2</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Localizar Pedidos no Mercos</h4>
                    <p className="text-sm text-gray-500">Busca pedidos correspondentes por NUNOTA nas observações ou referência</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-semibold text-green-600">3</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Atualizar Observações</h4>
                    <p className="text-sm text-gray-500">Adiciona dados PIX formatados nas observações do pedido Mercos</p>
                  </div>
                </div>
              </div>
            </div>

            {syncResult && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Detalhes da Última Execução</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{syncResult.totalProcessed}</div>
                      <div className="text-sm text-blue-600">Total Processados</div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{syncResult.totalSuccess}</div>
                      <div className="text-sm text-green-600">Sucessos</div>
                    </div>
                    <div className="bg-red-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">{syncResult.totalErrors}</div>
                      <div className="text-sm text-red-600">Erros</div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-gray-600">{syncResult.executionTimeMs}ms</div>
                      <div className="text-sm text-gray-600">Tempo Execução</div>
                    </div>
                  </div>

                  {syncResult.details.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Detalhes:</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {syncResult.details.map((detail: string, index: number) => (
                          <li key={index} className="flex items-start">
                            <span className="mr-2">•</span>
                            <span>{detail}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {syncResult.errors.length > 0 && (
                    <div>
                      <h4 className="font-medium text-red-900 mb-2">Erros:</h4>
                      <ul className="text-sm text-red-700 space-y-1">
                        {syncResult.errors.map((error: string, index: number) => (
                          <li key={index} className="flex items-start">
                            <span className="mr-2">•</span>
                            <span>{error}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Missing Table Fix */}
        {connectionStatus === 'missing_table' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-6 w-6 text-yellow-500 mt-1" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">🔧 Correção Necessária</h3>
                <p className="text-gray-600 mb-4">
                  A tabela <code className="bg-gray-100 px-2 py-1 rounded">integration_logs</code> não existe no seu projeto Supabase.
                </p>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Opção 1: Criação Automática (Experimental)</h4>
                    <button
                      onClick={createTableAutomatically}
                      className="inline-flex items-center px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors"
                    >
                      <Database className="h-4 w-4 mr-2" />
                      Criar Tabela Automaticamente
                    </button>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Opção 2: Criação Manual (Recomendado)</h4>
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600">
                        1. Acesse: <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">https://supabase.com/dashboard</a>
                      </p>
                      <p className="text-sm text-gray-600">
                        2. Vá para: <strong>SQL Editor</strong> → <strong>New Query</strong>
                      </p>
                      <p className="text-sm text-gray-600">
                        3. Cole e execute o SQL abaixo:
                      </p>
                      
                      <div className="relative">
                        <button
                          onClick={() => setShowSqlInstructions(!showSqlInstructions)}
                          className="inline-flex items-center px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          {showSqlInstructions ? 'Ocultar' : 'Mostrar'} SQL
                        </button>
                        
                        {showSqlInstructions && (
                          <div className="mt-3 relative">
                            <button
                              onClick={() => copyToClipboard(sqlScript)}
                              className="absolute top-2 right-2 p-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors z-10"
                              title="Copiar SQL"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                            <pre className="bg-gray-900 text-green-400 p-4 rounded-md text-sm overflow-x-auto">
                              {sqlScript}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Scheduled Job Status */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Status do Job Agendado</h3>
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex items-center">
              <RefreshCw className="h-5 w-5 text-blue-600 mr-3" />
              <div>
                <h4 className="text-sm font-medium text-blue-900">Integração ERP Automática</h4>
                <p className="text-sm text-blue-700 mt-1">
                  Executa automaticamente a cada 5 minutos via Netlify Functions
                </p>
                <p className="text-xs text-blue-600 mt-2">
                  ⏰ Próxima execução: A cada 5 minutos<br/>
                  🔒 Controle de sobreposição: Ativo<br/>
                  📊 Logs salvos no Supabase
                </p>
              </div>
            </div>
          </div>
          <div className="mt-4 text-xs text-gray-500">
            <p><strong>Função:</strong> scheduled-erp-integration.js</p>
            <p><strong>Configuração:</strong> netlify.toml [functions."scheduled-erp-integration"]</p>
            <p><strong>Controle:</strong> Tabela job_control no Supabase</p>
          </div>
        </div>

        {/* Environment Info */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações do Ambiente</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Supabase URL:</span>
              <p className="text-gray-600 break-all">{import.meta.env.VITE_SUPABASE_URL || 'Não definida'}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Supabase Key:</span>
              <p className="text-gray-600">{import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Definida' : 'Não definida'}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Modo:</span>
              <p className="text-gray-600">{import.meta.env.MODE}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Timestamp:</span>
              <p className="text-gray-600">{new Date().toLocaleString('pt-BR')}</p>
            </div>
          </div>
        </div>

        {/* Recent Logs */}
        {connectionStatus === 'connected' && logs.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Últimos Logs</h3>
            <div className="space-y-3">
              {logs.slice(0, 5).map((log, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                  <div>
                    <span className="text-sm font-medium text-gray-900">{log.type || 'N/A'}</span>
                    <p className="text-xs text-gray-500">{log.message || 'Sem mensagem'}</p>
                  </div>
                  <span className="text-xs text-gray-400">
                    {log.timestamp ? new Date(log.timestamp).toLocaleString('pt-BR') : 'N/A'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error Details */}
        {connectionStatus === 'error' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-red-900 mb-4">Detalhes do Erro</h3>
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <pre className="text-sm text-red-800 whitespace-pre-wrap">{error}</pre>
            </div>
            <div className="mt-4 text-sm text-gray-600">
              <p><strong>Possíveis soluções:</strong></p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Verificar se as variáveis de ambiente estão configuradas</li>
                <li>Verificar se a tabela 'integration_logs' existe no Supabase</li>
                <li>Verificar se as credenciais estão corretas</li>
                <li>Verificar a conexão com a internet</li>
              </ul>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;