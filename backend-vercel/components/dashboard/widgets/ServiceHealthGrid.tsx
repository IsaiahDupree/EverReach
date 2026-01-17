'use client';

import { CheckCircle2, AlertCircle, XCircle, HelpCircle } from 'lucide-react';

interface Props {
  data: {
    results: Array<{
      service: string;
      status: 'UP' | 'DEGRADED' | 'DOWN' | 'UNKNOWN';
      latency_ms?: number;
      message?: string;
    }>;
  };
}

export function ServiceHealthGrid({ data }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {data.results.map((service) => (
        <div
          key={service.service}
          className="p-3 border rounded-lg hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-2">
            {getStatusIcon(service.status)}
            <div className="flex-1">
              <div className="font-medium text-sm capitalize">{service.service}</div>
              <div className="text-xs text-gray-500">
                {service.latency_ms ? `${service.latency_ms}ms` : '-'}
              </div>
            </div>
          </div>
          {service.message && (
            <div className="mt-2 text-xs text-gray-600">{service.message}</div>
          )}
        </div>
      ))}
    </div>
  );
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'UP':
      return <CheckCircle2 className="w-5 h-5 text-green-500" />;
    case 'DEGRADED':
      return <AlertCircle className="w-5 h-5 text-yellow-500" />;
    case 'DOWN':
      return <XCircle className="w-5 h-5 text-red-500" />;
    default:
      return <HelpCircle className="w-5 h-5 text-gray-400" />;
  }
}
