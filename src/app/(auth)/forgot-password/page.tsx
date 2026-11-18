"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Scale, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  function validateEmail(val: string) {
    if (!val) return "Email is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return "Please enter a valid email address.";
    return "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const err = validateEmail(email);
    setEmailError(err);
    if (err) return;

    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      setSent(true);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#FAF8F3] flex flex-col justify-center items-center px-6 py-12">
      <div className="w-full max-w-[400px] space-y-7">

        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-[#1F6B4A] rounded-xl flex items-center justify-center">
            <Scale className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-[#1B2A22]">Smart Reconciliation</span>
        </div>

        {/* Card */}
        <div className="bg-white border border-[#E8E4D9] rounded-2xl shadow-sm p-8 space-y-6">

          {sent ? (
            /* ── Success state ─────────────────────────────────────────────── */
            <div className="text-center space-y-4">
              <div className="w-14 h-14 bg-[#E7F2EC] rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7 text-[#1F6B4A]" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#1B2A22] mb-2">Check your inbox</h2>
                <p className="text-sm text-[#6B7A71] leading-relaxed">
                  If an account exists for{" "}
                  <span className="font-medium text-[#1B2A22]">{email}</span>, you&apos;ll
                  receive a password reset link within a few minutes.
                </p>
              </div>
              <p className="text-xs text-[#6B7A71]">
                Didn&apos;t get it? Check your spam folder.
              </p>
            </div>
          ) : (
            /* ── Form state ────────────────────────────────────────────────── */
            <>
              <div>
                <h2 className="text-xl font-bold text-[#1B2A22] mb-1">Reset your password</h2>
                <p className="text-sm text-[#6B7A71]">
                  Enter the email address linked to your account and we&apos;ll send you a reset link.
                </p>
              </div>

              {error && (
                <div className="flex items-start gap-2.5 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-[#B3382C]">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="forgot-email" className="text-xs font-semibold text-[#1B2A22] uppercase tracking-wide">
                    Email Address
                  </Label>
                  <Input
                    id="forgot-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) setEmailError(validateEmail(e.target.value));
                    }}
                    onBlur={() => setEmailError(validateEmail(email))}
                    className={`h-11 border-[#E8E4D9] focus-visible:ring-[#1F6B4A] text-sm bg-white ${
                      emailError ? "border-[#B3382C] focus-visible:ring-[#B3382C]" : ""
                    }`}
                  />
                  {emailError && (
                    <p className="text-xs text-[#B3382C] flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {emailError}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 bg-[#1F6B4A] hover:bg-[#185A3E] text-white font-semibold cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Sending link…
                    </>
                  ) : (
                    "Send Reset Link"
                  )}
                </Button>
              </form>
            </>
          )}
        </div>

        {/* Back to login */}
        <Link
          href="/login"
          className="flex items-center gap-2 text-sm text-[#6B7A71] hover:text-[#1B2A22] transition-colors mx-auto w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Sign In
        </Link>
      </div>
    </div>
  );
}
