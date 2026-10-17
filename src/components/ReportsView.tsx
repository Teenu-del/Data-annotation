import React from 'react';
import {
  FileBarChart2,
  Download,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Clock,
  ShieldCheck,
  Building,
} from 'lucide-react';
import { Dataset, QualityIssue } from '../types';
import { exportCleanedDatasetCSV, exportIssuesCSV } from '../utils/exportUtils';

interface ReportsViewProps {
  datasets: Dataset[];
  issues: QualityIssue[];
  activeDataset?: Dataset;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  datasets,
  issues,
  activeDataset,
}) => {
  // Real calculations
  const totalDatasets = datasets.length;
  const auditedDatasets = datasets.filter((d) => d.lastScannedAt);
  const totalRecords = auditedDatasets.reduce((acc, d) => acc + d.rowCount, 0);
  const totalIssues = issues.length;
  const confirmedIssues = issues.filter((i) => i.reviewStatus === 'confirmed');
  const rejectedIssues = issues.filter((i) => i.reviewStatus === 'rejected');
  const pendingIssues = issues.filter((i) => i.reviewStatus === 'pending');

  const cleanlinessScore =
    totalRecords > 0
      ? Math.max(0, Math.min(100, Math.round(((totalRecords - totalIssues) / totalRecords) * 100)))
      : 100;

  const resolutionRate =
    totalIssues > 0
      ? Math.round(((confirmedIssues.length + rejectedIssues.length) / totalIssues) * 100)
      : 100;

  // Active dataset specific issues
  const activeDatasetIssues = activeDataset
    ? issues.filter((i) => i.datasetId === activeDataset.id)
    : [];
  const activeDatasetConfirmed = activeDatasetIssues.filter((i) => i.reviewStatus === 'confirmed');

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Data Quality & Compliance Reports</h1>
          <p className="text-sm text-slate-500 mt-1">
            Download audit logs, export verified clean datasets, and review executive compliance summaries.
          </p>
        </div>
      </div>

      {/* Summary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Cleanliness Score
          </span>
          <p className="text-3xl font-bold text-slate-900 mt-2">{cleanlinessScore}%</p>
          <p className="text-xs text-slate-500 mt-1">
            Calculated across {totalRecords} audited rows
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Resolution Velocity
          </span>
          <p className="text-3xl font-bold text-blue-600 mt-2">{resolutionRate}%</p>
          <p className="text-xs text-slate-500 mt-1">
            {confirmedIssues.length + rejectedIssues.length} resolved of {totalIssues} flagged
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Confirmed Corrections
          </span>
          <p className="text-3xl font-bold text-emerald-600 mt-2">{confirmedIssues.length}</p>
          <p className="text-xs text-slate-500 mt-1">Applied to cleaned export</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Unresolved Queue
          </span>
          <p className="text-3xl font-bold text-amber-600 mt-2">{pendingIssues.length}</p>
          <p className="text-xs text-slate-500 mt-1">Awaiting human reviewer sign-off</p>
        </div>
      </div>

      {/* Export Station Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Issue Audit Log CSV */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-2.5 bg-rose-50 text-rose-700 rounded-lg">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Issue Audit Log Export (CSV)</h3>
                <span className="text-xs text-slate-500">Comprehensive defect records & human review notes</span>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mt-2">
              Exports full ledger of all {issues.length} detected quality anomalies across datasets, including original raw values, suggested corrections, auditor notes, and review timestamps.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs font-mono text-slate-500">{issues.length} defect rows</span>
            <button
              disabled={issues.length === 0}
              onClick={() => exportIssuesCSV(issues, activeDataset?.name || 'all_datasets')}
              className="flex items-center space-x-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-colors shadow-xs disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>Download Issues CSV</span>
            </button>
          </div>
        </div>

        {/* Card 2: Cleaned Dataset CSV */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-lg">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Cleaned Dataset Export (CSV)</h3>
                <span className="text-xs text-slate-500">
                  {activeDataset ? activeDataset.name : 'Select active dataset'}
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mt-2">
              Exports the dataset with all confirmed human corrections substituted into the records and confirmed redundant duplicate rows safely removed.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs font-mono text-slate-500">
              {activeDataset ? `${activeDataset.rowCount} source rows · ${activeDatasetConfirmed.length} corrections applied` : 'No dataset'}
            </span>
            <button
              disabled={!activeDataset}
              onClick={() => {
                if (activeDataset) {
                  exportCleanedDatasetCSV(activeDataset, issues);
                }
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors shadow-xs disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>Download Cleaned CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Audit Trail Summary Breakdown */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
          Enterprise Audit Trail & Quality Certificate
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-xs text-slate-500 font-semibold block">Data Integrity Verification</span>
            <p className="text-sm font-bold text-slate-900 mt-1">Vattara Rule Engine v1.2</p>
            <p className="text-[11px] text-slate-500 mt-1">
              Deterministic AST-free parsing without third-party LLM hallucination risk.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-xs text-slate-500 font-semibold block">Human Oversight Standard</span>
            <p className="text-sm font-bold text-slate-900 mt-1">Dual-Confirmation Required</p>
            <p className="text-[11px] text-slate-500 mt-1">
              Raw values preserved in immutable state; corrections explicitly signed off.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-xs text-slate-500 font-semibold block">Multi-Industry Taxonomy</span>
            <p className="text-sm font-bold text-slate-900 mt-1">Retail · Real Estate · MFG · CS</p>
            <p className="text-[11px] text-slate-500 mt-1">
              Supports schema extension for visual bounding boxes and domain lexicons.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
