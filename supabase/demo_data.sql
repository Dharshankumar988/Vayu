-- Insert Demo Data Centers including isolated ones for private companies

INSERT INTO public.data_centers (id, name, location, region, lat, lng, total_capacity, status, current_load, health_score, is_isolated, price_per_slot_month)
VALUES 
  -- Public / Standard Data Centers
  ('11111111-1111-1111-1111-111111111111', 'Vayu NA-East', 'Ashburn, VA, USA', 'north_america', 39.0438, -77.4874, 500, 'healthy', 0.65, 95, false, 120.00),
  ('22222222-2222-2222-2222-222222222222', 'Vayu EU-Central', 'Frankfurt, Germany', 'europe', 50.1109, 8.6821, 450, 'warning', 0.82, 68, false, 140.00),
  ('33333333-3333-3333-3333-333333333333', 'Vayu AP-Tokyo', 'Tokyo, Japan', 'asia', 35.6895, 139.6917, 600, 'healthy', 0.70, 85, false, 150.00),
  
  -- Isolated / Private Data Centers (Represented in Gold on the Globe)
  ('aaaaa111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Stark Industries Core', 'Malibu, CA, USA', 'north_america', 34.0259, -118.7798, 200, 'healthy', 0.40, 99, true, 500.00),
  ('bbbbb222-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Wayne Enterprises Secure', 'Gotham (NYC), USA', 'north_america', 40.7128, -74.0060, 300, 'healthy', 0.35, 100, true, 650.00),
  ('ccccc333-cccc-cccc-cccc-cccccccccccc', 'Swiss Bank Vault DC', 'Zurich, Switzerland', 'europe', 47.3769, 8.5417, 100, 'healthy', 0.20, 99, true, 800.00)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  is_isolated = EXCLUDED.is_isolated;

-- Add a default room for each of these DCs
INSERT INTO public.rooms (id, data_center_id, name, display_order)
VALUES 
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'Main Hall A', 0),
  (gen_random_uuid(), 'aaaaa111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Stark Core Room', 0),
  (gen_random_uuid(), 'bbbbb222-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Batcave Servers', 0),
  (gen_random_uuid(), 'ccccc333-cccc-cccc-cccc-cccccccccccc', 'Vault 1', 0)
ON CONFLICT DO NOTHING;

-- (You can use the Admin Panel UI to easily add Racks and more Rooms for these!)
