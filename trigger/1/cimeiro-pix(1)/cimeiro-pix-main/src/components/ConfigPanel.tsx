import React, { useState, useEffect } from 'react';
import { Save, TestTube, CheckCircle, XCircle, Loader } from 'lucide-react';
import { SupabaseService } from '../services/SupabaseService';
import { ApiService } from '../services/ApiService';
import toast from 'react-hot-toast';

export function ConfigPanel() {
  const [configs, setConfigs] = useState({
    sankhya_token: '',
    sankhya_app_key: '',
    sankhya_username: '',
    sankhya_password: '',
    mercos_application_token: '',
    mercos_company_token: '',
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState<{ [key: string]: boolean | null }>({});
  const [isLoading, setIsLoading] = useState(true);

  const loadConfigs = async () => {
    setIsLoading(true);
    try {
      const configKeys = Object.keys(configs);
      const configPromises = configKeys.map(key => 
        SupabaseService.getConfig(key)
      );
      
      const configValues = await Promise.all(configPromises);
      
      const loadedConfigs = configKeys.reduce((acc, key, index) => {
        acc[key as keyof typeof configs] = configValues[index] || '';
        return acc;
      }, {} as typeof configs);
      
      setConfigs(loadedConfigs);
    } catch (error) {
      console.error('Failed to load configs:', error);
      toast.error('Erro ao carregar configurações');
    } finally {
      setIsLoading(false);
    }
  };

  const saveConfigs = async () => {
    setIsSaving(true);
    try {
      const savePromises = Object.entries(configs).map(([key, value]) =>
        SupabaseService.saveConfig(key, value)
      );
      
      const results = await Promise.all(savePromises);
      const allSaved = results.every(result => result);
      
      if (allSaved) {
        toast.success('Configurações salvas com sucesso');
      } else {
        toast.error('Erro ao salvar algumas configurações');
      }
    } catch (error) {
      console.error('Failed to save configs:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setIsSaving(false);
    }
  };

  const testConnections = async () => {
    setIsTesting(true);
    setTestResults({});
    
    try {
      const results = await ApiService.testConnections();
      setTestResults(results);
      
      const hasFailure = !results.sankhya || !results.mercos || !results.supabase;
      if (hasFailure) {
        toast.error('Algumas conexões falharam');
      } else {
        toast.success('Todas as conexões estão funcionando');
      }
    } catch (error) {
      console.error('Connection test failed:', error);
      toast.error('Erro ao testar conexões');
    } finally {
      setIsTesting(false);
    }
  };

  const handleChange = (key: string, value: string) => {
    setConfigs(prev => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    loadConfigs();
  }, []);

  const getTestIcon = (service: string) => {
    if (isTesting) return <Loader className="h-4 w-4 animate-spin" />;
    if (testResults[service] === true) return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (testResults[service] === false) return <XCircle className="h-4 w-4 text-red-500" />;
    return null;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Configurações</h1>
          <p className="mt-2 text-sm text-gray-600">
            Configure as credenciais das APIs e teste as conexões
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button
            onClick={testConnections}
            disabled={isTesting}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
          >
            <TestTube className={`h-4 w-4 mr-2 ${isTesting ? 'animate-pulse' : ''}`} />
            Testar Conexões
          </button>
          <button
            onClick={saveConfigs}
            disabled={isSaving}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
          >
            {isSaving ? (
              <Loader className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar Configurações
          </button>
        </div>
      </div>

      {/* Sankhya Configuration */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Sankhya ERP</h3>
          {getTestIcon('sankhya')}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Token</label>
            <input
              type="password"
              value={configs.sankhya_token}
              onChange={(e) => handleChange('sankhya_token', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Token de acesso do Sankhya"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">App Key</label>
            <input
              type="password"
              value={configs.sankhya_app_key}
              onChange={(e) => handleChange('sankhya_app_key', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Chave da aplicação"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
            <input
              type="text"
              value={configs.sankhya_username}
              onChange={(e) => handleChange('sankhya_username', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Usuário do Sankhya"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <input
              type="password"
              value={configs.sankhya_password}
              onChange={(e) => handleChange('sankhya_password', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Senha do usuário"
            />
          </div>
        </div>
      </div>

      {/* Mercos Configuration */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Mercos</h3>
          {getTestIcon('mercos')}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Application Token</label>
            <input
              type="password"
              value={configs.mercos_application_token}
              onChange={(e) => handleChange('mercos_application_token', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Token da aplicação Mercos"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Company Token</label>
            <input
              type="password"
              value={configs.mercos_company_token}
              onChange={(e) => handleChange('mercos_company_token', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Token da empresa"
            />
          </div>
        </div>
      </div>

      {/* Connection Test Results */}
      {Object.keys(testResults).length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Resultados dos Testes</h3>
          <div className="space-y-3">
            {Object.entries(testResults).map(([service, status]) => (
              <div key={service} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                <span className="text-sm font-medium text-gray-700 capitalize">
                  {service}
                </span>
                <div className="flex items-center space-x-2">
                  {status ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-green-600">Conectado</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 text-red-500" />
                      <span className="text-sm text-red-600">Falha na conexão</span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}