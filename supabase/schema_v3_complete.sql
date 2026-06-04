-- =====================================================================
-- VAYU DATABASE SCHEMA v3.0 (COMPLETE)
-- Data Center Infrastructure Management System
-- Run this entire file in the Supabase SQL Editor
-- =====================================================================

-- =====================================================================
-- EXTENSIONS
-- =====================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =====================================================================
-- CLEANUP (drop existing if re-running)
-- =====================================================================
DROP TABLE IF EXISTS public.policies CASCADE;
DROP TABLE IF EXISTS public.region_user_load CASCADE;
DROP TABLE IF EXISTS public.performance_metrics CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.operational_logs CASCADE;
DROP TABLE IF EXISTS public.ai_decisions CASCADE;
DROP TABLE IF EXISTS public.threat_simulations CASCADE;
DROP TABLE IF EXISTS public.traffic_simulations CASCADE;
DROP TABLE IF EXISTS public.billing_records CASCADE;
DROP TABLE IF EXISTS public.server_allocations CASCADE;
DROP TABLE IF EXISTS public.server_slots CASCADE;
DROP TABLE IF EXISTS public.racks CASCADE;
DROP TABLE IF EXISTS public.rooms CASCADE;
DROP TABLE IF EXISTS public.dc_links CASCADE;
DROP TABLE IF EXISTS public.data_centers CASCADE;
DROP TABLE IF EXISTS public.regions CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- Drop enums
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS client_type CASCADE;
DROP TYPE IF EXISTS approval_status CASCADE;
DROP TYPE IF EXISTS dc_status CASCADE;
DROP TYPE IF EXISTS dc_region CASCADE;
DROP TYPE IF EXISTS server_health CASCADE;
DROP TYPE IF EXISTS slot_status CASCADE;
DROP TYPE IF EXISTS sim_type CASCADE;
DROP TYPE IF EXISTS sim_severity CASCADE;
DROP TYPE IF EXISTS notif_type CASCADE;
DROP TYPE IF EXISTS log_category CASCADE;
DROP TYPE IF EXISTS billing_pref CASCADE;

-- =====================================================================
-- ENUMS
-- =====================================================================
CREATE TYPE user_role       AS ENUM ('admin', 'client');
CREATE TYPE client_type     AS ENUM ('individual', 'organization');
CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');
CREATE TYPE dc_status       AS ENUM ('healthy', 'warning', 'critical', 'offline');
CREATE TYPE dc_region       AS ENUM ('north_america', 'south_america', 'europe', 'asia', 'africa', 'oceania');
CREATE TYPE server_health   AS ENUM ('healthy', 'unhealthy', 'critical');
CREATE TYPE slot_status     AS ENUM ('available', 'occupied', 'reserved', 'maintenance');
CREATE TYPE sim_type        AS ENUM ('load_increase', 'ddos_attack', 'physical_damage');
CREATE TYPE sim_severity    AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE notif_type      AS ENUM ('info', 'warning', 'critical', 'success');
CREATE TYPE log_category    AS ENUM ('traffic', 'threat', 'cost', 'allocation');
CREATE TYPE billing_pref    AS ENUM ('monthly', 'annual');

-- =====================================================================
-- TABLE: regions (reference)
-- =====================================================================
CREATE TABLE public.regions (
  id          dc_region   PRIMARY KEY,
  name        TEXT        NOT NULL,
  description TEXT,
  lat         NUMERIC     NOT NULL,
  lng         NUMERIC     NOT NULL
);

-- =====================================================================
-- TABLE: users
-- =====================================================================
CREATE TABLE public.users (
  id                      UUID            DEFAULT uuid_generate_v4() PRIMARY KEY,
  email                   TEXT            UNIQUE NOT NULL,
  password                TEXT            NOT NULL,
  role                    user_role       NOT NULL DEFAULT 'client',
  client_type             client_type,
  approval_status         approval_status NOT NULL DEFAULT 'pending',
  full_name               TEXT            NOT NULL,
  company_name            TEXT,
  contact_person          TEXT,
  organization_type       TEXT,
  business_category       TEXT,
  country                 TEXT,
  region                  TEXT,
  phone                   TEXT,
  intended_usage          TEXT,
  preferred_dc_region     dc_region,
  estimated_server_needs  TEXT,
  expected_server_count   INTEGER,
  billing_preference      billing_pref    DEFAULT 'monthly',
  approved_by             UUID            REFERENCES public.users(id) ON DELETE SET NULL,
  approved_at             TIMESTAMPTZ,
  created_at              TIMESTAMPTZ     DEFAULT NOW() NOT NULL,
  updated_at              TIMESTAMPTZ     DEFAULT NOW() NOT NULL
);

