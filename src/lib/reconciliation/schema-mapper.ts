import { StatementLine, SystemLine } from "@/app/(app)/customer-reconciliation/page";
import { ParsedRow } from "./file-parser";

// ── Layer 2: Intelligent Schema Mapping ─────────────────────────────────────

export interface SchemaMappingConfig {
  docTypeCol?: string;
  docNoCol?: string;
  docDateCol?: string;
  refNoCol?: string;
  amountCol?: string;
  debitCol?: string;
  creditCol?: string;
  remarksCol?: string;
}

// Clean Currency & Number Strings (handles commas, ₹, $, negative in parens)
export function parseCleanAmount(raw: any): number {
  if (typeof raw === "number") return isNaN(raw) ? 0 : raw;
  if (!raw) return 0;

  let str = String(raw).trim();

  // Handle accounting negative in parentheses: (1,234.50) -> -1234.50
  let isNegative = false;
  if (str.startsWith("(") && str.endsWith(")")) {
    isNegative = true;
    str = str.slice(1, -1);
  } else if (str.endsWith("Dr") || str.endsWith("dr") || str.endsWith("-")) {
    isNegative = true;
  }

  // Remove currency signs, commas, spaces
  str = str.replace(/[₹$,\sA-Za-z]/g, "");
  const num = parseFloat(str);

  if (isNaN(num)) return 0;
  return isNegative ? -Math.abs(num) : num;
}

// Clean & Normalize Dates
export function parseCleanDate(raw: any): string {
  if (!raw) return "";

  // If already a JS Date
  if (raw instanceof Date) {
    if (isNaN(raw.getTime())) return "";
    return `${raw.getMonth() + 1}/${raw.getDate()}/${raw.getFullYear()}`;
  }

  const str = String(raw).trim();
  const timestamp = Date.parse(str);
  if (!isNaN(timestamp)) {
    const d = new Date(timestamp);
    return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
  }

  return str;
}

// Clean and sanitize string fields to prevent corrupted binary characters or replacement glyphs
export function sanitizeCleanField(val: any, fallback: string): string {
  if (val === undefined || val === null) return fallback;
  const str = String(val)
    .replace(/[\uFFFD\u0000-\u0008\u000B-\u000C\u000E-\u001F]/g, "")
    .trim();
  if (!str || /^[?\s\uFFFD\u25C6\u25A0<>]+$/.test(str) || str.length < 1) {
    return fallback;
  }
  return str;
}

// Auto-Detect Headers from Dynamic Client Schemas
export function autoDetectSchemaMapping(headers: string[]): SchemaMappingConfig {
  const config: SchemaMappingConfig = {};

  const docNoKeywords = [
    "doc no", "document no", "invoice no", "inv no", "bill no", "voucher no",
    "doc #", "entry no", "bill number", "reference number", "docno", "invoiceno", "doc_no"
  ];
  const docTypeKeywords = [
    "type", "doc type", "document type", "trans type", "transaction type",
    "voucher type", "particulars", "description", "doctype", "doc_type"
  ];
  const dateKeywords = [
    "date", "doc date", "document date", "posting date", "invoice date",
    "bill date", "txn date", "transaction date", "value date", "docdate", "postingdate", "doc_date"
  ];
  const refKeywords = [
    "ref no", "reference", "utr", "cheque no", "chq no", "ref", "po no",
    "order no", "external doc no", "refno", "ref_no"
  ];
  const amountKeywords = [
    "amount", "net amount", "total amount", "inv amount", "bill amount", "total", "net", "value"
  ];
  const debitKeywords = ["debit", "dr", "debit amount", "withdrawal"];
  const creditKeywords = ["credit", "cr", "credit amount", "deposit"];
  const remarksKeywords = ["remarks", "narration", "notes", "memo", "comment", "description"];

  headers.forEach((h) => {
    const lower = h.toLowerCase().trim();

    if (!config.docNoCol && docNoKeywords.some((k) => lower === k || lower.includes(k))) {
      config.docNoCol = h;
    } else if (!config.docDateCol && dateKeywords.some((k) => lower === k || lower.includes(k))) {
      config.docDateCol = h;
    } else if (!config.docTypeCol && docTypeKeywords.some((k) => lower === k || lower.includes(k))) {
      config.docTypeCol = h;
    } else if (!config.refNoCol && refKeywords.some((k) => lower === k || lower.includes(k))) {
      config.refNoCol = h;
    } else if (!config.debitCol && debitKeywords.some((k) => lower === k || lower.includes(k))) {
      config.debitCol = h;
    } else if (!config.creditCol && creditKeywords.some((k) => lower === k || lower.includes(k))) {
      config.creditCol = h;
    } else if (!config.amountCol && amountKeywords.some((k) => lower === k || lower.includes(k))) {
      config.amountCol = h;
    } else if (!config.remarksCol && remarksKeywords.some((k) => lower === k || lower.includes(k))) {
      config.remarksCol = h;
    }
  });

  return config;
}

