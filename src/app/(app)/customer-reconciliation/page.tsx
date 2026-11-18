"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Pencil,
  Share2,
  Plus,
  Trash2,
  ExternalLink,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Database,
  Upload,
  Play,
  Eye,
  Printer,
  MoreVertical,
  Check,
  Search,
  Filter,
  ListFilter,
  Bookmark,
  FileSpreadsheet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toaster";
import { parseStatementFile } from "@/lib/reconciliation/file-parser";
import { mapRowsToStatementLines, mapRowsToSystemLines } from "@/lib/reconciliation/schema-mapper";
import { runReconciliationMatching } from "@/lib/reconciliation/matching-engine";

// ── Types ───────────────────────────────────────────────────────────────────

export interface ReconciliationStatement {
  id: string;
  statementNo: string;
  customerNo: string;
  customerName: string;
  workDate: string;
  fromDate: string;
  toDate: string;
  statementDate: string;
  status: "Draft" | "In Progress" | "Reconciled";
  openingBalance: number;
  totalExcelAmount: number;
  totalCleAmount: number;
  differenceAmount: number;
  outstandingAmount: number;
  createdAt: string;
  excelLines: StatementLine[];
  systemLines: SystemLine[];
}

export interface StatementLine {
  id: string;
  docType: "Invoice" | "Payment" | "Credit Note";
  docNo: string;
  docDate: string;
  refNo: string;
  amount: number;
  matchedCleEntryNo: string;
  differenceAmount: number;
  remarks: string;
  status: "Matched" | "Partial Match" | "Unmatched";
}

export interface SystemLine {
  id: string;
  docType: "Invoice" | "Payment" | "Credit Note";
  docNo: string;
  postingDate: string;
  refNo: string;
  amount: number;
  matchedExcelDocNo: string;
  differenceAmount: number;
  status: "Matched" | "Partial Match" | "Unmatched";
}

// Currency Formatter
function formatINR(val: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
}

// Initial State: Start with an empty list
const INITIAL_STATEMENTS: ReconciliationStatement[] = [];

// Static fallback statement with zero dynamic date evaluation during render/prerender
const FALLBACK_EMPTY_STATEMENT: ReconciliationStatement = {
  id: "stmt_fallback",
  statementNo: "RECON-2026-001",
  customerNo: "",
  customerName: "",
  workDate: "2/11/2027",
  fromDate: "",
  toDate: "",
  statementDate: "2/11/2027",
  status: "Draft",
  openingBalance: 0,
  totalExcelAmount: 0,
  totalCleAmount: 0,
  differenceAmount: 0,
  outstandingAmount: 0,
  createdAt: "2/11/2027 10:00 AM",
  excelLines: [],
  systemLines: [],
};

function createEmptyStatement(statementNo?: string, dateStr = "2/11/2027", timeStr = "10:00 AM"): ReconciliationStatement {
  return {
    id: `stmt_${Date.now()}`,
    statementNo: statementNo || "RECON-2026-001",
    customerNo: "",
    customerName: "",
    workDate: dateStr,
    fromDate: "",
    toDate: "",
    statementDate: dateStr,
    status: "Draft",
    openingBalance: 0,
    totalExcelAmount: 0,
    totalCleAmount: 0,
    differenceAmount: 0,
    outstandingAmount: 0,
    createdAt: `${dateStr} ${timeStr}`,
    excelLines: [],
    systemLines: [],
  };
}

