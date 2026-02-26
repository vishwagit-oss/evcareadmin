"use client";

import { useState, useEffect } from "react";
import { getAuthToken } from "@/lib/cognito";
import type { Vehicle } from "@/types";
import { Battery, AlertTriangle, CheckCircle } from "lucide-react";

function getBatteryHealthColor(score: number) {
  if (score >= 90) return { bg: "bg-green-100", text: "text-green-800", border: "border-green-500" };
  if (score >= 70) return { bg: "bg-amber-100", text: "text-amber-800", border: "border-amber-500" };
  return { bg: "bg-red-100", text: "text-red-800", border: "border-red-500" };
}

function getBatteryHealthLabel(score: number) {
  if (score >= 90) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 50) return "Fair";
  return "Poor";
}

export default function BatteryPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchVehicles() {
      const token = await getAuthToken();
      if (!token) {
        setError("Not authenticated");
        setLoading(false);
        return;
      }
      try {
        const res = await fetch("/api/vehicles", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setVehicles(data);
      } catch {
        setError("Failed to load battery data");
      } finally {
        setLoading(false);
      }
    }
    fetchVehicles();
  }, []);

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Battery Health</h1>
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Battery Health</h1>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  const avgHealth =
    vehicles.length > 0
      ? vehicles.reduce((s, v) => s + v.battery_health_score, 0) / vehicles.length
      : 0;
  const needsAttention = vehicles.filter((v) => v.battery_health_score < 70).length;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Battery Health</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border flex items-center gap-4">
          <div className="p-3 bg-blue-100 rounded-lg">
            <Battery className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Vehicles Monitored</p>
            <p className="text-xl font-bold text-gray-900">{vehicles.length}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border flex items-center gap-4">
          <div className="p-3 bg-green-100 rounded-lg">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Average Health</p>
            <p className="text-xl font-bold text-gray-900">{avgHealth.toFixed(1)}%</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border flex items-center gap-4">
          <div className="p-3 bg-red-100 rounded-lg">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Needs Attention</p>
            <p className="text-xl font-bold text-gray-900">{needsAttention}</p>
          </div>
        </div>
      </div>

      {/* Vehicle battery cards */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Per-Vehicle Battery Status</h2>
        {vehicles.length === 0 ? (
          <p className="text-gray-500 py-8 text-center">No vehicles to display.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vehicles.map((v) => {
              const colors = getBatteryHealthColor(v.battery_health_score);
              const label = getBatteryHealthLabel(v.battery_health_score);
              const lastUpdated = v.updated_at
                ? new Date(v.updated_at).toLocaleString()
                : "N/A";

              return (
                <div
                  key={v.id}
                  className={`bg-white rounded-lg shadow border-l-4 ${colors.border} p-5`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {v.make} {v.model}
                      </p>
                      <p className="text-sm text-gray-500 font-mono">{v.vin}</p>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded ${colors.bg} ${colors.text}`}
                    >
                      {label}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-gray-500">Battery Health</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              v.battery_health_score >= 90
                                ? "bg-green-500"
                                : v.battery_health_score >= 70
                                  ? "bg-amber-500"
                                  : "bg-red-500"
                            }`}
                            style={{ width: `${v.battery_health_score}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">{v.battery_health_score}%</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Current Charge</p>
                      <p className="text-sm font-medium">{v.current_charge_percent}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Capacity</p>
                      <p className="text-sm font-medium">{v.battery_capacity_kwh} kWh</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Last Updated</p>
                      <p className="text-xs text-gray-600">{lastUpdated}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
