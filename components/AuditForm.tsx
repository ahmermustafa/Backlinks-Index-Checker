import React, { useState, useRef } from 'react';
import { PlusCircle, UploadCloud, Clipboard, X, RefreshCw, AlertCircle } from 'lucide-react';

interface AuditFormProps {
  onSubmit: (urls: string[]) => void;
  isProcessing: boolean;
}

export default function AuditForm({ onSubmit, isProcessing }: AuditFormProps) {
  const [pastedText, setPastedText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse and analyze lines in real-time
  const lines = pastedText
    .split(/[\r\n]+/)
    .map(l => l.trim())
    .filter(Boolean);

  const uniqueUrls = Array.from(new Set(lines)) as string[];
  const duplicateCount = lines.length - uniqueUrls.length;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      // Extract raw strings that look like URLs or domains, splitting by commas, tabs, semicolons, or newlines
      const parsedUrls = text
        .split(/[\r\n,;\t]+/)
        .map(item => item.trim())
        .filter(item => {
          if (!item) return false;
          // Basic check: should have a dot and look like a URL or domain
          return item.includes('.') && item.length > 3;
        });

      if (parsedUrls.length === 0) {
        setError('No valid URLs found in the uploaded file.');
        return;
      }

      setError(null);
      const combined = [...lines, ...parsedUrls];
      const uniqueCombined = Array.from(new Set(combined)) as string[];
      setPastedText(uniqueCombined.join('\n'));
    };

    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (uniqueUrls.length === 0) {
      setError('Please provide at least one URL to check.');
      return;
    }

    if (uniqueUrls.length > 100) {
      setError(`Maximum limit is 100 URLs per audit. You have submitted ${uniqueUrls.length} unique URLs.`);
      return;
    }

    onSubmit(uniqueUrls);
    setPastedText('');
  };

  const clearForm = () => {
    setPastedText('');
    setError(null);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs" id="audit-form-container">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <PlusCircle className="h-5 w-5 text-emerald-500" />
          <span>New Index Check</span>
        </h2>
        {pastedText && (
          <button
            onClick={clearForm}
            type="button"
            className="text-xs text-slate-400 hover:text-slate-600 font-medium flex items-center gap-1 transition-colors"
          >
            <X className="h-3 w-3" />
            <span>Clear Input</span>
          </button>
        )}
      </div>

      <form onSubmit={handleFormSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Paste Backlink URLs (One per line)
          </label>
          <div className="relative">
            <textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="https://external-blog.com/seo-article&#10;https://partner-site.org/backlink-page&#10;example.com/blog/page"
              rows={6}
              disabled={isProcessing}
              className="w-full text-sm font-mono p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-slate-50/50 focus:bg-white transition-all resize-y placeholder:text-slate-400 focus:outline-hidden"
              id="url-textarea"
            />
          </div>
        </div>

        {/* Drag and Drop File Input Area */}
        <div className="flex items-center justify-center w-full">
          <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-slate-200 border-dashed rounded-xl cursor-pointer bg-slate-50/20 hover:bg-slate-50 transition-all">
            <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
              <UploadCloud className="h-6 w-6 text-slate-400 mb-1" />
              <p className="text-xs text-slate-600 font-medium">
                <span className="text-emerald-600 font-semibold">Click to upload</span> or drag CSV / TXT list
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Deduplicated automatically</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleFileUpload}
              className="hidden"
              disabled={isProcessing}
            />
          </label>
        </div>

        {/* Live helper stats */}
        {lines.length > 0 && (
          <div className="bg-slate-50/80 rounded-xl p-3.5 space-y-2 text-xs text-slate-600 border border-slate-100 animate-fadeIn">
            <div className="flex justify-between items-center font-medium">
              <span>Total lines entered:</span>
              <span className="text-slate-900 font-semibold">{lines.length}</span>
            </div>
            <div className="flex justify-between items-center font-medium">
              <span>Unique, validated URLs:</span>
              <span className={`font-bold ${uniqueUrls.length > 100 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {uniqueUrls.length} / 100
              </span>
            </div>
            {duplicateCount > 0 && (
              <div className="flex justify-between items-center text-[11px] text-amber-600 font-medium">
                <span>Duplicate URLs skipped:</span>
                <span>-{duplicateCount}</span>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 text-xs text-rose-600 bg-rose-50 border border-rose-100 p-3 rounded-xl animate-shake">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isProcessing || uniqueUrls.length === 0 || uniqueUrls.length > 100}
          className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 text-white disabled:text-slate-400 py-3 rounded-xl font-bold text-sm shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
          id="submit-audit-btn"
        >
          {isProcessing ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Analyzing Backlinks...</span>
            </>
          ) : (
            <>
              <Clipboard className="h-4 w-4" />
              <span>Verify {uniqueUrls.length > 0 ? `${uniqueUrls.length} URLs` : 'Backlinks'}</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
