import React, { useState, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Sparkles,
  Tag,
  ArrowRight,
  Info,
  Filter,
  Image as ImageIcon,
  Mic,
  Video as VideoIcon,
  FileText,
  Layers,
  MessageSquare,
  FileCode,
  ClipboardPaste,
  RefreshCw,
} from 'lucide-react';
import { Dataset, Industry, Modality } from '../types';
import { ingestUniversalFiles, parsePastedReviews, FileIngestionProgress } from '../utils/fileParser';
import { SAMPLE_DATASETS } from '../data/sampleDatasets';
import { NavTab } from './Sidebar';
import { ModalityBadge } from './multimodal/ModalityBadge';

interface DatasetsViewProps {
  datasets: Dataset[];
  activeDataset?: Dataset;
  onSelectDataset: (dataset: Dataset) => void;
  onAddDataset: (dataset: Dataset) => void;
  onDeleteDataset: (id: string) => void;
  onNavigate: (tab: NavTab) => void;
}

export const DatasetsView: React.FC<DatasetsViewProps> = ({
  datasets,
  activeDataset,
  onSelectDataset,
  onAddDataset,
  onDeleteDataset,
  onNavigate,
}) => {
  const [uploadTab, setUploadTab] = useState<'files' | 'paste_reviews'>('files');
  const [isDragging, setIsDragging] = useState(false);
  const [selectedIndustry, setSelectedIndustry] = useState<Industry>('retail');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isIngesting, setIsIngesting] = useState(false);
  const [ingestionProgress, setIngestionProgress] = useState<FileIngestionProgress | null>(null);
  const [pastedReviewText, setPastedReviewText] = useState('');
  const [previewPage, setPreviewPage] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pageSize = 10;

  const handleProcessFiles = async (files: File[]) => {
    if (files.length === 0) return;
    setUploadError(null);
    setIsIngesting(true);
    setIngestionProgress({ total: files.length, current: 0, fileName: files[0].name });

    try {
      const parsedDataset = await ingestUniversalFiles(files, selectedIndustry, (progress) => {
        setIngestionProgress(progress);
      });
      onAddDataset(parsedDataset);
      onSelectDataset(parsedDataset);
    } catch (err: any) {
      setUploadError(`Failed to process files: ${err?.message || 'Check file formatting.'}`);
    } finally {
      setIsIngesting(false);
      setIngestionProgress(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleProcessFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handlePasteReviewsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pastedReviewText.trim()) {
      setUploadError('Please paste customer reviews before submitting.');
      return;
    }
    setUploadError(null);
    try {
      const parsed = parsePastedReviews(pastedReviewText, selectedIndustry);
      onAddDataset(parsed);
      onSelectDataset(parsed);
      setPastedReviewText('');
    } catch (err: any) {
      setUploadError(err?.message || 'Failed to parse review text.');
    }
  };

  const handleLoadSample = (sampleKey: string) => {
    const sample = SAMPLE_DATASETS[sampleKey];
    if (!sample) return;
    const existing = datasets.find((d) => d.id === sample.id);
    if (existing) {
      onSelectDataset(existing);
    } else {
      onAddDataset(sample);
      onSelectDataset(sample);
    }
  };

  const displayedRows = activeDataset
    ? activeDataset.data.slice((previewPage - 1) * pageSize, previewPage * pageSize)
    : [];
  const totalPages = activeDataset ? Math.ceil(activeDataset.data.length / pageSize) : 1;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Universal Ingestion Hub (Photos, Videos, Audio, Reviews & CSV)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Directly upload photos, raw video footage, audio recordings, customer review batches, or structured JSON/CSV files.
          </p>
        </div>
      </div>

      {/* Grid: Upload Station & Sample Data Selector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Upload Station (Left 7 cols) */}
        <div className="lg:col-span-7 bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            {/* Upper Bar: Ingestion Tab Switcher & Industry Tag */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => setUploadTab('files')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center space-x-1.5 ${
                    uploadTab === 'files'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Files / Media</span>
                </button>
                <button
                  type="button"
                  onClick={() => setUploadTab('paste_reviews')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center space-x-1.5 ${
                    uploadTab === 'paste_reviews'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Paste Reviews</span>
                </button>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-500 font-medium">Domain:</span>
                <select
                  value={selectedIndustry}
                  onChange={(e) => setSelectedIndustry(e.target.value as Industry)}
                  className="text-xs bg-slate-50 border border-slate-300 rounded px-2 py-1 text-slate-700 font-medium focus:outline-none"
                >
                  <option value="retail">Retail & E-Commerce</option>
                  <option value="customer_service">Customer Service & Care</option>
                  <option value="manufacturing">Manufacturing & QA</option>
                  <option value="real_estate">Real Estate & Listings</option>
                  <option value="autonomous_vehicles">Autonomous Systems & Vision</option>
                  <option value="general">General Enterprise</option>
                </select>
              </div>
            </div>

            {/* TAB 1: Universal Multi-File Dropzone */}
            {uploadTab === 'files' ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-7 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-blue-500 bg-blue-50/50'
                    : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".csv,.tsv,.json,.jsonl,.txt,.png,.jpg,.jpeg,.webp,.svg,.bmp,.mp3,.wav,.ogg,.m4a,.flac,.mp4,.webm,.mov,.mkv"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleProcessFiles(Array.from(e.target.files));
                    }
                  }}
                />

                <div className="w-12 h-12 bg-white rounded-full shadow-xs border border-slate-200 flex items-center justify-center mx-auto mb-3 text-blue-600">
                  {isIngesting ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <Upload className="w-5 h-5" />
                  )}
                </div>

                <p className="text-sm font-semibold text-slate-900">
                  {isIngesting
                    ? `Processing ${ingestionProgress?.current || 1} of ${ingestionProgress?.total || 1}...`
                    : 'Click to browse or drop any files here'}
                </p>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Directly upload <strong>Photos/Images</strong>, <strong>Videos</strong>, <strong>Audio recordings</strong>, <strong>Customer Reviews</strong>, <strong>JSON</strong>, or <strong>CSV</strong>.
                </p>

                {/* Supported Format Pills */}
                <div className="flex flex-wrap items-center justify-center gap-1.5 mt-4 pt-3 border-t border-slate-200/70">
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center space-x-1">
                    <ImageIcon className="w-3 h-3" />
                    <span>Photos / Images (.png, .jpg, .webp)</span>
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 flex items-center space-x-1">
                    <VideoIcon className="w-3 h-3" />
                    <span>Videos (.mp4, .webm, .mov)</span>
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center space-x-1">
                    <Mic className="w-3 h-3" />
                    <span>Audio (.mp3, .wav, .ogg)</span>
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 flex items-center space-x-1">
                    <MessageSquare className="w-3 h-3" />
                    <span>Reviews (.json, .txt, .csv)</span>
                  </span>
                </div>
              </div>
            ) : (
              /* TAB 2: Paste Customer Reviews Directly */
              <form onSubmit={handlePasteReviewsSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Paste Customer Reviews (One review per line)
                  </label>
                  <textarea
                    rows={6}
                    value={pastedReviewText}
                    onChange={(e) => setPastedReviewText(e.target.value)}
                    placeholder={`Paste review feedback, e.g.:\nGreat sound quality and fast delivery | 5 | Positive\nDevice broke after 1 hour and customer service was unhelpful | 1 | Negative\nArrived with missing charging cable | 2 | Neutral`}
                    className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg p-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Format: Plain text or pipe-separated: <code className="bg-slate-100 px-1 rounded">Review Text | Rating (1-5) | Sentiment</code>
                  </p>
                </div>

                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors shadow-xs"
                >
                  Create Review Dataset & Audit
                </button>
              </form>
            )}

            {uploadError && (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-md flex items-center space-x-2 text-xs text-rose-700">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Direct in-memory asset parsing</span>
            <span>Zero server upload without user approval</span>
          </div>
        </div>

        {/* Multimodal Benchmark Libraries (Right 5 cols) */}
        <div className="lg:col-span-5 bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Multi-Type Demo Library
              </h2>
              <span className="text-[10px] bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded border border-amber-200">
                Demonstration Data
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              One-click benchmark datasets across all media and review types:
            </p>

            <div className="space-y-2">
              {[
                {
                  key: 'reviews_ecommerce_sample',
                  modality: 'text' as Modality,
                  title: 'Customer Reviews & Feedback (Reviews)',
                  detail: 'Review sentiment contradictions, spam, out-of-scale ratings',
                },
                {
                  key: 'image_retail_vision',
                  modality: 'image' as Modality,
                  title: 'Retail Vision & Photos (Images)',
                  detail: 'Bounding box coordinate errors, missing image links, mislabeled goods',
                },
                {
                  key: 'audio_call_qa',
                  modality: 'audio' as Modality,
                  title: 'Support Call Center Audio (Audio)',
                  detail: 'Negative duration, speech rate acoustic mismatch, sentiment conflicts',
                },
                {
                  key: 'video_action_qa',
                  modality: 'video' as Modality,
                  title: 'Robotics Action Footage (Videos)',
                  detail: 'Temporal timestamp inversions (start > end), negative timestamps',
                },
                {
                  key: 'retail',
                  modality: 'text' as Modality,
                  title: 'OmniStore Product Inventory (CSV/Text)',
                  detail: 'Negative prices, missing values, duplicate SKUs, casing variations',
                },
              ].map((item) => {
                const isSelected = activeDataset?.id === SAMPLE_DATASETS[item.key]?.id;
                return (
                  <button
                    key={item.key}
                    onClick={() => handleLoadSample(item.key)}
                    className={`w-full text-left p-2.5 rounded-lg border transition-all flex items-center justify-between ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/70 ring-1 ring-blue-600'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <ModalityBadge modality={item.modality} />
                        <span className="text-xs font-semibold text-slate-900">{item.title}</span>
                        {isSelected && (
                          <span className="text-[10px] text-blue-700 bg-blue-100 px-1 py-0.2 rounded font-medium">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{item.detail}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Active Dataset Inspection */}
      {activeDataset ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs space-y-6 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <div className="flex items-center space-x-3">
                <h2 className="text-lg font-bold text-slate-900">{activeDataset.name}</h2>
                <ModalityBadge modality={activeDataset.modality} />
                {activeDataset.isSample && (
                  <span className="px-2 py-0.5 text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 rounded">
                    Demonstration Data
                  </span>
                )}
                <span className="text-xs font-medium text-slate-500">
                  ({activeDataset.rowCount} records · {activeDataset.columnCount} fields)
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Source: <span className="font-mono text-slate-700">{activeDataset.fileName}</span> · Modality:{' '}
                <strong className="text-slate-700 capitalize">{activeDataset.modality}</strong>
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => onDeleteDataset(activeDataset.id)}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                title="Remove dataset"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => onNavigate('annotation_review')}
                className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
              >
                <Tag className="w-3.5 h-3.5 text-slate-500" />
                <span>Verify Annotations</span>
              </button>
              <button
                onClick={() => onNavigate('run_checks')}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Run Quality Audit</span>
              </button>
            </div>
          </div>

          {/* Column Schema */}
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              Field Schema & Column Health
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
              {activeDataset.columns.map((col) => (
                <div key={col.name} className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 truncate" title={col.name}>
                      {col.name}
                    </span>
                    <span className="text-[10px] font-mono px-1 rounded uppercase font-semibold bg-slate-200 text-slate-700">
                      {col.inferredType}
                    </span>
                  </div>
                  <div className="mt-2 space-y-0.5 text-[11px] text-slate-500">
                    <div className="flex justify-between">
                      <span>Unique:</span>
                      <span className="font-mono text-slate-700">{col.uniqueCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Nulls:</span>
                      <span
                        className={`font-mono font-medium ${
                          col.nullCount > 0 ? 'text-rose-600' : 'text-slate-700'
                        }`}
                      >
                        {col.nullCount}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Data Preview Table */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Raw Data Preview ({activeDataset.data.length} records)
              </h3>
              {totalPages > 1 && (
                <div className="flex items-center space-x-2 text-xs">
                  <button
                    disabled={previewPage <= 1}
                    onClick={() => setPreviewPage((p) => p - 1)}
                    className="px-2 py-1 border border-slate-300 rounded disabled:opacity-40"
                  >
                    Prev
                  </button>
                  <span className="text-slate-600">
                    Page {previewPage} of {totalPages}
                  </span>
                  <button
                    disabled={previewPage >= totalPages}
                    onClick={() => setPreviewPage((p) => p + 1)}
                    className="px-2 py-1 border border-slate-300 rounded disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 border-b border-slate-200">
                    <th className="py-2.5 px-3 font-mono text-slate-400 w-12 text-center">#</th>
                    {activeDataset.headers.map((h) => (
                      <th key={h} className="py-2.5 px-3 font-semibold font-mono text-slate-800">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedRows.map((row, idx) => {
                    const rowNumber = (previewPage - 1) * pageSize + idx + 1;
                    return (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-slate-400 text-center">{rowNumber}</td>
                        {activeDataset.headers.map((h) => {
                          const val = row[h];
                          const isNull =
                            val === null ||
                            val === undefined ||
                            String(val).trim() === '' ||
                            ['null', 'nan', 'n/a'].includes(String(val).toLowerCase());
                          return (
                            <td key={h} className="py-2.5 px-3 font-mono text-slate-700 max-w-xs truncate">
                              {isNull ? (
                                <span className="text-rose-500 italic bg-rose-50 px-1 py-0.5 rounded text-[11px]">
                                  null
                                </span>
                              ) : (
                                String(val)
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white p-12 text-center rounded-xl border border-slate-200 shadow-xs">
          <FileSpreadsheet className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-900">No active dataset selected</h3>
        </div>
      )}
    </div>
  );
};
