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

// Use a placeholder cognito_user_id - replace with real user ID after signup
const DEMO_USER_ID = "demo-user-id";

const sampleVehicles = [
  {
    cognito_user_id: DEMO_USER_ID,
    vin: "1HGBH41JXMN109186",
    make: "Tesla",
    model: "Model 3",
    battery_capacity_kwh: 75,
    current_charge_percent: 85,
    battery_health_score: 94,
    status: "active",
    license_plate: "EV-001",
  },
  {
    cognito_user_id: DEMO_USER_ID,
    vin: "5YJ3E1EA1KF123456",
    make: "Tesla",
    model: "Model Y",
    battery_capacity_kwh: 80,
    current_charge_percent: 42,
    battery_health_score: 88,
    status: "charging",
    license_plate: "EV-002",
  },
  {
    cognito_user_id: DEMO_USER_ID,
    vin: "WVWZZZ3CZWE123789",
    make: "Volkswagen",
    model: "ID.4",
    battery_capacity_kwh: 82,
    current_charge_percent: 20,
    battery_health_score: 76,
    status: "maintenance",
    license_plate: "EV-003",
  },
];

async function seed() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

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
