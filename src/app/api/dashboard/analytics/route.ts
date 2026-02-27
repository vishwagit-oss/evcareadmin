import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request.headers.get("authorization"));
  if (auth.error) return auth.error;

  try {
    // Vehicles by status (for bar/pie chart)
    const statusResult = await query(
      `SELECT status, COUNT(*) as count
       FROM vehicles
       GROUP BY status`
    );

    const byStatus = statusResult.rows.map((r) => ({
      name: r.status,
      value: parseInt(r.count, 10),
    }));

    // Battery health distribution (for bar chart)
    const batteryResult = await query(
      `SELECT 
        CASE 
          WHEN battery_health_score >= 90 THEN 'Excellent (90-100%)'
          WHEN battery_health_score >= 70 THEN 'Good (70-89%)'
          WHEN battery_health_score >= 50 THEN 'Fair (50-69%)'
          ELSE 'Poor (<50%)'
        END as range,
        COUNT(*) as count
       FROM vehicles
       GROUP BY 1
       ORDER BY 1`
    );

    const batteryDistribution = batteryResult.rows.map((r) => ({
      name: r.range,
      count: parseInt(r.count, 10),
    }));

    return NextResponse.json({
      byStatus,
      batteryDistribution,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Error fetching dashboard analytics:", err);
    return NextResponse.json(
      {
        error: "Failed to fetch analytics",
        ...(process.env.NODE_ENV === "development" && { details: message }),
      },
      { status: 500 }
    );
  }
}
