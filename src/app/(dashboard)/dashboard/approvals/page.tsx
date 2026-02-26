"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getAuthToken } from "@/lib/cognito";
import { UserCheck } from "lucide-react";

const ADMIN_EMAIL = (typeof process.env.NEXT_PUBLIC_EVCARE_ADMIN_EMAIL === "string" && process.env.NEXT_PUBLIC_EVCARE_ADMIN_EMAIL)
  ? process.env.NEXT_PUBLIC_EVCARE_ADMIN_EMAIL
  : "vishwagohil21@gmail.com";

type PendingUser = { id: string; email: string; name: string | null; status: string; created_at: string };

export default function ApprovalsPage() {
  const { user } = useAuth();
  const [pending, setPending] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [approving, setApproving] = useState<string | null>(null);

  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  const fetchPending = async () => {
    const token = await getAuthToken();
    if (!token) return;
    const res = await fetch("/api/admin/pending", { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      setError("Failed to load pending users");
      setPending([]);
      return;
    }
    const data = await res.json();
    setPending(data.pending ?? []);
  };

  useEffect(() => {
    if (!isAdmin) return;
    fetchPending().finally(() => setLoading(false));
  }, [isAdmin]);

  const handleApprove = async (email: string) => {
    const token = await getAuthToken();
    if (!token) return;
    setApproving(email);
    setError("");
    try {
      const res = await fetch("/api/admin/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Failed to approve");
        return;
      }
      await fetchPending();
    } finally {
      setApproving(null);
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-8">
        <p className="text-gray-600">You don’t have access to this page.</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center gap-2 mb-6">
        <UserCheck className="w-8 h-8 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User approvals</h1>
          <p className="text-gray-500 text-sm">Approve new users who have verified their email. They can log in only after approval.</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
      )}

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : pending.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center text-gray-500">
          No pending approvals. New sign-ups will appear here after they enter their verification code.
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Email</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Name</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Requested</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pending.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{u.email}</td>
                  <td className="px-4 py-3 text-gray-600">{u.name ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-500 text-sm">
                    {new Date(u.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleApprove(u.email)}
                      disabled={approving === u.email}
                      className="px-3 py-1.5 bg-green-500 text-white text-sm font-medium rounded-lg hover:bg-green-600 disabled:opacity-50"
                    >
                      {approving === u.email ? "Approving..." : "Approve"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
