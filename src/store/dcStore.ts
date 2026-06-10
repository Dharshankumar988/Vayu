import { create } from 'zustand';
import type { DcRegion } from './index';

export type SlotStatus = 'available' | 'occupied' | 'reserved' | 'maintenance';
export type ServerHealth = 'healthy' | 'unhealthy' | 'critical';
export type DcStatus = 'healthy' | 'warning' | 'critical' | 'offline';

export interface ServerSlot {
  id: string;
  rack_id: string;
  position: 1 | 2 | 3 | 4;
  status: SlotStatus;
  client_id: string | null;
  client_name: string | null;
  server_name: string | null;
  health: ServerHealth;
  cpu_util: number;
  mem_util: number;
}

export interface Rack {
  id: string;
  name: string;
  room_id: string;
  display_order: number;
  slots: ServerSlot[];
}

export interface Room {
  id: string;
  name: string;
  dc_id: string;
  display_order: number;
  racks: Rack[];
}

export interface DataCenterFull {
  id: string;
  name: string;
  location: string;
  region: DcRegion;
  lat: number;
  lng: number;
  status: DcStatus;
  load: number;
  health_score: number;
  total_capacity: number;
  is_isolated: boolean;
  linked_dc_ids: string[];
  price_per_slot_month: number;
  rooms: Room[];
}

interface DCState {
  dataCenters: DataCenterFull[];
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;

  // Data loading
  loadFromServer: () => Promise<void>;
  setDataCenters: (dcs: DataCenterFull[]) => void;

  // DC mutations
  updateDCStatus: (dcId: string, status: DcStatus, load: number) => void;
  addDataCenter: (dc: Omit<DataCenterFull, 'rooms' | 'linked_dc_ids'> & { rooms?: Room[]; linked_dc_ids?: string[] }) => Promise<DataCenterFull | null>;
  deleteDataCenter: (dcId: string) => Promise<boolean>;
  updateSlotStatus: (slotId: string, status: SlotStatus, clientId?: string | null, clientName?: string | null, serverName?: string | null) => void;

  // Room management
  addRoom: (dcId: string, name: string) => Promise<Room | null>;
  removeRoom: (dcId: string, roomId: string) => Promise<boolean>;
  renameRoom: (roomId: string, newName: string) => Promise<boolean>;
  reorderRooms: (dcId: string, roomIds: string[]) => Promise<boolean>;

  // Rack management
  addRack: (roomId: string, name: string) => Promise<Rack | null>;
  removeRack: (roomId: string, rackId: string) => Promise<boolean>;

  // DC links & isolation
  linkDataCenters: (dcAId: string, dcBId: string) => void;
  unlinkDataCenters: (dcAId: string, dcBId: string) => void;
  setIsolated: (dcId: string, isolated: boolean) => void;
}

