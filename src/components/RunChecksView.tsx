import React, { useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Filter,
  Search,
  ArrowRight,
  Database,
  SlidersHorizontal,
  CheckCheck,
  RefreshCw,
  ExternalLink,
  Layers,
} from 'lucide-react';
import { Dataset, IssueSeverity, IssueType, QualityCheckConfig, QualityIssue } from '../types';
import { runQualityScan } from '../utils/qualityEngine';
import { NavTab } from './Sidebar';
import { ModalityBadge } from './multimodal/ModalityBadge';

interface RunChecksViewProps {
  dataset?: Dataset;
  allDatasets: Dataset[];
  onSelectDataset: (dataset: Dataset) => void;
  issues: QualityIssue[];
  onSetIssues: (issues: QualityIssue[]) => void;
  onNavigate: (tab: NavTab) => void;
  onInspectIssue: (issue: QualityIssue) => void;
}

export const RunChecksView: React.FC<RunChecksViewProps> = ({
  dataset,
  allDatasets,
  onSelectDataset,
  issues,
  onSetIssues,
  onNavigate,
  onInspectIssue,
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanCompleted, setScanCompleted] = useState(false);

  // Configuration options
  const [config, setConfig] = useState<QualityCheckConfig>({
    checkMissingValues: true,
    checkDuplicateRows: true,
    checkDuplicateIds: true,
    idColumnName: dataset?.idColumn || '',
    checkInvalidNumerics: true,
    allowNegativeNumbers: false,
    checkInconsistentCategories: true,
    checkBoundingBoxes: true,
    checkTemporalTimestamps: true,
    checkMediaAccessibility: true,
    checkAudioDuration: true,
    categoryColumns: [],
  });

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const currentDatasetIssues = dataset ? issues.filter((i) => i.datasetId === dataset.id) : [];

  const handleRunScan = () => {
    if (!dataset) return;
    setIsScanning(true);
    setScanCompleted(false);

    setTimeout(() => {
      const detected = runQualityScan(dataset, config);

      const existingReviews = new Map(
        issues.map((i) => [
          `${i.datasetId}_${i.rowIndex}_${i.column}_${i.issueType}`,
          {
            status: i.reviewStatus,
            corrected: i.correctedValue,
            notes: i.reviewNotes,
            reviewedAt: i.reviewedAt,
          },
        ])
      );

      const merged = detected.map((issue) => {
        const key = `${issue.datasetId}_${issue.rowIndex}_${issue.column}_${issue.issueType}`;
        const prev = existingReviews.get(key);
        if (prev) {
          return {
            ...issue,
            reviewStatus: prev.status,
            correctedValue: prev.corrected,
            reviewNotes: prev.notes,
            reviewedAt: prev.reviewedAt,
          };
        }
        return issue;
      });

      const otherDatasetIssues = issues.filter((i) => i.datasetId !== dataset.id);
      onSetIssues([...otherDatasetIssues, ...merged]);

      dataset.lastScannedAt = new Date().toISOString();

      setIsScanning(false);
      setScanCompleted(true);
    }, 400);
  };

  // Filter issues
  const filteredIssues = currentDatasetIssues.filter((issue) => {
    if (typeFilter !== 'all' && issue.issueType !== typeFilter) return false;
    if (severityFilter !== 'all' && issue.severity !== severityFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const colMatch = issue.column.toLowerCase().includes(q);
      const explMatch = issue.explanation.toLowerCase().includes(q);
      const origMatch = String(issue.originalValue || '').toLowerCase().includes(q);
      if (!colMatch && !explMatch && !origMatch) return false;
    }
    return true;
  });

  const criticalIssuesCount = currentDatasetIssues.filter((i) => i.severity === 'critical').length;
  const pendingCount = currentDatasetIssues.filter((i) => i.reviewStatus === 'pending').length;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Multimodal Data Quality Engine
            </h1>
            {dataset && <ModalityBadge modality={dataset.modality} />}
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Deterministic auditing for text tables, image bounding box bounds, audio speech rates, and video timeline segments.
          </p>
        </div>

        {/* Dataset Switcher */}
        <div className="flex items-center space-x-2">
          <Database className="w-4 h-4 text-slate-400" />
          <span className="text-xs text-slate-500 font-medium">Dataset:</span>
          <select
            value={dataset?.id || ''}
            onChange={(e) => {
              const found = allDatasets.find((d) => d.id === e.target.value);
              if (found) {
                onSelectDataset(found);
                setConfig((prev) => ({
                  ...prev,
                  idColumnName: found.idColumn || prev.idColumnName,
                }));
              }
            }}
            className="text-xs bg-white border border-slate-300 rounded-md px-3 py-1.5 text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-xs"
          >
            {allDatasets.map((d) => (
              <option key={d.id} value={d.id}>
                [{d.modality?.toUpperCase() || 'TEXT'}] {d.name} ({d.rowCount} rows)
              </option>
            ))}
          </select>
        </div>
      </div>

      {dataset ? (
        <>
          {/* Audit Rule Configuration Drawer */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <SlidersHorizontal className="w-4 h-4 text-slate-500" />
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Audit Rule Suite (Multimodal & Tabular)
                </h2>
              </div>
              <span className="text-xs text-slate-500">Autonomous client-side validation engine</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              {/* Check 1: Missing values & Broken Links */}
              <label className="flex items-start space-x-3 p-3 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100/60 transition-colors">
                <input
                  type="checkbox"
                  checked={config.checkMissingValues}
                  onChange={(e) => setConfig({ ...config, checkMissingValues: e.target.checked })}
                  className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="text-xs font-semibold text-slate-900 block">Missing Values & Media URLs</span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">Detect empty strings, N/A, and broken links</span>
                </div>
              </label>

              {/* Check 2: Bounding Box Coordinates */}
              <label className="flex items-start space-x-3 p-3 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100/60 transition-colors">
                <input
                  type="checkbox"
                  checked={config.checkBoundingBoxes}
                  onChange={(e) => setConfig({ ...config, checkBoundingBoxes: e.target.checked })}
                  className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="text-xs font-semibold text-slate-900 block">Bounding Box Geometry (Image)</span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">Validate [0, 1] bounds & positive w/h</span>
                </div>
              </label>

              {/* Check 3: Temporal Timestamps */}
              <label className="flex items-start space-x-3 p-3 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100/60 transition-colors">
                <input
                  type="checkbox"
                  checked={config.checkTemporalTimestamps}
                  onChange={(e) => setConfig({ ...config, checkTemporalTimestamps: e.target.checked })}
                  className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="text-xs font-semibold text-slate-900 block">Temporal Timestamps (Video/Audio)</span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">Detect start &gt;= end and negative times</span>
                </div>
              </label>

              {/* Check 4: Audio Speech Rate & Duration */}
              <label className="flex items-start space-x-3 p-3 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100/60 transition-colors">
                <input
                  type="checkbox"
                  checked={config.checkAudioDuration}
                  onChange={(e) => setConfig({ ...config, checkAudioDuration: e.target.checked })}
                  className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="text-xs font-semibold text-slate-900 block">Speech Rate & Duration (Audio)</span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">Detect acoustic duration vs transcript clashes</span>
                </div>
              </label>
            </div>

            {/* Inconsistent Categories & Actions */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
              <label className="flex items-center space-x-2 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.checkInconsistentCategories}
                  onChange={(e) => setConfig({ ...config, checkInconsistentCategories: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span>Check Inconsistent Category Casing & Spelling Variations</span>
              </label>

              <button
                disabled={isScanning}
                onClick={handleRunScan}
                className="w-full sm:w-auto flex items-center justify-center space-x-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors shadow-xs disabled:opacity-60"
              >
                {isScanning ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Auditing {dataset.modality.toUpperCase()} Records...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Execute Quality Audit ({dataset.rowCount} Rows)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Audit Metrics Banner */}
          {dataset.lastScannedAt && (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-xs text-slate-500 font-medium">Audited Records</span>
                <p className="text-xl font-bold text-slate-900 mt-1">{dataset.rowCount} rows</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Modality: <strong className="text-slate-700 capitalize">{dataset.modality}</strong>
                </p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-xs text-slate-500 font-medium">Total Anomalies</span>
                <p className="text-xl font-bold text-slate-900 mt-1">{currentDatasetIssues.length}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Across {new Set(currentDatasetIssues.map((i) => i.column)).size} columns
                </p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-xs text-slate-500 font-medium">Critical Defect Count</span>
                <p className="text-xl font-bold text-rose-600 mt-1">{criticalIssuesCount}</p>
                <p className="text-[11px] text-rose-500 mt-0.5">Coords, timestamps, missing files</p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 font-medium">Human Review Backlog</span>
                  <p className="text-xl font-bold text-amber-600 mt-1">{pendingCount}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Awaiting resolution</p>
                </div>
                {pendingCount > 0 && (
                  <button
                    onClick={() => onNavigate('review_centre')}
                    className="p-2 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg text-xs font-semibold"
                    title="Jump to Review Centre"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Audit Results Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Detected Quality Anomalies ({filteredIssues.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Granular audit logs with row index, affected column, original value, and suggested fix.
                </p>
              </div>

              {/* Filter Controls */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Search */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search column, value..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-md text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Filter by Type */}
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-300 rounded-md px-2.5 py-1.5 text-slate-700 focus:outline-none"
                >
                  <option value="all">All Issue Types</option>
                  <option value="invalid_bounding_box">Invalid Bounding Box</option>
                  <option value="temporal_timestamp_error">Temporal Timestamp Error</option>
                  <option value="missing_media_file">Missing Media File</option>
                  <option value="audio_duration_mismatch">Audio Duration Mismatch</option>
                  <option value="missing_value">Missing Values</option>
                  <option value="duplicate_row">Duplicate Rows</option>
                  <option value="duplicate_id">Duplicate IDs</option>
                  <option value="invalid_numeric">Invalid Numerics</option>
                  <option value="inconsistent_category">Inconsistent Categories</option>
                  <option value="annotation_mismatch">Annotation Mismatch</option>
                </select>

                {/* Filter by Severity */}
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-300 rounded-md px-2.5 py-1.5 text-slate-700 focus:outline-none"
                >
                  <option value="all">All Severities</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>

            {filteredIssues.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                      <th className="py-2.5 px-3 font-mono text-slate-400 w-12 text-center">Row</th>
                      <th className="py-2.5 px-3 font-semibold">Modality</th>
                      <th className="py-2.5 px-3 font-semibold">Column</th>
                      <th className="py-2.5 px-3 font-semibold">Issue Type</th>
                      <th className="py-2.5 px-3 font-semibold">Severity</th>
                      <th className="py-2.5 px-3 font-semibold">Original Value</th>
                      <th className="py-2.5 px-3 font-semibold">Suggested Correction</th>
                      <th className="py-2.5 px-3 font-semibold">Explanation</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredIssues.map((issue) => (
                      <tr key={issue.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 font-mono text-slate-500 text-center font-bold">
                          #{issue.rowIndex}
                        </td>
                        <td className="py-3 px-3">
                          <ModalityBadge modality={issue.modality} showLabel={false} />
                        </td>
                        <td className="py-3 px-3 font-mono font-semibold text-slate-800">
                          {issue.column}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                              issue.issueType === 'invalid_bounding_box'
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                : issue.issueType === 'temporal_timestamp_error'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : issue.issueType === 'missing_media_file'
                                ? 'bg-red-50 text-red-800 border border-red-200'
                                : issue.issueType === 'audio_duration_mismatch'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : issue.issueType === 'missing_value'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-blue-50 text-blue-700 border border-blue-200'
                            }`}
                          >
                            {issue.issueType.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              issue.severity === 'critical'
                                ? 'bg-rose-100 text-rose-800'
                                : issue.severity === 'high'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {issue.severity}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-rose-700 bg-rose-50/40 rounded max-w-[140px] truncate">
                          {issue.originalValue === null || issue.originalValue === undefined || issue.originalValue === ''
                            ? '<EMPTY>'
                            : String(issue.originalValue)}
                        </td>
                        <td className="py-3 px-3 font-mono text-emerald-700 max-w-[140px] truncate">
                          {issue.suggestedValue ? String(issue.suggestedValue) : '—'}
                        </td>
                        <td className="py-3 px-3 text-slate-600 max-w-xs text-[11px] leading-relaxed">
                          {issue.explanation}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => {
                              onInspectIssue(issue);
                              onNavigate('review_centre');
                            }}
                            className="px-2.5 py-1 text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-50 text-blue-600 rounded transition-colors shadow-2xs"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-900">No Quality Issues Detected</p>
                <p className="text-xs text-slate-500 mt-1">
                  {dataset.lastScannedAt
                    ? 'All multimodal and tabular rules passed cleanly.'
                    : "Click 'Execute Quality Audit' above to scan this dataset."}
                </p>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="bg-white p-12 text-center rounded-xl border border-slate-200 shadow-xs">
          <Database className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-900">No dataset selected</h3>
        </div>
      )}
    </div>
  );
};
