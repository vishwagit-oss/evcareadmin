import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { query } from "@/lib/db";
import { sendApprovedEmailToUser } from "@/lib/ses";

export async function POST(request: Request) {
  const auth = await requireAdmin(request.headers.get("authorization"));
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim() : "";
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }

    const update = await query(
      `UPDATE user_approvals
       SET status = 'approved', approved_at = CURRENT_TIMESTAMP, approved_by = $1
       WHERE LOWER(email) = LOWER($2) AND status = 'pending'
       RETURNING email, name`,
      [auth.email, email]
    );

    if (update.rows.length === 0) {
      return NextResponse.json({ error: "User not found or already approved/rejected" }, { status: 404 });
    }

    const row = update.rows[0];
    await sendApprovedEmailToUser(row.email, row.name ?? undefined);

    return NextResponse.json({ ok: true, message: "User approved and notified." });
  } catch (err) {
    console.error("[admin/approve]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
