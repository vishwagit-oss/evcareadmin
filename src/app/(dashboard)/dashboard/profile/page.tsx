"use client";

import { useAuth } from "@/contexts/AuthContext";

export default function ProfilePage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-2xl font-bold text-gray-900">Profile</h1>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              Name
            </label>
            <p className="text-gray-900 font-medium">{user?.name ?? "—"}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              Email
            </label>
            <p className="text-gray-900">{user?.email ?? "—"}</p>
          </div>
        </div>
        <p className="mt-4 text-sm text-gray-500">
          To update your profile, please contact your administrator or use the
          Cognito console.
        </p>
      </div>
    </div>
  );
}
