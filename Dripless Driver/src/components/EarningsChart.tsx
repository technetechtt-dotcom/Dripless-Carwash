import React from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis } from
'recharts';
interface EarningsChartProps {
  data: Array<{
    name: string;
    amount: number;
  }>;
}
export function EarningsChart({ data }: EarningsChartProps) {
  return (
    <div className="h-64 w-full" aria-label="Earnings chart" role="img">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{
            top: 10,
            right: 0,
            left: -20,
            bottom: 0
          }}>

          <defs>
            <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#e2e8f0"
            vertical={false} />

          <XAxis
            dataKey="name"
            stroke="#94A3B8"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            dy={10} />

          <YAxis
            stroke="#94A3B8"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `$${value}`} />

          <Tooltip
            contentStyle={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              color: '#0f172a',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
            itemStyle={{
              color: '#10B981'
            }}
            formatter={(value: number) => [`$${value}`, 'Earnings']} />

          <Area
            type="monotone"
            dataKey="amount"
            stroke="#10B981"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorEarnings)" />

        </AreaChart>
      </ResponsiveContainer>
    </div>);

}