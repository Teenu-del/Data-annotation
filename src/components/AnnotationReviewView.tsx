import React, { useState, useEffect } from 'react';
import {
  Tag,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Settings,
  ArrowRight,
  Database,
  Layers,
  Image as ImageIcon,
  Mic,
  Video as VideoIcon,
  FileText,
  RefreshCw,
  Eye,
} from 'lucide-react';
import { AISettings, AnnotationItem, BoundingBox, Dataset, Modality, QualityIssue } from '../types';
import { runAIVerification } from '../utils/aiVerification';
import { NavTab } from './Sidebar';
import { ModalityBadge } from './multimodal/ModalityBadge';
import { ImageAnnotationViewer } from './multimodal/ImageAnnotationViewer';
import { AudioAnnotationViewer } from './multimodal/AudioAnnotationViewer';
import { VideoAnnotationViewer } from './multimodal/VideoAnnotationViewer';

interface AnnotationReviewViewProps {
  dataset?: Dataset;
  allDatasets: Dataset[];
  onSelectDataset: (dataset: Dataset) => void;
  aiSettings: AISettings;
  onNavigate: (tab: NavTab) => void;
  onAddIssues: (newIssues: QualityIssue[]) => void;
}

export const AnnotationReviewView: React.FC<AnnotationReviewViewProps> = ({
  dataset,
  allDatasets,
  onSelectDataset,
  aiSettings,
  onNavigate,
  onAddIssues,
}) => {
  // Modality filter for datasets
  const [modalityFilter, setModalityFilter] = useState<'all' | Modality>('all');

  // Column selectors
  const [textColumn, setTextColumn] = useState<string>('');
  const [labelColumn, setLabelColumn] = useState<string>('');

  // Selected row for interactive multimodal inspection
  const [activeRowIndex, setActiveRowIndex] = useState<number>(1);

  // Annotation state
  const [items, setItems] = useState<AnnotationItem[]>([]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationFeedback, setVerificationFeedback] = useState<string | null>(null);

  // Auto-detect good candidate columns whenever dataset changes
  useEffect(() => {
    if (!dataset) return;

    // Detect text candidate
    const textCandidate = dataset.headers.find((h) =>
      /(transcript|notes|desc|description|title|product_name|address|comment|statement)/i.test(h)
    );
    // Detect label candidate
    const labelCandidate =
      dataset.labelColumn ||
      dataset.headers.find((h) =>
        /(target_label|intent_label|action_label|annotation_label|category|department|class|type|grade)/i.test(h)
      );

    setTextColumn(textCandidate || dataset.headers[0] || '');
    setLabelColumn(labelCandidate || dataset.headers[1] || dataset.headers[0] || '');
    setActiveRowIndex(1);
    setVerificationFeedback(null);
  }, [dataset]);

  // Sync rows from dataset into items when columns change
  useEffect(() => {
    if (!dataset) {
      setItems([]);
      return;
    }

    const mediaCol =
      dataset.mediaUrlColumn ||
      dataset.headers.find((h) => /(image_url|img_url|audio_url|video_url|media_url)/i.test(h));

    const boxCol =
      dataset.boxColumn ||
      dataset.headers.find((h) => /(bounding_box|bbox|box_coords)/i.test(h));

    const startSecCol =
      dataset.startSecColumn ||
      dataset.headers.find((h) => /(start_sec|start_time)/i.test(h));

    const endSecCol =
      dataset.endSecColumn ||
      dataset.headers.find((h) => /(end_sec|end_time)/i.test(h));

    const durCol = dataset.headers.find((h) => /(duration_seconds|duration_sec)/i.test(h));

    const initialItems: AnnotationItem[] = dataset.data.map((row, idx) => {
      let parsedBoxes: BoundingBox[] | undefined = undefined;
      if (boxCol && row[boxCol]) {
        try {
          const raw = String(row[boxCol]);
          parsedBoxes = raw.startsWith('{') ? [JSON.parse(raw)] : JSON.parse(raw);
        } catch {
          // ignore json errors
        }
      }

      return {
        id: `annot-${dataset.id}-${idx + 1}`,
        datasetId: dataset.id,
        rowIndex: idx + 1,
        modality: dataset.modality || 'text',
        textValue: textColumn ? String(row[textColumn] ?? '') : undefined,
        labelValue: labelColumn ? String(row[labelColumn] ?? '') : 'Unlabeled',
        mediaUrl: mediaCol ? String(row[mediaCol] ?? '') : undefined,
        mediaType:
          dataset.modality === 'image'
            ? 'image'
            : dataset.modality === 'audio'
            ? 'audio'
            : dataset.modality === 'video'
            ? 'video'
            : 'text',
        boundingBoxes: parsedBoxes,
        startTime: startSecCol ? Number(row[startSecCol]) : undefined,
        endTime: endSecCol ? Number(row[endSecCol]) : undefined,
        audioDuration: durCol ? Number(row[durCol]) : undefined,
        status: 'unverified',
        reviewedStatus: 'pending',
      };
    });

    setItems(initialItems);
  }, [dataset, textColumn, labelColumn]);

  const handleRunAIVerification = async () => {
    if (!dataset || !aiSettings.apiKey) return;
    setIsVerifying(true);
    setVerificationFeedback(null);

    const rowsToVerify = items.map((it) => ({
      rowIndex: it.rowIndex,
      text: it.textValue || `[${it.modality.toUpperCase()} ASSET: ${it.mediaUrl || 'media'}]`,
      label: it.labelValue,
    }));

    const result = await runAIVerification(
      aiSettings.apiKey,
      dataset.id,
      dataset.name,
      rowsToVerify,
      textColumn || 'media_asset',
      labelColumn || 'label'
    );

    setIsVerifying(false);
    setVerificationFeedback(result.message);

    if (result.success && result.items.length > 0) {
      const resultMap = new Map(result.items.map((i) => [i.rowIndex, i]));
      setItems((prev) =>
        prev.map((item) => {
          const res = resultMap.get(item.rowIndex);
          if (res) {
            return {
              ...item,
              status: res.status,
              predictedLabel: res.predictedLabel,
              reasoning: res.reasoning,
              correctedLabel: res.correctedLabel,
            };
          }
          return item;
        })
      );

      if (result.issues.length > 0) {
        onAddIssues(result.issues);
      }
    }
  };

  const handleManualStatusChange = (
    rowIndex: number,
    status: 'match' | 'mismatch',
    corrected?: string
  ) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.rowIndex === rowIndex) {
          return {
            ...item,
            status,
            reviewedStatus: 'confirmed',
            correctedLabel: corrected || item.labelValue,
            reasoning:
              status === 'match'
                ? 'Manually verified by human annotator'
                : 'Manual mismatch flagged by reviewer',
          };
        }
        return item;
      })
    );

    if (status === 'mismatch' && dataset) {
      const targetItem = items.find((i) => i.rowIndex === rowIndex);
      const newIssue: QualityIssue = {
        id: `issue-manual-annot-${dataset.id}-${rowIndex}-${labelColumn}`,
        datasetId: dataset.id,
        datasetName: dataset.name,
        rowIndex,
        column: labelColumn || 'annotation_label',
        issueType: 'annotation_mismatch',
        severity: 'high',
        modality: dataset.modality,
        mediaUrl: targetItem?.mediaUrl,
        originalValue: targetItem?.labelValue || '',
        suggestedValue: corrected || 'Re-classify',
        explanation: `Human reviewer flagged ${dataset.modality} label as inconsistent with asset content.`,
        reviewStatus: 'confirmed',
        correctedValue: corrected,
        reviewedAt: new Date().toISOString(),
        reviewedBy: 'Human Annotator',
      };
      onAddIssues([newIssue]);
    }
  };

  const filteredDatasets = allDatasets.filter((d) =>
    modalityFilter === 'all' ? true : d.modality === modalityFilter
  );

  const activeItem = items.find((i) => i.rowIndex === activeRowIndex) || items[0];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Multimodal Annotation Verification
            </h1>
            {dataset && <ModalityBadge modality={dataset.modality} />}
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Universal annotation verification platform supporting Text, Image Vision, Audio Speech, and Video temporal streams.
          </p>
        </div>

        {/* Dataset Switcher with Modality Tag */}
        <div className="flex items-center space-x-2">
          <Database className="w-4 h-4 text-slate-400" />
          <span className="text-xs text-slate-500 font-medium">Dataset:</span>
          <select
            value={dataset?.id || ''}
            onChange={(e) => {
              const found = allDatasets.find((d) => d.id === e.target.value);
              if (found) onSelectDataset(found);
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

      {/* Modality Filter Pills */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mr-2">
          Filter by Modality:
        </span>
        {[
          { id: 'all', label: 'All Modalities', icon: Layers },
          { id: 'text', label: 'Tabular Text', icon: FileText },
          { id: 'image', label: 'Image Vision & Bounding Boxes', icon: ImageIcon },
          { id: 'audio', label: 'Audio & Speech Transcripts', icon: Mic },
          { id: 'video', label: 'Video Action Segments', icon: VideoIcon },
        ].map((tab) => {
          const Icon = tab.icon;
          const isSelected = modalityFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setModalityFilter(tab.id as any);
                if (tab.id !== 'all') {
                  const firstMatch = allDatasets.find((d) => d.modality === tab.id);
                  if (firstMatch) onSelectDataset(firstMatch);
                }
              }}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {dataset ? (
        <div className="space-y-6">
          {/* AI Status Banner */}
          {!aiSettings.isConfigured ? (
            <div className="bg-slate-50 border border-slate-300 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-slate-200 text-slate-700 rounded-lg shrink-0 mt-0.5 sm:mt-0">
                  <AlertCircle className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    AI Multimodal Verification is not configured yet
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed max-w-2xl">
                    No multimodal classification model is active. To enable automated vision, acoustic, and text verification using Gemini 2.5 Flash, add your Gemini API Key in Settings.
                    In accordance with enterprise data fidelity standards, no fake model predictions or synthetic confidence scores are ever generated.
                  </p>
                </div>
              </div>

              <button
                onClick={() => onNavigate('settings')}
                className="shrink-0 flex items-center space-x-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Configure Gemini Model</span>
              </button>
            </div>
          ) : (
            <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-600 text-white rounded-lg">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm font-bold text-slate-900">Multimodal AI Active</h3>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded border border-emerald-200">
                      Gemini 2.5 Flash Connected
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Ready to verify {items.length} {dataset.modality} annotations for semantic and spatial alignment.
                  </p>
                </div>
              </div>

              <button
                disabled={isVerifying}
                onClick={handleRunAIVerification}
                className="shrink-0 flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors shadow-xs disabled:opacity-60"
              >
                {isVerifying ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying Multimodal Data...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Run Multimodal AI Audit</span>
                  </>
                )}
              </button>
            </div>
          )}

          {verificationFeedback && (
            <div className="p-3 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-700 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{verificationFeedback}</span>
            </div>
          )}

          {/* Interactive Workspace: Multimodal Viewer (Top/Left) + Records Table (Right/Bottom) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Multimodal Preview Canvas / Player (Left 5 cols) */}
            <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <Eye className="w-4 h-4 text-blue-600" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Asset Inspector (Row #{activeItem?.rowIndex || 1})
                  </h3>
                </div>
                <ModalityBadge modality={dataset.modality} />
              </div>

              {/* Render Modality Specific Viewer */}
              {dataset.modality === 'image' && (
                <ImageAnnotationViewer
                  imageUrl={activeItem?.mediaUrl}
                  boxes={activeItem?.boundingBoxes || []}
                  targetLabel={activeItem?.labelValue}
                />
              )}

              {dataset.modality === 'audio' && (
                <AudioAnnotationViewer
                  audioUrl={activeItem?.mediaUrl}
                  durationSeconds={activeItem?.audioDuration}
                  transcript={activeItem?.textValue}
                  intentLabel={activeItem?.labelValue}
                />
              )}

              {dataset.modality === 'video' && (
                <VideoAnnotationViewer
                  videoUrl={activeItem?.mediaUrl}
                  startSec={activeItem?.startTime}
                  endSec={activeItem?.endTime}
                  actionLabel={activeItem?.labelValue}
                />
              )}

              {dataset.modality === 'text' && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Text Under Audit</span>
                  <p className="text-sm text-slate-900 font-medium leading-relaxed bg-white p-3 rounded border border-slate-200">
                    {activeItem?.textValue || '<Empty Text>'}
                  </p>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-xs text-slate-500">Label:</span>
                    <span className="text-xs font-bold font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
                      {activeItem?.labelValue}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Annotation Records Table (Right 7 cols) */}
            <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between">
              <div>
                <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">
                      {dataset.name} Records ({items.length})
                    </h3>
                    <p className="text-xs text-slate-500">
                      Click any row to inspect media asset, bounding boxes, or audio/video streams.
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto max-h-[460px]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
                      <tr className="text-slate-600">
                        <th className="py-2 px-3 font-mono text-slate-400 w-10 text-center">#</th>
                        <th className="py-2 px-3 font-semibold">Asset / Input</th>
                        <th className="py-2 px-3 font-semibold">Assigned Label</th>
                        <th className="py-2 px-3 font-semibold">Verdict</th>
                        <th className="py-2 px-3 font-semibold text-right">Review Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.map((item) => {
                        const isSelected = activeRowIndex === item.rowIndex;
                        return (
                          <tr
                            key={item.id}
                            onClick={() => setActiveRowIndex(item.rowIndex)}
                            className={`cursor-pointer transition-colors ${
                              isSelected ? 'bg-blue-50/80 ring-1 ring-inset ring-blue-500' : 'hover:bg-slate-50/70'
                            }`}
                          >
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-500 text-center">
                              #{item.rowIndex}
                            </td>
                            <td className="py-2.5 px-3 font-medium text-slate-900 max-w-[200px] truncate">
                              {item.mediaUrl ? (
                                <span className="font-mono text-blue-600 text-[11px] truncate block" title={item.mediaUrl}>
                                  {item.mediaUrl.split('/').pop()?.slice(0, 24)}...
                                </span>
                              ) : item.textValue ? (
                                <span className="truncate block" title={item.textValue}>
                                  {item.textValue}
                                </span>
                              ) : (
                                <span className="italic text-slate-400">&lt;No content&gt;</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="font-mono bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-[11px] font-medium border border-slate-200">
                                {item.labelValue}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              {item.status === 'match' ? (
                                <span className="inline-flex items-center space-x-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  <span>Verified</span>
                                </span>
                              ) : item.status === 'mismatch' ? (
                                <span className="inline-flex items-center space-x-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                  <XCircle className="w-3 h-3 text-rose-600" />
                                  <span>Mismatch</span>
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[11px]">Pending Audit</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <div className="flex items-center justify-end space-x-1">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleManualStatusChange(item.rowIndex, 'match');
                                  }}
                                  className="px-2 py-0.5 text-[10px] font-semibold bg-white border border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 rounded"
                                >
                                  Verify
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const fix = prompt(
                                      `Flag label mismatch for Row #${item.rowIndex}. Enter correct label:`,
                                      item.predictedLabel || item.labelValue
                                    );
                                    if (fix !== null) {
                                      handleManualStatusChange(item.rowIndex, 'mismatch', fix);
                                    }
                                  }}
                                  className="px-2 py-0.5 text-[10px] font-semibold bg-white border border-slate-200 hover:bg-rose-50 hover:text-rose-700 text-slate-600 rounded"
                                >
                                  Flag
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white p-12 text-center rounded-xl border border-slate-200 shadow-xs">
          <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-900">No dataset selected</h3>
        </div>
      )}
    </div>
  );
};
