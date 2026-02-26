import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";
import { sendBatteryAlertEmail } from "@/lib/ses";
import { logEvent } from "@/lib/cloudwatch";

const BATTERY_ALERT_THRESHOLD = 50;

// GET /api/vehicles - List vehicles for authenticated user
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request.headers.get("authorization"));
  if (auth.error) return auth.error;

  const { sub } = auth;

  try {
    const result = await query(
      `SELECT id, cognito_user_id, vin, make, model, battery_capacity_kwh,
              current_charge_percent, battery_health_score, status, license_plate,
              created_at, updated_at
       FROM vehicles
       WHERE cognito_user_id = $1
       ORDER BY created_at DESC`,
      [sub]
    );
    logEvent("Vehicles listed", "info", { userId: sub, count: result.rows.length });
    return NextResponse.json(result.rows);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Error fetching vehicles:", err);
    logEvent("Vehicles fetch failed", "error", { error: String(err) });
    return NextResponse.json(
      {
        error: "Failed to fetch vehicles",
        ...(process.env.NODE_ENV === "development" && { details: message }),
      },
      { status: 500 }
    );
  }
}

// POST /api/vehicles - Add vehicle
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request.headers.get("authorization"));
  if (auth.error) return auth.error;

  const { sub } = auth;

  try {
    const body = await request.json();
    const {
      vin,
      make,
      model,
      battery_capacity_kwh,
      current_charge_percent = 0,
      battery_health_score = 100,
      status = "active",
      license_plate = "",
    } = body;

    if (!vin || !make || !model || battery_capacity_kwh == null) {
      return NextResponse.json(
        { error: "Missing required fields: vin, make, model, battery_capacity_kwh" },
        { status: 400 }
      );
    }

    const result = await query(
      `INSERT INTO vehicles (cognito_user_id, vin, make, model, battery_capacity_kwh,
                            current_charge_percent, battery_health_score, status, license_plate)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, cognito_user_id, vin, make, model, battery_capacity_kwh,
                 current_charge_percent, battery_health_score, status, license_plate,
                 created_at, updated_at`,
      [
        sub,
        vin,
        make,
        model,
        Number(battery_capacity_kwh),
        Number(current_charge_percent),
        Number(battery_health_score),
        status,
        license_plate ?? "",
      ]
    );
    const inserted = result.rows[0];
    const score = Number(battery_health_score);
    if (score < BATTERY_ALERT_THRESHOLD && process.env.AWS_REGION) {
      const toEmail = auth.email ?? process.env.EVCARE_ALERT_EMAIL ?? "";
      if (toEmail) {
        const sent = await sendBatteryAlertEmail(toEmail, {
          vin: inserted.vin,
          make: inserted.make,
          model: inserted.model,
          battery_health_score: inserted.battery_health_score,
        });
        await query(
          `INSERT INTO battery_alerts (vehicle_id, threshold, email_sent) VALUES ($1, $2, $3)`,
          [inserted.id, BATTERY_ALERT_THRESHOLD, sent]
        );
        logEvent("Battery alert sent (on add)", sent ? "info" : "warn", {
          vehicleId: inserted.id,
          score,
          sent,
        });
      } else {
        console.warn(
          "Battery alert skipped: no recipient email. Set EVCARE_ALERT_EMAIL or ensure Cognito user has email in token."
        );
      }
    }
    logEvent("Vehicle added", "info", { userId: sub, vin: vin });
    return NextResponse.json(inserted, { status: 201 });
  } catch (err) {
    console.error("Error adding vehicle:", err);
    const dbErr = err as { code?: string; message?: string };
    if (dbErr.code === "23505") {
      return NextResponse.json({ error: "VIN already exists" }, { status: 409 });
    }
    if (dbErr.code === "23514") {
      return NextResponse.json(
        { error: "Invalid value (check battery %, status, or VIN format)" },
        { status: 400 }
      );
    }
    const message = dbErr.message ?? "Failed to add vehicle";
    return NextResponse.json(
      { error: process.env.NODE_ENV === "development" ? message : "Failed to add vehicle" },
      { status: 500 }
    );
  }
}
