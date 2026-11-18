import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import pool from "@/lib/db";
import { setSessionCookie } from "@/lib/session";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, fullName, companyName } = body as {
      email: string;
      password: string;
      fullName: string;
      companyName?: string;
    };

    // ── Validate inputs ──────────────────────────────────────────────────────
    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: "Email, password, and full name are required." },
        { status: 400 }
      );
    }
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters." },
        { status: 400 }
      );
    }

    // ── Check email isn't already registered ─────────────────────────────────
    const existing = await pool.query(
      "SELECT id FROM public.users WHERE email = $1",
      [email.toLowerCase().trim()]
    );
    if (existing.rowCount && existing.rowCount > 0) {
      return NextResponse.json(
        { error: "An account with this email already exists. Please sign in." },
        { status: 409 }
      );
    }

    // ── Hash password ─────────────────────────────────────────────────────────
    const passwordHash = await bcrypt.hash(password, 12);

    // ── Insert user + profile in a transaction ───────────────────────────────
    const client = await pool.connect();
    let userId: string;
    try {
      await client.query("BEGIN");

      const userResult = await client.query<{ id: string }>(
        `INSERT INTO public.users (email, password_hash)
         VALUES ($1, $2)
         RETURNING id`,
        [email.toLowerCase().trim(), passwordHash]
      );
      userId = userResult.rows[0].id;

      // Update the profile that was auto-created by the trigger
      await client.query(
        `UPDATE public.profiles
         SET full_name = $1, company_name = $2
         WHERE id = $3`,
        [fullName.trim(), (companyName ?? "").trim(), userId]
      );

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    // ── Create JWT session cookie ─────────────────────────────────────────────
    await setSessionCookie({
      userId,
      email: email.toLowerCase().trim(),
      fullName: fullName.trim(),
      companyName: (companyName ?? "").trim(),
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("[/api/auth/signup] Error:", err);
    let errorMessage = "Something went wrong. Please try again.";
    if (err instanceof Error) {
      if (err.message.includes("password authentication failed")) {
        errorMessage = "PostgreSQL password in .env.local is incorrect. Please check your password.";
      } else if (err.message.includes("ECONNREFUSED")) {
        errorMessage = "Cannot connect to PostgreSQL on localhost:5432. Make sure PostgreSQL service is running.";
      } else if (err.message.includes("database \"smart_reconciliation\" does not exist")) {
        errorMessage = "Database 'smart_reconciliation' does not exist in pgAdmin. Please create it.";
      } else {
        errorMessage = err.message;
      }
    }
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
