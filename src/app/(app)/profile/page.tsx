"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserCheck, Building, Mail, ShieldCheck, Database } from "lucide-react";

export default function ProfilePage() {
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
            fullName: data.user.fullName || "User",
            companyName: data.user.companyName || "My Business",
            email: data.user.email || "",
          });
        }
      })
      .catch((err) => {
        console.error("Profile fetch error:", err);
      });
  }, []);

  const fullName = user?.fullName || "User";
  const companyName = user?.companyName || "My Business";
  const email = user?.email || "";

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1B2A22]">User Profile</h1>
        <p className="text-sm text-[#6B7A71] mt-1">
          Your account details, active firm, and system connection
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* User Card */}
        <Card className="border-[#E8E4D9] bg-white rounded-2xl shadow-xs md:col-span-1 flex flex-col items-center p-6 text-center">
          <div className="w-20 h-20 rounded-2xl bg-[#E7F2EC] text-[#1F6B4A] flex items-center justify-center font-bold text-2xl mb-4 border border-[#1F6B4A]/20">
            {fullName.charAt(0).toUpperCase()}
          </div>
          <h2 className="text-lg font-bold text-[#1B2A22]">{fullName}</h2>
          <p className="text-xs text-[#6B7A71] mt-0.5">{email || "account"}</p>
          <div className="mt-3">
            <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#E7F2EC] text-[#1F6B4A]">
              Accountant / Owner
            </span>
          </div>

          <div className="w-full border-t border-[#E8E4D9] mt-6 pt-4 text-left space-y-2.5 text-xs">
            <div className="flex items-center justify-between text-[#6B7A71]">
              <span>Status</span>
              <span className="font-semibold text-[#1F6B4A] flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Active
              </span>
            </div>
            <div className="flex items-center justify-between text-[#6B7A71]">
              <span>Database Sync</span>
              <span className="font-medium text-[#1B2A22]">PostgreSQL</span>
            </div>
          </div>
        </Card>

        {/* Firm & Account Details */}
        <div className="md:col-span-2 space-y-6">
          <Card className="border-[#E8E4D9] bg-white rounded-2xl shadow-xs">
            <CardHeader className="pb-3 border-b border-[#E8E4D9]">
              <CardTitle className="text-base font-semibold text-[#1B2A22]">
                Firm & Business Information
              </CardTitle>
              <CardDescription className="text-xs text-[#6B7A71]">
                Details registered in your local PostgreSQL database
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4 text-sm">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#FAF8F3] border border-[#E8E4D9] text-[#1F6B4A] flex items-center justify-center shrink-0">
                  <Building className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs text-[#6B7A71] font-medium uppercase tracking-wide">
                    Firm / Business Name
                  </div>
                  <div className="text-base font-bold text-[#1B2A22] mt-0.5">{companyName}</div>
                </div>
              </div>

              <div className="flex items-start gap-3 pt-2 border-t border-[#E8E4D9]">
                <div className="w-9 h-9 rounded-xl bg-[#FAF8F3] border border-[#E8E4D9] text-[#1F6B4A] flex items-center justify-center shrink-0">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs text-[#6B7A71] font-medium uppercase tracking-wide">
                    Full Name
                  </div>
                  <div className="text-base font-bold text-[#1B2A22] mt-0.5">{fullName}</div>
                </div>
              </div>

              <div className="flex items-start gap-3 pt-2 border-t border-[#E8E4D9]">
                <div className="w-9 h-9 rounded-xl bg-[#FAF8F3] border border-[#E8E4D9] text-[#1F6B4A] flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs text-[#6B7A71] font-medium uppercase tracking-wide">
                    Email Address
                  </div>
                  <div className="text-base font-bold text-[#1B2A22] mt-0.5">{email}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-[#E8E4D9] bg-white rounded-2xl shadow-xs">
            <CardHeader className="pb-3 border-b border-[#E8E4D9]">
              <CardTitle className="text-base font-semibold text-[#1B2A22] flex items-center gap-2">
                <Database className="w-4 h-4 text-[#1F6B4A]" /> Database Architecture
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 text-xs text-[#6B7A71] space-y-2">
              <div className="flex items-center justify-between">
                <span>Database Engine</span>
                <span className="font-mono text-[#1B2A22] font-semibold">PostgreSQL (Local / pgAdmin)</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Auth System</span>
                <span className="font-mono text-[#1B2A22] font-semibold">HTTP-Only JWT Cookie (sr-session)</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Password Security</span>
                <span className="font-mono text-[#1B2A22] font-semibold">bcrypt (salt rounds 12)</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
