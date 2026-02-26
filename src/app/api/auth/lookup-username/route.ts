import { NextResponse } from "next/server";
import {
  CognitoIdentityProviderClient,
  ListUsersCommand,
  AdminResendConfirmationCodeCommand,
} from "@aws-sdk/client-cognito-identity-provider";

const region = process.env.AWS_REGION ?? "us-east-2";
const userPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID;

/**
 * For unconfirmed users: look up Cognito username by email and optionally resend verification code.
 * POST body: { email: string, resend?: boolean }
 * Returns: { username } so client can open verify-email?email=...&username=...
 */
export async function POST(request: Request) {
  let body: { email?: string; resend?: boolean } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const email = typeof body.email === "string" ? body.email.trim() : "";

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }
  if (!userPoolId) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const client = new CognitoIdentityProviderClient({ region });

  try {
    const list = await client.send(
      new ListUsersCommand({
        UserPoolId: userPoolId,
        Filter: `email = "${email.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`,
        Limit: 1,
      })
    );

    const user = list.Users?.[0];
    if (!user) {
      return NextResponse.json({ error: "No account found with this email. Please sign up first." }, { status: 404 });
    }

    const status = user.UserStatus;
    if (status === "CONFIRMED") {
      return NextResponse.json({
        error: "This email is already verified. Try logging in.",
      }, { status: 400 });
    }

    const username = user.Username;
    if (!username) {
      return NextResponse.json({ error: "Account data incomplete." }, { status: 400 });
    }

    // Optionally resend verification code so they get a fresh code
    const resend = body.resend !== false;
    if (resend) {
      try {
        await client.send(
          new AdminResendConfirmationCodeCommand({
            UserPoolId: userPoolId,
            Username: username,
          })
        );
      } catch (resendErr) {
        console.error("[lookup-username] resend failed:", resendErr);
        // Still return username so they can use an existing code
      }
    }

    return NextResponse.json({ username });
  } catch (err) {
    console.error("[lookup-username]", err);
    return NextResponse.json({ error: "Could not look up account. Try again." }, { status: 500 });
  }
}