// ── Sign logic ───────────────────────────────────────────────────────────────
//
// Rules:
//   Invoice               → positive  (+)   e.g. +25,000
//   Payment / Credit Note → negative  (-)   e.g. -25,000
//
// IMPORTANT: sign is applied ONLY when docType was explicitly recognised from
// the file (i.e. the type column contained "Invoice", "Payment", "Credit Memo",
// etc.).  For unknown types ("BOB", "Fly", "Opening", "Closing", …) the raw
// amount from the file is used as-is so we do not silently flip signs.

export function applyDocTypeSign(rawAmount: number, docType: "Invoice" | "Payment" | "Credit Note"): number {
  const absAmt = Math.abs(rawAmount);
  if (docType === "Invoice") return absAmt;
  return -absAmt; // Payment / Credit Note reduce outstanding → negative
}

// Returns true when the raw type string maps to a known accounting doc type.
function detectDocType(rawType: any): { docType: "Invoice" | "Payment" | "Credit Note"; recognised: boolean } {
  if (!rawType) return { docType: "Invoice", recognised: false };
  const t = String(rawType).toLowerCase().trim();

  if (t.includes("pay") || t.includes("receipt") || t.includes("bank")) {
    return { docType: "Payment", recognised: true };
  }
  if (
    t === "credit memo" ||
    t.includes("credit memo") ||
    t.includes("cr note") ||
    t.includes("credit note") ||
    t.includes("return")
  ) {
    return { docType: "Credit Note", recognised: true };
  }
  if (t.includes("invoice") || t === "inv" || t.includes("bill")) {
    return { docType: "Invoice", recognised: true };
  }
  // Unrecognised (BOB, Fly, Opening, Closing, …)
  return { docType: "Invoice", recognised: false };
}

