'use client';

import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

interface Props {
  data: {
    data: Array<{ ts: string; value: number }>;
  };
  renderer?: 'line' | 'area' | 'bar';
}

export function TimeseriesChart({ data, renderer = 'line' }: Props) {
  const chartData = data.data.map((point) => ({
    time: format(new Date(point.ts), 'MMM d, HH:mm'),
    value: point.value,
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      {renderer === 'area' && (
        <AreaChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" />
          <YAxis />
          <Tooltip />
          <Area type="monotone" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
        </AreaChart>
      )}
      
      {renderer === 'bar' && (
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="value" fill="#3b82f6" />
        </BarChart>
      )}
      
      {renderer === 'line' && (
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={false} />
        </LineChart>
      )}
    </ResponsiveContainer>
  );
}
