import React, { useEffect, useMemo, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { LeafIcon, DropletIcon, TrashIcon } from 'lucide-react';
import { impactApi } from '@shared/api';
import type { ImpactSummary } from '@shared/api';

const EcoChart = () => {
  const [summary, setSummary] = useState<ImpactSummary | null>(null);
  const [chartData, setChartData] = useState<Array<{ name: string; co2: number }>>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [impact, trends] = await Promise.all([impactApi.summary(), impactApi.trends()]);
        if (cancelled) return;
        setSummary(impact);
        setChartData(trends.months.map((month) => ({ name: month.name, co2: month.co2 })));
      } catch {
        if (!cancelled) {
          setSummary(null);
          setChartData([]);
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const averages = useMemo(() => {
    const months = chartData.length || 1;
    const avgCo2 = chartData.reduce((sum, row) => sum + row.co2, 0) / months;
    const avgWater = (summary?.waterSavedLitres ?? 0) / months;
    const avgPlastic = (summary?.plasticKgReduced ?? 0) / months;
    return { avgCo2, avgWater, avgPlastic };
  }, [chartData, summary]);

  return (
    <div className="glass p-5 mb-6 dark:bg-slate-800/80">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-bold text-slate-800 dark:text-slate-100">Impact Trends</h3>
        <span className="text-xs bg-slate-100 dark:bg-slate-700 rounded-lg px-3 py-1.5 text-slate-600 dark:text-slate-300 font-medium">
          Last 6 Months
        </span>
      </div>

      <div className="h-56 w-full mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData.length ? chartData : [{ name: '—', co2: 0 }]}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorCo2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.5} />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
            <Tooltip
              formatter={(value: number) => [`${value.toFixed(1)} kg`, 'CO₂ Saved']}
            />
            <Area type="monotone" dataKey="co2" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorCo2)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-eco-50 dark:bg-eco-900/20 rounded-xl p-3 text-center">
          <div className="flex justify-center mb-1.5">
            <LeafIcon size={16} className="text-eco-600 dark:text-eco-400" />
          </div>
          <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
            {averages.avgCo2.toFixed(1)} kg
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Avg CO₂/mo</div>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-center">
          <div className="flex justify-center mb-1.5">
            <DropletIcon size={16} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
            {Math.round(averages.avgWater)} L
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Avg Water/mo</div>
        </div>
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-3 text-center">
          <div className="flex justify-center mb-1.5">
            <TrashIcon size={16} className="text-orange-600 dark:text-orange-400" />
          </div>
          <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
            {averages.avgPlastic.toFixed(1)} kg
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Avg Plastic/mo</div>
        </div>
      </div>
    </div>
  );
};

export default EcoChart;
