import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";
import { sendBatteryAlertEmail } from "@/lib/ses";
import { logEvent } from "@/lib/cloudwatch";

const BATTERY_ALERT_THRESHOLD = 50;

// GET /api/vehicles/[id] - Get single vehicle
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request.headers.get("authorization"));
  if (auth.error) return auth.error;

  const { id } = await params;

  try {
    const result = await query(
      `SELECT id, cognito_user_id, vin, make, model, battery_capacity_kwh,
              current_charge_percent, battery_health_score, status, license_plate,
              created_at, updated_at
       FROM vehicles
       WHERE id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }
    return NextResponse.json(result.rows[0]);
  } catch (err) {
    console.error("Error fetching vehicle:", err);
    return NextResponse.json(
      { error: "Failed to fetch vehicle" },
      { status: 500 }
    );
  }
}

// PUT /api/vehicles/[id] - Update vehicle
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request.headers.get("authorization"));
  if (auth.error) return auth.error;

  const { id } = await params;

  try {
    const body = await request.json();
    const {
      vin,
      make,
      model,
      battery_capacity_kwh,
      current_charge_percent,
      battery_health_score,
      status,
      license_plate,
    } = body;

    // Get current battery_health_score before update (to send alert only when crossing below threshold)
    const currentRow = await query(
      `SELECT battery_health_score FROM vehicles WHERE id = $1`,
      [id]
    );
    const oldBatteryScore =
      currentRow.rows.length > 0 && currentRow.rows[0].battery_health_score != null
        ? Number(currentRow.rows[0].battery_health_score)
        : null;

    const result = await query(
      `UPDATE vehicles SET
        vin = COALESCE($2, vin),
        make = COALESCE($3, make),
        model = COALESCE($4, model),
        battery_capacity_kwh = COALESCE($5, battery_capacity_kwh),
        current_charge_percent = COALESCE($6, current_charge_percent),
        battery_health_score = COALESCE($7, battery_health_score),
        status = COALESCE($8, status),
        license_plate = COALESCE($9, license_plate),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, cognito_user_id, vin, make, model, battery_capacity_kwh,
                 current_charge_percent, battery_health_score, status, license_plate,
                 created_at, updated_at`,
      [
        id,
        vin,
        make,
        model,
        battery_capacity_kwh != null ? Number(battery_capacity_kwh) : null,
        current_charge_percent != null ? Number(current_charge_percent) : null,
        battery_health_score != null ? Number(battery_health_score) : null,
        status,
        license_plate,
      ]
    );
    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }
    const updated = result.rows[0];
    const newScore =
      battery_health_score != null ? Number(battery_health_score) : null;
    const crossedBelowThreshold =
      newScore != null &&
      newScore < BATTERY_ALERT_THRESHOLD &&
      (oldBatteryScore === null || oldBatteryScore >= BATTERY_ALERT_THRESHOLD);
    if (crossedBelowThreshold && process.env.AWS_REGION) {
      const toEmail =
        auth.email ?? process.env.EVCARE_ALERT_EMAIL ?? "";
      if (toEmail) {
        const sent = await sendBatteryAlertEmail(toEmail, {
          vin: updated.vin,
          make: updated.make,
          model: updated.model,
          battery_health_score: updated.battery_health_score,
        });
        await query(
          `INSERT INTO battery_alerts (vehicle_id, threshold, email_sent) VALUES ($1, $2, $3)`,
          [id, BATTERY_ALERT_THRESHOLD, sent]
        );
        logEvent("Battery alert sent", sent ? "info" : "warn", {
          vehicleId: id,
          score: newScore,
          sent,
        });
      } else {
        console.warn(
          "Battery alert skipped: no recipient email. Set EVCARE_ALERT_EMAIL or ensure Cognito user has email in token."
        );
        logEvent("Battery alert skipped (no recipient email)", "warn", {
          vehicleId: id,
          score: newScore,
        });
      }
    }
    return NextResponse.json(updated);
  } catch (err) {
    console.error("Error updating vehicle:", err);
    if ((err as { code?: string })?.code === "23505") {
      return NextResponse.json({ error: "VIN already exists" }, { status: 409 });
    }
    return NextResponse.json(
      { error: "Failed to update vehicle" },
      { status: 500 }
    );
  }
}

// DELETE /api/vehicles/[id] - Delete vehicle
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request.headers.get("authorization"));
  if (auth.error) return auth.error;

  const { id } = await params;

  try {
    const result = await query(
      "DELETE FROM vehicles WHERE id = $1 RETURNING id",
      [id]
    );
    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error deleting vehicle:", err);
    return NextResponse.json(
      { error: "Failed to delete vehicle" },
      { status: 500 }
    );
  }
}
