import { StatementLine, SystemLine } from "@/app/(app)/customer-reconciliation/page";

// ── Layer 3: Reconciliation & Matching Engine ───────────────────────────────

export interface MatchResult {
  matchedExcelLines: StatementLine[];
  matchedSystemLines: SystemLine[];
  totalExcelAmount: number;
  totalCleAmount: number;
  differenceAmount: number;
  matchedCount: number;
  partialMatchCount: number;
  unmatchedCount: number;
}

// Normalize Reference / Document Strings (removes prefixes like 'INV-', 'BILL/', leading zeroes)
export function normalizeIdentifier(val: string): string {
  if (!val) return "";
  return val
    .toLowerCase()
    .replace(/^(inv|bill|doc|voucher|ref|utr|chq)[-_/:\s]*/i, "")
    .replace(/^0+/, "")
    .replace(/[^a-z0-9]/gi, "");
}

// Levenshtein Similarity Ratio (0.0 to 1.0)
export function calculateSimilarity(s1: string, s2: string): number {
  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0.0;

  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;

  if (longer.length === 0) return 1.0;

  // Simple edit distance
  const costs: number[] = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }

  return (longer.length - costs[s2.length]) / longer.length;
}

// Execute 3-Pass Reconciliation (Exact ID -> Fuzzy / Reference -> Amount Correlation)
export function runReconciliationMatching(
  excelLines: StatementLine[],
  systemLines: SystemLine[],
  amountTolerance: number = 0.01
): MatchResult {
  const updatedExcel: StatementLine[] = excelLines.map((l) => ({ ...l }));
  const updatedSystem: SystemLine[] = systemLines.map((l) => ({ ...l }));

  const matchedSystemIndices = new Set<number>();
  const matchedExcelIndices = new Set<number>();

  // Pass 1: Exact Document No Match
  for (let eIdx = 0; eIdx < updatedExcel.length; eIdx++) {
    const eLine = updatedExcel[eIdx];
    for (let sIdx = 0; sIdx < updatedSystem.length; sIdx++) {
      if (matchedSystemIndices.has(sIdx)) continue;
      const sLine = updatedSystem[sIdx];

      if (eLine.docNo && sLine.docNo && eLine.docNo.trim().toLowerCase() === sLine.docNo.trim().toLowerCase()) {
        const diff = Math.round((eLine.amount - sLine.amount) * 100) / 100;
        const isMatched = Math.abs(diff) <= amountTolerance;

        eLine.matchedCleEntryNo = sLine.docNo;
        eLine.differenceAmount = diff;
        eLine.status = isMatched ? "Matched" : "Partial Match";

        sLine.matchedExcelDocNo = eLine.docNo;
        sLine.differenceAmount = diff;
        sLine.status = isMatched ? "Matched" : "Partial Match";

        matchedExcelIndices.add(eIdx);
        matchedSystemIndices.add(sIdx);
        break;
      }
    }
  }

  // Pass 2: Reference Number Match (UTR / Cheque / PO)
  for (let eIdx = 0; eIdx < updatedExcel.length; eIdx++) {
    if (matchedExcelIndices.has(eIdx)) continue;
    const eLine = updatedExcel[eIdx];

    for (let sIdx = 0; sIdx < updatedSystem.length; sIdx++) {
      if (matchedSystemIndices.has(sIdx)) continue;
      const sLine = updatedSystem[sIdx];

      const eRef = (eLine.refNo || "").trim().toLowerCase();
      const sRef = (sLine.refNo || "").trim().toLowerCase();

      if (eRef && sRef && (eRef === sRef || eRef === sLine.docNo.toLowerCase() || sRef === eLine.docNo.toLowerCase())) {
        const diff = Math.round((eLine.amount - sLine.amount) * 100) / 100;
        const isMatched = Math.abs(diff) <= amountTolerance;

        eLine.matchedCleEntryNo = sLine.docNo;
        eLine.differenceAmount = diff;
        eLine.status = isMatched ? "Matched" : "Partial Match";

        sLine.matchedExcelDocNo = eLine.docNo;
        sLine.differenceAmount = diff;
        sLine.status = isMatched ? "Matched" : "Partial Match";

        matchedExcelIndices.add(eIdx);
        matchedSystemIndices.add(sIdx);
        break;
      }
    }
  }

  // Pass 3: Fuzzy Normalized ID & Amount Correlation (e.g. 'INV-99' vs '99')
  for (let eIdx = 0; eIdx < updatedExcel.length; eIdx++) {
    if (matchedExcelIndices.has(eIdx)) continue;
    const eLine = updatedExcel[eIdx];
    const normEDoc = normalizeIdentifier(eLine.docNo);
    const normERef = normalizeIdentifier(eLine.refNo);

    for (let sIdx = 0; sIdx < updatedSystem.length; sIdx++) {
      if (matchedSystemIndices.has(sIdx)) continue;
      const sLine = updatedSystem[sIdx];
      const normSDoc = normalizeIdentifier(sLine.docNo);
      const normSRef = normalizeIdentifier(sLine.refNo);

      const isIdFuzzyMatch =
        (normEDoc && normSDoc && (normEDoc === normSDoc || calculateSimilarity(normEDoc, normSDoc) >= 0.8)) ||
        (normERef && normSRef && (normERef === normSRef || calculateSimilarity(normERef, normSRef) >= 0.8));

      const isExactAmount = Math.abs(eLine.amount - sLine.amount) <= amountTolerance;

      if (isIdFuzzyMatch || (isExactAmount && (normEDoc.includes(normSDoc) || normSDoc.includes(normEDoc)))) {
        const diff = Math.round((eLine.amount - sLine.amount) * 100) / 100;
        const isMatched = Math.abs(diff) <= amountTolerance;

        eLine.matchedCleEntryNo = sLine.docNo;
        eLine.differenceAmount = diff;
        eLine.status = isMatched ? "Matched" : "Partial Match";

        sLine.matchedExcelDocNo = eLine.docNo;
        sLine.differenceAmount = diff;
        sLine.status = isMatched ? "Matched" : "Partial Match";

        matchedExcelIndices.add(eIdx);
        matchedSystemIndices.add(sIdx);
        break;
      }
    }
  }

  // Mark remaining unmatched
  updatedExcel.forEach((el, idx) => {
    if (!matchedExcelIndices.has(idx)) {
      el.matchedCleEntryNo = "";
      el.differenceAmount = el.amount;
      el.status = "Unmatched";
    }
  });

  updatedSystem.forEach((sl, idx) => {
    if (!matchedSystemIndices.has(idx)) {
      sl.matchedExcelDocNo = "";
      sl.differenceAmount = -sl.amount;
      sl.status = "Unmatched";
    }
  });

  // Totals & Metrics
  // amounts are already signed: Invoice = +, Payment/Credit Note = -
  const totalExcelAmount = Math.round(updatedExcel.reduce((acc, l) => acc + (l.amount || 0), 0) * 100) / 100;
  const totalCleAmount = Math.round(updatedSystem.reduce((acc, l) => acc + (l.amount || 0), 0) * 100) / 100;
  const differenceAmount = Math.round((totalExcelAmount - totalCleAmount) * 100) / 100;

  const matchedCount = updatedExcel.filter((l) => l.status === "Matched").length;
  const partialMatchCount = updatedExcel.filter((l) => l.status === "Partial Match").length;
  const unmatchedCount = updatedExcel.filter((l) => l.status === "Unmatched").length;

  return {
    matchedExcelLines: updatedExcel,
    matchedSystemLines: updatedSystem,
    totalExcelAmount,
    totalCleAmount,
    differenceAmount,
    matchedCount,
    partialMatchCount,
    unmatchedCount,
  };
}
