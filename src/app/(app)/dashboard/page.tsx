"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  MOCK_STATS,
  MOCK_CUSTOMERS,
  MOCK_VENDORS,
  formatINR,
} from "@/lib/mock-data";
import {
  Users,
  Building2,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  FileCheck,
} from "lucide-react";

export default function DashboardPage() {
  const [user, setUser] = useState<{
    fullName: string;
    companyName: string;
    email: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) {
          setUser({
            fullName: data.user.fullName || "Accountant",
            companyName: data.user.companyName || "My Business",
            email: data.user.email || "",
          });
        }
      })
      .catch((err) => {
        console.error("Dashboard user fetch error:", err);
      });
  }, []);

  const fullName = user?.fullName || "Accountant";
  const companyName = user?.companyName || "My Business";
  const email = user?.email || "";

  const customerMismatches = MOCK_CUSTOMERS.filter((c) => c.status === "mismatch");
  const vendorMismatches = MOCK_VENDORS.filter((v) => v.status === "mismatch");

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E8E4D9] shadow-xs">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight text-[#1B2A22]">
              Welcome back, {fullName} 👋
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#E7F2EC] text-[#1F6B4A] border border-[#1F6B4A]/20">
              {companyName}
            </span>
          </div>
          <p className="text-sm text-[#6B7A71]">
            Ledger reconciliation status & balance health for FY 2026–27 {email ? `· ${email}` : ""}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/customer-reconciliation">
            <Button
              variant="outline"
              className="border-[#E8E4D9] text-[#1B2A22] hover:bg-[#F3F0E8] text-xs font-medium cursor-pointer"
            >
              <Users className="w-3.5 h-3.5 mr-1.5 text-[#1F6B4A]" />
              Customer Recon
            </Button>
          </Link>
          <Link href="/vendor-reconciliation">
            <Button className="bg-[#1F6B4A] hover:bg-[#185A3E] text-white text-xs font-medium cursor-pointer">
              <Building2 className="w-3.5 h-3.5 mr-1.5" />
              Vendor Recon
            </Button>
          </Link>
        </div>
      </div>

      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Overall Health */}
        <Card className="border-[#E8E4D9] shadow-xs bg-white rounded-xl">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-[#6B7A71]">
              Overall Health
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-[#E7F2EC] text-[#1F6B4A] flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#1B2A22]">85.7%</div>
            <p className="text-xs text-[#1F6B4A] font-medium mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              36 of 42 accounts matched
            </p>
          </CardContent>
        </Card>

        {/* Customer Accounts */}
        <Card className="border-[#E8E4D9] shadow-xs bg-white rounded-xl">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-[#6B7A71]">
              Customer Ledgers
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-[#FAF8F3] border border-[#E8E4D9] text-[#1F6B4A] flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#1B2A22]">
              {MOCK_STATS.reconciledCustomers} / {MOCK_STATS.totalCustomers}
            </div>
            <p className="text-xs text-[#6B7A71] mt-1">
              {MOCK_STATS.customerReconciliationRate} reconciled rate
            </p>
          </CardContent>
        </Card>

        {/* Vendor Accounts */}
        <Card className="border-[#E8E4D9] shadow-xs bg-white rounded-xl">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-[#6B7A71]">
              Vendor Ledgers
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-[#FAF8F3] border border-[#E8E4D9] text-[#1F6B4A] flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#1B2A22]">
              {MOCK_STATS.reconciledVendors} / {MOCK_STATS.totalVendors}
            </div>
            <p className="text-xs text-[#6B7A71] mt-1">
              {MOCK_STATS.vendorReconciliationRate} reconciled rate
            </p>
          </CardContent>
        </Card>

        {/* Discrepancies Amount */}
        <Card className="border-[#E8E4D9] shadow-xs bg-white rounded-xl">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-[#6B7A71]">
              Open Mismatches
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-[#B7791F] flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#B7791F]">
              {formatINR(MOCK_STATS.pendingMismatchAmount)}
            </div>
            <p className="text-xs text-[#6B7A71] mt-1">
              Requires accountant review
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Discrepancies Requiring Attention */}
      <Card className="border-[#E8E4D9] shadow-xs bg-white rounded-xl">
        <CardHeader className="pb-3 border-b border-[#E8E4D9]">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-[#1B2A22]">
                Action Required: Ledger Discrepancies
              </CardTitle>
              <CardDescription className="text-xs text-[#6B7A71]">
                Customer and vendor balances with difference between our books and statement
              </CardDescription>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-[#B7791F] border border-amber-200">
              {customerMismatches.length + vendorMismatches.length} Mismatches
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF8F3] border-b border-[#E8E4D9] text-[#6B7A71] font-medium">
                <tr>
                  <th className="py-3 px-4">Entity</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">GSTIN</th>
                  <th className="py-3 px-4 text-right">Our Books</th>
                  <th className="py-3 px-4 text-right">Counterpart</th>
                  <th className="py-3 px-4 text-right">Variance</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E4D9]">
                {customerMismatches.map((item) => (
                  <tr key={item.id} className="hover:bg-[#FAF8F3]/60 transition-colors">
                    <td className="py-3 px-4 font-medium text-[#1B2A22]">
                      {item.name}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#E7F2EC] text-[#1F6B4A]">
                        Customer
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-[#6B7A71]">
                      {item.gstin}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-[#1B2A22]">
                      {formatINR(item.ledgerBalance)}
                    </td>
                    <td className="py-3 px-4 text-right text-[#6B7A71]">
                      {formatINR(item.portalBalance)}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-[#B3382C]">
                      +{formatINR(item.difference)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Link
                        href="/customer-reconciliation"
                        className="inline-flex items-center text-[#1F6B4A] hover:text-[#185A3E] font-medium text-xs gap-1"
                      >
                        Reconcile <ArrowRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}

                {vendorMismatches.map((item) => (
                  <tr key={item.id} className="hover:bg-[#FAF8F3]/60 transition-colors">
                    <td className="py-3 px-4 font-medium text-[#1B2A22]">
                      {item.name}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700">
                        Vendor
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-[#6B7A71]">
                      {item.gstin}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-[#1B2A22]">
                      {formatINR(item.ourBooksBalance)}
                    </td>
                    <td className="py-3 px-4 text-right text-[#6B7A71]">
                      {formatINR(item.vendorStatementBalance)}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-[#B3382C]">
                      {formatINR(item.difference)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Link
                        href="/vendor-reconciliation"
                        className="inline-flex items-center text-[#1F6B4A] hover:text-[#185A3E] font-medium text-xs gap-1"
                      >
                        Reconcile <ArrowRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Quick Guide / System Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-[#E8E4D9] bg-white rounded-xl shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-[#1B2A22] flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-[#1F6B4A]" />
              Reconciliation Checklist
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-[#6B7A71] space-y-2">
            <div className="flex items-center gap-2 text-[#1B2A22]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1F6B4A]" />
              <span>Verify credit note deductions on Tata Consumer Distributors</span>
            </div>
            <div className="flex items-center gap-2 text-[#1B2A22]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1F6B4A]" />
              <span>Confirm RTGS payment clearance for Jindal Steel & Alloys</span>
            </div>
            <div className="flex items-center gap-2 text-[#1B2A22]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1F6B4A]" />
              <span>Upload month-end statement for Anand Hardware</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#E8E4D9] bg-white rounded-xl shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-[#1B2A22]">
              How Matching Engine Works
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-[#6B7A71] space-y-1.5">
            <p>
              In Phase 1, you can browse customer/vendor ledgers, review
              discrepancies, and inspect vouchers.
            </p>
            <p>
              Phase 2 will integrate the automated matching engine (Python/FastAPI)
              to auto-reconcile invoices, payments, and TDS deductions.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
