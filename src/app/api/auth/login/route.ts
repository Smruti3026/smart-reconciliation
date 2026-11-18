import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import pool from "@/lib/db";
import { setSessionCookie } from "@/lib/session";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body as { email: string; password: string };

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    // ── Look up user ──────────────────────────────────────────────────────────
    const result = await pool.query<{
      id: string;
      password_hash: string;
      full_name: string;
      company_name: string;
    }>(
      `SELECT u.id, u.password_hash, p.full_name, p.company_name
       FROM public.users u
       JOIN public.profiles p ON p.id = u.id
       WHERE u.email = $1`,
      [email.toLowerCase().trim()]
    );

    if (!result.rowCount || result.rowCount === 0) {
      // Deliberately vague error to avoid email enumeration
      return NextResponse.json(
        { error: "Invalid email or password. Please try again." },
        { status: 401 }
      );
    }

    const user = result.rows[0];

    // ── Verify password ───────────────────────────────────────────────────────
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return NextResponse.json(
        { error: "Invalid email or password. Please try again." },
        { status: 401 }
      );
    }

    // ── Create JWT session cookie ─────────────────────────────────────────────
    await setSessionCookie({
      userId: user.id,
      email: email.toLowerCase().trim(),
      fullName: user.full_name || "User",
      companyName: user.company_name || "",
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("[/api/auth/login] Error:", err);
    let errorMessage = "Something went wrong. Please try again.";
    if (err instanceof Error) {
      if (err.message.includes("password authentication failed")) {
        errorMessage = "PostgreSQL password in .env.local is incorrect. Please check your password.";
      } else if (err.message.includes("ECONNREFUSED")) {
        errorMessage = "Cannot connect to PostgreSQL on localhost:5432. Make sure PostgreSQL service is running.";
      } else if (err.message.includes("database \"smart_reconciliation\" does not exist")) {
        errorMessage = "Database 'smart_reconciliation' does not exist in pgAdmin. Please create it.";
      }
    }
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
