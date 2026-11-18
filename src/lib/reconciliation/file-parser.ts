import * as XLSX from "xlsx";

// ── Types ───────────────────────────────────────────────────────────────────

export interface ParsedRow {
  [key: string]: any;
}

export interface ParseResult {
  success: boolean;
  fileName: string;
  fileType: "xlsx" | "xls" | "csv" | "pdf" | "image" | "unknown";
  detectedMime: string;
  sheetName?: string;
  availableSheets?: string[];
  totalRows: number;
  headers: string[];
  rows: ParsedRow[];
  error?: string;
  isScannedPdf?: boolean;
  isEncrypted?: boolean;
}

export interface ParseOptions {
  maxSizeMB?: number;
  targetSheet?: string;
  password?: string;
}

const DEFAULT_MAX_SIZE_MB = 50;

// ── FR-IN-02: Magic Bytes Detector ──────────────────────────────────────────

export function detectFileTypeFromMagicBytes(buffer: Uint8Array): {
  type: "xlsx" | "xls" | "csv" | "pdf" | "image" | "unknown";
  mime: string;
} {
  if (!buffer || buffer.length < 4) {
    return { type: "unknown", mime: "application/octet-stream" };
  }

  // PDF: %PDF (0x25 0x50 0x44 0x46)
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return { type: "pdf", mime: "application/pdf" };
  }

  // ZIP / Modern Office (XLSX, XLSM): PK.. (0x50 0x4B 0x03 0x04)
  if (buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04) {
    return { type: "xlsx", mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" };
  }

  // Legacy Excel (XLS, BIFF8): 0xD0 0xCF 0x11 0xE0
  if (buffer[0] === 0xd0 && buffer[1] === 0xcf && buffer[2] === 0x11 && buffer[3] === 0xe0) {
    return { type: "xls", mime: "application/vnd.ms-excel" };
  }

  // PNG: 0x89 0x50 0x4E 0x47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return { type: "image", mime: "image/png" };
  }

  // JPEG: 0xFF 0xD8 0xFF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { type: "image", mime: "image/jpeg" };
  }

  // TIFF: II*. (0x49 0x49 0x2A 0x00) or MM.* (0x4D 0x4D 0x00 0x2A)
  if (
    (buffer[0] === 0x49 && buffer[1] === 0x49 && buffer[2] === 0x2a && buffer[3] === 0x00) ||
    (buffer[0] === 0x4d && buffer[1] === 0x4d && buffer[2] === 0x00 && buffer[3] === 0x2a)
  ) {
    return { type: "image", mime: "image/tiff" };
  }

  // Plain Text / CSV check (ASCII / UTF-8 text bytes)
  let isText = true;
  const sampleLength = Math.min(buffer.length, 512);
  for (let i = 0; i < sampleLength; i++) {
    const byte = buffer[i];
    // Check if byte is outside printable ASCII / UTF-8 control codes
    if (byte < 0x09 || (byte > 0x0d && byte < 0x20 && byte !== 0x1b)) {
      isText = false;
      break;
    }
  }

  if (isText) {
    return { type: "csv", mime: "text/csv" };
  }

  return { type: "unknown", mime: "application/octet-stream" };
}

// ── FR-IN-04: CSV Delimiter & Encoding Detector ─────────────────────────────

export function detectCsvDelimiter(text: string): string {
  const sampleLines = text.split(/\r?\n/).slice(0, 5).filter(Boolean);
  if (sampleLines.length === 0) return ",";

  const delimiters = [",", ";", "\t", "|"];
  const counts: Record<string, number[]> = { ",": [], ";": [], "\t": [], "|": [] };

  for (const line of sampleLines) {
    for (const d of delimiters) {
      counts[d].push((line.split(d).length - 1));
    }
  }

  // Find delimiter with highest consistent frequency
  let bestDelimiter = ",";
  let maxConsistentScore = 0;

  for (const d of delimiters) {
    const list = counts[d];
    const avg = list.reduce((a, b) => a + b, 0) / list.length;
    const isConsistent = list.every((count) => count === list[0] && count > 0);
    const score = isConsistent ? avg * 2 : avg;

    if (score > maxConsistentScore) {
      maxConsistentScore = score;
      bestDelimiter = d;
    }
  }

  return bestDelimiter;
}

