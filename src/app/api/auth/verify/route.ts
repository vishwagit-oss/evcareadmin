import { NextRequest, NextResponse } from "next/server";
import { verifyCognitoToken, getTokenFromHeader } from "@/lib/verify-token";

export async function GET(request: NextRequest) {
  const token = getTokenFromHeader(request.headers.get("authorization"));
  if (!token) {
    return NextResponse.json({ valid: false }, { status: 401 });
  }

  const payload = await verifyCognitoToken(token);
  if (!payload) {
    return NextResponse.json({ valid: false }, { status: 401 });
  }

  return NextResponse.json({ valid: true, sub: payload.sub });
}
