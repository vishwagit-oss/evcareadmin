-- EVCare Admin - Insert fleet data directly in RDS
-- Run this in RDS Query Editor, psql, or any PostgreSQL client.
-- Replace 'demo-user-id' with your Cognito user ID if you want rows tied to a real user.
-- Skips rows that already exist (ON CONFLICT DO NOTHING on vin).

INSERT INTO vehicles (
  cognito_user_id, vin, make, model, battery_capacity_kwh,
  current_charge_percent, battery_health_score, status, license_plate
) VALUES
  ('demo-user-id', '5YJ3E1EA0NF123401', 'Tesla', 'Model 3', 75, 92, 96, 'active', 'EV-001'),
  ('demo-user-id', '5YJ3E1EA2NF234502', 'Tesla', 'Model 3 Long Range', 82, 45, 91, 'charging', 'EV-002'),
  ('demo-user-id', '7SAYGDEE1NF345603', 'Tesla', 'Model Y', 75, 18, 88, 'active', 'EV-003'),
  ('demo-user-id', '7SAYGDEE3NF456704', 'Tesla', 'Model Y Long Range', 81, 78, 94, 'active', 'EV-004'),
  ('demo-user-id', '5YJSA1E26NF567805', 'Tesla', 'Model S', 100, 100, 89, 'active', 'EV-005'),
  ('demo-user-id', '7SAXCDEE9NF678906', 'Tesla', 'Model X', 100, 62, 85, 'maintenance', 'EV-006'),
  ('demo-user-id', 'WVWZZZ3CZWE123789', 'Volkswagen', 'ID.4', 82, 33, 87, 'active', 'EV-007'),
  ('demo-user-id', 'WVWZZZ3CZWE234890', 'Volkswagen', 'ID.4 Pro', 77, 55, 92, 'active', 'EV-008'),
  ('demo-user-id', '1N4BZ1CP0KN123456', 'Nissan', 'Leaf', 40, 88, 72, 'active', 'EV-009'),
  ('demo-user-id', '1N4BZ1CP5NN234567', 'Nissan', 'Leaf Plus', 62, 12, 79, 'charging', 'EV-010'),
  ('demo-user-id', '3FMTK3SU0NMA12345', 'Ford', 'Mustang Mach-E', 88, 41, 90, 'active', 'EV-011'),
  ('demo-user-id', '3FMTK3SU5NMB23456', 'Ford', 'Mustang Mach-E Extended', 91, 67, 93, 'active', 'EV-012'),
  ('demo-user-id', 'KM8J23A45NU345678', 'Hyundai', 'Ioniq 5', 77, 24, 86, 'active', 'EV-013'),
  ('demo-user-id', 'KM8J23A48NU456789', 'Hyundai', 'Ioniq 6', 77, 95, 91, 'active', 'EV-014'),
  ('demo-user-id', '1G1FY6S05N4123456', 'Chevrolet', 'Bolt EV', 65, 50, 84, 'active', 'EV-015'),
  ('demo-user-id', 'WBA71AA060N5123456', 'BMW', 'i4', 83, 19, 88, 'charging', 'EV-016'),
  ('demo-user-id', 'WAUZZZ4GXNN612345', 'Audi', 'e-tron', 95, 73, 82, 'active', 'EV-017'),
  ('demo-user-id', '7FARW2P59NE723456', 'Rivian', 'R1T', 135, 38, 97, 'active', 'EV-018'),
  ('demo-user-id', '7FARW2P59NE834567', 'Rivian', 'R1S', 135, 11, 94, 'charging', 'EV-019'),
  ('demo-user-id', '5YJ3E1EB0NF945678', 'Tesla', 'Model 3 Standard', 54, 60, 68, 'maintenance', 'EV-020'),
  ('demo-user-id', '1HGBH41JXMN109187', 'Tesla', 'Model 3', 75, 100, 10, 'offline', 'EV-021')
ON CONFLICT (vin) DO NOTHING;
