import React from 'react';
import { BarChart3, PieChart as PieChartIcon } from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend
} from 'recharts';
import { Job } from '../types';

interface ChartsPanelProps {
  job: Job;
}

export default function ChartsPanel({ job }: ChartsPanelProps) {
  const chartData = [
    { name: 'Indexed ✅', value: job.indexed_count, color: '#10b981' },
    { name: 'Not Indexed ❌', value: job.not_indexed_count, color: '#f43f5e' },
    { name: 'Redirected ↪️', value: job.redirected_count, color: '#6366f1' },
    { name: 'Error / 404 ⚠️', value: job.error_count, color: '#f59e0b' },
  ];

  // Check if we have any data to render. If not, render placeholder values so the charts look nice but indicating 0.
  const hasData = job.total_urls > 0;
  const pieData = hasData 
    ? chartData.filter(d => d.value > 0)
    : [{ name: 'No Data', value: 1, color: '#cbd5e1' }];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="charts-panel-container">
      {/* 1. Donut Chart */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs flex flex-col h-[340px]">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4 shrink-0">
          <PieChartIcon className="h-4 w-4 text-emerald-500" />
          <span>Indexing Ratio</span>
        </h3>
        <div className="flex-1 min-h-0 relative flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={85}
                paddingAngle={4}
                dataKey="value"
                nameKey="name"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: any) => [hasData ? `${value} URLs` : '0 URLs', 'Count']}
                contentStyle={{ background: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
              />
            </PieChart>
          </ResponsiveContainer>
          
          {/* Central Percentage Display */}
          <div className="absolute text-center">
            <span className="block text-2xl font-black text-slate-900 leading-none">
              {job.total_urls > 0 ? Math.round((job.indexed_count / job.total_urls) * 100) : 0}%
            </span>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1 block">
              Indexed
            </span>
          </div>
        </div>

        {/* Legend Indicator list */}
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 pt-3 border-t border-slate-50 shrink-0 text-xs">
          {chartData.map((d, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }}></span>
              <span className="text-slate-500 font-medium">
                {d.name.split(' ')[0]}: <strong className="text-slate-800">{d.value}</strong>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Bar Chart */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs flex flex-col h-[340px]">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4 shrink-0">
          <BarChart3 className="h-4 w-4 text-emerald-500" />
          <span>Category Breakdown</span>
        </h3>
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
            >
              <XAxis 
                dataKey="name" 
                tickLine={false} 
                axisLine={false}
                tick={{ fill: '#64748b', fontSize: 10, fontWeight: 500 }}
              />
              <YAxis 
                allowDecimals={false}
                tickLine={false} 
                axisLine={false}
                tick={{ fill: '#64748b', fontSize: 10 }}
              />
              <Tooltip 
                cursor={{ fill: 'rgba(241, 245, 249, 0.5)' }}
                contentStyle={{ background: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                formatter={(value: any) => [`${value} URLs`, 'Count']}
              />
              <Bar 
                dataKey="value" 
                radius={[6, 6, 0, 0]}
                maxBarSize={38}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
