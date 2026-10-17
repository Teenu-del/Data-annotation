import Papa from 'papaparse';
import { Dataset, DatasetColumn, Industry, Modality } from '../types';
import { generateColumnsMetadata, detectKeyColumn, inferColumnType } from './csvParser';

export interface FileIngestionProgress {
  total: number;
  current: number;
  fileName: string;
}

/**
 * Helper to inspect image file dimensions
 */
export function getImageDimensions(file: File): Promise<{ width: number; height: number; url: string }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth || 600, height: img.naturalHeight || 400, url });
    };
    img.onerror = () => {
      resolve({ width: 0, height: 0, url });
    };
    img.src = url;
  });
}

/**
 * Helper to inspect audio file duration
 */
export function getAudioMetadata(file: File): Promise<{ duration: number; url: string }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    audio.onloadedmetadata = () => {
      resolve({ duration: Math.round(audio.duration * 10) / 10 || 5.0, url });
    };
    audio.onerror = () => {
      resolve({ duration: 0, url });
    };
    audio.src = url;
  });
}

/**
 * Helper to inspect video file duration and dimensions
 */
export function getVideoMetadata(file: File): Promise<{ duration: number; width: number; height: number; url: string }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      resolve({
        duration: Math.round(video.duration * 10) / 10 || 10.0,
        width: video.videoWidth || 1280,
        height: video.videoHeight || 720,
        url,
      });
    };
    video.onerror = () => {
      resolve({ duration: 0, width: 0, height: 0, url });
    };
    video.src = url;
  });
}

/**
 * Universal multi-file uploader supporting Photos, Audio, Video, Reviews, JSON, and CSV
 */
