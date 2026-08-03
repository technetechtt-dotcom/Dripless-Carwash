import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer } from
'recharts';
import { LeafIcon, DropletIcon, TrashIcon } from 'lucide-react';
const data = [
{
  name: 'Jan',
  co2: 4.2
},
{
  name: 'Feb',
  co2: 5.8
},
{
  name: 'Mar',
  co2: 7.5
},
{
  name: 'Apr',
  co2: 9.2
},
{
  name: 'May',
  co2: 11.0
},
{
  name: 'Jun',
  co2: 12.4
}];

const EcoChart = () => {
  return (
    <div className="glass p-5 mb-6 dark:bg-slate-800/80">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-bold text-slate-800 dark:text-slate-100">
          Impact Trends
        </h3>
        <select className="text-xs border-none bg-slate-100 dark:bg-slate-700 rounded-lg px-3 py-1.5 text-slate-600 dark:text-slate-300 outline-none font-medium">
          <option>Last 6 Months</option>
          <option>This Year</option>
        </select>
      </div>

      <div className="h-56 w-full mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{
              top: 10,
              right: 10,
              left: -20,
              bottom: 0
            }}>

            <defs>
              <linearGradient id="colorCo2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#e2e8f0"
              strokeOpacity={0.5} />

            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{
                fontSize: 10,
                fill: '#94a3b8'
              }}
              dy={10} />

            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{
                fontSize: 10,
                fill: '#94a3b8'
              }} />

            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                borderRadius: '12px',
                border: 'none',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                padding: '12px'
              }}
              itemStyle={{
                color: '#059669',
                fontSize: '13px',
                fontWeight: 'bold'
              }}
              labelStyle={{
                color: '#64748b',
                fontSize: '11px',
                marginBottom: '4px',
                fontWeight: '600'
              }}
              formatter={(value: number) => [`${value} kg`, 'CO₂ Saved']} />

            <Area
              type="monotone"
              dataKey="co2"
              stroke="#10b981"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorCo2)" />

          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-eco-50 dark:bg-eco-900/20 rounded-xl p-3 text-center">
          <div className="flex justify-center mb-1.5">
            <LeafIcon size={16} className="text-eco-600 dark:text-eco-400" />
          </div>
          <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
            2.1 kg
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
            Avg CO₂/mo
          </div>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-center">
          <div className="flex justify-center mb-1.5">
            <DropletIcon
              size={16}
              className="text-blue-600 dark:text-blue-400" />

          </div>
          <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
            58 L
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
            Avg Water/mo
          </div>
        </div>
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-3 text-center">
          <div className="flex justify-center mb-1.5">
            <TrashIcon
              size={16}
              className="text-orange-600 dark:text-orange-400" />

          </div>
          <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
            0.9 kg
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
            Avg Plastic/mo
          </div>
        </div>
      </div>
    </div>);

};
export default EcoChart;