"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Eye, EyeOff, Loader2, ArrowRight, AlertCircle,
  CheckCircle2, Scale,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";

const BENEFITS = [
  "Match customer & vendor ledgers in seconds",
  "Spot discrepancies with smart highlighting",
  "Export reconciliation reports in one click",
];

export default function SignupPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  // Field errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");

  // ── Validation ──────────────────────────────────────────────────────────
  function validate(): Record<string, string> {
    const e: Record<string, string> = {};
    if (!fullName.trim()) e.fullName = "Full name is required.";
    if (!businessName.trim()) e.businessName = "Business or firm name is required.";
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      e.email = "Please enter a valid email address.";
    if (!password || password.length < 6)
      e.password = "Password must be at least 6 characters.";
    if (password !== confirmPassword)
      e.confirmPassword = "Passwords don't match — please check again.";
    if (!agreedToTerms)
      e.terms = "You must agree to the terms to create an account.";
    return e;
  }

  function validateField(name: string, value: string) {
    const e = { ...errors };
    if (name === "fullName") e.fullName = value.trim() ? "" : "Full name is required.";
    if (name === "businessName") e.businessName = value.trim() ? "" : "Business name is required.";
    if (name === "email")
      e.email =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? "" : "Please enter a valid email address.";
    if (name === "password") {
      e.password = value.length >= 6 ? "" : "Password must be at least 6 characters.";
      if (confirmPassword) e.confirmPassword = value === confirmPassword ? "" : "Passwords don't match.";
    }
    if (name === "confirmPassword")
      e.confirmPassword = value === password ? "" : "Passwords don't match — please check again.";
    setErrors(e);
  }

  // ── Submit ───────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    const errs = validate();
    setErrors(errs);
    if (Object.values(errs).some(Boolean)) return;

    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          fullName: fullName.trim(),
          companyName: businessName.trim(),
        }),
      });
      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        throw new Error(data.error ?? "Something went wrong. Please try again.");
      }

      toast.success("Account created! Taking you to your dashboard…");
      router.push("/dashboard");
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setFormError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* ── Left green panel ────────────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[45%] bg-[#1F6B4A] flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-white/5 rounded-full" />
        <div className="absolute -bottom-32 -right-16 w-80 h-80 bg-white/5 rounded-full" />
        <div className="absolute top-1/2 left-1/3 w-40 h-40 bg-white/5 rounded-full" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center">
              <Scale className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-bold text-lg tracking-tight">Smart Reconciliation</span>
          </div>

          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Reconcile messy ledgers<br />
            in minutes,{" "}
            <span className="text-white/70">not days.</span>
          </h1>
          <p className="text-white/60 text-base leading-relaxed mb-10">
            Join thousands of Indian CAs and businesses who save hours every month on ledger reconciliation.
          </p>

          <ul className="space-y-4">
            {BENEFITS.map((b) => (
              <li key={b} className="flex items-start gap-3">
                <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-white/80 text-sm leading-relaxed">{b}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-white/40 text-xs">
          Free to start · No credit card required
        </p>
      </div>

      {/* ── Right panel — form ──────────────────────────────────────────────── */}
      <div className="flex-1 bg-[#FAF8F3] flex flex-col justify-center items-center px-6 py-12">
        <div className="w-full max-w-[420px] space-y-6">

          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2.5 mb-2">
            <div className="w-9 h-9 bg-[#1F6B4A] rounded-xl flex items-center justify-center">
              <Scale className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-[#1B2A22]">Smart Reconciliation</span>
          </div>

          {/* Header */}
          <div>
            <h2 className="text-2xl font-bold text-[#1B2A22] mb-1">Create your account</h2>
            <p className="text-sm text-[#6B7A71]">
              Already have an account?{" "}
              <Link href="/login" className="text-[#1F6B4A] font-semibold hover:underline">
                Sign in
              </Link>
            </p>
          </div>

          {/* Form error */}
          {formError && (
            <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-sm text-[#B3382C]">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Full Name */}
            <Field
              id="signup-fullName"
              label="Full Name"
              error={errors.fullName}
            >
              <Input
                id="signup-fullName"
                type="text"
                autoComplete="name"
                value={fullName}
                onChange={(e) => { setFullName(e.target.value); validateField("fullName", e.target.value); }}
                onBlur={() => validateField("fullName", fullName)}
                className={inputCx(!!errors.fullName)}
              />
            </Field>

            {/* Business Name */}
            <Field
              id="signup-businessName"
              label="Firm / Business Name"
              error={errors.businessName}
            >
              <Input
                id="signup-businessName"
                type="text"
                autoComplete="organization"
                value={businessName}
                onChange={(e) => { setBusinessName(e.target.value); validateField("businessName", e.target.value); }}
                onBlur={() => validateField("businessName", businessName)}
                className={inputCx(!!errors.businessName)}
              />
            </Field>

            {/* Email */}
            <Field id="signup-email" label="Work Email" error={errors.email}>
              <Input
                id="signup-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); validateField("email", e.target.value); }}
                onBlur={() => validateField("email", email)}
                className={inputCx(!!errors.email)}
              />
            </Field>

            {/* Password */}
            <Field id="signup-password" label="Password" error={errors.password}>
              <div className="relative">
                <Input
                  id="signup-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); validateField("password", e.target.value); }}
                  onBlur={() => validateField("password", password)}
                  className={cn(inputCx(!!errors.password), "pr-10")}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7A71] hover:text-[#1B2A22] cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </Field>

            {/* Confirm Password */}
            <Field id="signup-confirmPassword" label="Confirm Password" error={errors.confirmPassword}>
              <div className="relative">
                <Input
                  id="signup-confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); validateField("confirmPassword", e.target.value); }}
                  onBlur={() => validateField("confirmPassword", confirmPassword)}
                  className={cn(inputCx(!!errors.confirmPassword), "pr-10")}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7A71] hover:text-[#1B2A22] cursor-pointer"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </Field>

            {/* Terms checkbox */}
            <div className="space-y-1">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  id="signup-terms"
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => {
                    setAgreedToTerms(e.target.checked);
                    if (e.target.checked) {
                      setErrors((prev) => ({ ...prev, terms: "" }));
                    }
                  }}
                  className="w-4 h-4 mt-0.5 rounded border-[#D1D5DB] text-[#1F6B4A] focus:ring-[#1F6B4A] cursor-pointer accent-[#1F6B4A]"
                />
                <span className="text-sm text-[#6B7A71] leading-snug">
                  I agree to the{" "}
                  <span className="text-[#1F6B4A] font-medium hover:underline">
                    Terms of Service
                  </span>{" "}
                  and{" "}
                  <span className="text-[#1F6B4A] font-medium hover:underline">
                    Privacy Policy
                  </span>
                </span>
              </label>
              {errors.terms && (
                <p className="text-xs text-[#B3382C] flex items-center gap-1 pl-7">
                  <AlertCircle className="w-3 h-3" /> {errors.terms}
                </p>
              )}
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-[#1F6B4A] hover:bg-[#185A3E] text-white font-semibold cursor-pointer transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Creating account…
                </>
              ) : (
                <>
                  Create Account
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </form>

          <p className="text-center text-[11px] text-[#6B7A71]/70">
            Free to start · No credit card required · Indian data residency
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Small helpers ────────────────────────────────────────────────────────────

function inputCx(hasError: boolean) {
  return cn(
    "h-11 border-[#E8E4D9] focus-visible:ring-[#1F6B4A] text-sm bg-white",
    hasError && "border-[#B3382C] focus-visible:ring-[#B3382C]"
  );
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-semibold text-[#1B2A22] uppercase tracking-wide">
        {label}
      </Label>
      {children}
      {error && (
        <p className="text-xs text-[#B3382C] flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> {error}
        </p>
      )}
    </div>
  );
}