// ── FR-IN-03: Multi-Sheet Financial Ledger Detector ─────────────────────────

export function detectLedgerSheet(
  workbook: XLSX.WorkBook,
  userSelectedSheet?: string
): string {
  if (userSelectedSheet && workbook.SheetNames.includes(userSelectedSheet)) {
    return userSelectedSheet;
  }

  if (workbook.SheetNames.length === 1) {
    return workbook.SheetNames[0];
  }

  const ignoreWords = ["cover", "notes", "readme", "instruction", "metadata", "blank"];
  const financialKeywords = [
    "date", "doc", "invoice", "voucher", "bill", "ref", "amount",
    "debit", "credit", "balance", "particulars", "narration", "dr", "cr"
  ];

  let bestSheet = workbook.SheetNames[0];
  let highestScore = -1;

  for (const sheetName of workbook.SheetNames) {
    const lowerName = sheetName.toLowerCase().trim();
    if (ignoreWords.some((w) => lowerName.includes(w))) {
      continue;
    }

    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) continue;

    // Convert sheet to json array
    const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, blankrows: false });
    if (!rows || rows.length < 2) continue;

    let score = rows.length; // Row count factor

    // Inspect first 10 rows for financial headers
    for (const row of rows.slice(0, 10)) {
      if (Array.isArray(row)) {
        for (const cell of row) {
          const str = String(cell || "").toLowerCase();
          if (financialKeywords.some((k) => str.includes(k))) {
            score += 50; // Heavy bonus for financial column keywords
          }
        }
      }
    }

    if (score > highestScore) {
      highestScore = score;
      bestSheet = sheetName;
    }
  }

  return bestSheet;
}

// ── Universal File Ingestion Engine (FR-IN-01 to FR-IN-08) ──────────────────

