import Papa from 'papaparse';
import { Dataset, QualityIssue } from '../types';

export function downloadCSV(csvContent: string, filename: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportIssuesCSV(issues: QualityIssue[], datasetName: string = 'all_datasets'): void {
  const rows = issues.map((issue) => ({
    'Issue ID': issue.id,
    'Dataset Name': issue.datasetName,
    'Row Number': issue.rowIndex,
    'Target Column': issue.column,
    'Issue Type': issue.issueType.replace(/_/g, ' ').toUpperCase(),
    'Severity': issue.severity.toUpperCase(),
    'Original Value': issue.originalValue === null || issue.originalValue === undefined ? '' : String(issue.originalValue),
    'Suggested Correction': issue.suggestedValue === null || issue.suggestedValue === undefined ? '' : String(issue.suggestedValue),
    'Explanation': issue.explanation,
    'Review Status': issue.reviewStatus.toUpperCase(),
    'Confirmed / Corrected Value': issue.correctedValue === null || issue.correctedValue === undefined ? '' : String(issue.correctedValue),
    'Auditor Notes': issue.reviewNotes || '',
    'Reviewed At': issue.reviewedAt || '',
    'Reviewed By': issue.reviewedBy || '',
  }));

  const csv = Papa.unparse(rows);
  const safeName = datasetName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const dateStr = new Date().toISOString().split('T')[0];
  downloadCSV(csv, `vattara_dataguard_issues_${safeName}_${dateStr}.csv`);
}

export function exportCleanedDatasetCSV(
  dataset: Dataset,
  confirmedIssues: QualityIssue[]
): void {
  // Build a map of row number and column to confirmed correction
  // Row number is 1-indexed
  const correctionsMap = new Map<string, any>();
  const rowsToRemove = new Set<number>();

  for (const issue of confirmedIssues) {
    if (issue.datasetId === dataset.id && issue.reviewStatus === 'confirmed') {
      if (issue.issueType === 'duplicate_row' && issue.column === 'ALL_COLUMNS') {
        // Mark row for deletion
        rowsToRemove.add(issue.rowIndex);
      } else if (issue.column && issue.correctedValue !== undefined) {
        correctionsMap.set(`${issue.rowIndex}_${issue.column}`, issue.correctedValue);
      }
    }
  }

  const cleanedData: Record<string, any>[] = [];

  dataset.data.forEach((row, idx) => {
    const rowNum = idx + 1;
    if (rowsToRemove.has(rowNum)) {
      // Skipped duplicate row
      return;
    }

    const newRow = { ...row };
    dataset.headers.forEach((h) => {
      const key = `${rowNum}_${h}`;
      if (correctionsMap.has(key)) {
        newRow[h] = correctionsMap.get(key);
      }
    });

    cleanedData.push(newRow);
  });

  const csv = Papa.unparse(cleanedData);
  const safeName = dataset.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const dateStr = new Date().toISOString().split('T')[0];
  downloadCSV(csv, `vattara_dataguard_cleaned_${safeName}_${dateStr}.csv`);
}
