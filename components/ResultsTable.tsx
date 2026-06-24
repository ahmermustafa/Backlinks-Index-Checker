import React, { useState } from 'react';
import { Search, Download, ChevronLeft, ChevronRight, CheckCircle2, XCircle, ArrowUpRight, AlertTriangle, FileSpreadsheet, FileText, FileDown } from 'lucide-react';
import { Backlink, Job } from '../types';

interface ResultsTableProps {
  job: Job;
  backlinks: Backlink[];
  onExportCSV: (backlinks: Backlink[]) => void;
  onExportExcel: (backlinks: Backlink[]) => void;
  onExportPDF: (job: Job, backlinks: Backlink[]) => void;
}

type FilterType = 'all' | 'indexed' | 'not_indexed' | 'redirected' | 'errors';

export default function ResultsTable({
  job,
  backlinks,
  onExportCSV,
  onExportExcel,
  onExportPDF
}: ResultsTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // 1. Filter backlinks by Search Term and Status Tabs
  const filteredBacklinks = backlinks.filter((item) => {
    const matchesSearch = item.url.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesFilter = true;
    const statusLower = item.index_status.toLowerCase();
    
    if (activeFilter === 'indexed') {
      matchesFilter = statusLower.includes('indexed') && !statusLower.includes('not indexed');
    } else if (activeFilter === 'not_indexed') {
      matchesFilter = statusLower.includes('not indexed') || statusLower.includes('not found');
    } else if (activeFilter === 'redirected') {
      matchesFilter = statusLower.includes('redirected');
    } else if (activeFilter === 'errors') {
      matchesFilter = statusLower.includes('error');
    }

    return matchesSearch && matchesFilter;
  });

  // 2. Pagination Calculations
  const totalPages = Math.ceil(filteredBacklinks.length / itemsPerPage) || 1;
  const paginatedBacklinks = filteredBacklinks.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes('indexed') && !s.includes('not indexed')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          <span>Indexed</span>
        </span>
      );
    } else if (s.includes('not indexed')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-100">
          <XCircle className="h-3.5 w-3.5 shrink-0" />
          <span>Not Indexed</span>
        </span>
      );
    } else if (s.includes('redirected')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
          <ArrowUpRight className="h-3.5 w-3.5 shrink-0" />
          <span>Redirected</span>
        </span>
      );
    } else if (s.includes('not found')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-100">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>Not Found (404)</span>
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-50 text-slate-600 border border-slate-100">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>Error</span>
        </span>
      );
    }
  };

  const getHttpStatusBadge = (code: number | null) => {
    if (!code) return <span className="text-xs font-mono text-slate-400">—</span>;
    let colorClass = 'bg-slate-50 text-slate-600 border-slate-100';
    if (code >= 200 && code < 300) colorClass = 'bg-emerald-50 text-emerald-700 border-emerald-100';
    else if (code >= 300 && code < 400) colorClass = 'bg-indigo-50 text-indigo-700 border-indigo-100';
    else if (code === 404) colorClass = 'bg-amber-50 text-amber-700 border-amber-100';
    else if (code >= 400) colorClass = 'bg-rose-50 text-rose-700 border-rose-100';

    return (
      <span className={`inline-flex px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold border ${colorClass}`}>
        {code}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs space-y-6" id="results-table-container">
      {/* Search, Filter Tabs & Export Buttons */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search backlink URLs..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full text-sm pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-slate-50/50 focus:bg-white transition-all focus:outline-hidden"
          />
        </div>

        {/* Filter & Export toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Export Panel */}
          <div className="flex items-center gap-1.5 border border-slate-100 bg-slate-50/50 p-1 rounded-xl">
            <button
              onClick={() => onExportCSV(filteredBacklinks)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-white hover:text-slate-900 transition-all shadow-xs border border-transparent hover:border-slate-100 cursor-pointer"
              title="Export filtered to CSV"
            >
              <FileDown className="h-3.5 w-3.5 text-slate-500" />
              <span>CSV</span>
            </button>
            <button
              onClick={() => onExportExcel(filteredBacklinks)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-white hover:text-slate-900 transition-all shadow-xs border border-transparent hover:border-slate-100 cursor-pointer"
              title="Export filtered to Excel"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
              <span>Excel</span>
            </button>
            <button
              onClick={() => onExportPDF(job, filteredBacklinks)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-white hover:text-slate-900 transition-all shadow-xs border border-transparent hover:border-slate-100 cursor-pointer"
              title="Export filtered to PDF"
            >
              <FileText className="h-3.5 w-3.5 text-rose-600" />
              <span>PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2 overflow-x-auto scrollbar-none">
        {(['all', 'indexed', 'not_indexed', 'redirected', 'errors'] as FilterType[]).map((filter) => {
          const isActive = activeFilter === filter;
          const count = backlinks.filter((item) => {
            const statusLower = item.index_status.toLowerCase();
            if (filter === 'all') return true;
            if (filter === 'indexed') return statusLower.includes('indexed') && !statusLower.includes('not indexed');
            if (filter === 'not_indexed') return statusLower.includes('not indexed') || statusLower.includes('not found');
            if (filter === 'redirected') return statusLower.includes('redirected');
            if (filter === 'errors') return statusLower.includes('error');
            return false;
          }).length;

          const label = filter === 'all' ? 'All Backlinks' 
                      : filter === 'indexed' ? 'Indexed ✅' 
                      : filter === 'not_indexed' ? 'Not Indexed ❌' 
                      : filter === 'redirected' ? 'Redirected ↪️' 
                      : 'Errors ❌';

          return (
            <button
              key={filter}
              onClick={() => {
                setActiveFilter(filter);
                setCurrentPage(1);
              }}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-950 hover:bg-slate-50'
              }`}
            >
              <span>{label}</span>
              <span className={`ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Table Element */}
      <div className="overflow-x-auto border border-slate-100 rounded-2xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Target Backlink URL</th>
              <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider w-40">Google Status</th>
              <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider w-28 text-center">HTTP Code</th>
              <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider w-44">Redirect?</th>
              <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider w-36">Audited At</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 text-sm">
            {paginatedBacklinks.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-slate-400 font-medium">
                  No backlinks match the current filters.
                </td>
              </tr>
            ) : (
              paginatedBacklinks.map((item) => {
                return (
                  <tr key={item.id} className="hover:bg-slate-50/40 transition-colors">
                    <td className="px-5 py-4 max-w-md xl:max-w-xl">
                      <div className="flex flex-col">
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-slate-900 hover:text-emerald-600 truncate font-mono text-xs flex items-center gap-1"
                        >
                          {item.url}
                        </a>
                        {item.redirect_url && (
                          <span className="text-[10px] font-mono text-indigo-500 truncate mt-0.5 flex items-center gap-1">
                            ↪ {item.redirect_url}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {getStatusBadge(item.index_status)}
                    </td>
                    <td className="px-5 py-4 text-center">
                      {getHttpStatusBadge(item.http_status)}
                    </td>
                    <td className="px-5 py-4">
                      {item.redirect_url ? (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                          Yes
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-slate-400">No</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-slate-500 text-xs font-medium">
                      {new Date(item.checked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 border-t border-slate-50">
          <p className="text-xs text-slate-500 font-medium">
            Showing <strong className="text-slate-800">{(currentPage - 1) * itemsPerPage + 1}</strong> to <strong className="text-slate-800">{Math.min(currentPage * itemsPerPage, filteredBacklinks.length)}</strong> of <strong className="text-slate-800">{filteredBacklinks.length}</strong> checked backlinks
          </p>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-2 border border-slate-200 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            
            <div className="flex items-center gap-1 text-xs font-semibold text-slate-700">
              <span className="px-3 py-1.5 bg-slate-50 border border-slate-200/50 rounded-lg text-slate-900">{currentPage}</span>
              <span className="text-slate-400">/</span>
              <span className="px-1.5">{totalPages}</span>
            </div>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-2 border border-slate-200 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
