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
  slots: ServerSlot[];
}

export interface Room {
  id: string;
  name: string;
  dc_id: string;
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
  rooms: Room[];
}

interface DCState {
  dataCenters: DataCenterFull[];
  setDataCenters: (dcs: DataCenterFull[]) => void;
  updateDCStatus: (dcId: string, status: DcStatus, load: number) => void;
  addDataCenter: (dc: DataCenterFull) => void;
  updateSlotStatus: (slotId: string, status: SlotStatus, clientId?: string, clientName?: string, serverName?: string) => void;
  addRoom: (dcId: string, room: Room) => void;
  removeRoom: (dcId: string, roomId: string) => void;
  addRack: (roomId: string, rack: Rack) => void;
  removeRack: (roomId: string, rackId: string) => void;
  linkDataCenters: (dcAId: string, dcBId: string) => void;
  unlinkDataCenters: (dcAId: string, dcBId: string) => void;
  setIsolated: (dcId: string, isolated: boolean) => void;
}

// Default slot factory
function makeSlots(rackId: string, existingSlots?: Partial<ServerSlot>[]): ServerSlot[] {
  return [1, 2, 3, 4].map((pos) => {
    const existing = existingSlots?.find((s) => s.position === pos);
    return {
      id: `slot-${rackId}-${pos}`,
      rack_id: rackId,
      position: pos as 1 | 2 | 3 | 4,
      status: existing?.status ?? 'available',
      client_id: existing?.client_id ?? null,
      client_name: existing?.client_name ?? null,
      server_name: existing?.server_name ?? null,
      health: existing?.health ?? 'healthy',
      cpu_util: existing?.cpu_util ?? 0,
      mem_util: existing?.mem_util ?? 0,
    };
  });
}

// Build default rooms/racks/slots for a DC
function makeDefaultRooms(dcId: string, dcName: string, preSlots?: { rackId: string; slots: Partial<ServerSlot>[] }[]): Room[] {
  return ['A', 'B'].map((roomLetter) => {
    const roomId = `room-${dcId}-${roomLetter}`;
    const racks: Rack[] = Array.from({ length: 6 }, (_, i) => {
      const rackId = `rack-${roomId}-${i + 1}`;
      const pre = preSlots?.find((p) => p.rackId === rackId);
      return {
        id: rackId,
        name: `${dcName}-${roomLetter}${i + 1}`,
        room_id: roomId,
        slots: makeSlots(rackId, pre?.slots),
      };
    });
    return {
      id: roomId,
      name: `Room ${roomLetter}`,
      dc_id: dcId,
      racks,
    };
  });
}

const DC1_ID = 'dc-001';
const DC2_ID = 'dc-002';
const DC3_ID = 'dc-003';
const DC4_ID = 'dc-004';
const DC5_ID = 'dc-005';
const DC6_ID = 'dc-006';
const DC7_ID = 'dc-007';
const DC8_ID = 'dc-008';
const DC9_ID = 'dc-009';
const DC10_ID = 'dc-010';

const INITIAL_DCS: DataCenterFull[] = [
  {
    id: DC1_ID, name: 'Vayu NA-East', location: 'Ashburn, VA, USA',
    region: 'north_america', lat: 39.0438, lng: -77.4874,
    status: 'healthy', load: 0.65, health_score: 87, total_capacity: 500,
    is_isolated: false, linked_dc_ids: [DC2_ID],
    rooms: makeDefaultRooms(DC1_ID, 'NA-E', [
      { rackId: `rack-room-${DC1_ID}-A-1`, slots: [
        { position: 1, status: 'occupied', client_id: 'c1', client_name: 'Stark Industries', server_name: 'Stark-Prod-Web-1', health: 'healthy', cpu_util: 0.72, mem_util: 0.65 },
        { position: 2, status: 'occupied', client_id: 'c1', client_name: 'Stark Industries', server_name: 'Stark-DB-1',      health: 'healthy', cpu_util: 0.45, mem_util: 0.80 },
        { position: 3, status: 'occupied', client_id: 'c2', client_name: 'Wayne Enterprises', server_name: 'Wayne-App-1',    health: 'healthy', cpu_util: 0.60, mem_util: 0.55 },
      ]},
    ]),
  },
  {
    id: DC2_ID, name: 'Vayu NA-West', location: 'San Jose, CA, USA',
    region: 'north_america', lat: 37.3382, lng: -121.8863,
    status: 'healthy', load: 0.45, health_score: 95, total_capacity: 300,
    is_isolated: false, linked_dc_ids: [DC1_ID],
    rooms: makeDefaultRooms(DC2_ID, 'NA-W'),
  },
  {
    id: DC3_ID, name: 'Vayu SA-1', location: 'São Paulo, Brazil',
    region: 'south_america', lat: -23.5505, lng: -46.6333,
    status: 'healthy', load: 0.30, health_score: 92, total_capacity: 200,
    is_isolated: false, linked_dc_ids: [],
    rooms: makeDefaultRooms(DC3_ID, 'SA-1'),
  },
  {
    id: DC4_ID, name: 'Vayu EU-Central', location: 'Frankfurt, Germany',
    region: 'europe', lat: 50.1109, lng: 8.6821,
    status: 'warning', load: 0.82, health_score: 68, total_capacity: 450,
    is_isolated: false, linked_dc_ids: [DC5_ID],
    rooms: makeDefaultRooms(DC4_ID, 'EU-C'),
  },
  {
    id: DC5_ID, name: 'Vayu EU-West', location: 'Dublin, Ireland',
    region: 'europe', lat: 53.3498, lng: -6.2603,
    status: 'healthy', load: 0.55, health_score: 90, total_capacity: 350,
    is_isolated: false, linked_dc_ids: [DC4_ID],
    rooms: makeDefaultRooms(DC5_ID, 'EU-W'),
  },
  {
    id: DC6_ID, name: 'Vayu AP-Tokyo', location: 'Tokyo, Japan',
    region: 'asia', lat: 35.6895, lng: 139.6917,
    status: 'healthy', load: 0.70, health_score: 85, total_capacity: 600,
    is_isolated: false, linked_dc_ids: [DC10_ID],
    rooms: makeDefaultRooms(DC6_ID, 'AP-T'),
  },
  {
    id: DC7_ID, name: 'Vayu AP-Mumbai', location: 'Mumbai, India',
    region: 'asia', lat: 19.0760, lng: 72.8777,
    status: 'healthy', load: 0.50, health_score: 88, total_capacity: 400,
    is_isolated: false, linked_dc_ids: [],
    rooms: makeDefaultRooms(DC7_ID, 'AP-M'),
  },
  {
    id: DC8_ID, name: 'Vayu AF-1', location: 'Cape Town, South Africa',
    region: 'africa', lat: -33.9249, lng: 18.4241,
    status: 'warning', load: 0.75, health_score: 72, total_capacity: 150,
    is_isolated: false, linked_dc_ids: [],
    rooms: makeDefaultRooms(DC8_ID, 'AF-1'),
  },
  {
    id: DC9_ID, name: 'Vayu OC-1', location: 'Sydney, Australia',
    region: 'oceania', lat: -33.8688, lng: 151.2093,
    status: 'healthy', load: 0.40, health_score: 93, total_capacity: 200,
    is_isolated: false, linked_dc_ids: [],
    rooms: makeDefaultRooms(DC9_ID, 'OC-1'),
  },
  {
    id: DC10_ID, name: 'Vayu AP-Singapore', location: 'Singapore',
    region: 'asia', lat: 1.3521, lng: 103.8198,
    status: 'healthy', load: 0.60, health_score: 89, total_capacity: 350,
    is_isolated: false, linked_dc_ids: [DC6_ID],
    rooms: makeDefaultRooms(DC10_ID, 'AP-S'),
  },
];

