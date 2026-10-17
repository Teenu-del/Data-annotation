import React, { useState } from 'react';
import {
  ClipboardList,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  Check,
  X,
  FileEdit,
  Database,
  Layers,
} from 'lucide-react';
import { BoundingBox, Dataset, QualityIssue, ReviewStatus } from '../types';
import { ModalityBadge } from './multimodal/ModalityBadge';
import { ImageAnnotationViewer } from './multimodal/ImageAnnotationViewer';
import { AudioAnnotationViewer } from './multimodal/AudioAnnotationViewer';
import { VideoAnnotationViewer } from './multimodal/VideoAnnotationViewer';

interface ReviewCentreViewProps {
  issues: QualityIssue[];
  datasets: Dataset[];
  selectedIssue?: QualityIssue | null;
  onSelectIssue: (issue: QualityIssue | null) => void;
  onUpdateIssue: (
    issueId: string,
    reviewStatus: ReviewStatus,
    correctedValue?: any,
    reviewNotes?: string
  ) => void;
  onBatchConfirmSuggestions: () => void;
}

export const ReviewCentreView: React.FC<ReviewCentreViewProps> = ({
  issues,
  datasets,
  selectedIssue,
  onSelectIssue,
  onUpdateIssue,
  onBatchConfirmSuggestions,
}) => {
  // Filters
  const [statusTab, setStatusTab] = useState<'all' | 'pending' | 'confirmed' | 'rejected'>('pending');
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Inspector form state for the currently inspected issue
  const [editedCorrection, setEditedCorrection] = useState<string>('');
  const [reviewNotes, setReviewNotes] = useState<string>('');

  // When selectedIssue changes, sync the inspector state
  const handleOpenInspector = (issue: QualityIssue) => {
    onSelectIssue(issue);
    setEditedCorrection(
      issue.correctedValue !== undefined
        ? String(issue.correctedValue ?? '')
        : issue.suggestedValue !== undefined && issue.suggestedValue !== null
        ? String(issue.suggestedValue)
        : ''
    );
    setReviewNotes(issue.reviewNotes || '');
  };

  const handleConfirmCorrection = () => {
    if (!selectedIssue) return;
    onUpdateIssue(
      selectedIssue.id,
      'confirmed',
      editedCorrection !== '' ? editedCorrection : selectedIssue.suggestedValue,
      reviewNotes
    );
    onSelectIssue(null);
  };

  const handleRejectFlag = () => {
    if (!selectedIssue) return;
    onUpdateIssue(
      selectedIssue.id,
      'rejected',
      selectedIssue.originalValue,
      reviewNotes || 'Rejected as false positive or acceptable variance.'
    );
    onSelectIssue(null);
  };

  // Filter issues
  const filteredIssues = issues.filter((issue) => {
    if (statusTab !== 'all' && issue.reviewStatus !== statusTab) return false;
    if (selectedDatasetId !== 'all' && issue.datasetId !== selectedDatasetId) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchCol = issue.column.toLowerCase().includes(q);
      const matchExpl = issue.explanation.toLowerCase().includes(q);
      const matchVal = String(issue.originalValue || '').toLowerCase().includes(q);
      const matchDs = issue.datasetName.toLowerCase().includes(q);
      if (!matchCol && !matchExpl && !matchVal && !matchDs) return false;
    }
    return true;
  });

  const pendingCount = issues.filter((i) => i.reviewStatus === 'pending').length;
  const confirmedCount = issues.filter((i) => i.reviewStatus === 'confirmed').length;
  const rejectedCount = issues.filter((i) => i.reviewStatus === 'rejected').length;

  // Find dataset corresponding to selected issue to display row context
  const inspectingDataset = selectedIssue
    ? datasets.find((d) => d.id === selectedIssue.datasetId)
    : undefined;
  const fullRowData =
    inspectingDataset && selectedIssue
      ? inspectingDataset.data[selectedIssue.rowIndex - 1]
      : undefined;

  // Parse any bounding boxes if present
  let boundingBoxesForInspector: BoundingBox[] = [];
  if (selectedIssue && inspectingDataset) {
    const boxCol = inspectingDataset.boxColumn || 'bounding_box';
    if (fullRowData && fullRowData[boxCol]) {
      try {
        const raw = String(fullRowData[boxCol]);
        boundingBoxesForInspector = raw.startsWith('{') ? [JSON.parse(raw)] : JSON.parse(raw);
      } catch {
        // ignore
      }
    }
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Review Centre & Multimodal Resolution Queue
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Human-in-the-loop verification station. Inspect image boxes, audio waves, video clips, and text anomalies.
          </p>
        </div>

        {pendingCount > 0 && (
          <button
            onClick={onBatchConfirmSuggestions}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors shadow-xs"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Confirm All Suggested ({pendingCount})</span>
          </button>
        )}
      </div>

      {/* Status Filter Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
          <button
            onClick={() => setStatusTab('pending')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center space-x-1.5 ${
              statusTab === 'pending'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Pending Review</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                statusTab === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {pendingCount}
            </span>
          </button>

          <button
            onClick={() => setStatusTab('confirmed')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center space-x-1.5 ${
              statusTab === 'confirmed'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Confirmed</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                statusTab === 'confirmed' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {confirmedCount}
            </span>
          </button>

          <button
            onClick={() => setStatusTab('rejected')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center space-x-1.5 ${
              statusTab === 'rejected'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Rejected Flags</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                statusTab === 'rejected' ? 'bg-slate-200 text-slate-800' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {rejectedCount}
            </span>
          </button>

          <button
            onClick={() => setStatusTab('all')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              statusTab === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Issues ({issues.length})
          </button>
        </div>

        {/* Dataset selector & search filter */}
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <select
            value={selectedDatasetId}
            onChange={(e) => setSelectedDatasetId(e.target.value)}
            className="text-xs bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-slate-700 focus:outline-none"
          >
            <option value="all">All Datasets</option>
            {datasets.map((d) => (
              <option key={d.id} value={d.id}>
                [{d.modality?.toUpperCase() || 'TEXT'}] {d.name}
              </option>
            ))}
          </select>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search issues..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-md text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Main Review Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Issues List (Left 6 or 12 cols) */}
        <div className={`${selectedIssue ? 'lg:col-span-6' : 'lg:col-span-12'} space-y-3`}>
          {filteredIssues.length > 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                      <th className="py-2.5 px-3 font-mono text-slate-400 w-10 text-center">#</th>
                      <th className="py-2.5 px-3 font-semibold">Modality</th>
                      <th className="py-2.5 px-3 font-semibold">Column / Defect</th>
                      <th className="py-2.5 px-3 font-semibold">Issue Type</th>
                      <th className="py-2.5 px-3 font-semibold">Status</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Inspect</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredIssues.map((issue) => {
                      const isSelected = selectedIssue?.id === issue.id;
                      return (
                        <tr
                          key={issue.id}
                          onClick={() => handleOpenInspector(issue)}
                          className={`cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-blue-50/80 ring-1 ring-inset ring-blue-500'
                              : 'hover:bg-slate-50/80'
                          }`}
                        >
                          <td className="py-3 px-3 font-mono text-slate-500 text-center font-bold">
                            #{issue.rowIndex}
                          </td>
                          <td className="py-3 px-3">
                            <ModalityBadge modality={issue.modality} showLabel={false} />
                          </td>
                          <td className="py-3 px-3">
                            <p className="font-semibold text-slate-900 truncate max-w-[130px] font-mono">
                              {issue.column}
                            </p>
                            <p className="text-[11px] text-slate-400 truncate max-w-[130px]">
                              {issue.datasetName}
                            </p>
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
                              {issue.issueType.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                                issue.reviewStatus === 'confirmed'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : issue.reviewStatus === 'rejected'
                                  ? 'bg-slate-100 text-slate-600 border border-slate-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                            >
                              {issue.reviewStatus}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenInspector(issue);
                              }}
                              className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                            >
                              Inspect &rarr;
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white p-12 text-center rounded-xl border border-slate-200 shadow-xs">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-slate-900">No issues in current view</h3>
            </div>
          )}
        </div>

        {/* Multimodal Record Inspector Drawer (Right 6 cols) */}
        {selectedIssue && (
          <div className="lg:col-span-6 bg-white p-6 rounded-xl border border-slate-200 shadow-md space-y-5 sticky top-20 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center space-x-2">
                <FileEdit className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Inspect Row #{selectedIssue.rowIndex} ({selectedIssue.datasetName})
                </h3>
              </div>
              <div className="flex items-center space-x-2">
                <ModalityBadge modality={selectedIssue.modality} />
                <button
                  onClick={() => onSelectIssue(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Multimodal Live Preview inside Inspector! */}
            {inspectingDataset?.modality === 'image' && fullRowData && (
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
                  Live Vision Bounding Box Inspection
                </span>
                <ImageAnnotationViewer
                  imageUrl={fullRowData.image_url}
                  boxes={boundingBoxesForInspector}
                  targetLabel={fullRowData.target_label}
                />
              </div>
            )}

            {inspectingDataset?.modality === 'audio' && fullRowData && (
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
                  Live Audio Stream & Transcript Inspection
                </span>
                <AudioAnnotationViewer
                  audioUrl={fullRowData.audio_url}
                  durationSeconds={Number(fullRowData.duration_seconds)}
                  transcript={fullRowData.transcript}
                  intentLabel={fullRowData.intent_label}
                />
              </div>
            )}

            {inspectingDataset?.modality === 'video' && fullRowData && (
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
                  Live Video Temporal Timeline Inspection
                </span>
                <VideoAnnotationViewer
                  videoUrl={fullRowData.video_url}
                  startSec={Number(fullRowData.start_sec)}
                  endSec={Number(fullRowData.end_sec)}
                  actionLabel={fullRowData.action_label}
                />
              </div>
            )}

            {/* Explanation & Detection Basis */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700 uppercase">
                  {selectedIssue.issueType.replace(/_/g, ' ')}
                </span>
                <span
                  className={`text-[10px] font-bold uppercase px-1.5 py-0.2 rounded ${
                    selectedIssue.severity === 'critical'
                      ? 'bg-rose-100 text-rose-800'
                      : selectedIssue.severity === 'high'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {selectedIssue.severity} Severity
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">{selectedIssue.explanation}</p>
            </div>

            {/* Values Comparison: Preserved Raw vs Clean Correction */}
            <div className="space-y-4">
              {/* Permanent Original Value (Read Only) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Original Raw Value <span className="text-slate-400 font-normal">(Preserved Permanent Record)</span>
                </label>
                <div className="w-full bg-slate-100 text-rose-800 border border-slate-200 rounded-lg p-2.5 font-mono text-xs break-all">
                  {selectedIssue.originalValue === null ||
                  selectedIssue.originalValue === undefined ||
                  selectedIssue.originalValue === ''
                    ? '<EMPTY / NULL>'
                    : String(selectedIssue.originalValue)}
                </div>
              </div>

              {/* Editable Corrected Value */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Proposed Clean / Corrected Value
                </label>
                <input
                  type="text"
                  value={editedCorrection}
                  onChange={(e) => setEditedCorrection(e.target.value)}
                  placeholder="Enter corrected value..."
                  className="w-full text-xs font-mono bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
                />
                {selectedIssue.suggestedValue && (
                  <button
                    type="button"
                    onClick={() => setEditedCorrection(String(selectedIssue.suggestedValue))}
                    className="text-[11px] text-blue-600 hover:underline mt-1 block font-medium"
                  >
                    Reset to algorithm suggestion: {String(selectedIssue.suggestedValue)}
                  </button>
                )}
              </div>

              {/* Auditor Review Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Auditor Notes & Justification
                </label>
                <textarea
                  rows={2}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="e.g. Clamped bounding box or aligned video timestamps..."
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
                />
              </div>
            </div>

            {/* Human Confirmation Actions */}
            <div className="pt-3 border-t border-slate-200 space-y-2">
              <button
                onClick={handleConfirmCorrection}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors shadow-xs"
              >
                <Check className="w-4 h-4" />
                <span>Confirm Issue & Apply Correction</span>
              </button>

              <button
                onClick={handleRejectFlag}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition-colors shadow-2xs"
              >
                <X className="w-4 h-4 text-slate-400" />
                <span>Reject Flag (Keep Original Value)</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
