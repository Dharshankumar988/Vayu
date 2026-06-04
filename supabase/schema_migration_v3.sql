-- Rooms: add display_order, floor_area_sqm
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS floor_area_sqm NUMERIC;

-- Racks: add display_order
ALTER TABLE public.racks ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Data centers: add pricing
ALTER TABLE public.data_centers ADD COLUMN IF NOT EXISTS price_per_slot_month NUMERIC NOT NULL DEFAULT 120.00;
ALTER TABLE public.data_centers ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'USD';

-- Room/rack optional pricing overrides
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS price_override_per_slot NUMERIC;
ALTER TABLE public.racks ADD COLUMN IF NOT EXISTS price_override_per_slot NUMERIC;

-- Billing enhancements
ALTER TABLE public.billing_records ADD COLUMN IF NOT EXISTS data_center_id UUID REFERENCES public.data_centers(id);
ALTER TABLE public.billing_records ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES public.rooms(id);
ALTER TABLE public.billing_records ADD COLUMN IF NOT EXISTS rack_id UUID REFERENCES public.racks(id);
ALTER TABLE public.billing_records ADD COLUMN IF NOT EXISTS price_per_slot NUMERIC NOT NULL DEFAULT 120.00;
ALTER TABLE public.billing_records ADD COLUMN IF NOT EXISTS discount_pct NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE public.billing_records ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE public.billing_records ADD COLUMN IF NOT EXISTS end_date DATE;

-- Slot reservation tracking
ALTER TABLE public.server_slots ADD COLUMN IF NOT EXISTS reserved_at TIMESTAMPTZ;
ALTER TABLE public.server_slots ADD COLUMN IF NOT EXISTS reserved_by UUID REFERENCES public.users(id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rooms_order ON public.rooms(data_center_id, display_order);
CREATE INDEX IF NOT EXISTS idx_racks_order ON public.racks(room_id, display_order);

-- Backfill display_order for existing rooms
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY data_center_id ORDER BY created_at) - 1 AS rn
  FROM public.rooms
)
UPDATE public.rooms SET display_order = numbered.rn FROM numbered WHERE rooms.id = numbered.id;

-- Backfill display_order for existing racks
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY room_id ORDER BY created_at) - 1 AS rn
  FROM public.racks
)
UPDATE public.racks SET display_order = numbered.rn FROM numbered WHERE racks.id = numbered.id;
