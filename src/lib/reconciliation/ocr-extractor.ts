/**
 * OCR Document Extraction Engine
 * Provides dual OCR strategies:
 * 1. Tesseract.js: 100% Free, local / client-side execution, zero external API keys needed.
 * 2. Gemini 1.5 Flash Vision: Free tier (1,500 requests/day), cloud AI with table understanding.
 */

import { createWorker } from "tesseract.js";
import { ParsedRow } from "./file-parser";

export interface OcrExtractionResult {
  success: boolean;
  rawText: string;
  rows: ParsedRow[];
  headers: string[];
  engineUsed: "tesseract" | "gemini-vision" | "fallback";
  error?: string;
}

/**
 * Parses raw text extracted via OCR into structured table rows
 * Detects common invoice line patterns: Date, Doc No, Reference, Amount (Debit/Credit)
 */
export function parseOcrTextToRows(rawText: string): { headers: string[]; rows: ParsedRow[] } {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const parsedRows: ParsedRow[] = [];
  const headers = ["docDate", "docNo", "description", "debit", "credit", "amount"];

  // Regex patterns to identify dates and currency amounts in OCR lines (supports Indian & International)
  const dateRegex = /(\b\d{1,4}[-/.]\d{1,2}[-/.]\d{2,4}\b|\b\d{1,2}-[A-Za-z]{3}-\d{2,4}\b)/;
  const amountRegex = /\b\d+(?:,\d+)*(?:\.\d{2})\b/g;

  for (const line of lines) {
    // Check if line contains a date or amounts
    const dateMatch = line.match(dateRegex);
    const amountMatches = line.match(amountRegex);

    if (dateMatch || (amountMatches && amountMatches.length > 0)) {
      const tokens = line.split(/\s{2,}|\t/).filter((t) => t.trim().length > 0);

      // Attempt to structure line tokens
      const row: ParsedRow = {
        rawLine: line,
        docDate: dateMatch ? dateMatch[0] : "",
        docNo: "",
        description: line,
        amount: "",
      };

      if (tokens.length >= 3) {
        row.docDate = tokens[0] || row.docDate;
        row.docNo = tokens[1] || "";
        row.description = tokens.slice(2, -1).join(" ") || line;
        row.amount = tokens[tokens.length - 1] || "";
      } else if (amountMatches && amountMatches.length > 0) {
        row.amount = amountMatches[amountMatches.length - 1];
        // Guess docNo from first non-date, non-amount token
        const words = line.split(/\s+/).filter((w) => !amountMatches.includes(w) && (!dateMatch || w !== dateMatch[0]));
        const candidateDocNo = words.find((w) => /^[A-Za-z0-9#-]{1,25}$/.test(w) && !["dr", "cr", "to", "by"].includes(w.toLowerCase()));
        if (candidateDocNo) {
          row.docNo = candidateDocNo;
        }
      }

      parsedRows.push(row);
    }
  }

  // Fallback if no structured financial lines were recognized: treat lines as row records
  if (parsedRows.length === 0 && lines.length > 0) {
    for (const line of lines) {
      parsedRows.push({
        rawLine: line,
        description: line,
        amount: "",
      });
    }
  }

  return {
    headers: headers,
    rows: parsedRows,
  };
}

/**
 * Extracts tabular data from an image file using Tesseract.js (100% Free & Local)
 */
export async function performLocalTesseractOcr(
  imageFile: File | Blob
): Promise<OcrExtractionResult> {
  let worker: any = null;
  try {
    worker = await createWorker("eng");
    const ret = await worker.recognize(imageFile);
    await worker.terminate();

    const rawText = ret.data.text || "";
    const { headers, rows } = parseOcrTextToRows(rawText);

    return {
      success: true,
      rawText,
      rows,
      headers,
      engineUsed: "tesseract",
    };
  } catch (err: any) {
    if (worker) {
      try {
        await worker.terminate();
      } catch {}
    }
    return {
      success: false,
      rawText: "",
      rows: [],
      headers: [],
      engineUsed: "tesseract",
      error: `Tesseract OCR extraction failed: ${err.message || "Unknown error"}`,
    };
  }
}
