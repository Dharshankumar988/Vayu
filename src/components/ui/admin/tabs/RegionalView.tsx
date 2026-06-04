"use client";

import { useState } from "react";
import { Globe, ChevronRight, ArrowLeft, Server, Cpu } from "lucide-react";
import { useAppStore } from "@/store";
import { useEffect } from "react";
import { useDCStore } from "@/store/dcStore";
import { useSimulationStore } from "@/store/simulationStore";
import dynamic from "next/dynamic";

const GlobeView = dynamic(() => import("@/components/3d/Layer1/GlobeView"), { ssr: false });

const REGION_ORDER = ["north_america", "south_america", "europe", "asia", "africa", "oceania"];
const REGION_LABELS: Record<string, string> = {
  north_america: "North America", south_america: "South America",
  europe: "Europe", asia: "Asia", africa: "Africa", oceania: "Oceania",
};

export default function RegionalView() {
  const setSelectedDataCenterId = useAppStore((s) => s.setSelectedDataCenterId);
  const setViewMode = useAppStore((s) => s.setViewMode);
  const setSelectedRegionId = useAppStore((s) => s.setSelectedRegionId);
  const dataCenters = useDCStore((s) => s.dataCenters);
  const dcError = useDCStore((s) => s.error);
  const isLoading = useDCStore((s) => s.isLoading);
  const regions = useSimulationStore((s) => s.regions);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [showGlobe, setShowGlobe] = useState(true);

  // Force load if empty
  useEffect(() => {
    if (dataCenters.length === 0 && !isLoading && !dcError) {
      useDCStore.getState().loadFromServer();
    }
  }, [dataCenters.length, isLoading, dcError]);

  const regionDCs = dataCenters.filter((dc) => dc.region === selectedRegion);

  const handleEnterDC = (dcId: string) => {
    setSelectedDataCenterId(dcId);
    setViewMode("dc-interior");
  };

  const handleSelectRegion = (regionId: string) => {
    setSelectedRegion(regionId);
    setSelectedRegionId(regionId);
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#050814]">
      {/* Fullscreen Globe */}
      <div className="absolute inset-0 z-0">
        <GlobeView onDataCenterClick={(dcId) => {
          const dc = dataCenters.find((d) => d.id === dcId);
          if (dc) setSelectedRegion(dc.region);
        }} />
      </div>

      {/* Floating Overlays */}
      <div className="absolute inset-0 z-10 pointer-events-none flex">
        
        {/* Left Panel: Regions */}
        <div className="w-80 h-full bg-white/90 backdrop-blur-xl border-r border-slate-200/50 flex flex-col pointer-events-auto shadow-[4px_0_24px_rgba(0,0,0,0.05)]">
          <div className="px-5 py-5 border-b border-slate-200/50 bg-white/50">
            <h2 className="font-bold text-slate-900 text-lg">Global Regions</h2>
            <p className="text-xs text-slate-500 mt-1">
              {isLoading ? "Loading data centers..." : `${dataCenters.length} data centers worldwide`}
            </p>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {dcError && (
              <div className="m-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-xs shadow-sm">
                <p className="font-bold mb-1">Database Error</p>
                <p>{dcError}</p>
                <p className="mt-2 text-[10px] text-red-500 font-mono">Check if your .env.local matches your new Supabase project credentials!</p>
              </div>
            )}
            {REGION_ORDER.map((regionId) => {
              const regionData = regions[regionId];
              const dcCount = dataCenters.filter((d) => d.region === regionId).length;
              const isSelected = selectedRegion === regionId;
              return (
                <button key={regionId} onClick={() => handleSelectRegion(regionId)}
                  className={`w-full text-left px-5 py-4 border-b border-slate-100/50 hover:bg-slate-50/80 transition-colors flex items-center gap-3 ${
                    isSelected ? "bg-blue-50/80 border-l-4 border-l-blue-600" : "border-l-4 border-l-transparent"
                  }`}>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-slate-800 text-sm">{REGION_LABELS[regionId]}</p>
                      <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${ isSelected ? "rotate-90 text-blue-600" : "" }`} />
                    </div>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-xs text-slate-500">{dcCount} DCs</span>
                      {regionData && (
                        <>
                          <span className="text-xs text-slate-300">·</span>
                          <span className={`text-xs font-semibold ${ regionData.load > 0.85 ? "text-red-600" : regionData.load > 0.65 ? "text-amber-600" : "text-green-600" }`}>
                            {(regionData.load * 100).toFixed(0)}% load
                          </span>
                        </>
                      )}
                    </div>
                    {regionData && (
                      <div className="mt-3 progress-bar h-1.5 bg-slate-200">
                        <div className={`progress-bar-fill ${ regionData.load > 0.85 ? "bg-red-500" : regionData.load > 0.65 ? "bg-amber-500" : "bg-green-500" }`}
                          style={{ width: `${regionData.load * 100}%` }} />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Panel: Selected Region DCs */}
        <div className="flex-1 p-6 flex flex-col justify-start items-end pointer-events-none">
          {selectedRegion && (
            <div className="w-[400px] max-h-[90%] bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/50 flex flex-col pointer-events-auto overflow-hidden animate-in slide-in-from-right-8 duration-300">
              <div className="px-5 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/80">
                <div>
                  <h3 className="font-bold text-slate-900">{REGION_LABELS[selectedRegion]}</h3>
                  <p className="text-xs text-slate-500">{regionDCs.length} Data Centers</p>
                </div>
                <button onClick={() => setSelectedRegion(null)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-full transition-colors">
                  ✕
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 bg-slate-50/30 custom-scrollbar space-y-4">
                {regionDCs.map((dc) => (
                  <div key={dc.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold text-slate-900 text-sm">{dc.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{dc.location}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${ dc.status === "healthy" ? "bg-green-100 text-green-700" : dc.status === "warning" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700" }`}>
                        {dc.status}
                      </span>
                    </div>
                    <div className="space-y-2.5 mb-5">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Load Capacity</span>
                        <span className="font-mono font-semibold text-slate-700">{(dc.load * 100).toFixed(0)}%</span>
                      </div>
                      <div className="progress-bar h-1.5 bg-slate-100">
                        <div className={`progress-bar-fill ${ dc.load > 0.85 ? "bg-red-500" : dc.load > 0.65 ? "bg-amber-500" : "bg-green-500" }`}
                          style={{ width: `${dc.load * 100}%` }} />
                      </div>
                      <div className="flex justify-between text-xs pt-1">
                        <span className="text-slate-500">Rooms</span>
                        <span className="font-mono text-slate-700">{dc.rooms.length}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Network Links</span>
                        <span className="font-mono text-slate-700">{dc.linked_dc_ids.length}</span>
                      </div>
                    </div>
                    <button onClick={() => handleEnterDC(dc.id)}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm shadow-blue-500/20">
                      <Server className="w-4 h-4" /> Enter Facility
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
