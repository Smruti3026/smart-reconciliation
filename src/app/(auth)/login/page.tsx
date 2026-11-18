"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, ArrowRight, AlertCircle, CheckCircle2, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toaster";

const BENEFITS = [
  "Match customer & vendor ledgers in seconds",
  "Spot discrepancies with smart highlighting",
  "Export reconciliation reports in one click",
];

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Field-level errors
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [formError, setFormError] = useState("");

  // ── Inline validation ────────────────────────────────────────────────────
  function validateEmail(val: string) {
    if (!val) return "Email is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return "That doesn't look like a valid email.";
    return "";
  }

  function validatePassword(val: string) {
    if (!val) return "Password is required.";
    return "";
  }

  // ── Submit ───────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    const eErr = validateEmail(email);
    const pErr = validatePassword(password);
    setEmailError(eErr);
    setPasswordError(pErr);
    if (eErr || pErr) return;

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        throw new Error(data.error ?? "That email or password doesn't look right.");
      }

      toast.success("Welcome back! Redirecting…");
      router.push("/dashboard");
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "That email or password doesn't look right.";
      setFormError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* ── Left panel (hidden on mobile) ─────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[45%] bg-[#1F6B4A] flex-col justify-between p-12 relative overflow-hidden">
        {/* Subtle texture circles */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-white/5 rounded-full" />
        <div className="absolute -bottom-32 -right-16 w-80 h-80 bg-white/5 rounded-full" />
        <div className="absolute top-1/2 left-1/3 w-40 h-40 bg-white/5 rounded-full" />

        {/* Brand */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center">
              <Scale className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-bold text-lg tracking-tight">Smart Reconciliation</span>
          </div>

          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Reconcile messy ledgers in minutes,<br />
            <span className="text-white/70">not days.</span>
          </h1>
          <p className="text-white/60 text-base leading-relaxed mb-10">
            Built for Indian accountants and small businesses who need clean, audit-ready books — fast.
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

        {/* Bottom caption */}
        <p className="relative z-10 text-white/40 text-xs">
          Trusted by CAs & small businesses across India
        </p>
      </div>

      {/* ── Right panel — form ──────────────────────────────────────────────── */}
      <div className="flex-1 bg-[#FAF8F3] flex flex-col justify-center items-center px-6 py-12">
        <div className="w-full max-w-[400px] space-y-7">

          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2.5 mb-2">
            <div className="w-9 h-9 bg-[#1F6B4A] rounded-xl flex items-center justify-center">
              <Scale className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-[#1B2A22]">Smart Reconciliation</span>
          </div>

          {/* Header */}
          <div>
            <h2 className="text-2xl font-bold text-[#1B2A22] mb-1">Sign in</h2>
            <p className="text-sm text-[#6B7A71]">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="text-[#1F6B4A] font-semibold hover:underline">
                Create one free
              </Link>
            </p>
          </div>

          {/* Form error banner */}
          {formError && (
            <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-sm text-[#B3382C]">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="login-email" className="text-xs font-semibold text-[#1B2A22] uppercase tracking-wide">
                Email Address
              </Label>
              <Input
                id="login-email"
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

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="login-password" className="text-xs font-semibold text-[#1B2A22] uppercase tracking-wide">
                  Password
                </Label>
                <Link href="/forgot-password" className="text-xs text-[#1F6B4A] hover:underline font-medium">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (passwordError) setPasswordError(validatePassword(e.target.value));
                  }}
                  onBlur={() => setPasswordError(validatePassword(password))}
                  className={`h-11 pr-10 border-[#E8E4D9] focus-visible:ring-[#1F6B4A] text-sm bg-white ${
                    passwordError ? "border-[#B3382C] focus-visible:ring-[#B3382C]" : ""
                  }`}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7A71] hover:text-[#1B2A22] transition-colors cursor-pointer"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {passwordError && (
                <p className="text-xs text-[#B3382C] flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {passwordError}
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
                  Signing in…
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </form>

          <p className="text-center text-[11px] text-[#6B7A71]/70">
            Compliant with Indian Accounting Standards · Secure 256-bit SSL
          </p>
        </div>
      </div>
    </div>
  );
}
