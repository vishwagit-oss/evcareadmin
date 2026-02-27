import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { query } from "@/lib/db";
import { uploadReport } from "@/lib/s3";
import { logEvent } from "@/lib/cloudwatch";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request.headers.get("authorization"));
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") ?? "csv";
  const target = searchParams.get("target") ?? "download"; // download | s3

  try {
    const result = await query(
      `SELECT vin, make, model, status, battery_health_score, current_charge_percent, battery_capacity_kwh
       FROM vehicles
       ORDER BY created_at DESC`
    );
    const vehicles = result.rows;

    const headers = [
      "VIN",
      "Make",
      "Model",
      "Status",
      "Battery Health %",
      "Charge %",
      "Capacity kWh",
    ];
    const rows = vehicles.map((v) =>
      [
        v.vin,
        v.make,
        v.model,
        v.status,
        v.battery_health_score,
        v.current_charge_percent,
        v.battery_capacity_kwh,
      ].join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");

    if (target === "s3") {
      const date = new Date().toISOString().slice(0, 10);
      const key = `reports/${auth.sub}/${date}-fleet-report.csv`;
      const url = await uploadReport(key, csv, "text/csv");
      logEvent("Report exported to S3", "info", { userId: auth.sub, key });
      return NextResponse.json({ url, key });
    }

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="evcare-fleet-report-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Report export error:", err);
    logEvent("Report export failed", "error", { error: message });
    return NextResponse.json(
      {
        error: "Failed to export report",
        details: process.env.NODE_ENV === "development" ? message : undefined,
      },
      { status: 500 }
    );
  }
}
