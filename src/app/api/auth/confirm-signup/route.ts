import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { sendNewUserPendingEmailToAdmin } from "@/lib/ses";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const name = typeof body.name === "string" ? body.name.trim() : null;

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }

    await query(
      `INSERT INTO user_approvals (email, name, status)
       VALUES ($1, $2, 'pending')
       ON CONFLICT (email) DO UPDATE SET name = COALESCE(EXCLUDED.name, user_approvals.name), status = 'pending', approved_at = NULL, approved_by = NULL`,
      [email, name || null]
    );

    await sendNewUserPendingEmailToAdmin({ email, name: name ?? undefined });

    return NextResponse.json({ ok: true, message: "Pending approval. You will be notified when an admin approves you." });
  } catch (err) {
    console.error("[confirm-signup]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
