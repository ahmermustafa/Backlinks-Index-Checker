import React from 'react';
import { Files, CheckCircle2, XCircle, ArrowUpRight, AlertTriangle, Percent } from 'lucide-react';
import { Job } from '../types';

interface StatsDashboardProps {
  job: Job;
}

export default function StatsDashboard({ job }: StatsDashboardProps) {
  const indexRate = job.total_urls > 0 
    ? Math.round((job.indexed_count / job.total_urls) * 100) 
    : 0;

  const getPercentage = (count: number) => {
    return job.total_urls > 0 ? Math.round((count / job.total_urls) * 100) : 0;
  };

  const cards = [
    {
      id: 'stat-total',
      title: 'Total URLs',
      value: job.total_urls,
      desc: 'Audit batch size',
      icon: Files,
      colorClass: 'bg-slate-50 border-slate-100 text-slate-700',
      iconColor: 'text-slate-500 bg-slate-100/80',
    },
    {
      id: 'stat-indexed',
      title: 'Indexed',
      value: job.indexed_count,
      desc: `${getPercentage(job.indexed_count)}% of batch`,
      icon: CheckCircle2,
      colorClass: 'bg-emerald-50/50 border-emerald-100 text-emerald-950',
      iconColor: 'text-emerald-600 bg-emerald-100/80',
    },
    {
      id: 'stat-not-indexed',
      title: 'Not Indexed',
      value: job.not_indexed_count,
      desc: `${getPercentage(job.not_indexed_count)}% of batch`,
      icon: XCircle,
      colorClass: 'bg-rose-50/40 border-rose-100 text-rose-950',
      iconColor: 'text-rose-600 bg-rose-100/80',
    },
    {
      id: 'stat-redirected',
      title: 'Redirected',
      value: job.redirected_count,
      desc: `${getPercentage(job.redirected_count)}% of batch`,
      icon: ArrowUpRight,
      colorClass: 'bg-indigo-50/40 border-indigo-100 text-indigo-950',
      iconColor: 'text-indigo-600 bg-indigo-100/80',
    },
    {
      id: 'stat-errors',
      title: 'Errors / 404',
      value: job.error_count,
      desc: `${getPercentage(job.error_count)}% of batch`,
      icon: AlertTriangle,
      colorClass: 'bg-amber-50/40 border-amber-100 text-amber-950',
      iconColor: 'text-amber-600 bg-amber-100/80',
    },
    {
      id: 'stat-rate',
      title: 'Index Rate',
      value: `${indexRate}%`,
      desc: 'Success benchmark',
      icon: Percent,
      colorClass: 'bg-gradient-to-tr from-slate-900 to-slate-800 border-slate-950 text-white shadow-md shadow-slate-900/5',
      iconColor: 'text-teal-400 bg-white/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-6 gap-4" id="stats-dashboard-grid">
      {cards.map((card) => {
        const IconComponent = card.icon;
        const isDark = card.id === 'stat-rate';

        return (
          <div
            key={card.id}
            id={card.id}
            className={`rounded-2xl border p-4 flex flex-col justify-between transition-all ${card.colorClass}`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-400'}`}>
                {card.title}
              </span>
              <div className={`p-1.5 rounded-lg shrink-0 ${card.iconColor}`}>
                <IconComponent className="h-4 w-4" />
              </div>
            </div>

            <div>
              <div className="text-2xl font-black tracking-tight mb-0.5">
                {card.value}
              </div>
              <p className={`text-[10px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {card.desc}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
