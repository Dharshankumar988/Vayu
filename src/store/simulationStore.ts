import { create } from 'zustand';

export interface RegionalData {
  id: string;
  name: string;
  users: number; // Number of active users
  load: number;  // 0.0 to 1.0
  threatLevel: number; // 0.0 to 1.0
  trafficAnomaly: boolean;
}

export interface SimulationState {
  regions: Record<string, RegionalData>;
  globalTrafficRate: number;
  
  // Actions
  setRegionUsers: (regionId: string, users: number) => void;
  setTrafficAnomaly: (regionId: string, anomaly: boolean) => void;
  updateSimulation: (deltaTime: number) => void;
  
  // AI Actions (called after AI decision)
  mitigateThreat: (regionId: string) => void;
  optimizeTraffic: () => void;
  consolidateResources: () => void;
}

export const useSimulationStore = create<SimulationState>((set) => ({
  regions: {
    "us-east": { id: "us-east", name: "US-East", users: 1500000, load: 0.6, threatLevel: 0.1, trafficAnomaly: false },
    "us-west": { id: "us-west", name: "US-West", users: 800000, load: 0.4, threatLevel: 0.05, trafficAnomaly: false },
    "eu-central": { id: "eu-central", name: "EU-Central", users: 1200000, load: 0.5, threatLevel: 0.1, trafficAnomaly: false },
    "ap-tokyo": { id: "ap-tokyo", name: "AP-Tokyo", users: 2000000, load: 0.8, threatLevel: 0.2, trafficAnomaly: false },
  },
  globalTrafficRate: 10000, // req/s

  setRegionUsers: (regionId, users) => set((state) => ({
    regions: {
      ...state.regions,
      [regionId]: { ...state.regions[regionId], users }
    }
  })),

  setTrafficAnomaly: (regionId, anomaly) => set((state) => ({
    regions: {
      ...state.regions,
      [regionId]: { 
        ...state.regions[regionId], 
        trafficAnomaly: anomaly,
        threatLevel: anomaly ? 0.9 : 0.1,
        load: anomaly ? 0.99 : state.regions[regionId].load
      }
    }
  })),

  updateSimulation: (deltaTime) => set((state) => {
    // Fluctuations
    const updatedRegions = { ...state.regions };
    let totalLoad = 0;
    
    Object.keys(updatedRegions).forEach(key => {
      const r = updatedRegions[key];
      // Random walk for load based on users
      const targetLoad = Math.min(0.9, (r.users / 3000000));
      const drift = (Math.random() - 0.5) * 0.05;
      
      let newLoad = r.trafficAnomaly ? 0.95 + Math.random()*0.05 : r.load + drift + (targetLoad - r.load) * 0.1;
      newLoad = Math.max(0.1, Math.min(1.0, newLoad));
      
      updatedRegions[key] = { ...r, load: newLoad };
      totalLoad += newLoad;
    });

    return {
      regions: updatedRegions,
      globalTrafficRate: 5000 + (totalLoad * 5000)
    };
  }),

  mitigateThreat: (regionId) => set((state) => ({
    regions: {
      ...state.regions,
      [regionId]: { 
        ...state.regions[regionId], 
        trafficAnomaly: false, 
        threatLevel: 0.1,
        load: 0.5 
      }
    }
  })),

  optimizeTraffic: () => set((state) => {
    const updatedRegions = { ...state.regions };
    Object.keys(updatedRegions).forEach(key => {
      // Balance out the load
      updatedRegions[key].load = 0.5 + (Math.random() * 0.1);
    });
    return { regions: updatedRegions };
  }),

  consolidateResources: () => set((state) => {
    // Bring loads up slightly to represent consolidation (less idle servers)
    const updatedRegions = { ...state.regions };
    Object.keys(updatedRegions).forEach(key => {
      if (updatedRegions[key].load < 0.3) {
        updatedRegions[key].load = 0.6;
      }
    });
    return { regions: updatedRegions };
  })
}));
