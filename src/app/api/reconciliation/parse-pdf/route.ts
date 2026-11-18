import { NextRequest, NextResponse } from "next/server";

interface ExtractedRow {
  docDate?: string;
  docNo?: string;
  refNo?: string;
  docType?: "Invoice" | "Payment" | "Credit Note";
  description?: string;
  debit?: number | string;
  credit?: number | string;
  amount?: number;
  [key: string]: any;
}

// Cleans string by stripping non-printable ASCII and replacement characters
function cleanString(str: any): string {
  if (typeof str !== "string") return String(str || "");
  return str
    .replace(/[\uFFFD\u0000-\u0008\u000B-\u000C\u000E-\u001F]/g, "")
    .trim();
}

// Parses financial amount from text
function parseAmount(val: string): number {
  if (!val) return 0;
  const cleaned = val.replace(/[^0-9.-]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

// Parses raw PDF text into structured financial ledger rows
function parseTextToFinancialRows(text: string): { headers: string[]; rows: ExtractedRow[] } {
  const clean = cleanString(text);
  const rawLines = clean.split(/\r?\n/).filter((l) => l.trim().length > 0);

  const dateRegex = /(\b\d{1,4}[-/.]\d{1,2}[-/.]\d{2,4}\b|\b\d{1,2}-[A-Za-z]{3}-\d{2,4}\b)/;
  // Universal currency regex matching both Indian numbering (2,16,190.00 / 14,60,445.00) & International (216,190.00)
  const amountRegex = /\b\d+(?:,\d+)*(?:\.\d{2})\b/g;

  const rows: ExtractedRow[] = [];
  const headers = ["docDate", "docNo", "docType", "refNo", "description", "debit", "credit", "amount"];

  let lastSeenDate = "";

  for (let idx = 0; idx < rawLines.length; idx++) {
    const rawLine = rawLines[idx];
    const line = rawLine.trim();

    if (line.startsWith("--") && line.endsWith("--")) continue; // Page markers

    // Skip table header lines
    const lower = line.toLowerCase();
    if (
      (lower.includes("vch no") || lower.includes("debit") || lower.includes("credit") || lower.includes("particulars")) &&
      !line.match(amountRegex)
    ) {
      continue;
    }

    // Skip footer / summary lines
    if (
      lower.startsWith("total") ||
      lower.startsWith("grand total") ||
      lower.startsWith("closing balance") ||
      lower.includes("brought forward") ||
      lower.includes("carried forward")
    ) {
      continue;
    }

    const dateMatch = line.match(dateRegex);
    if (dateMatch) {
      lastSeenDate = dateMatch[0];
    }

    const amountMatches = line.match(amountRegex);
    if (!amountMatches || amountMatches.length === 0) continue;

    // Skip balance rows where two identical totals appear side-by-side (e.g. 14,60,445.00  14,60,445.00)
    if (amountMatches.length >= 2 && amountMatches[0] === amountMatches[1]) {
      continue;
    }

    const dateStr = dateMatch ? dateMatch[0] : lastSeenDate;
    const withoutDate = dateMatch ? line.replace(dateMatch[0], "").trim() : line;

    // Extract amounts
    const numericAmounts = amountMatches.map(parseAmount);
    let debit = 0;
    let credit = 0;
    let amount = 0;

    if (numericAmounts.length >= 2) {
      debit = numericAmounts[0];
      credit = numericAmounts[1];
      amount = debit !== 0 ? debit : credit;
    } else {
      amount = numericAmounts[0];
      // When single amount, check column position in raw line (Credit is right-aligned)
      const amountIndex = rawLine.lastIndexOf(amountMatches[0]);
      if (amountIndex > 28 || lower.includes("cr") || lower.includes("receipt") || lower.includes("payment")) {
        credit = amount;
      } else {
        debit = amount;
      }
    }

    // Infer Doc Type
    let docType: "Invoice" | "Payment" | "Credit Note" = "Invoice";
    if (credit > 0 && debit === 0) {
      docType = "Payment";
    } else if (lower.includes("credit") || lower.includes("cn-") || lower.includes("return")) {
      docType = "Credit Note";
    }

    // Extract Doc No / Voucher No
    const withoutAmounts = withoutDate.replace(amountRegex, "").trim();
    const words = withoutAmounts.split(/\s+/).filter(Boolean);

    // Skip summary footer rows that have multiple amounts with no voucher or document number
    if (words.length === 0 && numericAmounts.length >= 2) {
      continue;
    }

    let docNo = "";
    let refNo = "";
    let description = "";

    // Candidate for voucher number: can be alphanumeric (272627MU10350) or numeric (6, 13, 22, 112)
    const docNoCandidate = words.find(
      (w) =>
        /^[A-Za-z0-9#\/-]{1,30}$/.test(w) &&
        !["dr", "cr", "to", "by", "ltd", "pvt", "page"].includes(w.toLowerCase())
    );

    if (docNoCandidate) {
      docNo = docNoCandidate;
      refNo = docNoCandidate;
      description = words.filter((w) => w !== docNoCandidate).join(" ");
    } else {
      docNo = `ROW-${rows.length + 1}`;
      refNo = docNo;
      description = words.join(" ");
    }

    rows.push({
      docDate: dateStr,
      docNo,
      refNo,
      docType,
      description: description || docNo,
      debit: debit || "",
      credit: credit || "",
      amount: Math.abs(amount),
    });
  }

  return { headers, rows };
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided in form data." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Dynamic import to prevent client bundle leak
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfModule: any = await import("pdf-parse");
    const PDFParse = pdfModule.PDFParse ?? pdfModule.default?.PDFParse ?? pdfModule.default ?? pdfModule;

    if (!PDFParse) {
      return NextResponse.json({ error: "PDF parser library failed to initialize." }, { status: 500 });
    }

    try {
      const { pathToFileURL } = await import("url");
      const { createRequire } = await import("module");
      const require = createRequire(import.meta.url);
      const workerPath = require.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs");
      PDFParse.setWorker(pathToFileURL(workerPath).href);
    } catch (workerErr) {
      console.warn("Could not set custom pdf worker URL, using default:", workerErr);
    }

    const parser = new PDFParse({ data: buffer });
    let text = "";
    let extractedRows: ExtractedRow[] = [];
    let headers: string[] = ["docDate", "docNo", "docType", "refNo", "description", "debit", "credit", "amount"];

    // 1. Try vector table extraction first
    try {
      const tableResult = await parser.getTable();
      if (tableResult && tableResult.pages && tableResult.pages.length > 0) {
        for (const page of tableResult.pages) {
          if (page.tables && page.tables.length > 0) {
            for (const table of page.tables) {
              if (table.length >= 2) {
                // First row as headers
                const rawHeaders = table[0].map(cleanString).filter(Boolean);
                if (rawHeaders.length >= 2) {
                  headers = rawHeaders;
                  for (let r = 1; r < table.length; r++) {
                    const rowCells = table[r].map(cleanString);
                    if (rowCells.some((c: string) => c.length > 0)) {
                      const rowObj: ExtractedRow = {};
                      rawHeaders.forEach((h: string, hIdx: number) => {
                        rowObj[h] = rowCells[hIdx] || "";
                      });
                      extractedRows.push(rowObj);
                    }
                  }
                }
              }
            }
          }
        }
      }
    } catch (tblErr) {
      console.warn("Table extraction yielded no grid tables, falling back to text stream:", tblErr);
    }

    // 2. Fallback to text layer if no grid tables found
    if (extractedRows.length === 0) {
      const textResult = await parser.getText();
      text = textResult?.text || "";

      if (text.trim().length > 0) {
        const parsed = parseTextToFinancialRows(text);
        extractedRows = parsed.rows;
        if (parsed.headers.length > 0) {
          headers = parsed.headers;
        }
      }
    }

    await parser.destroy();

    // Check if scanned document (no digital text or zero detected transactions)
    const isScanned = extractedRows.length === 0 && text.trim().length < 30;

    return NextResponse.json({
      success: true,
      fileName: file.name,
      fileType: "pdf",
      detectedMime: "application/pdf",
      totalRows: extractedRows.length,
      headers,
      rows: extractedRows,
      isScannedPdf: isScanned,
      rawTextSample: text.slice(0, 500),
      error: isScanned
        ? "PDF appears to be a scanned image or document without a digital text layer. OCR processing recommended."
        : undefined,
    });
  } catch (err: any) {
    console.error("PDF Parse error in API route:", err);
    return NextResponse.json(
      {
        success: false,
        error: `Failed to parse PDF: ${err.message || "Unknown error"}`,
        totalRows: 0,
        headers: [],
        rows: [],
      },
      { status: 500 }
    );
  }
}
