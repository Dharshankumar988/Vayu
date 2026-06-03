import { create } from 'zustand';
import type { DcRegion } from './index';

export interface RegionalData {
  id: string;
  name: string;
  lat: number;
  lng: number;
  users: number;
  load: number;
  threatLevel: number;
  trafficAnomaly: boolean;
}

export type SimEventType = 'ddos' | 'physical_damage' | 'load_increase';
export type SimSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface SimulationEvent {
  id: string;
  type: SimEventType;
  target_dc_id: string;
  target_region?: DcRegion;
  severity: SimSeverity;
  damage_type?: string;
  load_multiplier?: number;
  active: boolean;
  started_at: Date;
}

export interface ActiveArcData {
  id: string;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  arcType: 'normal' | 'ai' | 'threat' | 'alloc' | 'backup';
  color: string;
}

export interface SimulationState {
  regions: Record<string, RegionalData>;
  globalTrafficRate: number;
  simulationEvents: SimulationEvent[];
  activeArcs: ActiveArcData[];
  aiTechniques: {
    traffic: string;
    threat: string;
    cost: string;
    allocation: string;
  };
  aiDecisions: {
    id: string;
    category: string;
    technique: string;
    decision: string;
    explanation: string;
    confidence: number;
    timestamp: Date;
  }[];

  // Actions
  setRegionUsers: (regionId: string, users: number) => void;
  setTrafficAnomaly: (regionId: string, anomaly: boolean) => void;
  updateSimulation: (deltaTime: number) => void;
  mitigateThreat: (regionId: string) => void;
  optimizeTraffic: () => void;
  consolidateResources: () => void;

  // Simulation triggers
  triggerDDoS: (dcId: string, dcLat: number, dcLng: number, severity: SimSeverity) => void;
  triggerPhysicalDamage: (dcId: string, dcLat: number, dcLng: number, damageType: string) => void;
  triggerLoadIncrease: (regionId: string, multiplier: number) => void;
  resolveSimulation: (eventId: string) => void;

  // AI technique updates
  setAITechnique: (category: 'traffic' | 'threat' | 'cost' | 'allocation', technique: string) => void;
  addAIDecision: (d: Omit<SimulationState['aiDecisions'][0], 'id' | 'timestamp'>) => void;
  setActiveArcs: (arcs: ActiveArcData[]) => void;
}

const ARC_COLORS = {
  normal: '#00ff66',
  ai: '#00f3ff',
  threat: '#ff0033',
  alloc: '#b52aff',
  backup: '#00ffff',
};