export const useDCStore = create<DCState>((set) => ({
  dataCenters: INITIAL_DCS,

  setDataCenters: (dcs) => set({ dataCenters: dcs }),

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

  addDataCenter: (dc) =>
    set((state) => ({ dataCenters: [...state.dataCenters, dc] })),

  updateSlotStatus: (slotId, status, clientId, clientName, serverName) =>
    set((state) => ({
      dataCenters: state.dataCenters.map((dc) => ({
        ...dc,
        rooms: dc.rooms.map((room) => ({
          ...room,
          racks: room.racks.map((rack) => ({
            ...rack,
            slots: rack.slots.map((slot) =>
              slot.id === slotId
                ? { ...slot, status, client_id: clientId ?? null, client_name: clientName ?? null, server_name: serverName ?? null }
                : slot
            ),
          })),
        })),
      })),
    })),

  addRoom: (dcId, room) =>
    set((state) => ({
      dataCenters: state.dataCenters.map((dc) =>
        dc.id === dcId ? { ...dc, rooms: [...dc.rooms, room] } : dc
      ),
    })),

  removeRoom: (dcId, roomId) =>
    set((state) => ({
      dataCenters: state.dataCenters.map((dc) =>
        dc.id === dcId ? { ...dc, rooms: dc.rooms.filter((r) => r.id !== roomId) } : dc
      ),
    })),

  addRack: (roomId, rack) =>
    set((state) => ({
      dataCenters: state.dataCenters.map((dc) => ({
        ...dc,
        rooms: dc.rooms.map((room) =>
          room.id === roomId ? { ...room, racks: [...room.racks, rack] } : room
        ),
      })),
    })),

  removeRack: (roomId, rackId) =>
    set((state) => ({
      dataCenters: state.dataCenters.map((dc) => ({
        ...dc,
        rooms: dc.rooms.map((room) =>
          room.id === roomId
            ? { ...room, racks: room.racks.filter((r) => r.id !== rackId) }
            : room
        ),
      })),
    })),

  linkDataCenters: (dcAId, dcBId) =>
    set((state) => ({
      dataCenters: state.dataCenters.map((dc) => {
        if (dc.id === dcAId && !dc.linked_dc_ids.includes(dcBId))
          return { ...dc, linked_dc_ids: [...dc.linked_dc_ids, dcBId] };
        if (dc.id === dcBId && !dc.linked_dc_ids.includes(dcAId))
          return { ...dc, linked_dc_ids: [...dc.linked_dc_ids, dcAId] };
        return dc;
      }),
    })),

  unlinkDataCenters: (dcAId, dcBId) =>
    set((state) => ({
      dataCenters: state.dataCenters.map((dc) => {
        if (dc.id === dcAId)
          return { ...dc, linked_dc_ids: dc.linked_dc_ids.filter((id) => id !== dcBId) };
        if (dc.id === dcBId)
          return { ...dc, linked_dc_ids: dc.linked_dc_ids.filter((id) => id !== dcAId) };
        return dc;
      }),
    })),

  setIsolated: (dcId, isolated) =>
    set((state) => ({
      dataCenters: state.dataCenters.map((dc) =>
        dc.id === dcId ? { ...dc, is_isolated: isolated } : dc
      ),
    })),
}));
