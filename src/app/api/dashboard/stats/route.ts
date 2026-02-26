import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request.headers.get("authorization"));
  if (auth.error) return auth.error;

  try {
    const statsResult = await query(
      `SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE status = 'charging') as charging,
        COUNT(*) FILTER (WHERE status = 'maintenance') as maintenance,
        COUNT(*) FILTER (WHERE status = 'offline') as offline,
        COALESCE(AVG(battery_health_score), 0)::numeric(5,2) as avg_battery_health,
        COUNT(*) FILTER (WHERE battery_health_score < 70) as needs_attention
       FROM vehicles
       WHERE cognito_user_id = $1`,
      [auth.sub]
    );

    const row = statsResult.rows[0];
    return NextResponse.json({
      totalVehicles: parseInt(row?.total ?? "0", 10),
      byStatus: {
        active: parseInt(row?.active ?? "0", 10),
        charging: parseInt(row?.charging ?? "0", 10),
        maintenance: parseInt(row?.maintenance ?? "0", 10),
        offline: parseInt(row?.offline ?? "0", 10),
      },
      avgBatteryHealth: parseFloat(row?.avg_battery_health ?? "0"),
      vehiclesNeedingAttention: parseInt(row?.needs_attention ?? "0", 10),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Error fetching dashboard stats:", err);
    return NextResponse.json(
      {
        error: "Failed to fetch stats",
        ...(process.env.NODE_ENV === "development" && { details: message }),
      },
      { status: 500 }
    );
  }
}
