import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

/**
 * POST /api/auth/forgot-password
 *
 * Checks if the email exists in the DB.
 * Always returns 200 (even if not found) to prevent email enumeration.
 *
 * Note: In a real production setup, this would send an actual email with a
 * signed reset token (e.g. via Nodemailer + SMTP). For Phase 1 local dev,
 * the response just confirms the request was received.
 */
export async function POST(request: NextRequest) {
  try {
    const { email } = (await request.json()) as { email?: string };

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Please provide a valid email address." },
        { status: 400 }
      );
    }

    // Check existence (but don't reveal the result to the caller)
    await pool.query("SELECT id FROM public.users WHERE email = $1", [
      email.toLowerCase().trim(),
    ]);

    // Always return success — avoids revealing which emails are registered
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[/api/auth/forgot-password] Error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
