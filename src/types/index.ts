export type VehicleStatus = "active" | "charging" | "maintenance" | "offline";

export interface Vehicle {
  id: string;
  cognito_user_id: string;
  vin: string;
  make: string;
  model: string;
  battery_capacity_kwh: number;
  current_charge_percent: number;
  battery_health_score: number;
  status: VehicleStatus;
  license_plate: string;
  created_at: Date;
  updated_at: Date;
}