-- =====================================================================
-- TABLE: data_centers
-- =====================================================================
CREATE TABLE public.data_centers (
  id                    UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  name                  TEXT        NOT NULL,
  location              TEXT        NOT NULL,
  region                dc_region   NOT NULL REFERENCES public.regions(id),
  lat                   NUMERIC     NOT NULL,
  lng                   NUMERIC     NOT NULL,
  status                dc_status   NOT NULL DEFAULT 'healthy',
  total_capacity        INTEGER     NOT NULL DEFAULT 100,
  current_load          NUMERIC     NOT NULL DEFAULT 0.0 CHECK (current_load BETWEEN 0 AND 1),
  health_score          INTEGER     NOT NULL DEFAULT 100 CHECK (health_score BETWEEN 0 AND 100),
  is_isolated           BOOLEAN     NOT NULL DEFAULT FALSE,
  price_per_slot_month  NUMERIC     NOT NULL DEFAULT 120.00,
  currency              TEXT        NOT NULL DEFAULT 'USD',
  created_by            UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at            TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =====================================================================
-- TABLE: dc_links (backup/redundancy connections)
-- =====================================================================
CREATE TABLE public.dc_links (
  id          UUID    DEFAULT uuid_generate_v4() PRIMARY KEY,
  dc_a_id     UUID    NOT NULL REFERENCES public.data_centers(id) ON DELETE CASCADE,
  dc_b_id     UUID    NOT NULL REFERENCES public.data_centers(id) ON DELETE CASCADE,
  link_type   TEXT    NOT NULL DEFAULT 'backup',
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (dc_a_id, dc_b_id),
  CHECK (dc_a_id <> dc_b_id)
);

-- =====================================================================
-- TABLE: rooms (within data centers)
-- =====================================================================
CREATE TABLE public.rooms (
  id                      UUID    DEFAULT uuid_generate_v4() PRIMARY KEY,
  data_center_id          UUID    NOT NULL REFERENCES public.data_centers(id) ON DELETE CASCADE,
  name                    TEXT    NOT NULL,
  description             TEXT,
  display_order           INTEGER DEFAULT 0,
  floor_area_sqm          NUMERIC,
  price_override_per_slot NUMERIC,
  created_at              TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =====================================================================
-- TABLE: racks (within rooms, 6 per room)
-- =====================================================================
CREATE TABLE public.racks (
  id                      UUID    DEFAULT uuid_generate_v4() PRIMARY KEY,
  room_id                 UUID    NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  name                    TEXT    NOT NULL,
  total_slots             INTEGER NOT NULL DEFAULT 4,
  display_order           INTEGER DEFAULT 0,
  price_override_per_slot NUMERIC,
  created_at              TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =====================================================================
-- TABLE: server_slots (4 per rack)
-- =====================================================================
CREATE TABLE public.server_slots (
  id          UUID          DEFAULT uuid_generate_v4() PRIMARY KEY,
  rack_id     UUID          NOT NULL REFERENCES public.racks(id) ON DELETE CASCADE,
  position    INTEGER       NOT NULL CHECK (position BETWEEN 1 AND 4),
  status      slot_status   NOT NULL DEFAULT 'available',
  client_id   UUID          REFERENCES public.users(id) ON DELETE SET NULL,
  server_name TEXT,
  health      server_health NOT NULL DEFAULT 'healthy',
  cpu_util    NUMERIC       DEFAULT 0.0 CHECK (cpu_util BETWEEN 0 AND 1),
  mem_util    NUMERIC       DEFAULT 0.0 CHECK (mem_util BETWEEN 0 AND 1),
  reserved_at TIMESTAMPTZ,
  reserved_by UUID          REFERENCES public.users(id),
  created_at  TIMESTAMPTZ   DEFAULT NOW() NOT NULL,
  updated_at  TIMESTAMPTZ   DEFAULT NOW() NOT NULL,
  UNIQUE (rack_id, position)
);

-- =====================================================================
-- TABLE: server_allocations (billing-linked)
-- =====================================================================
CREATE TABLE public.server_allocations (
  id              UUID    DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id       UUID    NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  slot_id         UUID    NOT NULL REFERENCES public.server_slots(id) ON DELETE CASCADE,
  data_center_id  UUID    NOT NULL REFERENCES public.data_centers(id),
  start_date      DATE    NOT NULL DEFAULT CURRENT_DATE,
  end_date        DATE,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =====================================================================
-- TABLE: billing_records
-- =====================================================================
CREATE TABLE public.billing_records (
  id              UUID    DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id       UUID    NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  allocation_id   UUID    REFERENCES public.server_allocations(id),
  data_center_id  UUID    REFERENCES public.data_centers(id),
  room_id         UUID    REFERENCES public.rooms(id),
  rack_id         UUID    REFERENCES public.racks(id),
  amount_usd      NUMERIC NOT NULL,
  price_per_slot  NUMERIC NOT NULL DEFAULT 120.00,
  discount_pct    NUMERIC NOT NULL DEFAULT 0,
  slots_count     INTEGER NOT NULL,
  duration_months INTEGER NOT NULL DEFAULT 1,
  start_date      DATE,
  end_date        DATE,
  billing_period  TEXT    NOT NULL,
  status          TEXT    NOT NULL DEFAULT 'pending',
  created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =====================================================================
-- TABLE: traffic_simulations
-- =====================================================================
CREATE TABLE public.traffic_simulations (
  id              UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  region          dc_region   NOT NULL REFERENCES public.regions(id),
  load_multiplier NUMERIC     NOT NULL DEFAULT 2.0,
  started_by      UUID        REFERENCES public.users(id),
  is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
  started_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  ended_at        TIMESTAMPTZ
);

-- =====================================================================
-- TABLE: threat_simulations
-- =====================================================================
CREATE TABLE public.threat_simulations (
  id                  UUID          DEFAULT uuid_generate_v4() PRIMARY KEY,
  data_center_id      UUID          NOT NULL REFERENCES public.data_centers(id),
  sim_type            sim_type      NOT NULL,
  severity            sim_severity  NOT NULL DEFAULT 'medium',
  damage_type         TEXT,
  started_by          UUID          REFERENCES public.users(id),
  is_active           BOOLEAN       NOT NULL DEFAULT TRUE,
  affected_client_ids UUID[],
  started_at          TIMESTAMPTZ   DEFAULT NOW() NOT NULL,
  ended_at            TIMESTAMPTZ
);

-- =====================================================================
-- TABLE: ai_decisions
-- =====================================================================
CREATE TABLE public.ai_decisions (
  id              UUID          DEFAULT uuid_generate_v4() PRIMARY KEY,
  category        log_category  NOT NULL,
  technique_id    TEXT          NOT NULL,
  technique_name  TEXT          NOT NULL,
  decision        TEXT          NOT NULL,
  explanation     TEXT          NOT NULL,
  confidence      NUMERIC       NOT NULL,
  trigger_event   TEXT,
  action_taken    BOOLEAN       NOT NULL DEFAULT TRUE,
  region          dc_region,
  data_center_id  UUID          REFERENCES public.data_centers(id),
  created_at      TIMESTAMPTZ   DEFAULT NOW() NOT NULL
);

-- =====================================================================
-- TABLE: operational_logs
-- =====================================================================
CREATE TABLE public.operational_logs (
  id          UUID          DEFAULT uuid_generate_v4() PRIMARY KEY,
  category    log_category  NOT NULL,
  event_type  TEXT          NOT NULL,
  message     TEXT          NOT NULL,
  severity    TEXT          NOT NULL DEFAULT 'info',
  metadata    JSONB,
  user_id     UUID          REFERENCES public.users(id),
  dc_id       UUID          REFERENCES public.data_centers(id),
  created_at  TIMESTAMPTZ   DEFAULT NOW() NOT NULL
);

-- =====================================================================
-- TABLE: notifications
-- =====================================================================
CREATE TABLE public.notifications (
  id              UUID          DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id         UUID          REFERENCES public.users(id) ON DELETE CASCADE,
  target_role     user_role,
  type            notif_type    NOT NULL DEFAULT 'info',
  title           TEXT          NOT NULL,
  message         TEXT          NOT NULL,
  is_read         BOOLEAN       NOT NULL DEFAULT FALSE,
  related_sim_id  UUID,
  created_at      TIMESTAMPTZ   DEFAULT NOW() NOT NULL
);

-- =====================================================================
-- TABLE: performance_metrics (time-series)
-- =====================================================================
CREATE TABLE public.performance_metrics (
  id                UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  data_center_id    UUID        NOT NULL REFERENCES public.data_centers(id) ON DELETE CASCADE,
  load              NUMERIC     NOT NULL,
  health_score      INTEGER     NOT NULL,
  requests_per_min  INTEGER     NOT NULL DEFAULT 0,
  active_clients    INTEGER     NOT NULL DEFAULT 0,
  recorded_at       TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =====================================================================
-- TABLE: region_user_load (admin-controlled simulation)
-- =====================================================================
CREATE TABLE public.region_user_load (
  region          dc_region   PRIMARY KEY REFERENCES public.regions(id),
  user_count      INTEGER     NOT NULL DEFAULT 1000000,
  load_override   NUMERIC,
  updated_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =====================================================================
-- TABLE: policies
-- =====================================================================
CREATE TABLE public.policies (
  id              UUID    DEFAULT uuid_generate_v4() PRIMARY KEY,
  name            TEXT    NOT NULL,
  description     TEXT,
  rule_type       TEXT    NOT NULL,
  configuration   JSONB   NOT NULL DEFAULT '{}',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_by      UUID    REFERENCES public.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =====================================================================
-- INDEXES
-- =====================================================================
CREATE INDEX idx_users_email           ON public.users(email);
CREATE INDEX idx_users_approval        ON public.users(approval_status);
CREATE INDEX idx_users_role            ON public.users(role);
CREATE INDEX idx_dc_region             ON public.data_centers(region);
CREATE INDEX idx_dc_status             ON public.data_centers(status);
CREATE INDEX idx_rooms_dc              ON public.rooms(data_center_id);
CREATE INDEX idx_rooms_order           ON public.rooms(data_center_id, display_order);
CREATE INDEX idx_racks_room            ON public.racks(room_id);
CREATE INDEX idx_racks_order           ON public.racks(room_id, display_order);
CREATE INDEX idx_slots_rack            ON public.server_slots(rack_id);
CREATE INDEX idx_slots_client          ON public.server_slots(client_id);
CREATE INDEX idx_slots_status          ON public.server_slots(status);
CREATE INDEX idx_ai_decisions_cat      ON public.ai_decisions(category);
CREATE INDEX idx_ai_decisions_time     ON public.ai_decisions(created_at DESC);
CREATE INDEX idx_op_logs_cat           ON public.operational_logs(category);
CREATE INDEX idx_op_logs_dc            ON public.operational_logs(dc_id);
CREATE INDEX idx_op_logs_time          ON public.operational_logs(created_at DESC);
CREATE INDEX idx_notif_user            ON public.notifications(user_id);
CREATE INDEX idx_notif_role            ON public.notifications(target_role);
CREATE INDEX idx_perf_dc_time          ON public.performance_metrics(data_center_id, recorded_at DESC);
CREATE INDEX idx_billing_client        ON public.billing_records(client_id);
CREATE INDEX idx_allocation_client     ON public.server_allocations(client_id);
CREATE INDEX idx_threat_sim_dc         ON public.threat_simulations(data_center_id);
CREATE INDEX idx_threat_sim_active     ON public.threat_simulations(is_active);
CREATE INDEX idx_traffic_sim_region    ON public.traffic_simulations(region);

-- =====================================================================
-- SEED DATA
-- =====================================================================

-- Regions
INSERT INTO public.regions (id, name, description, lat, lng) VALUES
  ('north_america', 'North America', 'US, Canada, Mexico',              39.0,  -98.0),
  ('south_america', 'South America', 'Brazil, Argentina, Chile',        -15.0, -60.0),
  ('europe',        'Europe',        'EU, UK, Eastern Europe',           50.0,   10.0),
  ('asia',          'Asia',          'East Asia, South Asia, SEA',       30.0,  105.0),
  ('africa',        'Africa',        'Sub-Saharan and North Africa',      0.0,   20.0),
  ('oceania',       'Oceania',       'Australia, New Zealand, Pacific', -25.0,  134.0);

-- Region user load
INSERT INTO public.region_user_load (region, user_count) VALUES
  ('north_america', 1500000),
  ('south_america',  500000),
  ('europe',        1200000),
  ('asia',          2000000),
  ('africa',         300000),
  ('oceania',        200000);

-- Admin users (pre-approved, no approval_status pending)
INSERT INTO public.users (id, email, password, role, approval_status, full_name, company_name) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'admin@vayu.com',  'admin123', 'admin', 'approved', 'System Admin',      'Vayu Global'),
  ('a0000000-0000-0000-0000-000000000002', 'admin2@vayu.com', 'admin123', 'admin', 'approved', 'System Admin Beta', 'Vayu Global');

-- Client users (approved)
INSERT INTO public.users (id, email, password, role, client_type, approval_status, full_name, company_name, country, preferred_dc_region, phone) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'tony@stark.com',  'client123', 'client', 'individual',   'approved', 'Tony Stark',  'Stark Industries', 'USA',     'north_america', '+1-555-0001'),
  ('c0000000-0000-0000-0000-000000000002', 'bruce@wayne.com', 'client123', 'client', 'organization', 'approved', 'Bruce Wayne', 'Wayne Enterprises', 'USA',    'north_america', '+1-555-0002'),
  ('c0000000-0000-0000-0000-000000000003', 'diana@themis.com','client123', 'client', 'organization', 'approved', 'Diana Prince','Themiscyra Tech',  'Greece',  'europe',        '+30-555-0003');

-- Pending user (for demo of approval flow)
INSERT INTO public.users (id, email, password, role, client_type, approval_status, full_name, country, preferred_dc_region) VALUES
  ('c0000000-0000-0000-0000-000000000004', 'pending@test.com', 'test123', 'client', 'individual', 'pending', 'New Applicant', 'Germany', 'europe');

-- Data Centers (10 standard + 3 isolated/private across regions)
INSERT INTO public.data_centers (id, name, location, region, lat, lng, status, total_capacity, current_load, health_score, is_isolated, price_per_slot_month) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Vayu NA-East',      'Ashburn, VA, USA',          'north_america',  39.0438,  -77.4874,  'healthy',  500, 0.65, 87, FALSE, 120.00),
  ('11111111-1111-1111-1111-111111111112', 'Vayu NA-West',      'San Jose, CA, USA',         'north_america',  37.3382, -121.8863,  'healthy',  300, 0.45, 95, FALSE, 120.00),
  ('11111111-1111-1111-1111-111111111113', 'Vayu SA-1',         'São Paulo, Brazil',         'south_america', -23.5505,  -46.6333,  'healthy',  200, 0.30, 92, FALSE, 100.00),
  ('22222222-2222-2222-2222-222222222222', 'Vayu EU-Central',   'Frankfurt, Germany',        'europe',         50.1109,    8.6821,  'warning',  450, 0.82, 68, FALSE, 140.00),
  ('22222222-2222-2222-2222-222222222223', 'Vayu EU-West',      'Dublin, Ireland',           'europe',         53.3498,   -6.2603,  'healthy',  350, 0.55, 90, FALSE, 140.00),
  ('33333333-3333-3333-3333-333333333333', 'Vayu AP-Tokyo',     'Tokyo, Japan',              'asia',           35.6895,  139.6917,  'healthy',  600, 0.70, 85, FALSE, 150.00),
  ('33333333-3333-3333-3333-333333333334', 'Vayu AP-Mumbai',    'Mumbai, India',             'asia',           19.0760,   72.8777,  'healthy',  400, 0.50, 88, FALSE, 110.00),
  ('44444444-4444-4444-4444-444444444444', 'Vayu AF-1',         'Cape Town, South Africa',   'africa',        -33.9249,   18.4241,  'warning',  150, 0.75, 72, FALSE, 90.00),
  ('55555555-5555-5555-5555-555555555555', 'Vayu OC-1',         'Sydney, Australia',         'oceania',       -33.8688,  151.2093,  'healthy',  200, 0.40, 93, FALSE, 130.00),
  ('66666666-6666-6666-6666-666666666666', 'Vayu AP-Singapore', 'Singapore',                 'asia',            1.3521,  103.8198,  'healthy',  350, 0.60, 89, FALSE, 150.00),
  
  -- Isolated (Private Data Centers)
  ('aaaaa111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Stark Industries Core', 'Malibu, CA, USA',     'north_america',  34.0259, -118.7798,  'healthy',  200, 0.40, 99, TRUE, 500.00),
  ('bbbbb222-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Wayne Enterprises Secure', 'Gotham (NYC), USA','north_america',  40.7128,  -74.0060,  'healthy',  300, 0.35, 100, TRUE, 650.00),
  ('ccccc333-cccc-cccc-cccc-cccccccccccc', 'Swiss Bank Vault DC', 'Zurich, Switzerland',   'europe',         47.3769,    8.5417,  'healthy',  100, 0.20, 99, TRUE, 800.00);

-- DC Links (backup connections)
INSERT INTO public.dc_links (dc_a_id, dc_b_id, link_type) VALUES
  ('11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111112', 'backup'),
  ('22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222223', 'backup'),
  ('33333333-3333-3333-3333-333333333333', '66666666-6666-6666-6666-666666666666', 'redundancy'),
  ('33333333-3333-3333-3333-333333333334', '33333333-3333-3333-3333-333333333333', 'backup');

-- Rooms and Racks creation for all DCs
DO $$
DECLARE
  dc_ids UUID[] := ARRAY[
    '11111111-1111-1111-1111-111111111111'::UUID,
    '11111111-1111-1111-1111-111111111112'::UUID,
    '11111111-1111-1111-1111-111111111113'::UUID,
    '22222222-2222-2222-2222-222222222222'::UUID,
    '22222222-2222-2222-2222-222222222223'::UUID,
    '33333333-3333-3333-3333-333333333333'::UUID,
    '33333333-3333-3333-3333-333333333334'::UUID,
    '44444444-4444-4444-4444-444444444444'::UUID,
    '55555555-5555-5555-5555-555555555555'::UUID,
    '66666666-6666-6666-6666-666666666666'::UUID,
    'aaaaa111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::UUID,
    'bbbbb222-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::UUID,
    'ccccc333-cccc-cccc-cccc-cccccccccccc'::UUID
  ];
  dc_id UUID;
  room_id UUID;
  rack_id UUID;
  i INT;
  j INT;
  k INT;
BEGIN
  FOREACH dc_id IN ARRAY dc_ids LOOP
    FOR i IN 1..2 LOOP
      room_id := uuid_generate_v4();
      INSERT INTO public.rooms (id, data_center_id, name, display_order)
        VALUES (room_id, dc_id, 'Room ' || CHR(64 + i), i - 1);
      FOR j IN 1..6 LOOP
        rack_id := uuid_generate_v4();
        INSERT INTO public.racks (id, room_id, name, total_slots, display_order)
          VALUES (rack_id, room_id, 'Rack ' || CHR(64 + i) || '-' || j, 4, j - 1);
        FOR k IN 1..4 LOOP
          INSERT INTO public.server_slots (rack_id, position, status, health)
            VALUES (rack_id, k, 'available', 'healthy');
        END LOOP;
      END LOOP;
    END LOOP;
  END LOOP;
END $$;

-- Seed some occupied slots for demo clients
DO $$
DECLARE
  rack_1 UUID;
  rack_2 UUID;
BEGIN
  -- Get first 2 racks of Vayu NA-East (11111111-1111-1111-1111-111111111111)
  SELECT r.id INTO rack_1 FROM public.racks r
    JOIN public.rooms rm ON r.room_id = rm.id
    WHERE rm.data_center_id = '11111111-1111-1111-1111-111111111111'
    ORDER BY r.created_at LIMIT 1;

  SELECT r.id INTO rack_2 FROM public.racks r
    JOIN public.rooms rm ON r.room_id = rm.id
    WHERE rm.data_center_id = '11111111-1111-1111-1111-111111111111'
    ORDER BY r.created_at LIMIT 1 OFFSET 1;

  IF rack_1 IS NOT NULL THEN
    UPDATE public.server_slots SET
      status = 'occupied', client_id = 'c0000000-0000-0000-0000-000000000001',
      server_name = 'Stark-Prod-Web-1', health = 'healthy', cpu_util = 0.72, mem_util = 0.65
      WHERE rack_id = rack_1 AND position = 1;

    UPDATE public.server_slots SET
      status = 'occupied', client_id = 'c0000000-0000-0000-0000-000000000001',
      server_name = 'Stark-DB-Primary', health = 'healthy', cpu_util = 0.45, mem_util = 0.80
      WHERE rack_id = rack_1 AND position = 2;

    UPDATE public.server_slots SET
      status = 'occupied', client_id = 'c0000000-0000-0000-0000-000000000002',
      server_name = 'Wayne-Analytics-1', health = 'healthy', cpu_util = 0.60, mem_util = 0.55
      WHERE rack_id = rack_1 AND position = 3;
  END IF;
END $$;
