/**
 * EVCare Admin - Seed Sample Data
 * Run after db:init. Requires: npm run db:init first
 * Run: node scripts/seed-db.js
 */

const { Pool } = require("pg");
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });

const DATABASE_URL = process.env.DATABASE_URL;

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

// Use a placeholder cognito_user_id - replace with real user ID after signup
const DEMO_USER_ID = "demo-user-id";

// Real-world EV fleet: real makes/models and battery capacities (kWh) from public specs
const sampleVehicles = [
  { cognito_user_id: DEMO_USER_ID, vin: "5YJ3E1EA0NF123401", make: "Tesla", model: "Model 3", battery_capacity_kwh: 75, current_charge_percent: 92, battery_health_score: 96, status: "active", license_plate: "EV-001" },
  { cognito_user_id: DEMO_USER_ID, vin: "5YJ3E1EA2NF234502", make: "Tesla", model: "Model 3 Long Range", battery_capacity_kwh: 82, current_charge_percent: 45, battery_health_score: 91, status: "charging", license_plate: "EV-002" },
  { cognito_user_id: DEMO_USER_ID, vin: "7SAYGDEE1NF345603", make: "Tesla", model: "Model Y", battery_capacity_kwh: 75, current_charge_percent: 18, battery_health_score: 88, status: "active", license_plate: "EV-003" },
  { cognito_user_id: DEMO_USER_ID, vin: "7SAYGDEE3NF456704", make: "Tesla", model: "Model Y Long Range", battery_capacity_kwh: 81, current_charge_percent: 78, battery_health_score: 94, status: "active", license_plate: "EV-004" },
  { cognito_user_id: DEMO_USER_ID, vin: "5YJSA1E26NF567805", make: "Tesla", model: "Model S", battery_capacity_kwh: 100, current_charge_percent: 100, battery_health_score: 89, status: "active", license_plate: "EV-005" },
  { cognito_user_id: DEMO_USER_ID, vin: "7SAXCDEE9NF678906", make: "Tesla", model: "Model X", battery_capacity_kwh: 100, current_charge_percent: 62, battery_health_score: 85, status: "maintenance", license_plate: "EV-006" },
  { cognito_user_id: DEMO_USER_ID, vin: "WVWZZZ3CZWE123789", make: "Volkswagen", model: "ID.4", battery_capacity_kwh: 82, current_charge_percent: 33, battery_health_score: 87, status: "active", license_plate: "EV-007" },
  { cognito_user_id: DEMO_USER_ID, vin: "WVWZZZ3CZWE234890", make: "Volkswagen", model: "ID.4 Pro", battery_capacity_kwh: 77, current_charge_percent: 55, battery_health_score: 92, status: "active", license_plate: "EV-008" },
  { cognito_user_id: DEMO_USER_ID, vin: "1N4BZ1CP0KN123456", make: "Nissan", model: "Leaf", battery_capacity_kwh: 40, current_charge_percent: 88, battery_health_score: 72, status: "active", license_plate: "EV-009" },
  { cognito_user_id: DEMO_USER_ID, vin: "1N4BZ1CP5NN234567", make: "Nissan", model: "Leaf Plus", battery_capacity_kwh: 62, current_charge_percent: 12, battery_health_score: 79, status: "charging", license_plate: "EV-010" },
  { cognito_user_id: DEMO_USER_ID, vin: "3FMTK3SU0NMA12345", make: "Ford", model: "Mustang Mach-E", battery_capacity_kwh: 88, current_charge_percent: 41, battery_health_score: 90, status: "active", license_plate: "EV-011" },
  { cognito_user_id: DEMO_USER_ID, vin: "3FMTK3SU5NMB23456", make: "Ford", model: "Mustang Mach-E Extended", battery_capacity_kwh: 91, current_charge_percent: 67, battery_health_score: 93, status: "active", license_plate: "EV-012" },
  { cognito_user_id: DEMO_USER_ID, vin: "KM8J23A45NU345678", make: "Hyundai", model: "Ioniq 5", battery_capacity_kwh: 77, current_charge_percent: 24, battery_health_score: 86, status: "active", license_plate: "EV-013" },
  { cognito_user_id: DEMO_USER_ID, vin: "KM8J23A48NU456789", make: "Hyundai", model: "Ioniq 6", battery_capacity_kwh: 77, current_charge_percent: 95, battery_health_score: 91, status: "active", license_plate: "EV-014" },
  { cognito_user_id: DEMO_USER_ID, vin: "1G1FY6S05N4123456", make: "Chevrolet", model: "Bolt EV", battery_capacity_kwh: 65, current_charge_percent: 50, battery_health_score: 84, status: "active", license_plate: "EV-015" },
  { cognito_user_id: DEMO_USER_ID, vin: "WBA71AA060N5123456", make: "BMW", model: "i4", battery_capacity_kwh: 83, current_charge_percent: 19, battery_health_score: 88, status: "charging", license_plate: "EV-016" },
  { cognito_user_id: DEMO_USER_ID, vin: "WAUZZZ4GXNN612345", make: "Audi", model: "e-tron", battery_capacity_kwh: 95, current_charge_percent: 73, battery_health_score: 82, status: "active", license_plate: "EV-017" },
  { cognito_user_id: DEMO_USER_ID, vin: "7FARW2P59NE723456", make: "Rivian", model: "R1T", battery_capacity_kwh: 135, current_charge_percent: 38, battery_health_score: 97, status: "active", license_plate: "EV-018" },
  { cognito_user_id: DEMO_USER_ID, vin: "7FARW2P59NE834567", make: "Rivian", model: "R1S", battery_capacity_kwh: 135, current_charge_percent: 11, battery_health_score: 94, status: "charging", license_plate: "EV-019" },
  { cognito_user_id: DEMO_USER_ID, vin: "5YJ3E1EB0NF945678", make: "Tesla", model: "Model 3 Standard", battery_capacity_kwh: 54, current_charge_percent: 60, battery_health_score: 68, status: "maintenance", license_plate: "EV-020" },
  { cognito_user_id: DEMO_USER_ID, vin: "1HGBH41JXMN109187", make: "Tesla", model: "Model 3", battery_capacity_kwh: 75, current_charge_percent: 100, battery_health_score: 10, status: "offline", license_plate: "EV-021" },
];

async function seed() {
  const { connectionString, ssl } = getConnectionConfig();
  const pool = new Pool({ connectionString, ssl });

  try {
    console.log("Seeding database with sample vehicles...");

    for (const v of sampleVehicles) {
      await pool.query(
        `INSERT INTO vehicles (
          cognito_user_id, vin, make, model, battery_capacity_kwh,
          current_charge_percent, battery_health_score, status, license_plate
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (vin) DO NOTHING`,
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

    console.log(`Inserted ${sampleVehicles.length} sample vehicles.`);
    console.log("Seed complete!");
  } catch (err) {
    console.error("Error seeding database:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