export default function CustomerReconciliationPage() {
  const [viewMode, setViewMode] = useState<"list" | "detail">("list");
  const [reconciliations, setReconciliations] = useState<ReconciliationStatement[]>(INITIAL_STATEMENTS);
  const [selectedStatementId, setSelectedStatementId] = useState<string | null>(null);
  const [activeDraft, setActiveDraft] = useState<ReconciliationStatement | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Collapsible FastTabs
  const [showGeneral, setShowGeneral] = useState(false);
  const [showSummary, setShowSummary] = useState(true);
  const [showLines, setShowLines] = useState(true);

  // Active line selection index
  const [selectedRowIndex, setSelectedRowIndex] = useState<number>(0);
  const [isEditing, setIsEditing] = useState(false);

  // Active form statement (uses static fallback during prerender, no new Date() called in render body)
  const currentStatement =
    activeDraft ||
    reconciliations.find((s) => s.id === selectedStatementId) ||
    FALLBACK_EMPTY_STATEMENT;

  const updateCurrentStatement = (updates: Partial<ReconciliationStatement>) => {
    const updated = { ...currentStatement, ...updates };
    setActiveDraft(updated);

    // Only commit to the saved reconciliations list if it has actual data filled in
    const hasData =
      Boolean(updated.customerNo && updated.customerNo.trim() !== "") ||
      Boolean(updated.customerName && updated.customerName.trim() !== "") ||
      updated.excelLines.length > 0 ||
      updated.systemLines.length > 0;

    if (hasData) {
      setReconciliations((prev) => {
        const idx = prev.findIndex((s) => s.id === updated.id);
        if (idx !== -1) {
          const list = [...prev];
          list[idx] = updated;
          return list;
        }
        return [...prev, updated];
      });
    }
  };

  // Record Cycler (Previous / Next statement)
  const currentIndex = reconciliations.findIndex((s) => s.id === currentStatement.id);
  const handlePrevRecord = () => {
    if (currentIndex > 0) {
      const prevStmt = reconciliations[currentIndex - 1];
      setActiveDraft(prevStmt);
      setSelectedStatementId(prevStmt.id);
    } else {
      toast.info("First record reached");
    }
  };
  const handleNextRecord = () => {
    if (currentIndex >= 0 && currentIndex < reconciliations.length - 1) {
      const nextStmt = reconciliations[currentIndex + 1];
      setActiveDraft(nextStmt);
      setSelectedStatementId(nextStmt.id);
    } else {
      toast.info("Last record reached");
    }
  };

  // Handler: Click "+ New" (Runs on client interaction only, safe to evaluate Date)
  const handleNewReconciliation = () => {
    const now = new Date();
    const today = now.toLocaleDateString("en-US", {
      month: "numeric",
      day: "numeric",
      year: "numeric",
    });
    const nowTime = now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const nextNumber = String(reconciliations.length + 1).padStart(3, "0");
    const statementNo = `RECON-2026-${nextNumber}`;
    const newStmt = createEmptyStatement(statementNo, today, nowTime);

    setActiveDraft(newStmt);
    setSelectedStatementId(newStmt.id);
    setViewMode("detail");
    setShowGeneral(true);
    toast.success(`New reconciliation ${statementNo} initiated`);
  };

  // Handler: Back to List view
  const handleBackToList = () => {
    // If activeDraft has no data at all, do not keep an empty ghost record
    if (activeDraft) {
      const hasData =
        Boolean(activeDraft.customerNo && activeDraft.customerNo.trim() !== "") ||
        Boolean(activeDraft.customerName && activeDraft.customerName.trim() !== "") ||
        activeDraft.excelLines.length > 0 ||
        activeDraft.systemLines.length > 0;

      if (!hasData) {
        setReconciliations((prev) => prev.filter((s) => s.id !== activeDraft.id));
      }
    }
    setActiveDraft(null);
    setViewMode("list");
  };

  // Handler: Select row in list view
  const handleSelectRow = (item: ReconciliationStatement) => {
    setActiveDraft(item);
    setSelectedStatementId(item.id);
    setViewMode("detail");
  };

  // Handler: Delete Statement
  const handleDelete = () => {
    if (selectedStatementId || activeDraft?.id) {
      const targetId = activeDraft?.id || selectedStatementId;
      setReconciliations((prev) => prev.filter((s) => s.id !== targetId));
    }
    setActiveDraft(null);
    setSelectedStatementId(null);
    setViewMode("list");
    toast.success(`Statement ${currentStatement.statementNo} deleted`);
  };

  // Handler: Upload ERP Statement (Real Ingestion for .xlsx, .xls, .xlsm, .csv, .tsv, .txt, .pdf, .png)
  const handleUploadErpStatement = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true; // FR-IN-07: Support multiple files per side
    input.accept = ".xlsx,.xls,.xlsm,.csv,.tsv,.txt,.pdf,.png,.jpg,.jpeg,.tiff";
    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files || files.length === 0) return;

      toast.info(`Ingesting ${files.length} ERP Statement file(s)...`);
      let allMappedLines: SystemLine[] = [];
      const failedFiles: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const res = await parseStatementFile(file, file.name);

        if (!res.success) {
          failedFiles.push(`${file.name}: ${res.error || "Failed to parse"}`);
          continue;
        }

        if (res.rows.length === 0) {
          if (res.isScannedPdf) {
            toast.info(`"${file.name}" is a scanned document / image. Tabular OCR processing is required.`);
          } else {
            toast.info(`"${file.name}" contained no data rows.`);
          }
          continue;
        }

        const lines = mapRowsToSystemLines(res.rows, res.headers);
        allMappedLines = [...allMappedLines, ...lines];
      }

      if (failedFiles.length > 0) {
        toast.error(`ERP Intake warning: ${failedFiles.join("; ")}`);
      }

      if (allMappedLines.length > 0) {
        // FR-IN-07: Merge multiple files in date order
        const sortedLines = allMappedLines.sort((a, b) => {
          const dateA = new Date(a.postingDate || 0).getTime();
          const dateB = new Date(b.postingDate || 0).getTime();
          return dateA - dateB;
        });

        const total = Math.round(sortedLines.reduce((acc, l) => acc + (l.amount || 0), 0) * 100) / 100;

        updateCurrentStatement({
          systemLines: sortedLines,
          totalCleAmount: total,
          outstandingAmount: total,
        });
        toast.success(`Loaded ${sortedLines.length} entries from ERP Statement (Net Total: ${formatINR(total)})`);
      } else if (failedFiles.length === 0) {
        toast.info("No ERP entries could be extracted from uploaded file(s).");
      }
    };
    input.click();
  };

  // Handler: Upload Customer Statement (Real Ingestion for .xlsx, .xls, .xlsm, .csv, .tsv, .txt, .pdf, .png)
  const handleUploadCustomerStatement = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true; // FR-IN-07: Support multiple files per side
    input.accept = ".xlsx,.xls,.xlsm,.csv,.tsv,.txt,.pdf,.png,.jpg,.jpeg,.tiff";
    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files || files.length === 0) return;

      toast.info(`Ingesting ${files.length} Customer Statement file(s)...`);
      let allMappedLines: StatementLine[] = [];
      const failedFiles: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const res = await parseStatementFile(file, file.name);

        if (!res.success) {
          failedFiles.push(`${file.name}: ${res.error || "Failed to parse"}`);
          continue;
        }

        if (res.rows.length === 0) {
          if (res.isScannedPdf) {
            toast.info(`"${file.name}" is a scanned document / image. Tabular OCR processing is required.`);
          } else {
            toast.info(`"${file.name}" contained no data rows.`);
          }
          continue;
        }

        const lines = mapRowsToStatementLines(res.rows, res.headers);
        allMappedLines = [...allMappedLines, ...lines];
      }

      if (failedFiles.length > 0) {
        toast.error(`File intake warning: ${failedFiles.join("; ")}`);
      }

      if (allMappedLines.length > 0) {
        // FR-IN-07: Merge multiple files in date order
        const sortedLines = allMappedLines.sort((a, b) => {
          const dateA = new Date(a.docDate || 0).getTime();
          const dateB = new Date(b.docDate || 0).getTime();
          return dateA - dateB;
        });

        const total = Math.round(sortedLines.reduce((acc, l) => acc + (l.amount || 0), 0) * 100) / 100;

        updateCurrentStatement({
          excelLines: sortedLines,
          totalExcelAmount: total,
        });
        toast.success(`Loaded ${sortedLines.length} entries from Customer Statement (Net Total: ${formatINR(total)})`);
      } else if (failedFiles.length === 0) {
        toast.info("No statement entries could be extracted from uploaded file(s).");
      }
    };
    input.click();
  };

  // Handler: Run Reconciliation (Layer 3 Engine)
  const handleRunReconciliation = () => {
    if (currentStatement.excelLines.length === 0 && currentStatement.systemLines.length === 0) {
      toast.error("Please upload Customer Statement and ERP Statement before running reconciliation.");
      return;
    }

    const result = runReconciliationMatching(
      currentStatement.excelLines,
      currentStatement.systemLines
    );

    updateCurrentStatement({
      excelLines: result.matchedExcelLines,
      systemLines: result.matchedSystemLines,
      totalExcelAmount: result.totalExcelAmount,
      totalCleAmount: result.totalCleAmount,
      differenceAmount: result.differenceAmount,
      status: "In Progress",
    });

    toast.success(
      `Reconciliation Complete: ${result.matchedCount} Matched, ${result.partialMatchCount} Partial, ${result.unmatchedCount} Unmatched (Net Difference: ${formatINR(result.differenceAmount)})`
    );
  };

  // Filter list rows (only statements that have actual data)
  const validStatements = reconciliations.filter(
    (item) =>
      Boolean(item.customerNo && item.customerNo.trim() !== "") ||
      Boolean(item.customerName && item.customerName.trim() !== "") ||
      item.excelLines.length > 0 ||
      item.systemLines.length > 0
  );

  const filteredList = validStatements.filter(
    (item) =>
      item.statementNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.customerNo.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ───────────────────────────────────────────────────────────────────────────
  // DETAIL VIEW (Dynamics 365 Business Central Exact Design - Image 2)
  // ───────────────────────────────────────────────────────────────────────────
  if (viewMode === "detail") {
    return (
      <div className="relative -mx-6 md:-mx-8 -my-6 md:-my-8 min-h-[calc(100vh-4rem)] bg-white text-[#242424] font-sans">
        {/* Floating Record Navigators (Previous / Next) on page edges */}
        <button
          onClick={handlePrevRecord}
          className="fixed left-64 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-[#3B454E]/90 hover:bg-[#2B353E] text-white flex items-center justify-center shadow-lg transition-all cursor-pointer opacity-80 hover:opacity-100"
          title="Previous Reconciliation Record"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={handleNextRecord}
          className="fixed right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-[#3B454E]/90 hover:bg-[#2B353E] text-white flex items-center justify-center shadow-lg transition-all cursor-pointer opacity-80 hover:opacity-100"
          title="Next Reconciliation Record"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* ── Top Header Area ───────────────────────────────────────────────── */}
        <div className="px-7 pt-4 pb-2 bg-white">
          {/* Top Bar: Back arrow, Breadcrumb / Subtitle, Top Right Icons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={handleBackToList}
                className="w-8 h-8 rounded-full bg-slate-100/80 hover:bg-slate-200/80 flex items-center justify-center text-teal-700 cursor-pointer transition-colors"
                title="Back to Customer Reconciliations list"
              >
                <ArrowLeft className="w-4 h-4 text-teal-700" />
              </button>
              <div className="text-[13px] text-slate-600 font-normal">
                Customer Reconciliation | Work Date: {currentStatement.workDate || "2/11/2027"}
              </div>
            </div>

            {/* Quick Window Utility Icons */}
            <div className="flex items-center gap-4 text-slate-500">
              <button
                onClick={() => {
                  setIsEditing(!isEditing);
                  toast.info(isEditing ? "View mode enabled" : "Edit mode enabled");
                }}
                className="hover:text-teal-700 cursor-pointer transition-colors"
                title="Edit document"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => toast.info("Link copied to clipboard")}
                className="hover:text-teal-700 cursor-pointer transition-colors"
                title="Share or Export"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <button
                onClick={handleNewReconciliation}
                className="hover:text-teal-700 cursor-pointer transition-colors"
                title="Create New Reconciliation"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                onClick={handleDelete}
                className="hover:text-red-600 cursor-pointer transition-colors"
                title="Delete / Clear This Reconciliation"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => toast.info("Opened in detached window")}
                className="hover:text-teal-700 cursor-pointer transition-colors ml-2"
                title="Open in new window"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen().catch(() => {});
                  } else {
                    document.exitFullscreen().catch(() => {});
                  }
                }}
                className="hover:text-teal-700 cursor-pointer transition-colors"
                title="Toggle Fullscreen"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Statement Number Title */}
          <div className="mt-2.5">
            <h1 className="text-[28px] font-normal text-[#242424] tracking-tight leading-none">
              {currentStatement.statementNo || "RECON-2026-001"}
            </h1>
          </div>

          {/* ── Action Command Bar (No scrolling, exact Business Central ribbon) ── */}
          <div className="mt-4 pt-2 pb-2.5 border-b border-[#E1DFDD] flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] text-[#242424]">
            <button
              onClick={handleUploadErpStatement}
              className="flex items-center gap-2 text-[#242424] hover:text-[#008272] cursor-pointer transition-colors py-1 group"
              title="Upload ERP Statement file"
            >
              <Database className="w-4 h-4 text-[#008272] group-hover:scale-105 transition-transform" />
              <span>Upload ERP Statement</span>
            </button>

            <button
              onClick={handleUploadCustomerStatement}
              className="flex items-center gap-2 text-[#242424] hover:text-[#008272] cursor-pointer transition-colors py-1 group"
              title="Upload Customer Statement file"
            >
              <Upload className="w-4 h-4 text-[#008272] group-hover:scale-105 transition-transform" />
              <span>Upload Customer Statement</span>
            </button>

            <button
              onClick={handleRunReconciliation}
              className="flex items-center gap-2 text-[#242424] hover:text-[#008272] cursor-pointer transition-colors py-1 group"
              title="Match Excel Lines with System CLE"
            >
              <Play className="w-4 h-4 text-[#008272] fill-[#008272]/20 group-hover:scale-105 transition-transform" />
              <span>Run Reconciliation</span>
            </button>

            <button
              onClick={() => {
                const matched = currentStatement.systemLines.filter((l) => l.status === "Matched");
                toast.info(`${matched.length} Matched entries recorded`);
              }}
              className="flex items-center gap-2 text-[#242424] hover:text-[#008272] cursor-pointer transition-colors py-1 group"
            >
              <Eye className="w-4 h-4 text-[#008272] group-hover:scale-105 transition-transform" />
              <span>View Matched Entries</span>
            </button>

            <button
              onClick={handleDelete}
              className="flex items-center gap-2 text-[#242424] hover:text-[#D13438] cursor-pointer transition-colors py-1 group"
            >
              <Trash2 className="w-4 h-4 text-[#008272] group-hover:text-[#D13438] transition-colors" />
              <span>Delete This Reconciliation</span>
            </button>

            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 text-[#242424] hover:text-[#008272] cursor-pointer transition-colors py-1 group"
            >
              <Printer className="w-4 h-4 text-[#008272] group-hover:scale-105 transition-transform" />
              <span>Print Reconciliation Report</span>
            </button>
          </div>
        </div>

        {/* ── Content FastTabs ──────────────────────────────────────────────── */}
        <div className="px-7 py-3 space-y-6">
          {/* Optional Collapsible FastTab: General */}
          <div className="space-y-3">
            <button
              onClick={() => setShowGeneral(!showGeneral)}
              className="flex items-center gap-1.5 text-[14px] font-semibold text-[#242424] hover:text-[#008272] cursor-pointer transition-colors"
            >
              <span>General</span>
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${
                  showGeneral ? "" : "-rotate-90"
                }`}
              />
            </button>

            {showGeneral && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-2 pt-1 pb-3 text-xs border-b border-[#E1DFDD]">
                {/* Column 1 */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[#605E5C] whitespace-nowrap min-w-[130px]">Customer No.</span>
                    <span className="flex-1 mx-2 border-b border-dotted border-[#C8C6C4] mb-1" />
                    <input
                      type="text"
                      placeholder="e.g. CUST-1049"
                      value={currentStatement.customerNo}
                      onChange={(e) => updateCurrentStatement({ customerNo: e.target.value })}
                      className="w-56 px-2.5 py-1 bg-[#F3F2F1] text-[#242424] text-xs border border-transparent focus:border-[#008272] focus:bg-white focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#605E5C] whitespace-nowrap min-w-[130px]">Customer Name</span>
                    <span className="flex-1 mx-2 border-b border-dotted border-[#C8C6C4] mb-1" />
                    <input
                      type="text"
                      placeholder="e.g. Alpine Ski House"
                      value={currentStatement.customerName}
                      onChange={(e) => updateCurrentStatement({ customerName: e.target.value })}
                      className="w-56 px-2.5 py-1 bg-[#F3F2F1] text-[#242424] text-xs border border-transparent focus:border-[#008272] focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                {/* Column 2 */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[#605E5C] whitespace-nowrap min-w-[130px]">From Date</span>
                    <span className="flex-1 mx-2 border-b border-dotted border-[#C8C6C4] mb-1" />
                    <input
                      type="date"
                      value={currentStatement.fromDate}
                      onChange={(e) => updateCurrentStatement({ fromDate: e.target.value })}
                      className="w-56 px-2.5 py-1 bg-[#F3F2F1] text-[#242424] text-xs border border-transparent focus:border-[#008272] focus:bg-white focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#605E5C] whitespace-nowrap min-w-[130px]">To Date</span>
                    <span className="flex-1 mx-2 border-b border-dotted border-[#C8C6C4] mb-1" />
                    <input
                      type="date"
                      value={currentStatement.toDate}
                      onChange={(e) => updateCurrentStatement({ toDate: e.target.value })}
                      className="w-56 px-2.5 py-1 bg-[#F3F2F1] text-[#242424] text-xs border border-transparent focus:border-[#008272] focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── FastTab 1: Reconciliation Summary (Dotted Leader Lines) ────── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-[#E1DFDD] pb-1.5">
              <button
                onClick={() => setShowSummary(!showSummary)}
                className="flex items-center gap-1.5 text-[14px] font-semibold text-[#242424] hover:text-[#008272] cursor-pointer"
              >
                <span>Reconciliation Summary</span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-200 ${
                    showSummary ? "" : "-rotate-90"
                  }`}
                />
              </button>
            </div>

            {showSummary && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-14 gap-y-2 text-xs">
                {/* Left Column */}
                <div className="space-y-2">
                  {/* Opening Balance */}
                  <div className="flex items-center justify-between">
                    <span className="text-[#605E5C] whitespace-nowrap min-w-[130px]">
                      Opening Balance
                    </span>
                    <span className="flex-1 mx-2 border-b border-dotted border-[#C8C6C4] mb-1" />
                    <div className="w-52 px-3 py-1 bg-[#F3F2F1] text-right text-[#242424] font-normal text-xs rounded-none">
                      {formatINR(currentStatement.openingBalance)}
                    </div>
                  </div>

                  {/* Total Excel Amount */}
                  <div className="flex items-center justify-between">
                    <span className="text-[#605E5C] whitespace-nowrap min-w-[130px]">
                      Total Excel Amount
                    </span>
                    <span className="flex-1 mx-2 border-b border-dotted border-[#C8C6C4] mb-1" />
                    <div className="w-52 px-3 py-1 bg-[#F3F2F1] text-right text-[#242424] font-normal text-xs rounded-none">
                      {formatINR(currentStatement.totalExcelAmount)}
                    </div>
                  </div>

                  {/* Total CLE Amount */}
                  <div className="flex items-center justify-between">
                    <span className="text-[#605E5C] whitespace-nowrap min-w-[130px]">
                      Total CLE Amount
                    </span>
                    <span className="flex-1 mx-2 border-b border-dotted border-[#C8C6C4] mb-1" />
                    <div className="w-52 px-3 py-1 bg-[#F3F2F1] text-right text-[#242424] font-normal text-xs rounded-none">
                      {formatINR(currentStatement.totalCleAmount)}
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-2">
                  {/* Difference Amount */}
                  <div className="flex items-center justify-between">
                    <span className="text-[#605E5C] whitespace-nowrap min-w-[130px]">
                      Difference Amount
                    </span>
                    <span className="flex-1 mx-2 border-b border-dotted border-[#C8C6C4] mb-1" />
                    <div className={`w-52 px-3 py-1 bg-[#F3F2F1] text-right font-semibold text-xs rounded-none ${
                      currentStatement.differenceAmount !== 0 ? "text-[#D13438]" : "text-[#242424]"
                    }`}>
                      {formatINR(currentStatement.differenceAmount)}
                    </div>
                  </div>

                  {/* Outstanding Amount */}
                  <div className="flex items-center justify-between">
                    <span className="text-[#605E5C] whitespace-nowrap min-w-[130px]">
                      Outstanding Amount
                    </span>
                    <span className="flex-1 mx-2 border-b border-dotted border-[#C8C6C4] mb-1" />
                    <div className="w-52 px-3 py-1 bg-[#F3F2F1] text-right text-[#242424] font-bold text-xs rounded-none">
                      {formatINR(currentStatement.outstandingAmount)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── FastTab 2: Reconciliation Lines (Side-by-side split view) ──── */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-b border-[#E1DFDD] pb-1.5">
              <button
                onClick={() => setShowLines(!showLines)}
                className="flex items-center gap-1.5 text-[14px] font-semibold text-[#242424] hover:text-[#008272] cursor-pointer"
              >
                <span>Reconciliation Lines</span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-200 ${
                    showLines ? "" : "-rotate-90"
                  }`}
                />
              </button>
            </div>

            {showLines && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Left Table: Customer Statement */}
                <div>
                  <div className="flex items-center gap-1.5 text-[13px] font-semibold text-[#242424] mb-2 cursor-pointer">
                    <span>Customer Statement</span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                  </div>

                  <div className="border border-[#E1DFDD] bg-white overflow-x-auto min-h-[220px]">
                    <table className="w-full text-left text-xs whitespace-nowrap border-collapse">
                      <thead>
                        <tr className="bg-[#FAF9F8] text-[#605E5C] border-b border-[#E1DFDD] font-medium text-[11px]">
                          <th className="w-6 py-2 px-1 text-center font-normal"></th>
                          <th className="py-2 px-2.5 font-medium">Document Type</th>
                          <th className="w-6 py-2 px-1"></th>
                          <th className="py-2 px-2.5 font-medium">Document No.</th>
                          <th className="py-2 px-2.5 font-medium">Document Date</th>
                          <th className="py-2 px-2.5 font-medium">Reference No. (UTR/Cheq...</th>
                          <th className="py-2 px-2.5 font-medium text-right">Amount</th>
                          <th className="py-2 px-2.5 font-medium">Matched ERP Doc No.</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EDEBE9]">
                        {currentStatement.excelLines.map((line, idx) => {
                          const isSelected = selectedRowIndex === idx;
                          return (
                            <tr
                              key={line.id}
                              onClick={() => setSelectedRowIndex(idx)}
                              className={`transition-colors cursor-pointer group ${
                                isSelected ? "bg-[#EDEBE9]/60" : "hover:bg-[#F3F2F1]"
                              }`}
                            >
                              <td className="py-1 px-1 text-center text-teal-800">
                                {isSelected ? "→" : ""}
                              </td>
                              <td className="py-1 px-2.5 underline decoration-[#C8C6C4] underline-offset-2 text-[#242424]">
                                {line.docType}
                              </td>
                              <td className="py-1 px-1 text-center">
                                <span className="inline-block p-0.5 rounded bg-teal-100 text-[#008272] group-hover:bg-teal-200 cursor-pointer">
                                  <MoreVertical className="w-3 h-3" />
                                </span>
                              </td>
                              <td className="py-1 px-2.5 font-normal text-[#242424]">{line.docNo}</td>
                              <td className="py-1 px-2.5 text-[#242424]">{line.docDate}</td>
                              <td className="py-1 px-2.5 text-[#605E5C]">{line.refNo}</td>
                              <td className={`py-1 px-2.5 text-right font-normal ${line.amount < 0 ? "text-[#D13438]" : "text-[#242424]"}`}>
                                {line.amount < 0 ? `(${formatINR(Math.abs(line.amount))})` : formatINR(line.amount)}
                              </td>
                              <td className="py-1 px-2.5 font-normal text-[#242424]">
                                {line.matchedCleEntryNo || "—"}
                              </td>
                            </tr>
                          );
                        })}

                        {currentStatement.excelLines.length === 0 && (
                          <tr>
                            <td colSpan={8} className="py-12 text-center text-[#605E5C]">
                              <FileSpreadsheet className="w-7 h-7 mx-auto mb-2 text-[#605E5C] opacity-40" />
                              <p className="font-medium text-[#242424]">No customer statement lines loaded.</p>
                              <p className="text-xs text-[#605E5C] mt-1">
                                Click &quot;Upload Customer Statement&quot; to import statement entries.
                              </p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Right Table: ERP Statement */}
                <div>
                  <div className="flex items-center gap-1.5 text-[13px] font-semibold text-[#242424] mb-2 cursor-pointer">
                    <span>ERP Statement</span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                  </div>

                  <div className="border border-[#E1DFDD] bg-white overflow-x-auto min-h-[220px]">
                    <table className="w-full text-left text-xs whitespace-nowrap border-collapse">
                      <thead>
                        <tr className="bg-[#FAF9F8] text-[#605E5C] border-b border-[#E1DFDD] font-medium text-[11px]">
                          <th className="w-6 py-2 px-1 text-center font-normal"></th>
                          <th className="py-2 px-2.5 font-medium">Document Type</th>
                          <th className="w-6 py-2 px-1"></th>
                          <th className="py-2 px-2.5 font-medium">Reference No.</th>
                          <th className="py-2 px-2.5 font-medium text-right">Amount</th>
                          <th className="py-2 px-2.5 font-medium">Matched Customer Doc No.</th>
                          <th className="py-2 px-2.5 font-medium text-right">Difference Amount</th>
                          <th className="py-2 px-2.5 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EDEBE9]">
                        {currentStatement.systemLines.map((line, idx) => {
                          const isSelected = selectedRowIndex === idx;
                          return (
                            <tr
                              key={line.id}
                              onClick={() => setSelectedRowIndex(idx)}
                              className={`transition-colors cursor-pointer group ${
                                isSelected ? "bg-[#EDEBE9]/60" : "hover:bg-[#F3F2F1]"
                              }`}
                            >
                              <td className="py-1 px-1 text-center text-teal-800">
                                {isSelected ? "→" : ""}
                              </td>
                              <td className="py-1 px-2.5 underline decoration-[#C8C6C4] underline-offset-2 text-[#242424]">
                                {line.docType}
                              </td>
                              <td className="py-1 px-1 text-center">
                                <span className="inline-block p-0.5 rounded bg-teal-100 text-[#008272] group-hover:bg-teal-200 cursor-pointer">
                                  <MoreVertical className="w-3 h-3" />
                                </span>
                              </td>
                              <td className="py-1 px-2.5 text-[#605E5C]">{line.refNo}</td>
                              <td className={`py-1 px-2.5 text-right font-normal ${line.amount < 0 ? "text-[#D13438]" : "text-[#242424]"}`}>
                                {line.amount < 0 ? `(${formatINR(Math.abs(line.amount))})` : formatINR(line.amount)}
                              </td>
                              <td className="py-1 px-2.5 text-[#242424]">{line.matchedExcelDocNo || "—"}</td>
                              <td className="py-1 px-2.5 text-right font-normal text-[#242424]">
                                {line.differenceAmount !== 0 ? (
                                  <span className="text-[#D13438] font-semibold">
                                    {formatINR(line.differenceAmount)}
                                  </span>
                                ) : (
                                  "0.00"
                                )}
                              </td>
                              <td className="py-1 px-2.5">
                                {line.status === "Matched" ? (
                                  <span className="text-[#107C41] font-semibold flex items-center gap-1">
                                    Matched
                                  </span>
                                ) : line.status === "Partial Match" ? (
                                  <span className="text-[#B7791F] font-semibold">
                                    Partial Match
                                  </span>
                                ) : (
                                  <span className="text-slate-400 font-normal">
                                    Unmatched
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}

                        {currentStatement.systemLines.length === 0 && (
                          <tr>
                            <td colSpan={8} className="py-12 text-center text-[#605E5C]">
                              <Database className="w-7 h-7 mx-auto mb-2 text-[#605E5C] opacity-40" />
                              <p className="font-medium text-[#242424]">No ERP statement lines loaded.</p>
                              <p className="text-xs text-[#605E5C] mt-1">
                                Click &quot;Upload ERP Statement&quot; to import ERP ledger entries.
                              </p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // LIST VIEW
  // ───────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white text-[#242424] text-xs">
      {/* Top Bar Header */}
      <div className="border-b border-[#E1DFDD] px-5 py-3 flex items-center justify-between bg-white">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-slate-100 text-[#008272] cursor-pointer"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-4 h-4 text-[#008272]" />
          </Link>
          <h1 className="text-lg font-semibold text-[#242424] tracking-tight">
            Customer Reconciliations
          </h1>
        </div>

        {/* Header Right Icons */}
        <div className="flex items-center gap-3 text-slate-500">
          <button className="p-1 hover:bg-slate-100 rounded cursor-pointer" title="Bookmark view">
            <Bookmark className="w-4 h-4" />
          </button>
          <button className="p-1 hover:bg-slate-100 rounded cursor-pointer" title="Open in new window">
            <ExternalLink className="w-4 h-4" />
          </button>
          <button className="p-1 hover:bg-slate-100 rounded cursor-pointer" title="Full screen">
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Action Command Bar */}
      <div className="border-b border-[#E1DFDD] px-5 py-2.5 flex items-center justify-between bg-[#FAF9F8]">
        {/* Left Toolbar */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 absolute left-2.5 text-slate-400 pointer-events-none" />
            <Input
              type="text"
              placeholder="Search statements..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 pr-3 text-xs w-48 sm:w-64 bg-white border-[#E1DFDD] focus-visible:ring-[#008272]"
            />
          </div>

          <Button
            size="sm"
            onClick={handleNewReconciliation}
            className="h-8 bg-[#008272] hover:bg-[#006e60] text-white px-3 font-medium text-xs cursor-pointer shadow-xs gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            New
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-8 border-[#E1DFDD] text-[#242424] hover:bg-slate-50 px-3 text-xs cursor-pointer gap-1"
          >
            Manage <ChevronDown className="w-3 h-3 text-slate-500" />
          </Button>
        </div>

        {/* Right Toolbar */}
        <div className="flex items-center gap-2 text-slate-500">
          <button
            onClick={() => toast.info("Exporting statement list...")}
            className="p-1.5 hover:bg-slate-200/60 rounded cursor-pointer"
            title="Export list"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => toast.info("Filter pane toggled")}
            className="p-1.5 hover:bg-slate-200/60 rounded cursor-pointer"
            title="Filter rows"
          >
            <Filter className="w-3.5 h-3.5" />
          </button>
          <button className="p-1.5 hover:bg-slate-200/60 rounded cursor-pointer" title="List options">
            <ListFilter className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Grid Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs whitespace-nowrap">
          <thead className="bg-[#FAF9F8] border-b border-[#E1DFDD] text-[#605E5C] font-semibold text-[11px]">
            <tr>
              <th className="py-2.5 px-3">Statement No. ↑</th>
              <th className="py-2.5 px-3">Customer No.</th>
              <th className="py-2.5 px-3">Customer Name</th>
              <th className="py-2.5 px-3">From Date</th>
              <th className="py-2.5 px-3">To Date</th>
              <th className="py-2.5 px-3">Statement Date</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3 text-right">Total Excel Amount</th>
              <th className="py-2.5 px-3 text-right">Total CLE Amount</th>
              <th className="py-2.5 px-3 text-right">Difference Amount</th>
              <th className="py-2.5 px-3">Created Date/Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EDEBE9]">
            {filteredList.map((item) => {
              const isSelected = selectedStatementId === item.id;
              return (
                <tr
                  key={item.id}
                  onClick={() => handleSelectRow(item)}
                  className={`cursor-pointer transition-colors ${
                    isSelected ? "bg-teal-50 hover:bg-teal-100/60" : "hover:bg-[#FAF9F8]"
                  }`}
                >
                  <td className="py-2 px-3 font-semibold text-[#008272] flex items-center gap-1.5">
                    {item.statementNo}
                  </td>
                  <td className="py-2 px-3 font-mono text-[#242424]">{item.customerNo || "—"}</td>
                  <td className="py-2 px-3 font-medium text-[#242424]">{item.customerName || "—"}</td>
                  <td className="py-2 px-3 text-[#605E5C]">{item.fromDate || "—"}</td>
                  <td className="py-2 px-3 text-[#605E5C]">{item.toDate || "—"}</td>
                  <td className="py-2 px-3 text-[#605E5C]">{item.statementDate || "—"}</td>
                  <td className="py-2 px-3">
                    <span className="font-semibold text-[#008272]">{item.status}</span>
                  </td>
                  <td className="py-2 px-3 text-right font-medium text-[#242424]">
                    {formatINR(item.totalExcelAmount)}
                  </td>
                  <td className="py-2 px-3 text-right font-medium text-[#242424]">
                    {formatINR(item.totalCleAmount)}
                  </td>
                  <td className="py-2 px-3 text-right font-semibold text-[#D13438]">
                    {formatINR(item.differenceAmount)}
                  </td>
                  <td className="py-2 px-3 text-[#605E5C]">{item.createdAt}</td>
                </tr>
              );
            })}

            {filteredList.length === 0 && (
              <tr>
                <td colSpan={11} className="py-16 text-center text-[#605E5C]">
                  <div className="max-w-md mx-auto space-y-3">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-[#008272]">
                      <FileSpreadsheet className="w-6 h-6 opacity-60" />
                    </div>
                    <p className="font-semibold text-sm text-[#242424]">
                      No Customer Reconciliations Found
                    </p>
                    <p className="text-xs text-[#605E5C]">
                      There are no statements yet. Click &quot;+ New&quot; to initiate a reconciliation.
                    </p>
                    <Button
                      size="sm"
                      onClick={handleNewReconciliation}
                      className="bg-[#008272] hover:bg-[#006e60] text-white text-xs px-3.5 py-1.5 font-medium cursor-pointer gap-1.5 shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" /> Create Reconciliation
                    </Button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Status Bar */}
      <div className="border-t border-[#E1DFDD] px-5 py-2 text-[11px] text-[#605E5C] flex items-center justify-between bg-[#FAF9F8]">
        <span>{filteredList.length} statement(s) displayed</span>
        <span>Click on any statement to view Dynamics 365 card view</span>
      </div>
    </div>
  );
}
