/**
 * EVCare Admin - Database Initialization Script
 * Run: node scripts/init-db.js
 * Requires: DATABASE_URL in .env.local or environment
 */

const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

// Load .env.local for local development
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL is not set. Add it to .env.local or set the environment variable.");
  process.exit(1);
}

async function initDb() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log("Connecting to database...");
    const schemaPath = path.join(__dirname, "..", "src", "lib", "schema.sql");
    const schema = fs.readFileSync(schemaPath, "utf8");

    // Split by semicolon but be careful with trigger/function blocks
    // Run the whole schema as one query - PostgreSQL supports multiple statements
    await pool.query(schema);
    console.log("Schema created successfully!");
  } catch (err) {
    console.error("Error initializing database:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

initDb();
