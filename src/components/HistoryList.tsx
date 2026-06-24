import React from 'react';
import { History, Calendar, Trash2, ChevronRight, Activity, RotateCw } from 'lucide-react';
import { Job } from '../types';

interface HistoryListProps {
  jobs: Job[];
  activeJobId: number | null;
  onSelectJob: (jobId: number) => void;
  onDeleteJob: (jobId: number, e: React.MouseEvent) => void;
  onRefresh: () => void;
  isLoading: boolean;
}

export default function HistoryList({
  jobs,
  activeJobId,
  onSelectJob,
  onDeleteJob,
  onRefresh,
  isLoading
}: HistoryListProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs flex flex-col h-full" id="history-container">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <History className="h-5 w-5 text-emerald-500" />
          <span>Audit History</span>
        </h2>
        <button
          onClick={onRefresh}
          disabled={isLoading}
          type="button"
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-50 cursor-pointer"
          title="Refresh history list"
        >
          <RotateCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 max-h-[340px] pr-1 scrollbar-thin">
        {jobs.length === 0 ? (
          <div className="text-center py-8 px-4 border border-dashed border-slate-100 rounded-xl">
            <p className="text-sm text-slate-400 font-medium">No previous audits found.</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Submit your backlink URLs to create your first audit report.</p>
          </div>
        ) : (
          jobs.map((job) => {
            const isSelected = activeJobId === job.id;
            const date = new Date(job.created_at);
            const indexRate = job.total_urls > 0 
              ? Math.round((job.indexed_count / job.total_urls) * 100) 
              : 0;

            let statusBadge = (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                Completed
              </span>
            );

            if (job.status === 'processing') {
              statusBadge = (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100 animate-pulse">
                  <Activity className="h-2.5 w-2.5 animate-spin" />
                  Checking
                </span>
              );
            } else if (job.status === 'failed') {
              statusBadge = (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-100">
                  Failed
                </span>
              );
            }

            return (
              <div
                key={job.id}
                onClick={() => onSelectJob(job.id)}
                className={`group flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 border-slate-900 text-white shadow-md shadow-slate-900/10'
                    : 'bg-slate-50/50 hover:bg-slate-50 border-slate-100 text-slate-700'
                }`}
              >
                <div className="flex-1 min-w-0 pr-3">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className={`text-[10px] font-mono font-bold tracking-wider uppercase ${isSelected ? 'text-slate-400' : 'text-slate-400'}`}>
                      Batch #{job.id}
                    </span>
                    {statusBadge}
                  </div>

                  <div className="flex items-center gap-1 text-xs mb-1">
                    <Calendar className="h-3 w-3 opacity-60 shrink-0" />
                    <span className="truncate opacity-90 font-medium">
                      {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] opacity-80 font-medium">
                    <span>URLs: <strong className={isSelected ? 'text-white' : 'text-slate-900'}>{job.total_urls}</strong></span>
                    {job.status === 'completed' && (
                      <>
                        <span>•</span>
                        <span>Index Rate: <strong className={isSelected ? 'text-emerald-400' : 'text-emerald-600'}>{indexRate}%</strong></span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={(e) => onDeleteJob(job.id, e)}
                    className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? 'text-slate-400 hover:text-rose-400 hover:bg-white/10 border-white/10'
                        : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 border-transparent hover:border-rose-100'
                    }`}
                    title="Delete audit report"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  <ChevronRight className={`h-4 w-4 opacity-40 transition-transform ${isSelected ? 'translate-x-0.5' : 'group-hover:translate-x-0.5'}`} />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