export const useSimulationStore = create<SimulationState>((set, get) => ({
  regions: {
    'north_america': { id: 'north_america', name: 'North America', lat: 39.0, lng: -98.0, users: 1500000, load: 0.65, threatLevel: 0.1, trafficAnomaly: false },
    'south_america': { id: 'south_america', name: 'South America', lat: -15.0, lng: -60.0, users: 500000,  load: 0.30, threatLevel: 0.05, trafficAnomaly: false },
    'europe':         { id: 'europe',         name: 'Europe',        lat: 50.0, lng: 10.0,   users: 1200000, load: 0.55, threatLevel: 0.1, trafficAnomaly: false },
    'asia':           { id: 'asia',           name: 'Asia',          lat: 30.0, lng: 105.0,  users: 2000000, load: 0.70, threatLevel: 0.15, trafficAnomaly: false },
    'africa':         { id: 'africa',         name: 'Africa',        lat: 0.0,  lng: 20.0,   users: 300000,  load: 0.45, threatLevel: 0.08, trafficAnomaly: false },
    'oceania':        { id: 'oceania',        name: 'Oceania',       lat: -25.0, lng: 134.0, users: 200000,  load: 0.35, threatLevel: 0.03, trafficAnomaly: false },
  },
  globalTrafficRate: 10000,
  simulationEvents: [],
  activeArcs: [],
  aiTechniques: {
    traffic:    'DNS Weighted Routing',
    threat:     'WAF + DPI',
    cost:       'Idle Consolidation',
    allocation: 'Hot-Cold Aisle',
  },
  aiDecisions: [],

  setRegionUsers: (regionId, users) =>
    set((state) => ({
      regions: { ...state.regions, [regionId]: { ...state.regions[regionId], users } },
    })),

  setTrafficAnomaly: (regionId, anomaly) =>
    set((state) => ({
      regions: {
        ...state.regions,
        [regionId]: {
          ...state.regions[regionId],
          trafficAnomaly: anomaly,
          threatLevel: anomaly ? 0.9 : 0.1,
          load: anomaly ? 0.99 : state.regions[regionId].load,
        },
      },
    })),

  updateSimulation: (_deltaTime) =>
    set((state) => {
      const updatedRegions = { ...state.regions };
      let totalLoad = 0;

      Object.keys(updatedRegions).forEach((key) => {
        const r = updatedRegions[key];
        const targetLoad = Math.min(0.95, r.users / 3000000);
        const drift = (Math.random() - 0.5) * 0.04;
        let newLoad = r.trafficAnomaly
          ? 0.93 + Math.random() * 0.07
          : r.load + drift + (targetLoad - r.load) * 0.08;
        newLoad = Math.max(0.05, Math.min(1.0, newLoad));
        updatedRegions[key] = { ...r, load: newLoad };
        totalLoad += newLoad;
      });

      return {
        regions: updatedRegions,
        globalTrafficRate: 5000 + totalLoad * 6000,
      };
    }),

  mitigateThreat: (regionId) =>
    set((state) => ({
      regions: {
        ...state.regions,
        [regionId]: { ...state.regions[regionId], trafficAnomaly: false, threatLevel: 0.1, load: 0.5 },
      },
    })),

  optimizeTraffic: () =>
    set((state) => {
      const updatedRegions = { ...state.regions };
      Object.keys(updatedRegions).forEach((key) => {
        updatedRegions[key] = { ...updatedRegions[key], load: 0.45 + Math.random() * 0.15 };
      });
      return { regions: updatedRegions };
    }),

  consolidateResources: () =>
    set((state) => {
      const updatedRegions = { ...state.regions };
      Object.keys(updatedRegions).forEach((key) => {
        if (updatedRegions[key].load < 0.3) updatedRegions[key].load = 0.55;
      });
      return { regions: updatedRegions };
    }),

  triggerDDoS: (dcId, dcLat, dcLng, severity) => {
    const eventId = crypto.randomUUID();
    const intensityMap = { low: 0.5, medium: 0.75, high: 0.9, critical: 1.0 };
    const intensity = intensityMap[severity];

    // Generate threat arcs converging on the target DC
    const sourcePoints = [
      { lat: 51.5, lng: -0.1 }, { lat: 35.7, lng: 139.7 },
      { lat: -33.9, lng: 151.2 }, { lat: 40.7, lng: -74.0 },
      { lat: 48.8, lng: 2.3 }, { lat: 1.3, lng: 103.8 },
    ];
    const arcs: ActiveArcData[] = sourcePoints.map((src, i) => ({
      id: `arc-threat-${eventId}-${i}`,
      startLat: src.lat, startLng: src.lng,
      endLat: dcLat, endLng: dcLng,
      arcType: 'threat',
      color: ARC_COLORS.threat,
    }));

    set((state) => ({
      simulationEvents: [
        ...state.simulationEvents,
        { id: eventId, type: 'ddos', target_dc_id: dcId, severity, active: true, started_at: new Date() },
      ],
      activeArcs: [...state.activeArcs.filter((a) => a.arcType !== 'threat'), ...arcs],
    }));

    // Increase load in that region based on severity
    const dcStore = get();
    Object.keys(dcStore.regions).forEach((key) => {
      const r = dcStore.regions[key];
      if (Math.abs(r.lat - dcLat) < 20 && Math.abs(r.lng - dcLng) < 30) {
        set((state) => ({
          regions: {
            ...state.regions,
            [key]: { ...state.regions[key], trafficAnomaly: true, threatLevel: intensity, load: intensity },
          },
        }));
      }
    });
  },

  triggerPhysicalDamage: (dcId, dcLat, dcLng, damageType) => {
    const eventId = crypto.randomUUID();
    // Generate backup arcs FROM other DCs TO compensate
    const backupArcs: ActiveArcData[] = [
      { id: `arc-backup-${eventId}-1`, startLat: dcLat + 10, startLng: dcLng + 20, endLat: dcLat, endLng: dcLng, arcType: 'backup', color: ARC_COLORS.backup },
      { id: `arc-backup-${eventId}-2`, startLat: dcLat - 15, startLng: dcLng - 30, endLat: dcLat, endLng: dcLng, arcType: 'backup', color: ARC_COLORS.backup },
    ];
    set((state) => ({
      simulationEvents: [
        ...state.simulationEvents,
        { id: eventId, type: 'physical_damage', target_dc_id: dcId, damage_type: damageType, severity: 'critical', active: true, started_at: new Date() },
      ],
      activeArcs: [...state.activeArcs.filter((a) => a.arcType !== 'backup'), ...backupArcs],
    }));
  },

  triggerLoadIncrease: (regionId, multiplier) => {
    const eventId = crypto.randomUUID();
    set((state) => ({
      simulationEvents: [
        ...state.simulationEvents,
        { id: eventId, type: 'load_increase', target_dc_id: '', target_region: regionId as DcRegion, severity: multiplier > 5 ? 'high' : 'medium', load_multiplier: multiplier, active: true, started_at: new Date() },
      ],
      regions: {
        ...state.regions,
        [regionId]: state.regions[regionId]
          ? { ...state.regions[regionId], load: Math.min(1.0, (state.regions[regionId].load * multiplier) / 2) }
          : state.regions[regionId],
      },
    }));
  },

  resolveSimulation: (eventId) =>
    set((state) => ({
      simulationEvents: state.simulationEvents.map((e) =>
        e.id === eventId ? { ...e, active: false } : e
      ),
      activeArcs: state.activeArcs.filter((a) => !a.id.includes(eventId)),
    })),

  setAITechnique: (category, technique) =>
    set((state) => ({
      aiTechniques: { ...state.aiTechniques, [category]: technique },
    })),

  addAIDecision: (d) =>
    set((state) => ({
      aiDecisions: [
        { ...d, id: crypto.randomUUID(), timestamp: new Date() },
        ...state.aiDecisions.slice(0, 99),
      ],
    })),

  setActiveArcs: (arcs) => set({ activeArcs: arcs }),
}));
