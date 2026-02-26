import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { query } from "@/lib/db";

export async function GET(request: Request) {
  const auth = await requireAdmin(request.headers.get("authorization"));
  if (auth.error) return auth.error;

  try {
    const result = await query(
      `SELECT id, email, name, status, created_at
       FROM user_approvals
       WHERE status = 'pending'
       ORDER BY created_at ASC`
    );
    return NextResponse.json({ pending: result.rows });
  } catch (err) {
    console.error("[admin/pending]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
