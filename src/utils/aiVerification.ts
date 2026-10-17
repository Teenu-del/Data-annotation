import { GoogleGenAI } from '@google/genai';
import { AnnotationItem, QualityIssue } from '../types';

export interface VerificationBatchResult {
  items: AnnotationItem[];
  issues: QualityIssue[];
  success: boolean;
  message: string;
}

export async function testGeminiConnection(apiKey: string): Promise<{ success: boolean; message: string }> {
  if (!apiKey || apiKey.trim() === '') {
    return { success: false, message: 'API Key cannot be empty.' };
  }

  try {
    const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'Respond with exactly: "OK"',
    });

    if (response.text) {
      return { success: true, message: 'Connection successful. Gemini 2.5 Flash is ready for annotation verification.' };
    }
    return { success: false, message: 'Model returned an empty response.' };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Failed to authenticate with Gemini API. Please check your API key.',
    };
  }
}

export async function runAIVerification(
  apiKey: string,
  datasetId: string,
  datasetName: string,
  rows: { rowIndex: number; text: string; label: string }[],
  textCol: string,
  labelCol: string
): Promise<VerificationBatchResult> {
  if (!apiKey || apiKey.trim() === '') {
    return {
      items: [],
      issues: [],
      success: false,
      message: 'AI verification is not configured yet. Please configure a valid API key in Settings.',
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey: apiKey.trim() });

    // Limit to batch size of max 15 to stay within fast single-turn processing
    const batch = rows.slice(0, 15);

    const prompt = `You are Vattara DataGuard AI's enterprise annotation verification engine.
Analyze each row's text content and its assigned category/label.
Determine whether the assigned label accurately represents the text.
If there is a clear mismatch (e.g. OLED TV labeled as Footwear, or a Praise ticket labeled as Severe System Outage), mark is_match as false, give a concise professional explanation, and provide the correct suggested label.
If the label is accurate, mark is_match as true with a brief explanation.

Input items:
${JSON.stringify(
  batch.map((b) => ({
    id: b.rowIndex,
    text: b.text,
    current_label: b.label,
  })),
  null,
  2
)}

Respond ONLY with a JSON array conforming to this schema:
[
  {
    "id": number,
    "is_match": boolean,
    "suggested_label": string,
    "reasoning": string
  }
]`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '[]';
    const parsed: Array<{
      id: number;
      is_match: boolean;
      suggested_label: string;
      reasoning: string;
    }> = JSON.parse(text);

    const parsedMap = new Map(parsed.map((p) => [p.id, p]));

    const items: AnnotationItem[] = [];
    const issues: QualityIssue[] = [];

    for (const b of batch) {
      const result = parsedMap.get(b.rowIndex);
      if (result) {
        const isMatch = result.is_match;
        items.push({
          id: `annot-${datasetId}-${b.rowIndex}`,
          datasetId,
          rowIndex: b.rowIndex,
          modality: 'text',
          textValue: b.text,
          labelValue: b.label,
          status: isMatch ? 'match' : 'mismatch',
          predictedLabel: result.suggested_label || b.label,
          reasoning: result.reasoning || (isMatch ? 'Label verified against text semantic context.' : 'Semantic discrepancy detected.'),
          reviewedStatus: 'pending',
          correctedLabel: isMatch ? b.label : result.suggested_label,
        });

        if (!isMatch) {
          issues.push({
            id: `issue-annot-${datasetId}-${b.rowIndex}-${labelCol}`,
            datasetId,
            datasetName,
            rowIndex: b.rowIndex,
            column: labelCol,
            issueType: 'annotation_mismatch',
            severity: 'high',
            modality: 'text',
            originalValue: b.label,
            suggestedValue: result.suggested_label,
            explanation: `AI Annotation Mismatch: ${result.reasoning || `Assigned label '${b.label}' does not match text content.`}`,
            reviewStatus: 'pending',
          });
        }
      }
    }

    return {
      items,
      issues,
      success: true,
      message: `Verified ${batch.length} annotations using Gemini 2.5 Flash model. Found ${issues.length} potential label mismatches.`,
    };
  } catch (err: any) {
    return {
      items: [],
      issues: [],
      success: false,
      message: `AI verification failed: ${err?.message || 'Network or authentication error.'}`,
    };
  }
}
