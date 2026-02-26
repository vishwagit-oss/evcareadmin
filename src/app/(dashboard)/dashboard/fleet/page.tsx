"use client";

import { useState, useEffect } from "react";
import { getAuthToken } from "@/lib/cognito";
import type { Vehicle, VehicleStatus } from "@/types";

const STATUS_OPTIONS: VehicleStatus[] = ["active", "charging", "maintenance", "offline"];

export default function FleetPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [form, setForm] = useState({
    vin: "",
    make: "",
    model: "",
    battery_capacity_kwh: "",
    current_charge_percent: "0",
    battery_health_score: "100",
    status: "active" as VehicleStatus,
    license_plate: "",
  });

  const fetchVehicles = async () => {
    const token = await getAuthToken();
    if (!token) {
      setError("Not authenticated");
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
      setError("Failed to load vehicles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const resetForm = () => {
    setForm({
      vin: "",
      make: "",
      model: "",
      battery_capacity_kwh: "",
      current_charge_percent: "0",
      battery_health_score: "100",
      status: "active",
      license_plate: "",
    });
    setEditing(null);
    setShowForm(false);
  };

  const openEdit = (v: Vehicle) => {
    setEditing(v);
    setForm({
      vin: v.vin,
      make: v.make,
      model: v.model,
      battery_capacity_kwh: String(v.battery_capacity_kwh),
      current_charge_percent: String(v.current_charge_percent),
      battery_health_score: String(v.battery_health_score),
      status: v.status,
      license_plate: v.license_plate ?? "",
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = await getAuthToken();
    if (!token) return;

    const payload = {
      vin: form.vin,
      make: form.make,
      model: form.model,
      battery_capacity_kwh: Number(form.battery_capacity_kwh),
      current_charge_percent: Number(form.current_charge_percent),
      battery_health_score: Number(form.battery_health_score),
      status: form.status,
      license_plate: form.license_plate,
    };

    try {
      if (editing) {
        const res = await fetch(`/api/vehicles/${editing.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? "Update failed");
        }
      } else {
        const res = await fetch("/api/vehicles", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? "Add failed");
        }
      }
      resetForm();
      fetchVehicles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operation failed");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this vehicle?")) return;
    const token = await getAuthToken();
    if (!token) return;

    try {
      const res = await fetch(`/api/vehicles/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Delete failed");
      fetchVehicles();
    } catch {
      setError("Failed to delete vehicle");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800";
      case "charging": return "bg-blue-100 text-blue-800";
      case "maintenance": return "bg-amber-100 text-amber-800";
      case "offline": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Fleet Management</h1>
        <p className="text-gray-600">Loading vehicles...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Fleet Management</h1>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Add Vehicle
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded text-sm">
          {error}
        </div>
      )}

      {showForm && (
        <div className="mb-8 p-6 bg-white rounded-lg shadow border">
          <h2 className="text-lg font-semibold mb-4">
            {editing ? "Edit Vehicle" : "Add Vehicle"}
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">VIN *</label>
              <input
                type="text"
                value={form.vin}
                onChange={(e) => setForm({ ...form, vin: e.target.value })}
                required
                maxLength={17}
                disabled={!!editing}
                className="w-full px-3 py-2 border rounded-md disabled:bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Make *</label>
              <input
                type="text"
                value={form.make}
                onChange={(e) => setForm({ ...form, make: e.target.value })}
                required
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Model *</label>
              <input
                type="text"
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
                required
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">License Plate</label>
              <input
                type="text"
                value={form.license_plate}
                onChange={(e) => setForm({ ...form, license_plate: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Battery (kWh) *</label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={form.battery_capacity_kwh}
                onChange={(e) => setForm({ ...form, battery_capacity_kwh: e.target.value })}
                required
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Charge %</label>
              <input
                type="number"
                min="0"
                max="100"
                value={form.current_charge_percent}
                onChange={(e) => setForm({ ...form, current_charge_percent: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Battery Health %</label>
              <input
                type="number"
                min="0"
                max="100"
                value={form.battery_health_score}
                onChange={(e) => setForm({ ...form, battery_health_score: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as VehicleStatus })}
                className="w-full px-3 py-2 border rounded-md"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2 flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {editing ? "Update" : "Add"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {vehicles.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No vehicles yet. Click &quot;Add Vehicle&quot; to add one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">VIN</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Make</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Model</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">License</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Charge %</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Health %</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {vehicles.map((v) => (
                  <tr key={v.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-mono">{v.vin}</td>
                    <td className="px-4 py-3 text-sm">{v.make}</td>
                    <td className="px-4 py-3 text-sm">{v.model}</td>
                    <td className="px-4 py-3 text-sm">{v.license_plate || "-"}</td>
                    <td className="px-4 py-3 text-sm">{v.current_charge_percent}%</td>
                    <td className="px-4 py-3 text-sm">{v.battery_health_score}%</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(v.status)}`}
                      >
                        {v.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openEdit(v)}
                        className="text-blue-600 hover:underline mr-3"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(v.id)}
                        className="text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
