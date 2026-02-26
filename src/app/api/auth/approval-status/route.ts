import { NextResponse } from "next/server";
import { requireAuth, isAdminEmail } from "@/lib/api-auth";
import { query } from "@/lib/db";

export async function GET(request: Request) {
  const auth = await requireAuth(request.headers.get("authorization"));
  if (auth.error) return auth.error;

  const email = auth.email;
  if (!email) {
    return NextResponse.json({ approved: false });
  }

  // Main admin can always log in (to approve others)
  if (isAdminEmail(email)) {
    return NextResponse.json({ approved: true });
  }

  try {
    const result = await query(
      "SELECT status FROM user_approvals WHERE LOWER(email) = LOWER($1)",
      [email]
    );
    const row = result.rows[0];
    const approved = row?.status === "approved";
    return NextResponse.json({ approved });
  } catch (err) {
    console.error("[approval-status]", err);
    return NextResponse.json({ approved: false });
  }
}
