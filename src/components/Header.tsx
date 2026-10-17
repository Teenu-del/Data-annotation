import React from 'react';
import { ShieldCheck, Sparkles, AlertCircle, Database, CheckCircle2 } from 'lucide-react';
import { AISettings, Dataset } from '../types';

interface HeaderProps {
  activeDataset?: Dataset;
  aiSettings: AISettings;
  onOpenSettings: () => void;
  onOpenUpload: () => void;
  onRunChecks: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeDataset,
  aiSettings,
  onOpenSettings,
  onOpenUpload,
  onRunChecks,
}) => {
  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Brand & Context */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center text-white shadow-sm">
            <ShieldCheck className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-slate-900 tracking-tight text-base">Vattara DataGuard AI</span>
              <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-600 rounded border border-slate-200">
                v1.2 SaaS
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">Enterprise Data Quality & Annotation Verification</p>
          </div>
        </div>

        {/* Active Dataset Pill */}
        {activeDataset && (
          <div className="hidden lg:flex items-center space-x-2 pl-4 border-l border-slate-200">
            <Database className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs text-slate-500">Active:</span>
            <span className="text-xs font-semibold text-slate-800 max-w-[200px] truncate" title={activeDataset.name}>
              {activeDataset.name}
            </span>
            {activeDataset.isSample && (
              <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.2 rounded font-medium">
                Demo Data
              </span>
            )}
            <span className="text-xs text-slate-400">({activeDataset.rowCount} rows)</span>
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-3">
        {/* AI Status Badge */}
        <button
          onClick={onOpenSettings}
          title={aiSettings.isConfigured ? 'AI Verification Model is configured' : 'AI Verification Model is not configured'}
          className={`flex items-center space-x-1.5 text-xs px-2.5 py-1.5 rounded-md border transition-colors ${
            aiSettings.isConfigured
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
          }`}
        >
          {aiSettings.isConfigured ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span className="font-medium">AI Active (Gemini)</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-medium">AI Not Configured</span>
            </>
          )}
        </button>

        {/* Quick Upload Button */}
        <button
          onClick={onOpenUpload}
          className="text-xs font-medium px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50 transition-colors shadow-xs"
        >
          Upload CSV
        </button>

        {/* Run Checks Quick Action */}
        <button
          onClick={onRunChecks}
          className="flex items-center space-x-1.5 text-xs font-semibold px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors shadow-xs"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Run Quality Checks</span>
        </button>
      </div>
    </header>
  );
};
