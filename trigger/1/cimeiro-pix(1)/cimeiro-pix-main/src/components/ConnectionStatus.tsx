import React from 'react';
import { Database, Wifi, CheckCircle, XCircle, Loader } from 'lucide-react';
import type { ConnectionStatus } from '../types';

interface ConnectionStatusProps {
  status: ConnectionStatus | null;
  isLoading: boolean;
  onTest: () => void;
}

export function ConnectionStatusCard({ status, isLoading, onTest }: ConnectionStatusProps) {
  const connections = [
    {
      name: 'Sankhya ERP',
      status: status?.sankhya,
      icon: Database,
    },
    {
      name: 'Mercos',
      status: status?.mercos,
      icon: Wifi,
    },
    {
      name: 'Supabase',
      status: status?.supabase,
      icon: Database,
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Status das Conexões</h3>
        <button
          onClick={onTest}
          disabled={isLoading}
          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <Loader className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Wifi className="h-4 w-4 mr-2" />
          )}
          Testar Conexões
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {connections.map((connection) => {
          const Icon = connection.icon;
          const StatusIcon = isLoading ? Loader : connection.status ? CheckCircle : XCircle;
          
          return (
            <div key={connection.name} className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50">
              <Icon className="h-5 w-5 text-gray-400" />
              <span className="text-sm font-medium text-gray-900">{connection.name}</span>
              <StatusIcon 
                className={`h-4 w-4 ml-auto ${
                  isLoading 
                    ? 'text-gray-400 animate-spin' 
                    : connection.status 
                      ? 'text-green-500' 
                      : 'text-red-500'
                }`} 
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}