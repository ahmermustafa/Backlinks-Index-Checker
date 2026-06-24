import React from 'react';
import { ShieldCheck, Server, AlertCircle } from 'lucide-react';

interface HeaderProps {
  apiKeyConfigured: boolean;
}

export default function Header({ apiKeyConfigured }: HeaderProps) {
  return (
    <header className="border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-40" id="app-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-emerald-500 to-teal-600 p-2.5 rounded-xl text-white shadow-md shadow-emerald-500/10">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Backlink Index Checker</h1>
            <p className="text-xs text-slate-500 font-medium">Verify Google indexation status for backlinks instantly</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shadow-xs ${
            apiKeyConfigured 
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/50' 
              : 'bg-amber-50 text-amber-700 border border-amber-200/50'
          }`}>
            <Server className="h-3.5 w-3.5" />
            <span>Gemini Search Engine:</span>
            <span className="flex h-2 w-2 relative">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                apiKeyConfigured ? 'bg-emerald-400' : 'bg-amber-400'
              }`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${
                apiKeyConfigured ? 'bg-emerald-500' : 'bg-amber-500'
              }`}></span>
            </span>
            <span>{apiKeyConfigured ? 'Connected' : 'Missing API Key'}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
