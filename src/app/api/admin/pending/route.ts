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
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("user_approvals") || msg.includes("does not exist")) {
      return NextResponse.json(
        { error: "Database table user_approvals is missing. Run: npm run db:init (or add the user_approvals table from src/lib/schema.sql)." },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
