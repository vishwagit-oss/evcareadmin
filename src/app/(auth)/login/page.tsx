"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "@/lib/cognito";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signIn(email.trim(), password);
      window.location.href = "/dashboard";
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Sign in failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center bg-white px-4">
      {/* Logo */}
      <div className="mb-10 text-center">
        <Link href="/" className="inline-flex flex-col items-center">
          <span className="text-4xl font-bold text-blue-600">EVC</span>
          <span className="text-lg font-semibold text-blue-700 uppercase tracking-wider">
            EVCARE
          </span>
        </Link>
      </div>

      {/* Login form */}
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          Log In
        </h1>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="Email"
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
          />

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Password"
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? "Signing in..." : "Log In"}
          </button>
        </form>

        <p className="mt-4 text-center">
          <Link
            href="#"
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Forgot password?
          </Link>
        </p>

        <p className="mt-8 text-center text-sm text-gray-500">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-blue-600 font-medium hover:underline">
            Sign up
          </Link>
        </p>
      </div>

      {/* Footer branding */}
      <div className="absolute bottom-8 text-center">
        <p className="text-sm text-gray-500">caring for the ❤️ of EV</p>
      </div>
    </div>
  );
}
