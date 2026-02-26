-- EVCare Admin - Database Schema
-- Run this to create tables in PostgreSQL (RDS)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cognito_user_id VARCHAR(255) NOT NULL,
  vin VARCHAR(17) NOT NULL UNIQUE,
  make VARCHAR(100) NOT NULL,
  model VARCHAR(100) NOT NULL,
  battery_capacity_kwh DECIMAL(10, 2) NOT NULL,
  current_charge_percent DECIMAL(5, 2) NOT NULL CHECK (current_charge_percent >= 0 AND current_charge_percent <= 100),
  battery_health_score DECIMAL(5, 2) NOT NULL CHECK (battery_health_score >= 0 AND battery_health_score <= 100),
  status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'charging', 'maintenance', 'offline')),
  license_plate VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups by user and status
CREATE INDEX IF NOT EXISTS idx_vehicles_cognito_user_id ON vehicles(cognito_user_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_vin ON vehicles(vin);

-- Battery alerts table (for SES email notifications)
CREATE TABLE IF NOT EXISTS battery_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  threshold DECIMAL(5, 2) NOT NULL,
  notified_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  email_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_battery_alerts_vehicle_id ON battery_alerts(vehicle_id);

-- User approvals: pending until admin approves (no login until approved)
CREATE TABLE IF NOT EXISTS user_approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_user_approvals_email ON user_approvals(email);
CREATE INDEX IF NOT EXISTS idx_user_approvals_status ON user_approvals(status);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for vehicles.updated_at
DROP TRIGGER IF EXISTS update_vehicles_updated_at ON vehicles;
CREATE TRIGGER update_vehicles_updated_at
  BEFORE UPDATE ON vehicles
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();
