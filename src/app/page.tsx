"use client";

import { useEffect, useState } from "react";
import { Globe, Server, Activity, ShieldAlert, Cpu, LogOut, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import GlobeView from "@/components/3d/Layer1/GlobeView";
import DataCenterInterior from "@/components/3d/Layer3/DataCenterInterior";
import { MOCK_DATA_CENTERS } from "@/lib/mockData";
import { useAppStore } from "@/store";
import LoginPanel from "@/components/ui/LoginPanel";
import SimulationPanel from "@/components/ui/SimulationPanel";

export default function Home() {
  const user = useAppStore((state) => state.user);
  const setUser = useAppStore((state) => state.setUser);
  const viewLayer = useAppStore((state) => state.viewLayer);
  const setViewLayer = useAppStore((state) => state.setViewLayer);
  
  const [mounted, setMounted] = useState(false);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <main className="relative w-screen h-screen bg-black overflow-hidden flex flex-col items-center justify-center">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
      
      {/* Central Title and Glow */}
      <div className={`relative z-10 flex flex-col items-center pointer-events-none transition-all duration-1000 ${user ? 'mb-0 mt-8 absolute top-0' : 'mb-10'}`}>
        <div className="absolute w-96 h-96 bg-neon-blue/20 rounded-full blur-[100px] -z-10 animate-pulse" />
        <h1 className={`font-bold tracking-tight text-white mb-2 text-glow transition-all duration-1000 ${user ? 'text-4xl' : 'text-7xl'}`}>VAYU</h1>
        <p className={`text-gray-400 font-light tracking-widest uppercase transition-all duration-1000 ${user ? 'text-sm' : 'text-xl'}`}>Global Cloud Digital Twin</p>
      </div>

      {/* Login Panel */}
      {!user && (
        <LoginPanel />
      )}

      {/* Simulation Panel */}
      {user && user.role === 'admin' && isSimulatorOpen && (
        <SimulationPanel onClose={() => setIsSimulatorOpen(false)} />
      )}

      {/* Authenticated User HUD */}
      {user && (
        <>
          {/* Top Bar User Info */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-8 right-8 z-20 glass-panel px-6 py-3 flex items-center gap-6"
          >
            <div className="flex flex-col text-right">
              <span className="text-white font-medium">{user.full_name}</span>
              <span className="text-xs text-neon-blue uppercase tracking-wider">{user.role} | {user.company_name}</span>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <button 
              onClick={() => setUser(null)}
              className="text-gray-400 hover:text-white transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </motion.div>

          {/* Bottom Control Bar */}
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 glass-panel-neon p-6 rounded-2xl w-full max-w-4xl flex justify-between items-center z-10"
          >
            <div 
              onClick={() => setViewLayer(0)}
              className={`flex flex-col items-center gap-2 cursor-pointer transition-colors ${viewLayer === 0 ? 'text-neon-blue' : 'text-gray-400 hover:text-neon-blue'}`}
            >
              <Globe className="w-6 h-6" />
              <span className="text-xs uppercase">Global View</span>
            </div>
            <div className="w-px h-10 bg-white/10" />
            <div 
              onClick={() => setViewLayer(2)}
              className={`flex flex-col items-center gap-2 cursor-pointer transition-colors ${viewLayer === 2 ? 'text-neon-purple' : 'text-gray-400 hover:text-neon-purple'}`}
            >
              <Server className="w-6 h-6" />
              <span className="text-xs uppercase">Data Centers</span>
            </div>
            <div className="w-px h-10 bg-white/10" />
            
            {user.role === 'admin' && (
              <>
                <div 
                  onClick={() => setIsSimulatorOpen(true)}
                  className="flex flex-col items-center gap-2 cursor-pointer hover:text-neon-green transition-colors text-gray-400"
                >
                  <Activity className="w-6 h-6" />
                  <span className="text-xs uppercase">Traffic Optimizer</span>
                </div>
                <div className="w-px h-10 bg-white/10" />
                <div 
                  onClick={() => setIsSimulatorOpen(true)}
                  className="flex flex-col items-center gap-2 cursor-pointer hover:text-neon-red transition-colors text-gray-400"
                >
                  <ShieldAlert className="w-6 h-6" />
                  <span className="text-xs uppercase">Threat Defense</span>
                </div>
                <div className="w-px h-10 bg-white/10" />
                <div 
                  onClick={() => setIsSimulatorOpen(true)}
                  className="flex flex-col items-center gap-2 cursor-pointer hover:text-white transition-colors text-gray-400"
                >
                  <Cpu className="w-6 h-6" />
                  <span className="text-xs uppercase">Cost Efficiency</span>
                </div>
              </>
            )}
          </motion.div>
        </>
      )}

      {/* 3D Canvas Switcher */}
      <div className="absolute inset-0 z-0">
        {viewLayer === 0 && <GlobeView dataCenters={MOCK_DATA_CENTERS} onDataCenterClick={() => setViewLayer(2)} />}
        {viewLayer === 2 && <DataCenterInterior />}
      </div>
    </main>
  );
}
