"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Building2,
  User,
  Scale,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Customer Reconciliation",
    href: "/customer-reconciliation",
    icon: Users,
  },
  {
    name: "Vendor Reconciliation",
    href: "/vendor-reconciliation",
    icon: Building2,
  },
  {
    name: "Profile",
    href: "/profile",
    icon: User,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-[#E8E4D9] bg-white flex flex-col shrink-0 min-h-screen">
      {/* Brand logo & title */}
      <div className="h-16 flex items-center gap-3 px-6 border-b border-[#E8E4D9]">
        <div className="w-9 h-9 rounded-lg bg-[#1F6B4A] text-white flex items-center justify-center shadow-xs">
          <Scale className="w-5 h-5" />
        </div>
        <div>
          <span className="font-bold text-sm text-[#1B2A22] block leading-tight">
            Smart Recon
          </span>
          <span className="text-[11px] text-[#6B7A71] block">
            Ledger Reconciler
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="p-4 space-y-1 flex-1">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7A71] px-3 pb-2 pt-1">
          Menu
        </div>
        {navigation.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-[#E7F2EC] text-[#1F6B4A] font-semibold"
                  : "text-[#1B2A22] hover:bg-[#F3F0E8] hover:text-[#1B2A22]"
              )}
            >
              <Icon
                className={cn(
                  "w-4 h-4",
                  isActive ? "text-[#1F6B4A]" : "text-[#6B7A71]"
                )}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Database & System Info */}
      <div className="p-4 border-t border-[#E8E4D9]">
        <div className="bg-[#FAF8F3] border border-[#E8E4D9] rounded-lg p-3 text-xs space-y-1.5">
          <div className="flex items-center gap-1.5 font-medium text-[#1F6B4A]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>PostgreSQL Active</span>
          </div>
          <p className="text-[11px] text-[#6B7A71] leading-relaxed">
            Connected to your local database with secure session authentication.
          </p>
        </div>
      </div>
    </aside>
  );
}
