import { NextResponse } from "next/server";
import { verifyCognitoToken, getTokenFromHeader } from "./verify-token";

export async function requireAuth(authHeader: string | null): Promise<
  | { sub: string; email?: string; error?: never }
  | { sub?: never; error: NextResponse }
> {
  const token = getTokenFromHeader(authHeader);
  if (!token) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const payload = await verifyCognitoToken(token);
  if (!payload) {
    return { error: NextResponse.json({ error: "Invalid token" }, { status: 401 }) };
  }

  return { sub: payload.sub, email: payload.email };
}

const ADMIN_EMAIL = process.env.EVCARE_ADMIN_EMAIL ?? "vishwagohil21@gmail.com";

export function isAdminEmail(email: string | undefined): boolean {
  return !!email && email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

export async function requireAdmin(authHeader: string | null): Promise<
  | { sub: string; email: string; error?: never }
  | { sub?: never; email?: never; error: NextResponse }
> {
  const auth = await requireAuth(authHeader);
  if (auth.error) return auth;
  if (!auth.email || !isAdminEmail(auth.email)) {
    return { error: NextResponse.json({ error: "Forbidden: admin only" }, { status: 403 }) };
  }
  return { sub: auth.sub, email: auth.email };
}
