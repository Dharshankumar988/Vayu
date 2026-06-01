-- Vayu Database Schema (College Project Version)
-- Run this in the Supabase SQL Editor

-- 1. Enable extensions
create extension if not exists "uuid-ossp";

-- 2. Create custom types
create type user_role as enum ('admin', 'client', 'provider');
create type data_center_status as enum ('operational', 'degraded', 'offline');
create type server_status as enum ('active', 'idle', 'offline', 'provisioning');

-- 3. Users Table (Standalone for simplified college auth)
create table public.users (
  id uuid default uuid_generate_v4() primary key,
  email text unique not null,
  password text not null, -- Stored plain/simple for demonstration purposes
  role user_role not null default 'client',
  company_name text,
  full_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Data Centers Table
create table public.data_centers (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  location text not null,
  region text not null,
  lat numeric not null,
  lng numeric not null,
  status data_center_status not null default 'operational',
  total_capacity integer not null default 100,
  current_load numeric not null default 0.0,
  health_score integer not null default 100,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Racks Table
create table public.racks (
  id uuid default uuid_generate_v4() primary key,
  data_center_id uuid references public.data_centers on delete cascade not null,
  name text not null,
  total_units integer not null default 42,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Servers Table
create table public.servers (
  id uuid default uuid_generate_v4() primary key,
  rack_id uuid references public.racks on delete cascade not null,
  client_id uuid references public.users on delete set null,
  name text not null,
  status server_status not null default 'active',
  unit_position integer not null,
  unit_size integer not null default 1,
  cpu_utilization numeric not null default 0.0,
  memory_utilization numeric not null default 0.0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. AI Logs Table
create table public.ai_logs (
  id uuid default uuid_generate_v4() primary key,
  system_type text not null,
  decision text not null,
  explanation text not null,
  confidence numeric not null,
  action_taken boolean not null default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 8. Policies Table
create table public.policies (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  rule_type text not null,
  configuration jsonb not null,
  is_active boolean not null default true,
  created_by uuid references public.users on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 9. Client Region Policies
create table public.client_region_policies (
  id uuid default uuid_generate_v4() primary key,
  client_id uuid references public.users on delete cascade not null,
  region text not null,
  access_action text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 10. Enable Row Level Security (Simplified for custom auth)
-- Since auth is custom and not tied to auth.uid(), we will handle authorization in our Next.js API routes or use basic RLS if passing a custom role.
-- For a college project with custom auth, it's often easier to disable RLS and enforce security in the application layer (API routes), or write policies based on a passed JWT.
-- We will leave RLS disabled for simplicity, relying on our Next.js API to enforce access.

-- ==========================================
-- SEED DATA
-- ==========================================

-- Seed Users
INSERT INTO public.users (id, email, password, role, company_name, full_name) VALUES
  ('a1b2c3d4-0000-0000-0000-000000000001', 'admin1@vayu.com', 'admin123', 'admin', 'Vayu Global', 'System Admin Alpha'),
  ('a1b2c3d4-0000-0000-0000-000000000002', 'admin2@vayu.com', 'admin123', 'admin', 'Vayu Global', 'System Admin Beta'),
  ('a1b2c3d4-0000-0000-0000-000000000003', 'client1@stark.com', 'client123', 'client', 'Stark Industries', 'Tony Stark'),
  ('a1b2c3d4-0000-0000-0000-000000000004', 'client2@wayne.com', 'client123', 'client', 'Wayne Enterprises', 'Bruce Wayne'),
  ('a1b2c3d4-0000-0000-0000-000000000005', 'provider1@aws.mock', 'provider123', 'provider', 'Mock AWS', 'AWS Liaison'),
  ('a1b2c3d4-0000-0000-0000-000000000006', 'provider2@azure.mock', 'provider123', 'provider', 'Mock Azure', 'Azure Liaison');

-- Seed Data Centers
INSERT INTO public.data_centers (id, name, location, region, lat, lng, status, total_capacity) VALUES
  ('dcc00000-0000-0000-0000-000000000001', 'US East (N. Virginia)', 'Ashburn, VA', 'us-east-1', 39.0438, -77.4874, 'operational', 500),
  ('dcc00000-0000-0000-0000-000000000002', 'US West (N. California)', 'San Jose, CA', 'us-west-1', 37.3382, -121.8863, 'operational', 300),
  ('dcc00000-0000-0000-0000-000000000003', 'Europe (Frankfurt)', 'Frankfurt, Germany', 'eu-central-1', 50.1109, 8.6821, 'operational', 450),
  ('dcc00000-0000-0000-0000-000000000004', 'Asia Pacific (Tokyo)', 'Tokyo, Japan', 'ap-northeast-1', 35.6895, 139.6917, 'operational', 600);

-- Seed Racks
INSERT INTO public.racks (id, data_center_id, name) VALUES
  ('1ac00000-0000-0000-0000-000000000001', 'dcc00000-0000-0000-0000-000000000001', 'US-E1-A01'),
  ('1ac00000-0000-0000-0000-000000000002', 'dcc00000-0000-0000-0000-000000000001', 'US-E1-A02'),
  ('1ac00000-0000-0000-0000-000000000003', 'dcc00000-0000-0000-0000-000000000002', 'US-W1-B01'),
  ('1ac00000-0000-0000-0000-000000000004', 'dcc00000-0000-0000-0000-000000000004', 'AP-T1-C01');

-- Seed Servers (Assigning to clients)
INSERT INTO public.servers (id, rack_id, client_id, name, status, unit_position) VALUES
  ('5e400000-0000-0000-0000-000000000001', '1ac00000-0000-0000-0000-000000000001', 'a1b2c3d4-0000-0000-0000-000000000003', 'Stark-Prod-Web-1', 'active', 1),
  ('5e400000-0000-0000-0000-000000000002', '1ac00000-0000-0000-0000-000000000001', 'a1b2c3d4-0000-0000-0000-000000000003', 'Stark-Prod-DB-1', 'active', 2),
  ('5e400000-0000-0000-0000-000000000003', '1ac00000-0000-0000-0000-000000000003', 'a1b2c3d4-0000-0000-0000-000000000004', 'Wayne-Analytics-Node', 'active', 1),
  ('5e400000-0000-0000-0000-000000000004', '1ac00000-0000-0000-0000-000000000004', NULL, 'Available-Node-JP-1', 'idle', 1);
