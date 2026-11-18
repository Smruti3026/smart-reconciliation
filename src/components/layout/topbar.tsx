"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Building, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Topbar() {
  const router = useRouter();
  const [userName, setUserName] = useState<string>("");
  const [companyName, setCompanyName] = useState<string>("");
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) {
          setUserName(data.user.fullName || data.user.email?.split("@")[0] || "User");
          setCompanyName(data.user.companyName || "My Business");
        }
      })
      .catch((err) => {
        console.error("Failed to fetch current user in Topbar:", err);
      });
  }, []);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("Logout request failed:", err);
    }
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="h-16 border-b border-[#E8E4D9] bg-white px-6 flex items-center justify-between sticky top-0 z-10">
      {/* Left: Active Company / Account */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#FAF8F3] border border-[#E8E4D9] flex items-center justify-center text-[#1F6B4A]">
          <Building className="w-4 h-4" />
        </div>
        <div>
          <span className="text-xs font-semibold text-[#1B2A22] block leading-tight">
            {companyName || "Smart Reconciliation"}
          </span>
          <span className="text-[11px] text-[#6B7A71] block">
            FY 2026–27 &middot; Regular Books
          </span>
        </div>
      </div>

      {/* Right: User info & Sign out */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 pl-2 border-l border-[#E8E4D9]">
          <div className="w-7 h-7 rounded-full bg-[#FAF8F3] border border-[#E8E4D9] flex items-center justify-center text-[#1F6B4A] text-xs font-semibold">
            <UserCheck className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-medium text-[#1B2A22] hidden sm:inline">
            {userName || "Account"}
          </span>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          disabled={loggingOut}
          className="border-[#E8E4D9] text-[#6B7A71] hover:text-[#B3382C] hover:bg-red-50 hover:border-red-200 text-xs h-8 px-2.5 ml-1 cursor-pointer transition-colors"
          title="Sign out of account"
        >
          <LogOut className="w-3.5 h-3.5 mr-1" />
          {loggingOut ? "Signing out..." : "Logout"}
        </Button>
      </div>
    </header>
  );
}
