"use client";

import { useState, useEffect } from "react";
import { getAuthToken } from "@/lib/cognito";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Download } from "lucide-react";

interface AnalyticsData {
  byStatus: { name: string; value: number }[];
  batteryDistribution: { name: string; count: number }[];
}

interface StatsData {
  totalVehicles: number;
  avgBatteryHealth: number;
  byStatus: { active: number; charging: number; maintenance: number; offline: number };
}

const CHART_COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#6b7280", "#ef4444"];

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchData() {
      const token = await getAuthToken();
      if (!token) {
        setError("Not authenticated");
        setLoading(false);
        return;
      }
      const headers = { Authorization: `Bearer ${token}` };
      try {
        const [analyticsRes, statsRes] = await Promise.all([
          fetch("/api/dashboard/analytics", { headers }),
          fetch("/api/dashboard/stats", { headers }),
        ]);
        if (analyticsRes.ok) setAnalytics(await analyticsRes.json());
        if (statsRes.ok) setStats(await statsRes.json());
      } catch {
        setError("Failed to load analytics");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleExportCSV = async () => {
    const token = await getAuthToken();
    if (!token) return;
    try {
      const res = await fetch("/api/reports/export?target=download", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to export");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `evcare-fleet-report-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Failed to export");
    }
  };

  const handleExportS3 = async () => {
    const token = await getAuthToken();
    if (!token) return;
    try {
      const res = await fetch("/api/reports/export?target=s3", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.details ?? data.error ?? "Failed to export to S3";
        setError(msg);
        return;
      }
      setError("");
      alert(`Report uploaded to S3: ${data.url}`);
    } catch {
      setError("Failed to export to S3. Check server logs for details.");
    }
  };

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Fleet Analytics</h1>
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Fleet Analytics</h1>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Fleet Analytics</h1>
        <div className="flex gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={handleExportS3}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-800"
          >
            <Download className="w-4 h-4" />
            Export to S3
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-white p-6 rounded-lg shadow border">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Fleet Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-500">Total Vehicles</p>
            <p className="text-2xl font-bold">{stats?.totalVehicles ?? 0}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Avg Battery Health</p>
            <p className="text-2xl font-bold">{stats?.avgBatteryHealth?.toFixed(1) ?? 0}%</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Active</p>
            <p className="text-2xl font-bold text-green-600">
              {stats?.byStatus?.active ?? 0}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">In Maintenance</p>
            <p className="text-2xl font-bold text-amber-600">
              {stats?.byStatus?.maintenance ?? 0}
            </p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Vehicles by Status</h2>
          {analytics?.byStatus?.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={analytics.byStatus}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" name="Count" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 py-12 text-center">No data to display</p>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Battery Health Distribution
          </h2>
          {analytics?.batteryDistribution?.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={analytics.batteryDistribution}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {analytics.batteryDistribution.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 py-12 text-center">No data to display</p>
          )}
        </div>
      </div>

      <p className="text-sm text-gray-500">
        Export CSV downloads locally. Export to S3 uploads to your configured S3 bucket.
      </p>
    </div>
  );
}
