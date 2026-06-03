"use client";

import { motion } from "framer-motion";
import { Users, AlertTriangle, Activity } from "lucide-react";
import { useSimulationStore } from "@/store/simulationStore";

export default function AdminCapacityPanel() {
  const regions = useSimulationStore((state) => state.regions);
  const setRegionUsers = useSimulationStore((state) => state.setRegionUsers);
  const setTrafficAnomaly = useSimulationStore((state) => state.setTrafficAnomaly);
  const globalTrafficRate = useSimulationStore((state) => state.globalTrafficRate);

  return (
    <motion.div 
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      className="absolute top-24 left-8 z-30 glass-panel-neon w-80 flex flex-col"
    >
      <div className="flex items-center gap-2 p-4 border-b border-white/10">
        <Users className="w-5 h-5 text-neon-blue" />
        <h3 className="font-semibold uppercase tracking-wider text-sm text-white">Capacity & Load Control</h3>
      </div>
      
      <div className="p-4 flex flex-col gap-4">
        <div className="flex justify-between items-center bg-black/40 p-2 rounded border border-white/5">
          <span className="text-xs text-gray-400">Global Traffic</span>
          <span className="text-sm text-neon-green font-mono">{globalTrafficRate.toFixed(0)} req/s</span>
        </div>

        {Object.values(regions).map((region) => (
          <div key={region.id} className="flex flex-col gap-2 p-3 bg-white/5 rounded-lg border border-white/10">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-white">{region.name}</span>
              <span className={`text-xs font-mono ${region.load > 0.8 ? 'text-neon-red' : 'text-neon-green'}`}>
                Load: {(region.load * 100).toFixed(0)}%
              </span>
            </div>
            
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">Active Users: {region.users.toLocaleString()}</label>
              <input 
                type="range" 
                min="100000" 
                max="5000000" 
                step="100000"
                value={region.users}
                onChange={(e) => setRegionUsers(region.id, parseInt(e.target.value))}
                className="w-full accent-neon-blue"
              />
            </div>

            <button 
              onClick={() => setTrafficAnomaly(region.id, !region.trafficAnomaly)}
              className={`mt-2 py-1.5 rounded text-xs font-medium uppercase border flex items-center justify-center gap-2 transition-colors ${
                region.trafficAnomaly 
                  ? 'bg-neon-red/20 border-neon-red text-neon-red hover:bg-neon-red/30' 
                  : 'bg-black/30 border-white/10 text-gray-400 hover:text-white hover:border-white/30'
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              {region.trafficAnomaly ? 'Stop Anomaly' : 'Trigger Anomaly'}
            </button>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
