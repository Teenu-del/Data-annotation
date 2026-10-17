import React from 'react';
import {
  Database,
  ScanLine,
  AlertTriangle,
  Clock,
  CheckCircle2,
  TrendingUp,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Building,
  Layers,
  Image as ImageIcon,
  Mic,
  Video as VideoIcon,
  FileText,
} from 'lucide-react';
import { Dataset, QualityIssue } from '../types';
import { NavTab } from './Sidebar';
import { ModalityBadge } from './multimodal/ModalityBadge';

interface DashboardViewProps {
  datasets: Dataset[];
  issues: QualityIssue[];
  onNavigate: (tab: NavTab) => void;
  onSelectDataset: (dataset: Dataset) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  datasets,
  issues,
  onNavigate,
  onSelectDataset,
}) => {
  // Real calculations
  const totalDatasets = datasets.length;
  const scannedDatasets = datasets.filter((d) => d.lastScannedAt);
  const totalRecordsScanned = scannedDatasets.reduce((acc, d) => acc + d.rowCount, 0);
  const totalIssues = issues.length;
  const pendingReviews = issues.filter((i) => i.reviewStatus === 'pending').length;
  const confirmedCorrections = issues.filter((i) => i.reviewStatus === 'confirmed').length;
  const rejectedFlags = issues.filter((i) => i.reviewStatus === 'rejected').length;

  const cleanlinessScore =
    totalRecordsScanned > 0
      ? Math.max(0, Math.min(100, Math.round(((totalRecordsScanned - totalIssues) / totalRecordsScanned) * 100)))
      : 100;

  // Real issues by type
  const issueCountsByType = {
    invalid_bounding_box: issues.filter((i) => i.issueType === 'invalid_bounding_box').length,
    temporal_timestamp_error: issues.filter((i) => i.issueType === 'temporal_timestamp_error').length,
    missing_media_file: issues.filter((i) => i.issueType === 'missing_media_file').length,
    audio_duration_mismatch: issues.filter((i) => i.issueType === 'audio_duration_mismatch').length,
    missing_value: issues.filter((i) => i.issueType === 'missing_value').length,
    duplicate_row: issues.filter((i) => i.issueType === 'duplicate_row').length,
    duplicate_id: issues.filter((i) => i.issueType === 'duplicate_id').length,
    invalid_numeric: issues.filter((i) => i.issueType === 'invalid_numeric').length,
    inconsistent_category: issues.filter((i) => i.issueType === 'inconsistent_category').length,
    annotation_mismatch: issues.filter((i) => i.issueType === 'annotation_mismatch').length,
  };

  // Modality statistics
  const modalityStats = {
    text: datasets.filter((d) => d.modality === 'text'),
    image: datasets.filter((d) => d.modality === 'image'),
    audio: datasets.filter((d) => d.modality === 'audio'),
    video: datasets.filter((d) => d.modality === 'video'),
  };

  // Real issues by severity
  const criticalCount = issues.filter((i) => i.severity === 'critical').length;
  const highCount = issues.filter((i) => i.severity === 'high').length;
  const mediumCount = issues.filter((i) => i.severity === 'medium').length;
  const lowCount = issues.filter((i) => i.severity === 'low').length;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Top Welcome & KPI Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Enterprise Multimodal Quality Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time audit metrics across <strong>Text</strong>, <strong>Image Vision</strong>, <strong>Audio Speech</strong>, and <strong>Video</strong> datasets.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => onNavigate('datasets')}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors shadow-xs"
          >
            Manage Datasets
          </button>
          <button
            onClick={() => onNavigate('run_checks')}
            className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Audit All Datasets</span>
          </button>
        </div>
      </div>

      {/* 4 Core Application Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Datasets */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Datasets</span>
            <div className="p-2 bg-slate-100 rounded-lg text-slate-700">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-bold text-slate-900">{totalDatasets}</span>
            <p className="text-xs text-slate-500 mt-1">
              {scannedDatasets.length} audited · {totalDatasets - scannedDatasets.length} awaiting scan
            </p>
          </div>
        </div>

        {/* Records Scanned */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Records Scanned</span>
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <ScanLine className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-bold text-slate-900">{totalRecordsScanned.toLocaleString()}</span>
            <p className="text-xs text-slate-500 mt-1">Across all media & tabular pipelines</p>
          </div>
        </div>

        {/* Detected Issues */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Detected Issues</span>
            <div className="p-2 bg-rose-50 rounded-lg text-rose-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-bold text-slate-900">{totalIssues}</span>
              {criticalCount > 0 && (
                <span className="text-xs font-medium text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                  {criticalCount} critical
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">Anomalies in boxes, timestamps & rows</p>
          </div>
        </div>

        {/* Pending Human Reviews */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Pending Reviews</span>
            <div className="p-2 bg-amber-50 rounded-lg text-amber-700">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-bold text-amber-600">{pendingReviews}</span>
              <span className="text-xs text-slate-500">/ {totalIssues}</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {confirmedCorrections} confirmed · {rejectedFlags} rejected
            </p>
          </div>
        </div>
      </div>

      {/* Multimodal Coverage Summary Strip */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
          Multimodal Dataset Coverage & Modalities
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center space-x-3">
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-md">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-800">Image Vision</span>
              <p className="text-[11px] text-slate-500">
                {modalityStats.image.length} datasets · Bounding boxes
              </p>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center space-x-3">
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-md">
              <Mic className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-800">Audio Speech</span>
              <p className="text-[11px] text-slate-500">
                {modalityStats.audio.length} datasets · Audio & Transcripts
              </p>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center space-x-3">
            <div className="p-2 bg-rose-50 text-rose-700 rounded-md">
              <VideoIcon className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-800">Video Temporal</span>
              <p className="text-[11px] text-slate-500">
                {modalityStats.video.length} datasets · Segment timelines
              </p>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center space-x-3">
            <div className="p-2 bg-slate-200 text-slate-700 rounded-md">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-800">Tabular Text</span>
              <p className="text-[11px] text-slate-500">
                {modalityStats.text.length} datasets · CSV rows & columns
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Cleanliness Health Banner */}
      <div className="bg-slate-900 text-white rounded-xl p-6 shadow-md flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-blue-400" />
            <h3 className="font-semibold text-lg text-white">Data Cleanliness Index: {cleanlinessScore}%</h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Calculated strictly from audited records versus detected anomalies ({totalRecordsScanned} total rows scanned, {totalIssues} distinct defects flagged). Zero simulated values.
          </p>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-3">
            <div
              className={`h-full transition-all duration-500 ${
                cleanlinessScore > 85 ? 'bg-emerald-500' : cleanlinessScore > 65 ? 'bg-amber-500' : 'bg-rose-500'
              }`}
              style={{ width: `${cleanlinessScore}%` }}
            />
          </div>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          {pendingReviews > 0 ? (
            <button
              onClick={() => onNavigate('review_centre')}
              className="flex items-center space-x-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              <span>Review {pendingReviews} Flagged Items</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <div className="flex items-center space-x-2 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>Review backlog clear</span>
            </div>
          )}
        </div>
      </div>

      {/* Grid: Issue Category Distribution & Severity Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Issue Breakdown by Type */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Quality Anomalies by Category</h3>
            <span className="text-xs text-slate-500 font-mono">Total: {totalIssues}</span>
          </div>

          <div className="mt-4 space-y-3.5">
            {[
              { label: 'Invalid Bounding Boxes (Image Geometry)', count: issueCountsByType.invalid_bounding_box, color: 'bg-indigo-600' },
              { label: 'Temporal Inversions (Video / Audio Timestamps)', count: issueCountsByType.temporal_timestamp_error, color: 'bg-rose-600' },
              { label: 'Missing / Corrupt Media Assets', count: issueCountsByType.missing_media_file, color: 'bg-red-700' },
              { label: 'Audio Duration vs Transcript Mismatches', count: issueCountsByType.audio_duration_mismatch, color: 'bg-emerald-600' },
              { label: 'Missing Values (Null / N/A / Empty)', count: issueCountsByType.missing_value, color: 'bg-rose-500' },
              { label: 'Invalid Numeric Values (Negative / Strings)', count: issueCountsByType.invalid_numeric, color: 'bg-red-600' },
              { label: 'Duplicate Unique IDs', count: issueCountsByType.duplicate_id, color: 'bg-amber-500' },
              { label: 'Duplicate Full Records', count: issueCountsByType.duplicate_row, color: 'bg-orange-500' },
              { label: 'Inconsistent Category Casing / Typos', count: issueCountsByType.inconsistent_category, color: 'bg-blue-500' },
              { label: 'Annotation / Semantic Mismatches', count: issueCountsByType.annotation_mismatch, color: 'bg-purple-500' },
            ].map((cat) => {
              const pct = totalIssues > 0 ? Math.round((cat.count / totalIssues) * 100) : 0;
              return (
                <div key={cat.label} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-slate-700">{cat.label}</span>
                    <span className="font-mono text-slate-600">
                      {cat.count} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div className={`h-full ${cat.color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Severity & Resolution Breakdown */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Severity Classification</h3>
              <span className="text-xs text-slate-500">Risk Matrix</span>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-lg">
                <span className="text-[11px] font-bold text-rose-700 uppercase">Critical Severity</span>
                <p className="text-2xl font-bold text-rose-900 mt-1">{criticalCount}</p>
                <p className="text-[11px] text-rose-600 mt-0.5">Bad coords, time inversions, missing files</p>
              </div>

              <div className="p-3.5 bg-amber-50 border border-amber-100 rounded-lg">
                <span className="text-[11px] font-bold text-amber-800 uppercase">High Severity</span>
                <p className="text-2xl font-bold text-amber-900 mt-1">{highCount}</p>
                <p className="text-[11px] text-amber-700 mt-0.5">Missing metrics, duplicate rows</p>
              </div>

              <div className="p-3.5 bg-blue-50 border border-blue-100 rounded-lg">
                <span className="text-[11px] font-bold text-blue-700 uppercase">Medium Severity</span>
                <p className="text-2xl font-bold text-blue-900 mt-1">{mediumCount}</p>
                <p className="text-[11px] text-blue-600 mt-0.5">Category casing variations</p>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[11px] font-bold text-slate-600 uppercase">Low / Formatting</span>
                <p className="text-2xl font-bold text-slate-800 mt-1">{lowCount}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Minor whitespace issues</p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-between">
            <span className="text-xs text-slate-500">Need to export findings?</span>
            <button
              onClick={() => onNavigate('reports')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center space-x-1"
            >
              <span>Generate Audit CSV</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Active Datasets Table Overview with Modality Badge */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Loaded Multimodal Datasets Status</h3>
            <p className="text-xs text-slate-500">Auditing text, vision, acoustic, and video annotation pipelines</p>
          </div>
          <button
            onClick={() => onNavigate('datasets')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800"
          >
            Manage Datasets &rarr;
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <th className="py-2.5 px-4 font-semibold">Dataset Name</th>
                <th className="py-2.5 px-4 font-semibold">Modality</th>
                <th className="py-2.5 px-4 font-semibold">Industry</th>
                <th className="py-2.5 px-4 font-semibold">Rows</th>
                <th className="py-2.5 px-4 font-semibold">Status</th>
                <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {datasets.map((d) => {
                const datasetIssues = issues.filter((i) => i.datasetId === d.id);
                return (
                  <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-900">
                      <div className="flex items-center space-x-2">
                        <span>{d.name}</span>
                        {d.isSample && (
                          <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1 rounded font-medium">
                            Demo
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <ModalityBadge modality={d.modality} />
                    </td>
                    <td className="py-3 px-4 text-slate-600 capitalize">{d.industry.replace('_', ' ')}</td>
                    <td className="py-3 px-4 text-slate-600 font-mono">{d.rowCount}</td>
                    <td className="py-3 px-4">
                      {d.lastScannedAt ? (
                        datasetIssues.length > 0 ? (
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            {datasetIssues.length} issues detected
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Clean
                          </span>
                        )
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600">
                          Awaiting Scan
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => {
                          onSelectDataset(d);
                          onNavigate('run_checks');
                        }}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                      >
                        Audit Now
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
