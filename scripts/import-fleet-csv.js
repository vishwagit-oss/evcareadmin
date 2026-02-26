/**
 * EVCare Admin - Import fleet from CSV
 * CSV format (same as export): VIN, Make, Model, Status, Battery Health %, Charge %, Capacity kWh
 * Optional: add License Plate as 8th column for custom plates.
 *
 * Usage:
 *   node scripts/import-fleet-csv.js <path-to.csv> [cognito_user_id]
 *   EVCARE_IMPORT_USER_ID is used if second arg omitted (default: demo-user-id)
 *
 * Run: npm run db:import -- path/to/fleet-report.csv
 * Or:  node scripts/import-fleet-csv.js "C:\Users\vishw\Downloads\evcare-fleet-report-2026-02-26.csv"
 */

const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });

const DATABASE_URL = process.env.DATABASE_URL;
const DEFAULT_USER_ID = process.env.EVCARE_IMPORT_USER_ID || "demo-user-id";

if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL is not set.");
  process.exit(1);
}

// Strip sslmode from URL so our ssl config is used (avoids self-signed cert errors with RDS).
function getConnectionConfig() {
  try {
    const url = new URL(DATABASE_URL);
    url.searchParams.delete("sslmode");
    url.searchParams.delete("ssl");
    return {
      connectionString: url.toString(),
      ssl: { rejectUnauthorized: false },
    };
  } catch {
    return { connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } };
  }
}

const validStatuses = ["active", "charging", "maintenance", "offline"];

function parseCsvLine(line) {
  const parts = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') inQuotes = !inQuotes;
    else if ((c === "," && !inQuotes) || (c === "\r" && !inQuotes)) {
      parts.push(current.trim());
      current = "";
      if (c === "\r") break;
    } else current += c;
  }
  parts.push(current.trim());
  return parts;
}

function normalizeStatus(s) {
  const lower = (s || "").toLowerCase().trim();
  return validStatuses.includes(lower) ? lower : "active";
}

function parseCsv(content) {
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const header = parseCsvLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const row = {};
    header.forEach((h, idx) => {
      row[h] = values[idx] !== undefined ? values[idx].trim() : "";
    });
    rows.push(row);
  }
  return rows;
}

function mapCsvToVehicle(row, cognitoUserId) {
  const vin = (row["VIN"] || row["vin"] || "").trim().slice(0, 17);
  const make = (row["Make"] || row["make"] || "Unknown").trim().slice(0, 100);
  const model = (row["Model"] || row["model"] || "Unknown").trim().slice(0, 100);
  const status = normalizeStatus(row["Status"] || row["status"]);
  const batteryHealth = parseFloat(row["Battery Health %"] ?? row["battery_health_score"] ?? "85") || 85;
  const chargePercent = parseFloat(row["Charge %"] ?? row["current_charge_percent"] ?? "50") || 50;
  const capacityKwh = parseFloat(row["Capacity kWh"] ?? row["battery_capacity_kwh"] ?? "70") || 70;
  const licensePlate = (row["License Plate"] || row["license_plate"] || "").trim().slice(0, 20) || null;

  return {
    cognito_user_id: cognitoUserId,
    vin,
    make,
    model,
    battery_capacity_kwh: Math.max(0, Math.min(999, capacityKwh)),
    current_charge_percent: Math.max(0, Math.min(100, chargePercent)),
    battery_health_score: Math.max(0, Math.min(100, batteryHealth)),
    status,
    license_plate: licensePlate || null,
  };
}

async function run() {
  const csvPath = process.argv[2];
  const cognitoUserId = process.argv[3] || DEFAULT_USER_ID;

  if (!csvPath) {
    console.error("Usage: node scripts/import-fleet-csv.js <path-to.csv> [cognito_user_id]");
    console.error("Example: node scripts/import-fleet-csv.js ./evcare-fleet-report-2026-02-26.csv");
    process.exit(1);
  }

  const resolved = path.resolve(csvPath);
  if (!fs.existsSync(resolved)) {
    console.error("File not found:", resolved);
    process.exit(1);
  }

  const content = fs.readFileSync(resolved, "utf8");
  const rows = parseCsv(content);
  const vehicles = rows
    .map((row) => mapCsvToVehicle(row, cognitoUserId))
    .filter((v) => v.vin.length >= 10);

  if (vehicles.length === 0) {
    console.error("No valid rows with VIN found in CSV.");
    process.exit(1);
  }

  const { connectionString, ssl } = getConnectionConfig();
  const pool = new Pool({ connectionString, ssl });

  try {
    console.log(`Importing ${vehicles.length} vehicles for user ${cognitoUserId}...`);

    for (const v of vehicles) {
      await pool.query(
        `INSERT INTO vehicles (
          cognito_user_id, vin, make, model, battery_capacity_kwh,
          current_charge_percent, battery_health_score, status, license_plate
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (vin) DO UPDATE SET
          make = EXCLUDED.make,
          model = EXCLUDED.model,
          battery_capacity_kwh = EXCLUDED.battery_capacity_kwh,
          current_charge_percent = EXCLUDED.current_charge_percent,
          battery_health_score = EXCLUDED.battery_health_score,
          status = EXCLUDED.status,
          license_plate = COALESCE(EXCLUDED.license_plate, vehicles.license_plate),
          updated_at = CURRENT_TIMESTAMP`,
        [
          v.cognito_user_id,
          v.vin,
          v.make,
          v.model,
          v.battery_capacity_kwh,
          v.current_charge_percent,
          v.battery_health_score,
          v.status,
          v.license_plate,
        ]
      );
    }

    console.log(`Imported/updated ${vehicles.length} vehicles. Done.`);
  } catch (err) {
    console.error("Import error:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
