-- =====================================================================
-- VAYU DATABASE SCHEMA v2.0
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
  id              UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  name            TEXT        NOT NULL,
  location        TEXT        NOT NULL,
  region          dc_region   NOT NULL REFERENCES public.regions(id),
  lat             NUMERIC     NOT NULL,
  lng             NUMERIC     NOT NULL,
  status          dc_status   NOT NULL DEFAULT 'healthy',
  total_capacity  INTEGER     NOT NULL DEFAULT 100,
  current_load    NUMERIC     NOT NULL DEFAULT 0.0 CHECK (current_load BETWEEN 0 AND 1),
  health_score    INTEGER     NOT NULL DEFAULT 100 CHECK (health_score BETWEEN 0 AND 100),
  is_isolated     BOOLEAN     NOT NULL DEFAULT FALSE,
  created_by      UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL
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
  id              UUID    DEFAULT uuid_generate_v4() PRIMARY KEY,
  data_center_id  UUID    NOT NULL REFERENCES public.data_centers(id) ON DELETE CASCADE,
  name            TEXT    NOT NULL,
  description     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =====================================================================
-- TABLE: racks (within rooms, 6 per room)
-- =====================================================================
CREATE TABLE public.racks (
  id          UUID    DEFAULT uuid_generate_v4() PRIMARY KEY,
  room_id     UUID    NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  name        TEXT    NOT NULL,
  total_slots INTEGER NOT NULL DEFAULT 4,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
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
  amount_usd      NUMERIC NOT NULL,
  slots_count     INTEGER NOT NULL,
  duration_months INTEGER NOT NULL DEFAULT 1,
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
CREATE INDEX idx_racks_room            ON public.racks(room_id);
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

-- Data Centers (10 across all 6 regions)
INSERT INTO public.data_centers (id, name, location, region, lat, lng, status, total_capacity, current_load, health_score, is_isolated) VALUES
  ('dc000001-0000-0000-0000-000000000001', 'Vayu NA-East',      'Ashburn, VA, USA',          'north_america',  39.0438,  -77.4874,  'healthy',  500, 0.65, 87, FALSE),
  ('dc000001-0000-0000-0000-000000000002', 'Vayu NA-West',      'San Jose, CA, USA',         'north_america',  37.3382, -121.8863,  'healthy',  300, 0.45, 95, FALSE),
  ('dc000001-0000-0000-0000-000000000003', 'Vayu SA-1',         'São Paulo, Brazil',         'south_america', -23.5505,  -46.6333,  'healthy',  200, 0.30, 92, FALSE),
  ('dc000001-0000-0000-0000-000000000004', 'Vayu EU-Central',   'Frankfurt, Germany',        'europe',         50.1109,    8.6821,  'warning',  450, 0.82, 68, FALSE),
  ('dc000001-0000-0000-0000-000000000005', 'Vayu EU-West',      'Dublin, Ireland',           'europe',         53.3498,   -6.2603,  'healthy',  350, 0.55, 90, FALSE),
  ('dc000001-0000-0000-0000-000000000006', 'Vayu AP-Tokyo',     'Tokyo, Japan',              'asia',           35.6895,  139.6917,  'healthy',  600, 0.70, 85, FALSE),
  ('dc000001-0000-0000-0000-000000000007', 'Vayu AP-Mumbai',    'Mumbai, India',             'asia',           19.0760,   72.8777,  'healthy',  400, 0.50, 88, FALSE),
  ('dc000001-0000-0000-0000-000000000008', 'Vayu AF-1',         'Cape Town, South Africa',   'africa',        -33.9249,   18.4241,  'warning',  150, 0.75, 72, FALSE),
  ('dc000001-0000-0000-0000-000000000009', 'Vayu OC-1',         'Sydney, Australia',         'oceania',       -33.8688,  151.2093,  'healthy',  200, 0.40, 93, FALSE),
  ('dc000001-0000-0000-0000-000000000010', 'Vayu AP-Singapore', 'Singapore',                 'asia',            1.3521,  103.8198,  'healthy',  350, 0.60, 89, FALSE);

-- DC Links (backup connections)
INSERT INTO public.dc_links (dc_a_id, dc_b_id, link_type) VALUES
  ('dc000001-0000-0000-0000-000000000001', 'dc000001-0000-0000-0000-000000000002', 'backup'),
  ('dc000001-0000-0000-0000-000000000004', 'dc000001-0000-0000-0000-000000000005', 'backup'),
  ('dc000001-0000-0000-0000-000000000006', 'dc000001-0000-0000-0000-000000000010', 'redundancy'),
  ('dc000001-0000-0000-0000-000000000007', 'dc000001-0000-0000-0000-000000000006', 'backup');

-- Rooms (2 per DC — seeding all 10 DCs)
DO $$
DECLARE
  dc_ids UUID[] := ARRAY[
    'dc000001-0000-0000-0000-000000000001'::UUID,
    'dc000001-0000-0000-0000-000000000002'::UUID,
    'dc000001-0000-0000-0000-000000000003'::UUID,
    'dc000001-0000-0000-0000-000000000004'::UUID,
    'dc000001-0000-0000-0000-000000000005'::UUID,
    'dc000001-0000-0000-0000-000000000006'::UUID,
    'dc000001-0000-0000-0000-000000000007'::UUID,
    'dc000001-0000-0000-0000-000000000008'::UUID,
    'dc000001-0000-0000-0000-000000000009'::UUID,
    'dc000001-0000-0000-0000-000000000010'::UUID
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
      INSERT INTO public.rooms (id, data_center_id, name)
        VALUES (room_id, dc_id, 'Room ' || CHR(64 + i));
      FOR j IN 1..6 LOOP
        rack_id := uuid_generate_v4();
        INSERT INTO public.racks (id, room_id, name, total_slots)
          VALUES (rack_id, room_id, 'Rack ' || CHR(64 + i) || '-' || j, 4);
        FOR k IN 1..4 LOOP
          INSERT INTO public.server_slots (rack_id, position, status, health)
            VALUES (rack_id, k, 'available', 'healthy');
        END LOOP;
      END LOOP;
    END LOOP;
  END LOOP;
END $$;

-- Seed some occupied slots for demo clients
-- We'll find racks in DC-001 Room A and assign to Tony Stark
DO $$
DECLARE
  rack_1 UUID;
  rack_2 UUID;
  slot_id UUID;
BEGIN
  -- Get first 2 racks of DC-001 Room A
  SELECT r.id INTO rack_1 FROM public.racks r
    JOIN public.rooms rm ON r.room_id = rm.id
    JOIN public.data_centers dc ON rm.data_center_id = dc.id
    WHERE dc.id = 'dc000001-0000-0000-0000-000000000001'
    ORDER BY r.created_at LIMIT 1;

  SELECT r.id INTO rack_2 FROM public.racks r
    JOIN public.rooms rm ON r.room_id = rm.id
    JOIN public.data_centers dc ON rm.data_center_id = dc.id
    WHERE dc.id = 'dc000001-0000-0000-0000-000000000001'
    ORDER BY r.created_at LIMIT 1 OFFSET 1;

  IF rack_1 IS NOT NULL THEN
    -- Tony Stark owns slots 1 and 2 in rack_1
    UPDATE public.server_slots SET
      status = 'occupied', client_id = 'c0000000-0000-0000-0000-000000000001',
      server_name = 'Stark-Prod-Web-1', health = 'healthy', cpu_util = 0.72, mem_util = 0.65
      WHERE rack_id = rack_1 AND position = 1;

    UPDATE public.server_slots SET
      status = 'occupied', client_id = 'c0000000-0000-0000-0000-000000000001',
      server_name = 'Stark-DB-Primary', health = 'healthy', cpu_util = 0.45, mem_util = 0.80
      WHERE rack_id = rack_1 AND position = 2;

    -- Wayne Enterprises slot 3 in rack_1
    UPDATE public.server_slots SET
      status = 'occupied', client_id = 'c0000000-0000-0000-0000-000000000002',
      server_name = 'Wayne-Analytics-1', health = 'healthy', cpu_util = 0.60, mem_util = 0.55
      WHERE rack_id = rack_1 AND position = 3;
  END IF;

  IF rack_2 IS NOT NULL THEN
    -- Tony Stark slot 1 in rack_2
    UPDATE public.server_slots SET
      status = 'occupied', client_id = 'c0000000-0000-0000-0000-000000000001',
      server_name = 'Stark-Cache-1', health = 'healthy', cpu_util = 0.30, mem_util = 0.40
      WHERE rack_id = rack_2 AND position = 1;
  END IF;
END $$;

-- Server allocations for demo
INSERT INTO public.server_allocations (client_id, slot_id, data_center_id, start_date, is_active)
  SELECT 
    ss.client_id,
    ss.id,
    'dc000001-0000-0000-0000-000000000001',
    CURRENT_DATE - INTERVAL '30 days',
    TRUE
  FROM public.server_slots ss
  WHERE ss.client_id IS NOT NULL
    AND ss.rack_id IN (
      SELECT r.id FROM public.racks r
        JOIN public.rooms rm ON r.room_id = rm.id
        WHERE rm.data_center_id = 'dc000001-0000-0000-0000-000000000001'
    );

-- Billing records for demo clients
INSERT INTO public.billing_records (client_id, amount_usd, slots_count, duration_months, billing_period, status)
  VALUES
    ('c0000000-0000-0000-0000-000000000001', 360.00, 3, 1, TO_CHAR(NOW(), 'YYYY-MM'), 'paid'),
    ('c0000000-0000-0000-0000-000000000001', 360.00, 3, 1, TO_CHAR(NOW() - INTERVAL '1 month', 'YYYY-MM'), 'paid'),
    ('c0000000-0000-0000-0000-000000000002', 120.00, 1, 1, TO_CHAR(NOW(), 'YYYY-MM'), 'pending');

-- Sample AI decisions
INSERT INTO public.ai_decisions (category, technique_id, technique_name, decision, explanation, confidence, trigger_event, action_taken) VALUES
  ('traffic', 'dns_weighted', 'DNS Weighted Routing', 'Redistribute 35% of US-East traffic to EU-Central via DNS weighted routing', 'US-East data center approaching 85% load capacity. EU-Central currently at 45% with available headroom. DNS weighted routing adjustment will reduce US-East load to ~65% within 5 minutes.', 91.4, 'load_threshold_exceeded', TRUE),
  ('threat', 'waf_dpi', 'WAF + DPI', 'Deploy WAF rules for XSS/SQLi pattern blocking on AP-Tokyo edge nodes', 'Unusual traffic pattern detected: 15% increase in malformed requests from 3 IP ranges. Activating WAF rule set WAF-2024-Q3 and enabling DPI for payload inspection.', 87.2, 'anomaly_detected', TRUE),
  ('cost', 'idle_consolidate', 'Idle Consolidation', 'Consolidate 12 idle servers in Oceania region to reduce power consumption', 'Oceania region running at 32% utilization. 12 servers identified with <5% average CPU over 6 hours. Live migration to 4 core servers will reduce PUE from 1.6 to 1.4, saving $840/month.', 89.5, 'low_utilization', TRUE),
  ('allocation', 'hot_cold_aisle', 'Hot-Cold Aisle', 'Rearrange EU-Central Rack C5-C8 to maintain hot-cold aisle separation', 'Thermal analysis shows mixed airflow in EU-Central Room B. Racks C5-C8 violating hot-cold containment. Rearranging server orientation will reduce cooling load by 18%.', 85.0, 'thermal_threshold', TRUE);

-- Sample operational logs
INSERT INTO public.operational_logs (category, event_type, message, severity, metadata) VALUES
  ('traffic', 'routing_change', 'BGP route update: US-East → EU-Central failover path activated', 'info', '{"affected_regions": ["north_america", "europe"], "duration_ms": 340}'),
  ('threat', 'anomaly_detected', 'Unusual traffic spike detected in AP-Tokyo: 500k req/s from 847 unique IPs', 'warning', '{"region": "asia", "req_per_sec": 500000, "unique_ips": 847}'),
  ('cost', 'consolidation', 'Idle server consolidation completed: 8 servers powered down in SA-1', 'info', '{"servers_consolidated": 8, "power_saved_kw": 12.4}'),
  ('allocation', 'new_allocation', 'Server allocated: Stark-Prod-Web-1 in NA-East Rack A-1 Slot 1', 'info', '{"client": "Stark Industries", "dc": "Vayu NA-East", "rack": "Rack A-1"}'),
  ('traffic', 'load_balanced', 'Traffic load balancing applied across North America region', 'info', '{"before_load": 0.87, "after_load": 0.65, "technique": "DNS Weighted Routing"}');

-- Sample notifications (for admin)
INSERT INTO public.notifications (target_role, type, title, message) VALUES
  ('admin', 'warning',  'High Load Alert',           'EU-Central data center reaching 82% capacity. Consider load balancing.'),
  ('admin', 'info',     'AI Decision Applied',       'Traffic optimization: 35% rerouted from US-East to EU-Central.'),
  ('admin', 'critical', 'Anomaly Detected',          'AP-Tokyo showing unusual traffic patterns. AI threat defense activated.'),
  ('admin', 'success',  'System Fully Operational',  'All 10 data centers online. Vayu AI monitoring active.');

-- Seed notification for client Tony Stark
INSERT INTO public.notifications (user_id, type, title, message)
  VALUES ('c0000000-0000-0000-0000-000000000001', 'info', 'Server Health Update', 'Stark-Prod-Web-1 is running at optimal performance. CPU: 72%, Memory: 65%.');

-- =====================================================================
-- ROW LEVEL SECURITY (optional — enabled for reference)
-- Vayu uses custom auth (no Supabase Auth), so RLS is left disabled.
-- Application layer (Next.js API routes) enforces access control.
-- Uncomment below to enable basic RLS if needed in future:
-- =====================================================================
-- ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.data_centers ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.server_slots ENABLE ROW LEVEL SECURITY;
-- -- etc.

-- =====================================================================
-- VERIFICATION QUERIES
-- Run these after seeding to verify data integrity:
-- SELECT COUNT(*) FROM public.users;             -- Should be 6
-- SELECT COUNT(*) FROM public.data_centers;      -- Should be 10
-- SELECT COUNT(*) FROM public.rooms;             -- Should be 20 (2 per DC)
-- SELECT COUNT(*) FROM public.racks;             -- Should be 120 (6 per room)
-- SELECT COUNT(*) FROM public.server_slots;      -- Should be 480 (4 per rack)
-- SELECT COUNT(*) FROM public.server_slots WHERE status = 'occupied'; -- Should be 4
-- SELECT COUNT(*) FROM public.ai_decisions;      -- Should be 4
-- SELECT COUNT(*) FROM public.operational_logs;  -- Should be 5
-- =====================================================================
