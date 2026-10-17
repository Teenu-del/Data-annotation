export type Industry = 'retail' | 'real_estate' | 'manufacturing' | 'customer_service' | 'autonomous_vehicles' | 'healthcare' | 'general';

export type Modality = 'text' | 'image' | 'audio' | 'video' | 'multimodal';

export type IssueType =
  | 'missing_value'
  | 'duplicate_row'
  | 'duplicate_id'
  | 'invalid_numeric'
  | 'inconsistent_category'
  | 'annotation_mismatch'
  | 'invalid_bounding_box'
  | 'temporal_timestamp_error'
  | 'missing_media_file'
  | 'audio_duration_mismatch';

export type IssueSeverity = 'critical' | 'high' | 'medium' | 'low';

export type ReviewStatus = 'pending' | 'confirmed' | 'rejected';

export interface BoundingBox {
  id?: string;
  label: string;
  x: number; // Normalized 0 to 1, or pixel
  y: number;
  width: number;
  height: number;
  confidence?: number;
  isValid?: boolean;
  error?: string;
}

export interface QualityIssue {
  id: string;
  datasetId: string;
  datasetName: string;
  rowIndex: number; // 1-indexed row number from CSV data
  column: string;
  issueType: IssueType;
  severity: IssueSeverity;
  modality?: Modality;
  mediaUrl?: string;
  originalValue: string | number | null | undefined;
  suggestedValue?: string | number | null;
  explanation: string;
  reviewStatus: ReviewStatus;
  correctedValue?: string | number | null;
  reviewNotes?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  // Multimodal contextual metadata
  boundingBoxData?: BoundingBox[];
  temporalData?: { startTime: number; endTime: number; duration?: number };
}

export interface DatasetColumn {
  name: string;
  inferredType: 'string' | 'number' | 'boolean' | 'date';
  nullCount: number;
  uniqueCount: number;
  sampleValues: (string | number)[];
  modalityRole?: 'text' | 'image_url' | 'audio_url' | 'video_url' | 'bounding_box' | 'timestamp_start' | 'timestamp_end' | 'label' | 'metric';
}

export interface Dataset {
  id: string;
  name: string;
  industry: Industry;
  modality: Modality;
  isSample: boolean;
  uploadedAt: string;
  fileName: string;
  rowCount: number;
  columnCount: number;
  columns: DatasetColumn[];
  headers: string[];
  data: Record<string, any>[];
  lastScannedAt?: string;
  idColumn?: string;
  mediaUrlColumn?: string;
  labelColumn?: string;
  boxColumn?: string;
  startSecColumn?: string;
  endSecColumn?: string;
  transcriptColumn?: string;
}

export interface AnnotationItem {
  id: string;
  datasetId: string;
  rowIndex: number;
  modality: Modality;
  textValue?: string;
  labelValue: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'audio' | 'video' | 'text';
  boundingBoxes?: BoundingBox[];
  startTime?: number;
  endTime?: number;
  audioDuration?: number;
  status: 'unverified' | 'match' | 'mismatch' | 'error';
  predictedLabel?: string;
  confidence?: number;
  reasoning?: string;
  reviewedStatus: ReviewStatus;
  correctedLabel?: string;
  notes?: string;
}

export interface AISettings {
  apiKey: string;
  model: string;
  isConfigured: boolean;
  statusMessage?: string;
  lastTestedAt?: string;
}

export interface QualityCheckConfig {
  checkMissingValues: boolean;
  checkDuplicateRows: boolean;
  checkDuplicateIds: boolean;
  idColumnName: string;
  checkInvalidNumerics: boolean;
  allowNegativeNumbers: boolean;
  checkInconsistentCategories: boolean;
  checkBoundingBoxes: boolean;
  checkTemporalTimestamps: boolean;
  checkMediaAccessibility: boolean;
  checkAudioDuration: boolean;
  categoryColumns: string[];
}