// Helper to call API routes
async function apiCall(endpoint: string, body: Record<string, unknown>) {
  const res = await fetch(`/api/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `API error: ${res.status}`);
  return data;
}

// Transform Supabase response to our nested DataCenterFull shape
function transformDCResponse(raw: Record<string, unknown>): DataCenterFull {
  const dc = raw as Record<string, unknown>;
  return {
    id: dc.id as string,
    name: dc.name as string,
    location: dc.location as string,
    region: dc.region as DcRegion,
    lat: Number(dc.lat),
    lng: Number(dc.lng),
    status: (dc.status as DcStatus) || 'healthy',
    load: Number(dc.current_load ?? dc.load ?? 0),
    health_score: Number(dc.health_score ?? 100),
    total_capacity: Number(dc.total_capacity ?? 100),
    is_isolated: Boolean(dc.is_isolated),
    linked_dc_ids: (dc.linked_dc_ids as string[]) || [],
    price_per_slot_month: Number(dc.price_per_slot_month ?? 120),
    rooms: ((dc.rooms as Record<string, unknown>[]) || []).map((r) => ({
      id: r.id as string,
      name: r.name as string,
      dc_id: r.data_center_id as string || dc.id as string,
      display_order: Number(r.display_order ?? 0),
      racks: ((r.racks as Record<string, unknown>[]) || []).map((rk) => ({
        id: rk.id as string,
        name: rk.name as string,
        room_id: rk.room_id as string || r.id as string,
        display_order: Number(rk.display_order ?? 0),
        slots: ((rk.slots as Record<string, unknown>[]) || []).map((s) => ({
          id: s.id as string,
          rack_id: s.rack_id as string || rk.id as string,
          position: Number(s.position) as 1 | 2 | 3 | 4,
          status: (s.status as SlotStatus) || 'available',
          client_id: (s.client_id as string) || null,
          client_name: (s.client_name as string) || null,
          server_name: (s.server_name as string) || null,
          health: (s.health as ServerHealth) || 'healthy',
          cpu_util: Number(s.cpu_util ?? 0),
          mem_util: Number(s.mem_util ?? 0),
        })),
      })),
    })),
  };
}

export const useDCStore = create<DCState>()((set, get) => ({
  dataCenters: [],
  isLoaded: false,
  isLoading: false,
  error: null,

  // ── Load all data from Supabase ──────────────────────────
  loadFromServer: async () => {
    if (get().isLoading) return;
    set({ isLoading: true, error: null });
    try {
      const data = await apiCall('datacenters', { action: 'list' });
      const dcs = (data.data || data).map(transformDCResponse);
      set({ dataCenters: dcs, isLoaded: true, isLoading: false });
    } catch (err: unknown) {
      console.error('Failed to load data centers:', err);
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  setDataCenters: (dcs) => set({ dataCenters: dcs }),

  // ── DC status update (local-only for simulation real-time) ──
  updateDCStatus: (dcId, status, load) =>
    set((state) => ({
      dataCenters: state.dataCenters.map((dc) =>
        dc.id === dcId
          ? {
              ...dc,
              status,
              load,
              health_score: status === 'offline' ? 0 : status === 'critical' ? 20 : status === 'warning' ? 60 : 90,
            }
          : dc
      ),
    })),

  // ── Add data center → persists to Supabase ──
  addDataCenter: async (dcInput) => {
    try {
      const data = await apiCall('datacenters', {
        action: 'create',
        name: dcInput.name,
        location: dcInput.location,
        region: dcInput.region,
        lat: dcInput.lat,
        lng: dcInput.lng,
        total_capacity: dcInput.total_capacity,
        price_per_slot_month: dcInput.price_per_slot_month ?? 120,
        numRooms: dcInput.rooms?.length || 1,
        racksPerRoom: dcInput.rooms?.[0]?.racks?.length || 4,
      });
      // Reload from server to get full nested structure
      await get().loadFromServer();
      return data.data ? transformDCResponse(data.data) : null;
    } catch (err) {
      console.error('Failed to create data center:', err);
      return null;
    }
  },

  // ── Delete data center → persists to Supabase ──
  deleteDataCenter: async (dcId) => {
    try {
      await apiCall('datacenters', { action: 'delete', id: dcId });
      set((state) => ({
        dataCenters: state.dataCenters.filter((dc) => dc.id !== dcId),
      }));
      return true;
    } catch (err) {
      console.error('Failed to delete data center:', err);
      return false;
    }
  },

  // ── Update slot status (local state + sync to Supabase) ──
  updateSlotStatus: (slotId, status, clientId, clientName, serverName) => {
    // Immediate local update
    set((state) => ({
      dataCenters: state.dataCenters.map((dc) => ({
        ...dc,
        rooms: dc.rooms.map((room) => ({
          ...room,
          racks: room.racks.map((rack) => ({
            ...rack,
            slots: rack.slots.map((slot) =>
              slot.id === slotId
                ? {
                    ...slot,
                    status,
                    client_id: clientId ?? null,
                    client_name: clientName ?? null,
                    server_name: serverName ?? null,
                  }
                : slot
            ),
          })),
        })),
      })),
    }));

    // Async sync to Supabase (fire-and-forget)
    const action = status === 'occupied' ? 'occupy'
      : status === 'available' ? 'release'
      : status === 'reserved' ? 'reserve'
      : 'maintenance';

    apiCall('slots', {
      action,
      slot_id: slotId,
      client_id: clientId,
      server_name: serverName,
    }).catch((err) => console.error('Slot sync failed:', err));
  },

  // ── Room management → all persisted to Supabase ──
  addRoom: async (dcId, name) => {
    try {
      const data = await apiCall('rooms', { action: 'create', data_center_id: dcId, name });
      const newRoom: Room = {
        id: data.data?.id || data.id,
        name,
        dc_id: dcId,
        display_order: data.data?.display_order ?? 0,
        racks: [],
      };
      set((state) => ({
        dataCenters: state.dataCenters.map((dc) =>
          dc.id === dcId ? { ...dc, rooms: [...dc.rooms, newRoom] } : dc
        ),
      }));
      return newRoom;
    } catch (err) {
      console.error('Failed to add room:', err);
      return null;
    }
  },

  removeRoom: async (dcId, roomId) => {
    try {
      await apiCall('rooms', { action: 'delete', id: roomId });
      set((state) => ({
        dataCenters: state.dataCenters.map((dc) =>
          dc.id === dcId ? { ...dc, rooms: dc.rooms.filter((r) => r.id !== roomId) } : dc
        ),
      }));
      return true;
    } catch (err) {
      console.error('Failed to remove room:', err);
      return false;
    }
  },

  renameRoom: async (roomId, newName) => {
    try {
      await apiCall('rooms', { action: 'update', id: roomId, name: newName });
      set((state) => ({
        dataCenters: state.dataCenters.map((dc) => ({
          ...dc,
          rooms: dc.rooms.map((r) => (r.id === roomId ? { ...r, name: newName } : r)),
        })),
      }));
      return true;
    } catch (err) {
      console.error('Failed to rename room:', err);
      return false;
    }
  },

  reorderRooms: async (dcId, roomIds) => {
    try {
      await apiCall('rooms', { action: 'reorder', data_center_id: dcId, room_ids: roomIds });
      set((state) => ({
        dataCenters: state.dataCenters.map((dc) => {
          if (dc.id !== dcId) return dc;
          const ordered = roomIds.map((id, i) => {
            const room = dc.rooms.find((r) => r.id === id);
            return room ? { ...room, display_order: i } : null;
          }).filter(Boolean) as Room[];
          return { ...dc, rooms: ordered };
        }),
      }));
      return true;
    } catch (err) {
      console.error('Failed to reorder rooms:', err);
      return false;
    }
  },

  // ── Rack management → all persisted to Supabase ──
  addRack: async (roomId, name) => {
    try {
      const data = await apiCall('racks', { action: 'create', room_id: roomId, name });
      // Reload to get full rack with auto-created slots
      await get().loadFromServer();
      return data.data || null;
    } catch (err) {
      console.error('Failed to add rack:', err);
      return null;
    }
  },

  removeRack: async (roomId, rackId) => {
    try {
      await apiCall('racks', { action: 'delete', id: rackId });
      set((state) => ({
        dataCenters: state.dataCenters.map((dc) => ({
          ...dc,
          rooms: dc.rooms.map((room) =>
            room.id === roomId
              ? { ...room, racks: room.racks.filter((r) => r.id !== rackId) }
              : room
          ),
        })),
      }));
      return true;
    } catch (err) {
      console.error('Failed to remove rack:', err);
      return false;
    }
  },

  // ── DC links & isolation (local + fire-and-forget sync) ──
  linkDataCenters: (dcAId, dcBId) => {
    set((state) => ({
      dataCenters: state.dataCenters.map((dc) => {
        if (dc.id === dcAId && !dc.linked_dc_ids.includes(dcBId))
          return { ...dc, linked_dc_ids: [...dc.linked_dc_ids, dcBId] };
        if (dc.id === dcBId && !dc.linked_dc_ids.includes(dcAId))
          return { ...dc, linked_dc_ids: [...dc.linked_dc_ids, dcAId] };
        return dc;
      }),
    }));
  },

  unlinkDataCenters: (dcAId, dcBId) => {
    set((state) => ({
      dataCenters: state.dataCenters.map((dc) => {
        if (dc.id === dcAId)
          return { ...dc, linked_dc_ids: dc.linked_dc_ids.filter((id) => id !== dcBId) };
        if (dc.id === dcBId)
          return { ...dc, linked_dc_ids: dc.linked_dc_ids.filter((id) => id !== dcAId) };
        return dc;
      }),
    }));
  },

  setIsolated: (dcId, isolated) => {
    set((state) => ({
      dataCenters: state.dataCenters.map((dc) =>
        dc.id === dcId ? { ...dc, is_isolated: isolated } : dc
      ),
    }));
    // Sync to Supabase
    apiCall('datacenters', { action: 'update', id: dcId, is_isolated: isolated })
      .catch((err) => console.error('Isolation sync failed:', err));
  },
}));
