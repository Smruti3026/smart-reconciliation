/**
 * Mock data for Phase 1 development.
 * Static sample data for Indian accountants and small business ledger reconciliation.
 */

export interface CustomerItem {
  id: string;
  name: string;
  gstin: string;
  contactPerson: string;
  ledgerBalance: number; // in INR
  portalBalance: number; // in INR
  difference: number;
  status: "reconciled" | "mismatch" | "pending";
  lastReconciledDate: string;
}

export interface VendorItem {
  id: string;
  name: string;
  gstin: string;
  contactPerson: string;
  ourBooksBalance: number; // in INR
  vendorStatementBalance: number; // in INR
  difference: number;
  status: "reconciled" | "mismatch" | "pending";
  lastReconciledDate: string;
}

export interface LedgerTransaction {
  id: string;
  date: string;
  voucherNo: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  matched: boolean;
  matchRef?: string;
}

export const MOCK_CUSTOMERS: CustomerItem[] = [
  {
    id: "cust-01",
    name: "Mehta Electronics Pvt Ltd",
    gstin: "27AABCM1234F1Z5",
    contactPerson: "Suresh Mehta",
    ledgerBalance: 485200,
    portalBalance: 485200,
    difference: 0,
    status: "reconciled",
    lastReconciledDate: "21/10/2026",
  },
  {
    id: "cust-02",
    name: "Tata Consumer Distributors",
    gstin: "27AAACT2345K1Z9",
    contactPerson: "Priya Nair",
    ledgerBalance: 1245000,
    portalBalance: 1210000,
    difference: 35000,
    status: "mismatch",
    lastReconciledDate: "20/10/2026",
  },
  {
    id: "cust-03",
    name: "Patel Traders & Wholesalers",
    gstin: "24AABCP9876C1Z1",
    contactPerson: "Dharmesh Patel",
    ledgerBalance: 872400,
    portalBalance: 872400,
    difference: 0,
    status: "reconciled",
    lastReconciledDate: "19/10/2026",
  },
  {
    id: "cust-04",
    name: "Anand Hardware & Electricals",
    gstin: "27AABCA5678Q1Z2",
    contactPerson: "Anand Kulkarni",
    ledgerBalance: 320150,
    portalBalance: 295150,
    difference: 25000,
    status: "mismatch",
    lastReconciledDate: "18/10/2026",
  },
  {
    id: "cust-05",
    name: "Apex Logistics India",
    gstin: "07AABCA4321R1Z8",
    contactPerson: "Vikramjeet Singh",
    ledgerBalance: 610000,
    portalBalance: 610000,
    difference: 0,
    status: "reconciled",
    lastReconciledDate: "16/10/2026",
  },
];

export const MOCK_VENDORS: VendorItem[] = [
  {
    id: "vend-01",
    name: "Bajaj Electricals Supply Corp",
    gstin: "27AAACB0987H1Z4",
    contactPerson: "Amit Bajaj",
    ourBooksBalance: 954000,
    vendorStatementBalance: 954000,
    difference: 0,
    status: "reconciled",
    lastReconciledDate: "22/10/2026",
  },
  {
    id: "vend-02",
    name: "Jindal Steel & Alloys Ltd",
    gstin: "06AAACJ8765N1Z3",
    contactPerson: "R. K. Jindal",
    ourBooksBalance: 2450000,
    vendorStatementBalance: 2510000,
    difference: -60000,
    status: "mismatch",
    lastReconciledDate: "20/10/2026",
  },
  {
    id: "vend-03",
    name: "Godrej Agrovet Packaging",
    gstin: "27AAACG5432E1Z7",
    contactPerson: "Kavita Rao",
    ourBooksBalance: 412800,
    vendorStatementBalance: 412800,
    difference: 0,
    status: "reconciled",
    lastReconciledDate: "17/10/2026",
  },
  {
    id: "vend-04",
    name: "Sundaram Fasteners Agency",
    gstin: "33AAACS1234L1Z6",
    contactPerson: "S. Venkataraman",
    ourBooksBalance: 185000,
    vendorStatementBalance: 165000,
    difference: 20000,
    status: "mismatch",
    lastReconciledDate: "15/10/2026",
  },
];

export const MOCK_CUSTOMER_TRANSACTIONS: LedgerTransaction[] = [
  {
    id: "tx-01",
    date: "02/10/2026",
    voucherNo: "INV-2026-0842",
    description: "Tax Invoice - Consumer Goods Supply",
    debit: 150000,
    credit: 0,
    balance: 150000,
    matched: true,
    matchRef: "REC-MATCH-01",
  },
  {
    id: "tx-02",
    date: "08/10/2026",
    voucherNo: "RCPT-2026-0199",
    description: "RTGS Bank Transfer - HDFC Bank Ref 42918",
    debit: 0,
    credit: 150000,
    balance: 0,
    matched: true,
    matchRef: "REC-MATCH-01",
  },
  {
    id: "tx-03",
    date: "12/10/2026",
    voucherNo: "INV-2026-0911",
    description: "Tax Invoice - Seasonal Stock Delivery",
    debit: 35000,
    credit: 0,
    balance: 35000,
    matched: false, // Mismatch pending
  },
];

export const MOCK_STATS = {
  totalCustomers: 24,
  reconciledCustomers: 21,
  customerReconciliationRate: "87.5%",
  totalVendors: 18,
  reconciledVendors: 15,
  vendorReconciliationRate: "83.3%",
  pendingMismatchAmount: 140000, // ₹1,40,000
  recentActivityCount: 12,
};

/**
 * Format Indian Currency (e.g. 140000 -> ₹1,40,000.00)
 */
export function formatINR(val: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(val);
}
