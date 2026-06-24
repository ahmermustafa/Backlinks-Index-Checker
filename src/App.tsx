import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import AuditForm from './components/AuditForm';
import HistoryList from './components/HistoryList';
import StatsDashboard from './components/StatsDashboard';
import ChartsPanel from './components/ChartsPanel';
import ResultsTable from './components/ResultsTable';
import { exportToCSV, exportToExcel, exportToPDF } from './utils/export';
import { Job, Backlink, JobsListResponse, JobDetailsResponse, CreateJobResponse } from './types';
import { ShieldCheck, Activity, Info, RefreshCw, ServerCrash, Layers } from 'lucide-react';

export default function App() {
  const [apiKeyConfigured, setApiKeyConfigured] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [activeJobId, setActiveJobId] = useState<number | null>(null);
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const [backlinks, setBacklinks] = useState<Backlink[]>([]);
  
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Keep a ref of activeJob to prevent polling closures from being stale
  const activeJobRef = useRef<Job | null>(null);
  activeJobRef.current = activeJob;

  // 1. Fetch backend health and API key status on mount
  useEffect(() => {
    async function checkHealth() {
      try {
        const res = await fetch('/api/health');
        const data = await res.json();
        setApiKeyConfigured(data.apiKeyConfigured);
        setServerError(null);
      } catch (err) {
        console.error("Failed to connect to the full-stack server:", err);
        setServerError("Could not connect to the backend server. Please verify the Express dev server is running.");
      }
    }
    checkHealth();
  }, []);

  // 2. Fetch history on mount
  const fetchHistory = async (autoSelectLatest = false) => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch('/api/jobs');
      const data: JobsListResponse = await res.json();
      if (data.success) {
        setJobs(data.jobs);
        
        // Auto-select latest completed or active job if requested and none is active
        if (autoSelectLatest && data.jobs.length > 0 && !activeJobId) {
          const latestId = data.jobs[0].id;
          setActiveJobId(latestId);
          fetchJobDetails(latestId);
        }
      }
    } catch (err: any) {
      console.error("Failed to fetch jobs history:", err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory(true);
  }, []);

  // 3. Fetch single job details (including backlinks list)
  const fetchJobDetails = async (jobId: number) => {
    setIsLoadingDetails(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}`);
      const data: JobDetailsResponse = await res.json();
      if (data.success) {
        setActiveJob(data.job);
        setBacklinks(data.backlinks);
      }
    } catch (err) {
      console.error(`Failed to fetch job ${jobId} details:`, err);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  // 4. Handle creating a new verification job
  const handleSubmitAudit = async (urls: string[]) => {
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls })
      });
      const data: CreateJobResponse = await res.json();
      
      if (data.success) {
        // Set as active job and refresh list
        setActiveJobId(data.jobId);
        await fetchHistory(false);
        // Load details immediately
        fetchJobDetails(data.jobId);
      } else {
        alert(data.message || "Failed to create audit job");
      }
    } catch (err) {
      console.error("Failed to submit audit:", err);
      alert("A server error occurred while launching the audit.");
    }
  };

  // 5. Delete an audit job from history
  const handleDeleteJob = async (jobId: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid selecting the job as active
    if (!confirm("Are you sure you want to permanently delete this audit and all its backlink logs?")) {
      return;
    }

    try {
      const res = await fetch(`/api/jobs/${jobId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        // If we deleted the active job, reset the selected view
        if (activeJobId === jobId) {
          setActiveJobId(null);
          setActiveJob(null);
          setBacklinks([]);
        }
        // Refresh history list
        fetchHistory(false);
      }
    } catch (err) {
      console.error("Failed to delete job:", err);
    }
  };

  // 6. Polling effect: Poll details if active selected job is "processing"
  useEffect(() => {
    if (!activeJobId || !activeJob || activeJob.status !== 'processing') return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/jobs/${activeJobId}`);
        const data: JobDetailsResponse = await res.json();
        
        if (data.success) {
          setActiveJob(data.job);
          setBacklinks(data.backlinks);
          
          // If complete or failed, refresh history table to sync global records and stop polling
          if (data.job.status !== 'processing') {
            clearInterval(interval);
            fetchHistory(false);
          }
        }
      } catch (err) {
        console.error("Error during background polling:", err);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [activeJobId, activeJob?.status]);

  // Calculations for live progress bar
  const totalCount = activeJob?.total_urls || 0;
  const processedCount = activeJob 
    ? (activeJob.indexed_count + activeJob.not_indexed_count + activeJob.redirected_count + activeJob.error_count) 
    : 0;
  const progressPercent = totalCount > 0 ? Math.round((processedCount / totalCount) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50/50 font-sans flex flex-col text-slate-800" id="app-root-view">
      <Header apiKeyConfigured={apiKeyConfigured} />

      {serverError && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 w-full animate-fadeIn" id="server-error-banner">
          <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-center gap-3 text-rose-800 text-sm">
            <ServerCrash className="h-5 w-5 text-rose-600 shrink-0" />
            <div>
              <span className="font-bold block">Backend Offline Connection Warning</span>
              <span className="text-rose-700/90 font-medium">{serverError}</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Full-Stack Layout Canvas */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Setup Panel */}
        <section className="lg:col-span-4 space-y-6 flex flex-col" id="setup-section">
          {/* Form and Upload Container */}
          <AuditForm onSubmit={handleSubmitAudit} isProcessing={activeJob?.status === 'processing'} />

          {/* Past Run History */}
          <HistoryList
            jobs={jobs}
            activeJobId={activeJobId}
            onSelectJob={(id) => {
              setActiveJobId(id);
              fetchJobDetails(id);
            }}
            onDeleteJob={handleDeleteJob}
            onRefresh={() => fetchHistory(false)}
            isLoading={isLoadingHistory}
          />
        </section>

        {/* Right Side: Visual Reports & Logs */}
        <section className="lg:col-span-8 space-y-6 min-w-0" id="reports-section">
          {/* Active Checking Live Progress Tracker */}
          {activeJob && activeJob.status === 'processing' && (
            <div className="bg-slate-900 border border-slate-950 rounded-2xl p-6 text-white shadow-xl animate-fadeIn space-y-4" id="live-progress-bar-container">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <Activity className="h-5 w-5 text-emerald-400 animate-pulse" />
                  <div>
                    <h3 className="text-sm font-bold tracking-tight">Active Indexing Audit in Progress...</h3>
                    <p className="text-[11px] text-slate-400 font-medium">Batch #{activeJob.id} • Parallel checks using site:FULL_URL</p>
                  </div>
                </div>
                <div className="text-xs font-mono font-bold bg-white/10 px-2.5 py-1 rounded-md text-emerald-300 self-start sm:self-center">
                  {processedCount} / {totalCount} Checked ({progressPercent}%)
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-white/10 rounded-full h-3.5 overflow-hidden p-0.5 border border-white/5">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500 ease-out animate-pulse"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Real-time Indicator showing active checking backlink URL */}
              {activeJob.current_url && (
                <div className="bg-black/25 rounded-xl px-4 py-3 border border-white/5 flex items-start gap-2.5 animate-fadeIn">
                  <RefreshCw className="h-4 w-4 text-slate-400 animate-spin shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Verifying Google Indexing status:</span>
                    <span className="text-xs font-mono font-medium text-emerald-300 break-all leading-tight block mt-0.5">
                      {activeJob.current_url}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Selected Audit view (charts & table) or No-Data state */}
          {activeJob ? (
            <div className="space-y-6 animate-fadeIn" id="audit-details-view">
              {/* Header Info Banner */}
              <div className="bg-white rounded-2xl border border-slate-100 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="bg-slate-100 p-2 rounded-xl text-slate-700">
                    <Layers className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900 leading-snug">Audit Audit Logs: Batch #{activeJob.id}</h2>
                    <p className="text-xs text-slate-400 font-medium">Created on {new Date(activeJob.created_at).toLocaleString()}</p>
                  </div>
                </div>

                <div className="text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-full shrink-0">
                  Total backlinks checked: {activeJob.total_urls}
                </div>
              </div>

              {/* Metric Cards Grid */}
              <StatsDashboard job={activeJob} />

              {/* Recharts Analytics */}
              <ChartsPanel job={activeJob} />

              {/* Logs Table with Filters & Exports */}
              <ResultsTable
                job={activeJob}
                backlinks={backlinks}
                onExportCSV={exportToCSV}
                onExportExcel={exportToExcel}
                onExportPDF={exportToPDF}
              />
            </div>
          ) : (
            /* Dashboard Welcome State */
            <div className="bg-white rounded-3xl border border-slate-100 p-10 flex flex-col items-center justify-center text-center h-[540px] shadow-xs" id="empty-state-dashboard">
              <div className="bg-gradient-to-tr from-emerald-500/10 to-teal-500/10 p-5 rounded-full text-emerald-600 mb-6 border border-emerald-50 animate-bounce">
                <ShieldCheck className="h-10 w-10" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Setup Your Backlink Index Check</h2>
              <p className="text-slate-400 text-sm max-w-sm mt-2 font-medium leading-relaxed">
                SEO indexing checks use Google site search queries (<code className="font-mono text-slate-700 bg-slate-50 px-1 rounded-md text-xs">site:FULL_URL</code>) to verify live backlink statuses safely.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg mt-8 w-full border-t border-slate-50 pt-8">
                <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 text-left">
                  <div className="h-6 w-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold mb-2">1</div>
                  <h4 className="text-xs font-bold text-slate-800">Paste List</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Input up to 100 backlinks or drop a raw CSV file.</p>
                </div>
                <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 text-left">
                  <div className="h-6 w-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold mb-2">2</div>
                  <h4 className="text-xs font-bold text-slate-800">Google Grounding</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Gemini Search extracts live Google Index hits.</p>
                </div>
                <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 text-left">
                  <div className="h-6 w-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold mb-2">3</div>
                  <h4 className="text-xs font-bold text-slate-800">Export Reports</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Download index data directly in CSV, Excel, or PDF.</p>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