export async function parseStatementFile(
  file: File | Blob,
  fileName: string,
  options: ParseOptions = {}
): Promise<ParseResult> {
  const maxSize = (options.maxSizeMB || DEFAULT_MAX_SIZE_MB) * 1024 * 1024;

  // FR-IN-08: File Size Validation
  if (file.size > maxSize) {
    return {
      success: false,
      fileName,
      fileType: "unknown",
      detectedMime: file.type || "unknown",
      totalRows: 0,
      headers: [],
      rows: [],
      error: `File size exceeds the limit (${(file.size / (1024 * 1024)).toFixed(1)}MB > ${options.maxSizeMB || DEFAULT_MAX_SIZE_MB}MB).`,
    };
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    // FR-IN-02: Content-based type detection
    const { type: detectedType, mime: detectedMime } = detectFileTypeFromMagicBytes(bytes);
    const ext = fileName.split(".").pop()?.toLowerCase() || "";

    const effectiveType = detectedType !== "unknown" ? detectedType : ext;

    // ── 1. Excel / Spreadsheet Ingestion (.xlsx, .xls, .xlsm) ──
    if (effectiveType === "xlsx" || effectiveType === "xls" || ext === "xlsx" || ext === "xls" || ext === "xlsm") {
      try {
        const workbook = XLSX.read(bytes, {
          type: "array",
          cellDates: true,
          password: options.password,
        });

        // FR-IN-03: Detect which sheet contains the ledger
        const sheetName = detectLedgerSheet(workbook, options.targetSheet);
        const worksheet = workbook.Sheets[sheetName];

        if (!worksheet) {
          return {
            success: false,
            fileName,
            fileType: "xlsx",
            detectedMime,
            totalRows: 0,
            headers: [],
            rows: [],
            error: `Unable to read ledger sheet "${sheetName}".`,
          };
        }

        // Raw rows matrix
        const rawMatrix = XLSX.utils.sheet_to_json<any[]>(worksheet, {
          header: 1,
          blankrows: false,
          defval: "",
        });

        if (rawMatrix.length === 0) {
          return {
            success: true,
            fileName,
            fileType: "xlsx",
            detectedMime,
            sheetName,
            availableSheets: workbook.SheetNames,
            totalRows: 0,
            headers: [],
            rows: [],
          };
        }

        // Find header row (skip top metadata, title blocks, empty rows)
        let headerRowIndex = 0;
        let maxFilledCells = 0;

        for (let i = 0; i < Math.min(rawMatrix.length, 12); i++) {
          const row = rawMatrix[i];
          if (Array.isArray(row)) {
            const filledCount = row.filter((c) => String(c).trim() !== "").length;
            if (filledCount > maxFilledCells) {
              maxFilledCells = filledCount;
              headerRowIndex = i;
            }
          }
        }

        const rawHeaders = (rawMatrix[headerRowIndex] || []).map((h: any, idx: number) => {
          const str = String(h || "").trim();
          return str || `Column_${idx + 1}`;
        });

        const rows: ParsedRow[] = [];
        for (let r = headerRowIndex + 1; r < rawMatrix.length; r++) {
          const rowData = rawMatrix[r];
          if (!Array.isArray(rowData)) continue;

          // Check if row has any non-empty cell
          const hasContent = rowData.some((cell) => String(cell || "").trim() !== "");
          if (!hasContent) continue;

          const rowObj: ParsedRow = {};
          rawHeaders.forEach((header: string, cIdx: number) => {
            rowObj[header] = rowData[cIdx] !== undefined ? rowData[cIdx] : "";
          });
          rows.push(rowObj);
        }

        return {
          success: true,
          fileName,
          fileType: "xlsx",
          detectedMime,
          sheetName,
          availableSheets: workbook.SheetNames,
          totalRows: rows.length,
          headers: rawHeaders,
          rows,
        };
      } catch (err: any) {
        // FR-IN-05: Encrypted / password check
        if (err.message?.toLowerCase().includes("password") || err.message?.toLowerCase().includes("encrypted")) {
          return {
            success: false,
            fileName,
            fileType: "xlsx",
            detectedMime,
            totalRows: 0,
            headers: [],
            rows: [],
            isEncrypted: true,
            error: "This Excel spreadsheet is password protected. Please provide decrypted file or password.",
          };
        }
        throw err;
      }
    }

    // ── 2. CSV / TSV / TXT Ingestion ──
    if (effectiveType === "csv" || ext === "csv" || ext === "tsv" || ext === "txt") {
      let text = new TextDecoder("utf-8").decode(bytes);
      // Strip UTF-8 BOM if present
      if (text.charCodeAt(0) === 0xfeff) {
        text = text.slice(1);
      }

      // FR-IN-04: Auto delimiter detection
      const delimiter = ext === "tsv" ? "\t" : detectCsvDelimiter(text);

      const workbook = XLSX.read(text, { type: "string", FS: delimiter });
      const firstSheet = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheet];

      const rows = XLSX.utils.sheet_to_json<ParsedRow>(worksheet, { defval: "" });
      const headers = rows.length > 0 ? Object.keys(rows[0]) : [];

      return {
        success: true,
        fileName,
        fileType: "csv",
        detectedMime: "text/csv",
        totalRows: rows.length,
        headers,
        rows,
      };
    }

    // ── 3. PDF Ingestion (.pdf) ──
    if (effectiveType === "pdf" || ext === "pdf") {
      try {
        const formData = new FormData();
        formData.append("file", file);

        const apiRes = await fetch("/api/reconciliation/parse-pdf", {
          method: "POST",
          body: formData,
        });

        if (!apiRes.ok) {
          const errJson = await apiRes.json().catch(() => ({}));
          throw new Error(errJson.error || `HTTP ${apiRes.status}`);
        }

        const parseResult = await apiRes.json();

        // If the server extracted rows successfully
        if (parseResult.success && parseResult.rows && parseResult.rows.length > 0) {
          return {
            success: true,
            fileName,
            fileType: "pdf",
            detectedMime: "application/pdf",
            isScannedPdf: false,
            totalRows: parseResult.rows.length,
            headers: parseResult.headers || Object.keys(parseResult.rows[0]),
            rows: parseResult.rows,
          };
        }

        // If it's a scanned PDF or no digital text rows were detected, fallback to Tesseract OCR
        if (parseResult.isScannedPdf || (parseResult.rows && parseResult.rows.length === 0)) {
          try {
            const { performLocalTesseractOcr } = await import("./ocr-extractor");
            const ocrResult = await performLocalTesseractOcr(file);

            if (ocrResult.success && ocrResult.rows.length > 0) {
              return {
                success: true,
                fileName,
                fileType: "pdf",
                detectedMime: "application/pdf",
                isScannedPdf: true,
                totalRows: ocrResult.rows.length,
                headers: ocrResult.headers,
                rows: ocrResult.rows,
              };
            }
          } catch (ocrErr) {
            console.warn("Client OCR fallback attempt completed:", ocrErr);
          }

          return {
            success: true,
            fileName,
            fileType: "pdf",
            detectedMime: "application/pdf",
            isScannedPdf: true,
            totalRows: 0,
            headers: ["Notice"],
            rows: [],
            error: "PDF appears to be a scanned image without an embedded digital text layer. OCR extraction recommended.",
          };
        }

        return parseResult;
      } catch (pdfErr: any) {
        return {
          success: false,
          fileName,
          fileType: "pdf",
          detectedMime: "application/pdf",
          totalRows: 0,
          headers: [],
          rows: [],
          error: `Failed to parse PDF document: ${pdfErr.message}`,
        };
      }
    }

    // ── 4. Image Statement (OCR with Tesseract.js) ──
    if (effectiveType === "image" || ["png", "jpg", "jpeg", "tiff"].includes(ext)) {
      try {
        const { performLocalTesseractOcr } = await import("./ocr-extractor");
        const ocrResult = await performLocalTesseractOcr(file);

        if (ocrResult.success && ocrResult.rows.length > 0) {
          return {
            success: true,
            fileName,
            fileType: "image",
            detectedMime,
            isScannedPdf: true,
            totalRows: ocrResult.rows.length,
            headers: ocrResult.headers,
            rows: ocrResult.rows,
          };
        }

        return {
          success: true,
          fileName,
          fileType: "image",
          detectedMime,
          isScannedPdf: true,
          totalRows: 0,
          headers: ["OCR_Raw_Text"],
          rows: ocrResult.rawText ? [{ OCR_Raw_Text: ocrResult.rawText }] : [],
          error: ocrResult.error || "OCR processed the image, but could not detect distinct tabular transaction lines.",
        };
      } catch (ocrErr: any) {
        return {
          success: false,
          fileName,
          fileType: "image",
          detectedMime,
          totalRows: 0,
          headers: [],
          rows: [],
          error: `OCR execution error: ${ocrErr.message}`,
        };
      }
    }

    return {
      success: false,
      fileName,
      fileType: "unknown",
      detectedMime,
      totalRows: 0,
      headers: [],
      rows: [],
      error: `Unsupported file format (.${ext}). Supported formats: .xlsx, .xls, .xlsm, .csv, .tsv, .txt, .pdf, .png, .jpg`,
    };
  } catch (err: any) {
    // FR-IN-08: Never crash on corrupt files; report which file failed and why
    return {
      success: false,
      fileName,
      fileType: "unknown",
      detectedMime: "unknown",
      totalRows: 0,
      headers: [],
      rows: [],
      error: `Corrupt or unreadable file "${fileName}": ${err.message || "Unknown read error"}`,
    };
  }
}

// ── FR-IN-07: Multi-File Ingestion & Date Order Merge ────────────────────────

export function mergeStatementRowsByDate(allRows: ParsedRow[], dateKey: string = "docDate"): ParsedRow[] {
  return [...allRows].sort((a, b) => {
    const dateA = new Date(a[dateKey] || 0).getTime();
    const dateB = new Date(b[dateKey] || 0).getTime();
    return dateA - dateB;
  });
}
