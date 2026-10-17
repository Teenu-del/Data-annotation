import { BoundingBox, Dataset, QualityCheckConfig, QualityIssue } from '../types';

export function runQualityScan(
  dataset: Dataset,
  config?: Partial<QualityCheckConfig>
): QualityIssue[] {
  const issues: QualityIssue[] = [];
  const rows = dataset.data;
  const headers = dataset.headers;

  const cfg: QualityCheckConfig = {
    checkMissingValues: config?.checkMissingValues ?? true,
    checkDuplicateRows: config?.checkDuplicateRows ?? true,
    checkDuplicateIds: config?.checkDuplicateIds ?? true,
    idColumnName: config?.idColumnName || dataset.idColumn || '',
    checkInvalidNumerics: config?.checkInvalidNumerics ?? true,
    allowNegativeNumbers: config?.allowNegativeNumbers ?? false,
    checkInconsistentCategories: config?.checkInconsistentCategories ?? true,
    checkBoundingBoxes: config?.checkBoundingBoxes ?? true,
    checkTemporalTimestamps: config?.checkTemporalTimestamps ?? true,
    checkMediaAccessibility: config?.checkMediaAccessibility ?? true,
    checkAudioDuration: config?.checkAudioDuration ?? true,
    categoryColumns: config?.categoryColumns || [],
  };

  const seenRowHashes = new Map<string, number>();
  const seenIds = new Map<string, number>();

  // Detect multimodal columns
  const mediaUrlCol =
    dataset.mediaUrlColumn ||
    headers.find((h) => /(image_url|img_url|audio_url|video_url|media_url|file_path)/i.test(h));

  const boxCol =
    dataset.boxColumn ||
    headers.find((h) => /(bounding_box|bbox|box_coords|boxes)/i.test(h));

  const startSecCol =
    dataset.startSecColumn ||
    headers.find((h) => /(start_sec|start_time|timestamp_start|begin_sec)/i.test(h));

  const endSecCol =
    dataset.endSecColumn ||
    headers.find((h) => /(end_sec|end_time|timestamp_end|stop_sec)/i.test(h));

  const transcriptCol =
    dataset.transcriptColumn ||
    headers.find((h) => /(transcript|speech_text|transcription|audio_text)/i.test(h));

  const durationCol =
    headers.find((h) => /(duration_seconds|duration_sec|duration_ms|audio_len)/i.test(h));

  // Identify numeric & categorical columns
  const numericColumns = dataset.columns
    .filter(
      (c) =>
        c.inferredType === 'number' ||
        /(price|cost|qty|quantity|amount|rating|hours|bedrooms|bathrooms|deviation|defect_count|score|duration_seconds|start_sec|end_sec)/i.test(
          c.name
        )
    )
    .map((c) => c.name);

  const nonNegativeColumns = numericColumns.filter((col) =>
    /(price|cost|qty|quantity|stock|count|bedrooms|bathrooms|hours|rating|score|duration_seconds)/i.test(col)
  );

  const categoricalColumns = dataset.columns
    .filter(
      (c) =>
        c.inferredType === 'string' &&
        c.name !== cfg.idColumnName &&
        c.name !== mediaUrlCol &&
        c.name !== boxCol &&
        !/(notes|description|address|email|name|title|transcript|url)/i.test(c.name) &&
        c.uniqueCount <= Math.max(15, rows.length * 0.6)
    )
    .map((c) => c.name);

  // Pre-analyze categorical frequencies across the dataset
  const categoryNormToDominant = new Map<string, Map<string, string>>();

  if (cfg.checkInconsistentCategories) {
    for (const col of categoricalColumns) {
      const freq = new Map<string, number>();
      const normMap = new Map<string, { dominant: string; maxCount: number }>();

      for (const row of rows) {
        const raw = String(row[col] ?? '').trim();
        if (!raw) continue;
        freq.set(raw, (freq.get(raw) || 0) + 1);

        const norm = raw.toLowerCase().replace(/[-_ ]+/g, ' ');
        const existing = normMap.get(norm);
        const count = freq.get(raw) || 1;
        if (!existing || count > existing.maxCount) {
          normMap.set(norm, { dominant: raw, maxCount: count });
        }
      }

      const dominants = new Map<string, string>();
      normMap.forEach((v, k) => dominants.set(k, v.dominant));
      categoryNormToDominant.set(col, dominants);
    }
  }

  // Row by row inspection
  rows.forEach((row, idx) => {
    const rowNum = idx + 1; // 1-based row index

    // 1. DUPLICATE ROW CHECK
    if (cfg.checkDuplicateRows) {
      const rowString = headers.map((h) => String(row[h] ?? '').trim()).join('|~|');
      if (seenRowHashes.has(rowString)) {
        const firstSeen = seenRowHashes.get(rowString)!;
        issues.push({
          id: `issue-duprow-${dataset.id}-${rowNum}`,
          datasetId: dataset.id,
          datasetName: dataset.name,
          rowIndex: rowNum,
          column: 'ALL_COLUMNS',
          issueType: 'duplicate_row',
          severity: 'high',
          modality: dataset.modality,
          originalValue: 'Full Row Duplicate',
          suggestedValue: 'Remove or consolidate duplicate record',
          explanation: `Row ${rowNum} is an identical duplicate of Row ${firstSeen}. Redundant entry in the dataset.`,
          reviewStatus: 'pending',
        });
      } else {
        seenRowHashes.set(rowString, rowNum);
      }
    }

    // 2. DUPLICATE ID CHECK
    if (cfg.checkDuplicateIds && cfg.idColumnName && row[cfg.idColumnName] !== undefined) {
      const idVal = String(row[cfg.idColumnName] ?? '').trim();
      if (idVal && !['null', 'nan', 'n/a', ''].includes(idVal.toLowerCase())) {
        if (seenIds.has(idVal)) {
          const firstSeen = seenIds.get(idVal)!;
          issues.push({
            id: `issue-dupid-${dataset.id}-${rowNum}-${cfg.idColumnName}`,
            datasetId: dataset.id,
            datasetName: dataset.name,
            rowIndex: rowNum,
            column: cfg.idColumnName,
            issueType: 'duplicate_id',
            severity: 'critical',
            modality: dataset.modality,
            originalValue: idVal,
            suggestedValue: `${idVal}-DUP`,
            explanation: `Unique key conflict: Identifier '${idVal}' in column '${cfg.idColumnName}' was already assigned to Row ${firstSeen}.`,
            reviewStatus: 'pending',
          });
        } else {
          seenIds.set(idVal, rowNum);
        }
      }
    }

    // 3. MULTIMODAL: MEDIA ACCESSIBILITY CHECK
    if (cfg.checkMediaAccessibility && mediaUrlCol) {
      const mediaVal = String(row[mediaUrlCol] ?? '').trim();
      if (!mediaVal || ['null', 'nan', 'n/a', ''].includes(mediaVal.toLowerCase())) {
        issues.push({
          id: `issue-media-missing-${dataset.id}-${rowNum}-${mediaUrlCol}`,
          datasetId: dataset.id,
          datasetName: dataset.name,
          rowIndex: rowNum,
          column: mediaUrlCol,
          issueType: 'missing_media_file',
          severity: 'critical',
          modality: dataset.modality,
          originalValue: '<EMPTY / BROKEN URL>',
          suggestedValue: 'Provide accessible media URL or storage path',
          explanation: `Missing media file URL in column '${mediaUrlCol}'. Annotation cannot be verified without accessible media asset.`,
          reviewStatus: 'pending',
        });
      }
    }

    // 4. MULTIMODAL: BOUNDING BOX COORDINATE CHECKS
    if (cfg.checkBoundingBoxes && boxCol && row[boxCol]) {
      const boxRaw = String(row[boxCol]).trim();
      try {
        let parsedBoxes: BoundingBox[] = [];
        if (boxRaw.startsWith('{')) {
          parsedBoxes = [JSON.parse(boxRaw)];
        } else if (boxRaw.startsWith('[')) {
          parsedBoxes = JSON.parse(boxRaw);
        }

        for (const b of parsedBoxes) {
          const isOutOfRange =
            b.x < 0 ||
            b.y < 0 ||
            b.x > 1.05 ||
            b.y > 1.05 ||
            b.width <= 0 ||
            b.height <= 0 ||
            b.x + b.width > 1.1 ||
            b.y + b.height > 1.1;

          if (isOutOfRange) {
            const clampedX = Math.max(0, Math.min(0.85, Math.abs(b.x > 1 ? 0.15 : b.x)));
            const clampedY = Math.max(0, Math.min(0.85, Math.abs(b.y > 1 ? 0.15 : b.y)));
            const clampedW = Math.max(0.1, Math.min(1 - clampedX, Math.abs(b.width)));
            const clampedH = Math.max(0.1, Math.min(1 - clampedY, Math.abs(b.height)));

            issues.push({
              id: `issue-box-${dataset.id}-${rowNum}-${boxCol}`,
              datasetId: dataset.id,
              datasetName: dataset.name,
              rowIndex: rowNum,
              column: boxCol,
              issueType: 'invalid_bounding_box',
              severity: 'critical',
              modality: 'image',
              mediaUrl: mediaUrlCol ? row[mediaUrlCol] : undefined,
              originalValue: `[x: ${b.x}, y: ${b.y}, w: ${b.width}, h: ${b.height}]`,
              suggestedValue: JSON.stringify([{ ...b, x: clampedX, y: clampedY, width: clampedW, height: clampedH }]),
              explanation: `Invalid bounding box coordinates [x: ${b.x}, y: ${b.y}, w: ${b.width}, h: ${b.height}]. Values must be normalized between 0 and 1, with positive width and height.`,
              reviewStatus: 'pending',
              boundingBoxData: parsedBoxes,
            });
            break;
          }
        }
      } catch (err) {
        issues.push({
          id: `issue-box-json-${dataset.id}-${rowNum}-${boxCol}`,
          datasetId: dataset.id,
          datasetName: dataset.name,
          rowIndex: rowNum,
          column: boxCol,
          issueType: 'invalid_bounding_box',
          severity: 'high',
          modality: 'image',
          originalValue: boxRaw,
          suggestedValue: '{"x":0.1,"y":0.1,"width":0.5,"height":0.5}',
          explanation: `Malformed bounding box JSON format: Unable to parse coordinate payload.`,
          reviewStatus: 'pending',
        });
      }
    }

    // 5. MULTIMODAL: VIDEO / AUDIO TEMPORAL TIMESTAMP CHECKS
    if (cfg.checkTemporalTimestamps && startSecCol && endSecCol && row[startSecCol] !== undefined && row[endSecCol] !== undefined) {
      const start = Number(String(row[startSecCol]).replace(/[^0-9.-]/g, ''));
      const end = Number(String(row[endSecCol]).replace(/[^0-9.-]/g, ''));

      if (!isNaN(start) && !isNaN(end)) {
        if (start < 0) {
          issues.push({
            id: `issue-temporal-neg-${dataset.id}-${rowNum}-${startSecCol}`,
            datasetId: dataset.id,
            datasetName: dataset.name,
            rowIndex: rowNum,
            column: startSecCol,
            issueType: 'temporal_timestamp_error',
            severity: 'critical',
            modality: dataset.modality || 'video',
            mediaUrl: mediaUrlCol ? row[mediaUrlCol] : undefined,
            originalValue: `${start}s`,
            suggestedValue: '0.0',
            explanation: `Negative temporal start timestamp (${start}s) is invalid for media playback.`,
            reviewStatus: 'pending',
            temporalData: { startTime: start, endTime: end },
          });
        } else if (start >= end) {
          issues.push({
            id: `issue-temporal-invert-${dataset.id}-${rowNum}`,
            datasetId: dataset.id,
            datasetName: dataset.name,
            rowIndex: rowNum,
            column: `${startSecCol} / ${endSecCol}`,
            issueType: 'temporal_timestamp_error',
            severity: 'critical',
            modality: dataset.modality || 'video',
            mediaUrl: mediaUrlCol ? row[mediaUrlCol] : undefined,
            originalValue: `Start: ${start}s >= End: ${end}s`,
            suggestedValue: `Start: ${end}s, End: ${start}s`,
            explanation: `Temporal inversion defect: Segment start time (${start}s) is greater than or equal to end time (${end}s).`,
            reviewStatus: 'pending',
            temporalData: { startTime: start, endTime: end },
          });
        }
      }
    }

    // 6. MULTIMODAL: AUDIO DURATION & TRANSCRIPT ACOUSTIC SANITY CHECK
    if (cfg.checkAudioDuration && durationCol && transcriptCol && row[durationCol] && row[transcriptCol]) {
      const dur = Number(String(row[durationCol]).replace(/[^0-9.-]/g, ''));
      const trans = String(row[transcriptCol]).trim();
      const wordCount = trans ? trans.split(/\s+/).length : 0;

      if (!isNaN(dur) && dur > 0 && dur < 3 && wordCount > 35) {
        issues.push({
          id: `issue-audio-rate-${dataset.id}-${rowNum}`,
          datasetId: dataset.id,
          datasetName: dataset.name,
          rowIndex: rowNum,
          column: `${durationCol} / ${transcriptCol}`,
          issueType: 'audio_duration_mismatch',
          severity: 'high',
          modality: 'audio',
          mediaUrl: mediaUrlCol ? row[mediaUrlCol] : undefined,
          originalValue: `${dur}s audio for ${wordCount} words`,
          suggestedValue: `${Math.round(wordCount / 2.5)}s`,
          explanation: `Acoustic rate mismatch: Recorded audio duration of ${dur}s cannot contain ${wordCount} words (exceeds human speech limits). Verify audio file alignment.`,
          reviewStatus: 'pending',
        });
      }
    }

    // 7. CUSTOMER REVIEWS & FEEDBACK QUALITY CHECKS
    const reviewTextCol = headers.find((h) => /(review_text|review_body|feedback_text|customer_comment)/i.test(h));
    const starRatingCol = headers.find((h) => /(star_rating|rating_score|rating)/i.test(h));
    const sentimentCol = headers.find((h) => /(sentiment_label|sentiment)/i.test(h));

    if (reviewTextCol && sentimentCol && row[reviewTextCol] && row[sentimentCol]) {
      const reviewText = String(row[reviewTextCol]).toLowerCase().trim();
      const sentiment = String(row[sentimentCol]).toLowerCase().trim();
      const isExtremeComplaint = /(catastrophic|failure|broken|danger|hazard|burned|worst|horrible|terrible|scam|fraud|unauthorized)/.test(reviewText);

      if (isExtremeComplaint && (sentiment.includes('pos') || sentiment === 'positive' || sentiment === 'delighted')) {
        issues.push({
          id: `issue-review-contradict-${dataset.id}-${rowNum}`,
          datasetId: dataset.id,
          datasetName: dataset.name,
          rowIndex: rowNum,
          column: sentimentCol,
          issueType: 'annotation_mismatch',
          severity: 'critical',
          modality: 'text',
          originalValue: row[sentimentCol],
          suggestedValue: 'Negative',
          explanation: `Customer review sentiment contradiction: Label '${row[sentimentCol]}' directly contradicts severe product defect reported in review text ("${String(row[reviewTextCol]).slice(0, 60)}...").`,
          reviewStatus: 'pending',
        });
      }

      // Spam check
      if (reviewText.length > 0 && reviewText.length <= 3 && /^(.)\1*$/.test(reviewText)) {
        issues.push({
          id: `issue-review-spam-${dataset.id}-${rowNum}`,
          datasetId: dataset.id,
          datasetName: dataset.name,
          rowIndex: rowNum,
          column: reviewTextCol,
          issueType: 'missing_value',
          severity: 'medium',
          modality: 'text',
          originalValue: row[reviewTextCol],
          suggestedValue: 'Flag as Spam / Incomplete',
          explanation: `Spam customer review detected: Content '${row[reviewTextCol]}' lacks substantive feedback.`,
          reviewStatus: 'pending',
        });
      }
    }

    if (starRatingCol && row[starRatingCol] !== undefined && row[starRatingCol] !== '') {
      const ratingVal = Number(String(row[starRatingCol]).replace(/[^0-9.-]/g, ''));
      if (!isNaN(ratingVal) && (ratingVal < 1 || ratingVal > 5)) {
        issues.push({
          id: `issue-rating-bounds-${dataset.id}-${rowNum}`,
          datasetId: dataset.id,
          datasetName: dataset.name,
          rowIndex: rowNum,
          column: starRatingCol,
          issueType: 'invalid_numeric',
          severity: 'high',
          modality: 'text',
          originalValue: row[starRatingCol],
          suggestedValue: ratingVal < 1 ? '1' : '5',
          explanation: `Star rating ${row[starRatingCol]} is out of standard 1-to-5 star rating scale.`,
          reviewStatus: 'pending',
        });
      }
    }

    // Column-level general checks
    headers.forEach((col) => {
      const rawVal = row[col];
      const strVal = rawVal === null || rawVal === undefined ? '' : String(rawVal).trim();
      const lowerVal = strVal.toLowerCase();

      // MISSING VALUES CHECK
      const isMissing =
        strVal === '' ||
        ['null', 'nan', 'n/a', '#n/a', 'none', 'undefined', 'nil', '-'].includes(lowerVal);

      if (isMissing && cfg.checkMissingValues) {
        // Skip mediaUrlCol as it was already handled with specialized missing_media_file issue
        if (col === mediaUrlCol) return;

        const isKeyCol = col === cfg.idColumnName;
        issues.push({
          id: `issue-missing-${dataset.id}-${rowNum}-${col}`,
          datasetId: dataset.id,
          datasetName: dataset.name,
          rowIndex: rowNum,
          column: col,
          issueType: 'missing_value',
          severity: isKeyCol ? 'critical' : 'high',
          modality: dataset.modality,
          originalValue: strVal === '' ? '<EMPTY>' : strVal,
          suggestedValue: isKeyCol ? 'Assign Unique ID' : 'Provide missing value',
          explanation: `Missing or null placeholder value detected in column '${col}'. Required for complete data integrity.`,
          reviewStatus: 'pending',
        });
        return;
      }

      // INVALID NUMERIC VALUES CHECK
      if (cfg.checkInvalidNumerics && numericColumns.includes(col)) {
        const cleanedNumStr = strVal.replace(/[$,]/g, '');
        const parsedNum = Number(cleanedNumStr);

        if (isNaN(parsedNum)) {
          issues.push({
            id: `issue-nonnum-${dataset.id}-${rowNum}-${col}`,
            datasetId: dataset.id,
            datasetName: dataset.name,
            rowIndex: rowNum,
            column: col,
            issueType: 'invalid_numeric',
            severity: 'high',
            modality: dataset.modality,
            originalValue: strVal,
            suggestedValue: null,
            explanation: `Non-numeric text '${strVal}' encountered in expected numeric column '${col}'.`,
            reviewStatus: 'pending',
          });
        } else {
          if (!cfg.allowNegativeNumbers && nonNegativeColumns.includes(col) && parsedNum < 0) {
            const absoluteVal = Math.abs(parsedNum).toString();
            issues.push({
              id: `issue-negnum-${dataset.id}-${rowNum}-${col}`,
              datasetId: dataset.id,
              datasetName: dataset.name,
              rowIndex: rowNum,
              column: col,
              issueType: 'invalid_numeric',
              severity: 'critical',
              modality: dataset.modality,
              originalValue: strVal,
              suggestedValue: absoluteVal,
              explanation: `Negative value ${strVal} violates business constraints for non-negative column '${col}'.`,
              reviewStatus: 'pending',
            });
          }
        }
      }

      // INCONSISTENT CATEGORIES / CASING CHECK
      if (cfg.checkInconsistentCategories && categoricalColumns.includes(col) && strVal) {
        const norm = strVal.toLowerCase().replace(/[-_ ]+/g, ' ');
        const dominant = categoryNormToDominant.get(col)?.get(norm);

        if (dominant && dominant !== strVal) {
          issues.push({
            id: `issue-cat-${dataset.id}-${rowNum}-${col}`,
            datasetId: dataset.id,
            datasetName: dataset.name,
            rowIndex: rowNum,
            column: col,
            issueType: 'inconsistent_category',
            severity: 'medium',
            modality: dataset.modality,
            originalValue: strVal,
            suggestedValue: dominant,
            explanation: `Inconsistent category styling or casing '${strVal}'. Standard representation in dataset is '${dominant}'.`,
            reviewStatus: 'pending',
          });
        }
      }
    });
  });

  return issues;
}