export async function ingestUniversalFiles(
  files: File[],
  industry: Industry = 'retail',
  onProgress?: (progress: FileIngestionProgress) => void
): Promise<Dataset> {
  if (files.length === 0) {
    throw new Error('No files selected for upload.');
  }

  // 1. If single CSV or TSV, parse using existing CSV parser
  if (files.length === 1 && (files[0].name.endsWith('.csv') || files[0].name.endsWith('.tsv'))) {
    const text = await files[0].text();
    const result = Papa.parse<Record<string, any>>(text, {
      header: true,
      skipEmptyLines: 'greedy',
      dynamicTyping: false,
    });
    const headers = result.meta.fields || (result.data.length > 0 ? Object.keys(result.data[0]) : []);
    const cleanData = result.data.filter((row) => Object.values(row).some((val) => String(val || '').trim() !== ''));
    const columns = generateColumnsMetadata(headers, cleanData);

    let modality: Modality = 'text';
    if (headers.some((h) => /image_url|img_url|photo_url|bounding_box/i.test(h))) modality = 'image';
    else if (headers.some((h) => /audio_url|speech|transcript/i.test(h))) modality = 'audio';
    else if (headers.some((h) => /video_url|start_sec|end_sec/i.test(h))) modality = 'video';

    return {
      id: `dataset-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: files[0].name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
      fileName: files[0].name,
      industry,
      modality,
      isSample: false,
      uploadedAt: new Date().toISOString(),
      rowCount: cleanData.length,
      columnCount: headers.length,
      headers,
      columns,
      data: cleanData,
      idColumn: detectKeyColumn(headers),
      mediaUrlColumn: headers.find((h) => /url|path|file/i.test(h)),
      labelColumn: headers.find((h) => /label|category|sentiment|intent|action/i.test(h)),
    };
  }

  // 2. If JSON or JSONL file (Customer Reviews, Annotation Manifests)
  if (files.length === 1 && (files[0].name.endsWith('.json') || files[0].name.endsWith('.jsonl'))) {
    const text = await files[0].text();
    let parsedData: any[] = [];
    if (files[0].name.endsWith('.jsonl')) {
      parsedData = text
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => JSON.parse(line));
    } else {
      const json = JSON.parse(text);
      parsedData = Array.isArray(json) ? json : json.reviews || json.records || json.data || [json];
    }

    if (!Array.isArray(parsedData) || parsedData.length === 0) {
      throw new Error('JSON file must contain an array of records or reviews.');
    }

    // Flatten objects to strings for tabular inspection
    const flatData = parsedData.map((item, idx) => {
      const row: Record<string, any> = {};
      Object.keys(item).forEach((k) => {
        const val = item[k];
        if (typeof val === 'object' && val !== null) {
          row[k] = JSON.stringify(val);
        } else {
          row[k] = val !== undefined && val !== null ? String(val) : '';
        }
      });
      if (!row['id'] && !row['review_id'] && !row['record_id']) {
        row['id'] = `REC-${idx + 1}`;
      }
      return row;
    });

    const headers = Object.keys(flatData[0]);
    const columns = generateColumnsMetadata(headers, flatData);
    const isReview = headers.some((h) => /review|rating|sentiment|feedback|comment/i.test(h));

    return {
      id: `dataset-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: files[0].name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
      fileName: files[0].name,
      industry,
      modality: isReview ? 'text' : 'multimodal',
      isSample: false,
      uploadedAt: new Date().toISOString(),
      rowCount: flatData.length,
      columnCount: headers.length,
      headers,
      columns,
      data: flatData,
      idColumn: detectKeyColumn(headers),
      labelColumn: headers.find((h) => /sentiment|rating|category|label/i.test(h)),
    };
  }

  // 3. Batch Image / Photo files (.png, .jpg, .jpeg, .webp, .svg, .bmp)
  const imageFiles = files.filter((f) => /\.(jpe?g|png|webp|svg|bmp|gif)$/i.test(f.name));
  if (imageFiles.length > 0 && imageFiles.length === files.length) {
    const rows: Record<string, any>[] = [];

    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      if (onProgress) onProgress({ total: imageFiles.length, current: i + 1, fileName: file.name });
      const meta = await getImageDimensions(file);
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

      // Default centered initial bounding box ready for verification
      const defaultBox = JSON.stringify([
        {
          label: cleanName.split(' ')[0] || 'Object',
          x: 0.15,
          y: 0.15,
          width: 0.7,
          height: 0.7,
        },
      ]);

      rows.push({
        image_id: `IMG-${1000 + i + 1}`,
        file_name: file.name,
        image_url: meta.url,
        target_label: cleanName,
        bounding_box: defaultBox,
        image_width: meta.width,
        image_height: meta.height,
        resolution: `${meta.width}x${meta.height}`,
        file_size_kb: Math.round(file.size / 1024),
      });
    }

    const headers = [
      'image_id',
      'file_name',
      'image_url',
      'target_label',
      'bounding_box',
      'resolution',
      'image_width',
      'image_height',
      'file_size_kb',
    ];
    const columns = generateColumnsMetadata(headers, rows);

    return {
      id: `dataset-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: `Photo Collection (${imageFiles.length} Images)`,
      fileName: `image_batch_${imageFiles.length}_photos`,
      industry,
      modality: 'image',
      isSample: false,
      uploadedAt: new Date().toISOString(),
      rowCount: rows.length,
      columnCount: headers.length,
      headers,
      columns,
      data: rows,
      idColumn: 'image_id',
      mediaUrlColumn: 'image_url',
      labelColumn: 'target_label',
      boxColumn: 'bounding_box',
    };
  }

  // 4. Batch Audio files (.mp3, .wav, .ogg, .m4a, .flac)
  const audioFiles = files.filter((f) => /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(f.name));
  if (audioFiles.length > 0 && audioFiles.length === files.length) {
    const rows: Record<string, any>[] = [];

    for (let i = 0; i < audioFiles.length; i++) {
      const file = audioFiles[i];
      if (onProgress) onProgress({ total: audioFiles.length, current: i + 1, fileName: file.name });
      const meta = await getAudioMetadata(file);
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

      rows.push({
        audio_id: `AUD-${1000 + i + 1}`,
        file_name: file.name,
        audio_url: meta.url,
        duration_seconds: meta.duration,
        transcript: `[Audio speech stream for ${cleanName}]`,
        intent_label: cleanName.split(' ')[0] || 'Inquiry',
        file_size_kb: Math.round(file.size / 1024),
      });
    }

    const headers = [
      'audio_id',
      'file_name',
      'audio_url',
      'duration_seconds',
      'transcript',
      'intent_label',
      'file_size_kb',
    ];
    const columns = generateColumnsMetadata(headers, rows);

    return {
      id: `dataset-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: `Audio Audio Recordings (${audioFiles.length} Clips)`,
      fileName: `audio_batch_${audioFiles.length}_files`,
      industry,
      modality: 'audio',
      isSample: false,
      uploadedAt: new Date().toISOString(),
      rowCount: rows.length,
      columnCount: headers.length,
      headers,
      columns,
      data: rows,
      idColumn: 'audio_id',
      mediaUrlColumn: 'audio_url',
      labelColumn: 'intent_label',
      transcriptColumn: 'transcript',
    };
  }

  // 5. Batch Video files (.mp4, .webm, .mov, .mkv)
  const videoFiles = files.filter((f) => /\.(mp4|webm|mov|mkv|avi)$/i.test(f.name));
  if (videoFiles.length > 0 && videoFiles.length === files.length) {
    const rows: Record<string, any>[] = [];

    for (let i = 0; i < videoFiles.length; i++) {
      const file = videoFiles[i];
      if (onProgress) onProgress({ total: videoFiles.length, current: i + 1, fileName: file.name });
      const meta = await getVideoMetadata(file);
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

      rows.push({
        video_id: `VID-${1000 + i + 1}`,
        file_name: file.name,
        video_url: meta.url,
        duration_seconds: meta.duration,
        resolution: `${meta.width}x${meta.height}`,
        start_sec: '0.0',
        end_sec: String(Math.min(meta.duration, 5.0)),
        action_label: cleanName.split(' ')[0] || 'Action Segment',
        file_size_kb: Math.round(file.size / 1024),
      });
    }

    const headers = [
      'video_id',
      'file_name',
      'video_url',
      'duration_seconds',
      'resolution',
      'start_sec',
      'end_sec',
      'action_label',
      'file_size_kb',
    ];
    const columns = generateColumnsMetadata(headers, rows);

    return {
      id: `dataset-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: `Video Footage Stream (${videoFiles.length} Videos)`,
      fileName: `video_batch_${videoFiles.length}_files`,
      industry,
      modality: 'video',
      isSample: false,
      uploadedAt: new Date().toISOString(),
      rowCount: rows.length,
      columnCount: headers.length,
      headers,
      columns,
      data: rows,
      idColumn: 'video_id',
      mediaUrlColumn: 'video_url',
      labelColumn: 'action_label',
      startSecColumn: 'start_sec',
      endSecColumn: 'end_sec',
    };
  }

  // 6. Text Review files (.txt) -> One line per customer review
  if (files.length === 1 && files[0].name.endsWith('.txt')) {
    const content = await files[0].text();
    const lines = content.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
    const rows = lines.map((line, idx) => ({
      review_id: `REV-${1001 + idx}`,
      review_text: line,
      rating: '5',
      sentiment_label: 'Positive',
    }));

    const headers = ['review_id', 'review_text', 'rating', 'sentiment_label'];
    const columns = generateColumnsMetadata(headers, rows);

    return {
      id: `dataset-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: files[0].name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
      fileName: files[0].name,
      industry,
      modality: 'text',
      isSample: false,
      uploadedAt: new Date().toISOString(),
      rowCount: rows.length,
      columnCount: headers.length,
      headers,
      columns,
      data: rows,
      idColumn: 'review_id',
      labelColumn: 'sentiment_label',
    };
  }

  // Mixed or unsupported: create a multimodal index manifest
  const mixedRows = files.map((file, idx) => ({
    file_id: `FILE-${1000 + idx + 1}`,
    file_name: file.name,
    file_type: file.type || 'unknown',
    file_size_kb: Math.round(file.size / 1024),
    media_url: URL.createObjectURL(file),
    annotation_label: file.name.split('.')[0] || 'Unlabeled',
  }));

  const headers = ['file_id', 'file_name', 'file_type', 'file_size_kb', 'media_url', 'annotation_label'];
  const columns = generateColumnsMetadata(headers, mixedRows);

  return {
    id: `dataset-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: `Batch Ingestion (${files.length} Assets)`,
    fileName: `batch_assets_${files.length}_files`,
    industry,
    modality: 'multimodal',
    isSample: false,
    uploadedAt: new Date().toISOString(),
    rowCount: mixedRows.length,
    columnCount: headers.length,
    headers,
    columns,
    data: mixedRows,
    idColumn: 'file_id',
    mediaUrlColumn: 'media_url',
    labelColumn: 'annotation_label',
  };
}

/**
 * Direct Paste Review Text Ingestion
 */
export function parsePastedReviews(rawText: string, industry: Industry = 'retail'): Dataset {
  const lines = rawText.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
  if (lines.length === 0) {
    throw new Error('Please enter at least one review line.');
  }

  const rows = lines.map((line, idx) => {
    // Check if line contains comma, tab, or pipe separation (e.g. "Review text | 4.5 | Positive")
    const parts = line.split(/[|\t]/);
    if (parts.length >= 2) {
      return {
        review_id: `REV-${1001 + idx}`,
        review_text: parts[0].trim(),
        rating: parts[1]?.trim() || '5',
        sentiment_label: parts[2]?.trim() || (Number(parts[1]) >= 4 ? 'Positive' : 'Negative'),
      };
    }

    return {
      review_id: `REV-${1001 + idx}`,
      review_text: line,
      rating: '5',
      sentiment_label: 'Positive',
    };
  });

  const headers = ['review_id', 'review_text', 'rating', 'sentiment_label'];
  const columns = generateColumnsMetadata(headers, rows);

  return {
    id: `dataset-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: `Pasted Customer Reviews (${rows.length} Entries)`,
    fileName: 'pasted_reviews.txt',
    industry,
    modality: 'text',
    isSample: false,
    uploadedAt: new Date().toISOString(),
    rowCount: rows.length,
    columnCount: headers.length,
    headers,
    columns,
    data: rows,
    idColumn: 'review_id',
    labelColumn: 'sentiment_label',
  };
}
