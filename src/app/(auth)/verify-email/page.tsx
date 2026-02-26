"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { confirmRegistration, resendConfirmationCode } from "@/lib/cognito";

function EmailLookupForm({
  onSuccess,
  onError,
}: {
  onSuccess: (email: string, username: string) => void;
  onError: (message: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes("@")) {
      onError("Please enter a valid email address.");
      return;
    }
    onError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/lookup-username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, resend: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        onError(data.error ?? "Something went wrong. Try again.");
        return;
      }
      if (data.username) {
        onSuccess(trimmed, data.username);
      } else {
        onError("Could not find your account. Please sign up first.");
      }
    } catch {
      onError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        placeholder="Your email"
        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
      />
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 px-4 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
      >
        {loading ? "Sending new code..." : "Send new verification code"}
      </button>
    </form>
  );
}

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const name = searchParams.get("name") ?? "";
  const username = searchParams.get("username") ?? "";

  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username) {
      setError("Verification link is missing data. Please sign up again to get a new link.");
      return;
    }
    if (!email) {
      setError("Missing email. Please sign up again.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      await confirmRegistration(username, code);
      // Notify our backend: user verified email → record pending approval & email admin
      const res = await fetch("/api/auth/confirm-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name: name || email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to register for approval");
      }
      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
        router.refresh();
      }, 3000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Verification failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!username) {
      setError("Cannot resend: please sign up again to get a new verification link.");
      return;
    }
    setResendLoading(true);
    setError("");
    setResendSent(false);
    try {
      await resendConfirmationCode(username);
      setResendSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to resend code");
    } finally {
      setResendLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4">
        <div className="w-full max-w-sm p-8 text-center">
          <div className="text-green-600 font-semibold mb-2">Email verified</div>
          <p className="text-gray-500 text-sm">
            Your account is pending admin approval. You&apos;ll receive an email when approved. Then you can log in.
          </p>
          <p className="text-gray-400 text-xs mt-2">Redirecting to sign in...</p>
        </div>
      </div>
    );
  }

  // No username: show "Enter your email" to get a new code and load username (for unconfirmed users)
  if (!username) {
    return (
      <div className="min-h-screen relative flex flex-col items-center justify-center bg-white px-4 py-12">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex flex-col items-center">
            <span className="text-4xl font-bold text-blue-600">EVC</span>
            <span className="text-lg font-semibold text-blue-700 uppercase tracking-wider">EVCARE</span>
          </Link>
        </div>
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">Verify your email</h1>
          <p className="text-gray-500 text-sm text-center mb-6">
            Already signed up but didn&apos;t verify? Enter your email and we&apos;ll send a new 6-digit code.
          </p>
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
          )}
          <EmailLookupForm
            onSuccess={(e: string, u: string) => {
              setError("");
              router.replace(`/verify-email?email=${encodeURIComponent(e)}&username=${encodeURIComponent(u)}`);
            }}
            onError={(msg: string) => setError(msg)}
          />
          <p className="mt-8 text-center text-sm text-gray-500">
            <Link href="/login" className="text-blue-600 font-medium hover:underline">Back to sign in</Link>
            {" · "}
            <Link href="/register" className="text-blue-600 font-medium hover:underline">Sign up</Link>
          </p>
        </div>
        <div className="absolute bottom-8 text-center">
          <p className="text-sm text-gray-500">caring for the ❤️ of EV</p>
        </div>
      </div>
    );
  }

  if (!email) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4">
        <div className="w-full max-w-sm p-8 text-center">
          <p className="text-gray-600 mb-4">No email provided. Please complete sign up first.</p>
          <Link href="/register" className="text-blue-600 font-medium hover:underline">Sign up</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center bg-white px-4 py-12">
      <div className="mb-8 text-center">
        <Link href="/" className="inline-flex flex-col items-center">
          <span className="text-4xl font-bold text-blue-600">EVC</span>
          <span className="text-lg font-semibold text-blue-700 uppercase tracking-wider">EVCARE</span>
        </Link>
      </div>

      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">Verify your email</h1>
        <p className="text-gray-500 text-sm text-center mb-6">
          Enter the 6-digit code we sent to <strong>{email}</strong>
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
        )}
        {resendSent && (
          <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm">New code sent. Check your email.</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            required
            maxLength={6}
            placeholder="000000"
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-center text-xl tracking-widest placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
          />

          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full py-3 px-4 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? "Verifying..." : "Verify & request approval"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-500">
          Didn&apos;t get the code?{" "}
          <button
            type="button"
            onClick={handleResend}
            disabled={resendLoading}
            className="text-blue-600 font-medium hover:underline disabled:opacity-50"
          >
            {resendLoading ? "Sending..." : "Resend code"}
          </button>
        </p>

        <p className="mt-8 text-center text-sm text-gray-500">
          <Link href="/login" className="text-blue-600 font-medium hover:underline">Back to sign in</Link>
        </p>
      </div>

      <div className="absolute bottom-8 text-center">
        <p className="text-sm text-gray-500">caring for the ❤️ of EV</p>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <VerifyEmailForm />
    </Suspense>
  );
}
