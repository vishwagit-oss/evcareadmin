"use client";

import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserAttribute,
} from "amazon-cognito-identity-js";

const poolData = {
  UserPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID!,
  ClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!,
};

const userPool = new CognitoUserPool(poolData);

export function signUp(
  email: string,
  password: string,
  name: string
): Promise<{ userSub: string }> {
  return new Promise((resolve, reject) => {
    const attributes = [
      new CognitoUserAttribute({ Name: "email", Value: email }),
      new CognitoUserAttribute({ Name: "name", Value: name }),
      new CognitoUserAttribute({ Name: "preferred_username", Value: email }),
    ];

    // Username must NOT be email format when user pool uses "email alias"
    const username = `user_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

    userPool.signUp(username, password, attributes, [], (err, result) => {
      if (err) {
        reject(err);
        return;
      }
      resolve({ userSub: result?.user.getUsername() ?? "" });
    });
  });
}

/** Confirm sign-up with the 6-digit code sent to email. Use email (alias) as username. */
export function confirmRegistration(email: string, code: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const cognitoUser = new CognitoUser({
      Username: email.trim(),
      Pool: userPool,
    });
    cognitoUser.confirmRegistration(code.trim(), true, (err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

/** Resend verification code to email. Use email (alias) as username. */
export function resendConfirmationCode(email: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const cognitoUser = new CognitoUser({
      Username: email.trim(),
      Pool: userPool,
    });
    cognitoUser.resendConfirmationCode((err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

export function signIn(email: string, password: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const authDetails = new AuthenticationDetails({
      Username: email,
      Password: password,
    });

    const cognitoUser = new CognitoUser({
      Username: email,
      Pool: userPool,
    });

    cognitoUser.authenticateUser(authDetails, {
      onSuccess: () => resolve(),
      onFailure: (err) => reject(err),
    });
  });
}

export function signOut(): void {
  const user = userPool.getCurrentUser();
  if (user) {
    user.signOut();
  }
}

export async function getAuthToken(): Promise<string | null> {
  const session = await getSession();
  return session?.idToken ?? null;
}

export interface CurrentUser {
  email: string;
  name: string;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const token = await getAuthToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1])) as {
      email?: string;
      name?: string;
      "cognito:username"?: string;
    };
    const email = payload.email ?? payload["cognito:username"] ?? "User";
    const name = payload.name ?? email.split("@")[0] ?? "User";
    return { email, name };
  } catch {
    return null;
  }
}

export function getSession(): Promise<{
  idToken: string;
  accessToken: string;
} | null> {
  return new Promise((resolve) => {
    const user = userPool.getCurrentUser();
    if (!user) {
      resolve(null);
      return;
    }

    user.getSession((err: Error | null, session: { isValid: () => boolean; getIdToken: () => { getJwtToken: () => string }; getAccessToken: () => { getJwtToken: () => string } } | null) => {
      if (err || !session || !session.isValid()) {
        resolve(null);
        return;
      }
      resolve({
        idToken: session.getIdToken().getJwtToken(),
        accessToken: session.getAccessToken().getJwtToken(),
      });
    });
  });
}
