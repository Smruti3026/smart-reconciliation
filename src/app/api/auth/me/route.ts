import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import pool from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  try {
    const res = await pool.query(
      `SELECT u.id, u.email, p.full_name, p.company_name
       FROM public.users u
       LEFT JOIN public.profiles p ON p.id = u.id
       WHERE u.id = $1`,
      [session.userId]
    );

    if (res.rowCount && res.rows.length > 0) {
      const row = res.rows[0];
      return NextResponse.json({
        user: {
          id: row.id,
          email: row.email,
          fullName: row.full_name || session.fullName || "User",
          companyName: row.company_name || session.companyName || "My Business",
        },
      });
    }
  } catch (err) {
    console.error("[/api/auth/me] Error:", err);
  }

  // Fallback to session JWT payload
  return NextResponse.json({
    user: {
      id: session.userId,
      email: session.email,
      fullName: session.fullName || "User",
      companyName: session.companyName || "My Business",
    },
  });
}
