import Papa from 'papaparse';
import { Dataset, DatasetColumn, Industry } from '../types';

export function inferColumnType(values: any[]): 'string' | 'number' | 'boolean' | 'date' {
  const nonNullValues = values.filter(
    (v) => v !== null && v !== undefined && String(v).trim() !== '' && String(v).toLowerCase() !== 'n/a'
  );

  if (nonNullValues.length === 0) return 'string';

  let numberCount = 0;
  let booleanCount = 0;
  let dateCount = 0;

  for (const val of nonNullValues.slice(0, 50)) {
    const str = String(val).trim();
    if (!isNaN(Number(str)) && str !== '') {
      numberCount++;
    } else if (['true', 'false', 'yes', 'no', '1', '0'].includes(str.toLowerCase())) {
      booleanCount++;
    } else if (!isNaN(Date.parse(str)) && str.length > 5 && /\d/.test(str)) {
      dateCount++;
    }
  }

  const sampleSize = Math.min(nonNullValues.length, 50);
  if (numberCount / sampleSize > 0.75) return 'number';
  if (booleanCount / sampleSize > 0.75) return 'boolean';
  if (dateCount / sampleSize > 0.75) return 'date';
  return 'string';
}

export function detectKeyColumn(headers: string[]): string | undefined {
  const idRegex = /(id|sku|code|key|uuid|batch|ticket|prop)/i;
  // First look for exact match or suffix
  const exact = headers.find((h) => ['id', 'sku', 'ticket_id', 'batch_id', 'property_id', 'record_id'].includes(h.toLowerCase()));
  if (exact) return exact;
  return headers.find((h) => idRegex.test(h));
}

export function generateColumnsMetadata(headers: string[], data: Record<string, any>[]): DatasetColumn[] {
  return headers.map((header) => {
    const values = data.map((row) => row[header]);
    const nullCount = values.filter(
      (v) => v === null || v === undefined || String(v).trim() === '' || ['null', 'nan', 'n/a', 'none'].includes(String(v).trim().toLowerCase())
    ).length;

    const uniqueSet = new Set(values.map((v) => String(v).trim()));
    const sampleValues = Array.from(uniqueSet).filter((v) => v !== '').slice(0, 4);

    return {
      name: header,
      inferredType: inferColumnType(values),
      nullCount,
      uniqueCount: uniqueSet.size,
      sampleValues,
    };
  });
}

export function parseCSVString(
  csvContent: string,
  fileName: string = 'custom_upload.csv',
  industry: Industry = 'general'
): Dataset {
  const result = Papa.parse<Record<string, any>>(csvContent, {
    header: true,
    skipEmptyLines: 'greedy',
    dynamicTyping: false, // Keep as string so we inspect exact original raw inputs
  });

  const headers = result.meta.fields || (result.data.length > 0 ? Object.keys(result.data[0]) : []);
  const cleanData = result.data.filter((row) => Object.values(row).some((val) => String(val || '').trim() !== ''));
  const columns = generateColumnsMetadata(headers, cleanData);
  const idColumn = detectKeyColumn(headers);

  return {
    id: `dataset-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
    fileName,
    industry,
    modality: headers.some((h) => /image_url|img_url/i.test(h))
      ? 'image'
      : headers.some((h) => /audio_url/i.test(h))
      ? 'audio'
      : headers.some((h) => /video_url/i.test(h))
      ? 'video'
      : 'text',
    isSample: false,
    uploadedAt: new Date().toISOString(),
    rowCount: cleanData.length,
    columnCount: headers.length,
    headers,
    columns,
    data: cleanData,
    idColumn,
  };
}

export function parseCSVFile(file: File, industry: Industry = 'general'): Promise<Dataset> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const dataset = parseCSVString(text, file.name, industry);
        resolve(dataset);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsText(file);
  });
}
