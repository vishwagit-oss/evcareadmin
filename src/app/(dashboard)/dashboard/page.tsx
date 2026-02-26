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
import { Car, Battery, AlertTriangle, Activity } from "lucide-react";

interface DashboardStats {
  totalVehicles: number;
  byStatus: { active: number; charging: number; maintenance: number; offline: number };
  avgBatteryHealth: number;
  vehiclesNeedingAttention: number;
}

interface AnalyticsData {
  byStatus: { name: string; value: number }[];
  batteryDistribution: { name: string; count: number }[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
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
        const [statsRes, analyticsRes] = await Promise.all([
          fetch("/api/dashboard/stats", { headers }),
          fetch("/api/dashboard/analytics", { headers }),
        ]);
        if (statsRes.ok) setStats(await statsRes.json());
        if (analyticsRes.ok) setAnalytics(await analyticsRes.json());
      } catch {
        setError("Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition">
          <div className="p-3 bg-blue-100 rounded-xl">
            <Car className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Vehicles</p>
            <p className="text-2xl font-bold text-gray-900">{stats?.totalVehicles ?? 0}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition">
          <div className="p-3 bg-green-100 rounded-xl">
            <Activity className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Active</p>
            <p className="text-2xl font-bold text-gray-900">{stats?.byStatus?.active ?? 0}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition">
          <div className="p-3 bg-amber-100 rounded-xl">
            <Battery className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Avg Battery Health</p>
            <p className="text-2xl font-bold text-gray-900">
              {stats?.avgBatteryHealth?.toFixed(1) ?? 0}%
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition">
          <div className="p-3 bg-red-100 rounded-xl">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Needs Attention</p>
            <p className="text-2xl font-bold text-gray-900">
              {stats?.vehiclesNeedingAttention ?? 0}
            </p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
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

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Battery Health Distribution</h2>
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
                  {analytics.batteryDistribution.map((_, index) => (
                    <Cell
                      key={index}
                      fill={["#22c55e", "#3b82f6", "#f59e0b", "#ef4444"][index % 4]}
                    />
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

      {/* Status summary */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Status Summary</h2>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-sm text-gray-600">Active: {stats?.byStatus?.active ?? 0}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-sm text-gray-600">Charging: {stats?.byStatus?.charging ?? 0}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="text-sm text-gray-600">
              Maintenance: {stats?.byStatus?.maintenance ?? 0}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-gray-500" />
            <span className="text-sm text-gray-600">Offline: {stats?.byStatus?.offline ?? 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
