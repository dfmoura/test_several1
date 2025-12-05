import React from 'react';
import { CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react';
import type { DashboardMetrics } from '../types';

interface StatusCardsProps {
  metrics: DashboardMetrics;
  isLoading: boolean;
}

export function StatusCards({ metrics, isLoading }: StatusCardsProps) {
  const cards = [
    {
      title: 'Total Processados',
      value: metrics.total,
      icon: Clock,
      color: 'text-blue-600 bg-blue-50',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Sucessos',
      value: metrics.success,
      icon: CheckCircle,
      color: 'text-green-600 bg-green-50',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Erros',
      value: metrics.error,
      icon: XCircle,
      color: 'text-red-600 bg-red-50',
      bgColor: 'bg-red-50',
    },
    {
      title: 'Não Encontrados',
      value: metrics.not_found,
      icon: AlertCircle,
      color: 'text-yellow-600 bg-yellow-50',
      bgColor: 'bg-yellow-50',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.title} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">{card.title}</p>
                <p className="text-3xl font-bold text-gray-900">
                  {isLoading ? '...' : card.value.toLocaleString()}
                </p>
              </div>
              <div className={`p-3 rounded-full ${card.bgColor}`}>
                <Icon className={`h-6 w-6 ${card.color.split(' ')[0]}`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}