/**
 * Lightweight toast notification system — no external dependency needed.
 * Drop-in replacement for sonner/react-hot-toast for this project's needs.
 */
"use client";

import { useEffect, useState, useCallback } from "react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

// Global store — simple event emitter pattern
type ToastListener = (toast: Toast) => void;
const listeners: ToastListener[] = [];

function emit(toast: Toast) {
  listeners.forEach((l) => l(toast));
}

export const toast = {
  success: (message: string) =>
    emit({ id: crypto.randomUUID(), message, type: "success" }),
  error: (message: string) =>
    emit({ id: crypto.randomUUID(), message, type: "error" }),
  info: (message: string) =>
    emit({ id: crypto.randomUUID(), message, type: "info" }),
};

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    const handler = (t: Toast) => {
      setToasts((prev) => [...prev, t]);
      setTimeout(() => remove(t.id), 4000);
    };
    listeners.push(handler);
    return () => {
      const idx = listeners.indexOf(handler);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  }, [remove]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "flex items-start gap-3 p-4 rounded-xl shadow-lg border pointer-events-auto",
            "animate-in slide-in-from-right-4 fade-in duration-300",
            t.type === "success"
              ? "bg-white border-[#1F6B4A]/30 text-[#1B2A22]"
              : t.type === "error"
              ? "bg-white border-red-200 text-[#1B2A22]"
              : "bg-white border-blue-200 text-[#1B2A22]"
          )}
        >
          {t.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-[#1F6B4A] shrink-0 mt-0.5" />
          ) : t.type === "error" ? (
            <XCircle className="w-5 h-5 text-[#B3382C] shrink-0 mt-0.5" />
          ) : (
            <Info className="w-5 h-5 text-[#0078D4] shrink-0 mt-0.5" />
          )}
          <p className="text-sm flex-1 leading-snug">{t.message}</p>
          <button
            onClick={() => remove(t.id)}
            className="text-[#6B7A71] hover:text-[#1B2A22] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