// Standardize Raw Client Rows into Internal Unified Statement Lines
export function mapRowsToStatementLines(
  rows: ParsedRow[],
  headers: string[],
  overrideConfig?: SchemaMappingConfig
): StatementLine[] {
  const config = overrideConfig || autoDetectSchemaMapping(headers);

  return rows.map((row, idx) => {
    // Document Number
    const rawDocNo = config.docNoCol
      ? row[config.docNoCol]
      : row.docNo || row.invoiceNo || row[headers[0]];
    const docNo = sanitizeCleanField(rawDocNo, `STMT-${idx + 1}`);

    // Document Type
    const rawType = config.docTypeCol ? row[config.docTypeCol] : row.docType || row.type;
    const { docType, recognised } = detectDocType(rawType);

    // Date
    const rawDate = config.docDateCol ? row[config.docDateCol] : row.docDate || row.date || "";
    const docDate = parseCleanDate(rawDate);

    // Ref No
    const rawRef = config.refNoCol ? row[config.refNoCol] : row.refNo || row.ref || docNo;
    const refNo = sanitizeCleanField(rawRef, docNo);

    // Amount
    let amount = 0;
    const amountVal = config.amountCol ? row[config.amountCol] : row.amount;

    if (amountVal !== undefined && amountVal !== "") {
      const rawAmount = parseCleanAmount(amountVal);
      // Apply sign ONLY when doc type is a known accounting type
      amount = recognised ? applyDocTypeSign(rawAmount, docType) : rawAmount;
    } else if (config.debitCol || config.creditCol || row.debit !== undefined || row.credit !== undefined) {
      // Separate Debit / Credit columns → both are POSITIVE amounts, total = Debit + Credit
      const debit = config.debitCol
        ? parseCleanAmount(row[config.debitCol])
        : row.debit ? parseCleanAmount(row.debit) : 0;
      const credit = config.creditCol
        ? parseCleanAmount(row[config.creditCol])
        : row.credit ? parseCleanAmount(row.credit) : 0;
      // Both debit and credit contribute positively: total = |debit| + |credit|
      amount = Math.abs(debit) + Math.abs(credit);
    }

    const remarksRaw = config.remarksCol ? row[config.remarksCol] : row.description || row.remarks || "";
    const remarks = sanitizeCleanField(remarksRaw, "");

    return {
      id: `stmt_line_${Date.now()}_${idx}`,
      docType,
      docNo,
      docDate,
      refNo,
      amount,
      matchedCleEntryNo: "",
      differenceAmount: 0,
      remarks,
      status: "Unmatched" as const,
    };
  });
}

// Standardize Raw Client Rows into Internal Unified ERP System Lines
export function mapRowsToSystemLines(
  rows: ParsedRow[],
  headers: string[],
  overrideConfig?: SchemaMappingConfig
): SystemLine[] {
  const config = overrideConfig || autoDetectSchemaMapping(headers);

  return rows.map((row, idx) => {
    const rawDocNo = config.docNoCol
      ? row[config.docNoCol]
      : row.docNo || row.invoiceNo || row[headers[0]];
    const docNo = sanitizeCleanField(rawDocNo, `ERP-${idx + 1}`);

    // Document Type
    const rawType = config.docTypeCol ? row[config.docTypeCol] : row.docType || row.type;
    const { docType, recognised } = detectDocType(rawType);

    const rawDate = config.docDateCol ? row[config.docDateCol] : row.postingDate || row.docDate || row.date || "";
    const postingDate = parseCleanDate(rawDate);
    const rawRef = config.refNoCol ? row[config.refNoCol] : row.refNo || row.ref || docNo;
    const refNo = sanitizeCleanField(rawRef, docNo);

    // Amount
    let amount = 0;
    const amountVal = config.amountCol ? row[config.amountCol] : row.amount;

    if (amountVal !== undefined && amountVal !== "") {
      const rawAmount = parseCleanAmount(amountVal);
      // Apply sign ONLY when doc type is a known accounting type
      amount = recognised ? applyDocTypeSign(rawAmount, docType) : rawAmount;
    } else if (config.debitCol || config.creditCol || row.debit !== undefined || row.credit !== undefined) {
      // Separate Debit / Credit columns → both are POSITIVE amounts, total = Debit + Credit
      const debit = config.debitCol
        ? parseCleanAmount(row[config.debitCol])
        : row.debit ? parseCleanAmount(row.debit) : 0;
      const credit = config.creditCol
        ? parseCleanAmount(row[config.creditCol])
        : row.credit ? parseCleanAmount(row.credit) : 0;
      // Both debit and credit contribute positively: total = |debit| + |credit|
      amount = Math.abs(debit) + Math.abs(credit);
    }

    return {
      id: `sys_line_${Date.now()}_${idx}`,
      docType,
      docNo,
      postingDate,
      refNo,
      amount,
      matchedExcelDocNo: "",
      differenceAmount: 0,
      status: "Unmatched" as const,
    };
  });
}
