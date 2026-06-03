"use client";

import { useState } from "react";
import { Globe, ChevronRight, ArrowLeft, Server, Cpu } from "lucide-react";
import { useAppStore } from "@/store";
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
  const regions = useSimulationStore((s) => s.regions);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [showGlobe, setShowGlobe] = useState(true);

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
    <div className="flex h-full">
      {/* Left panel: region list */}
      <div className="w-72 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col">
        <div className="px-4 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Global Regions</h2>
          <p className="text-xs text-slate-400 mt-0.5">{dataCenters.length} data centers worldwide</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {REGION_ORDER.map((regionId) => {
            const regionData = regions[regionId];
            const dcCount = dataCenters.filter((d) => d.region === regionId).length;
            const isSelected = selectedRegion === regionId;
            return (
              <button key={regionId} onClick={() => handleSelectRegion(regionId)}
                className={`w-full text-left px-4 py-4 border-b border-slate-50 hover:bg-slate-50 transition-colors flex items-center gap-3 ${
                  isSelected ? "bg-blue-50 border-l-2 border-l-blue-600" : ""
                }`}>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-slate-800 text-sm">{REGION_LABELS[regionId]}</p>
                    <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${ isSelected ? "rotate-90 text-blue-600" : "" }`} />
                  </div>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-xs text-slate-400">{dcCount} DCs</span>
                    {regionData && (
                      <>
                        <span className="text-xs text-slate-300">·</span>
                        <span className={`text-xs font-medium ${ regionData.load > 0.85 ? "text-red-600" : regionData.load > 0.65 ? "text-amber-600" : "text-green-600" }`}>
                          {(regionData.load * 100).toFixed(0)}% load
                        </span>
                      </>
                    )}
                  </div>
                  {regionData && (
                    <div className="mt-2 progress-bar">
                      <div className={`progress-bar-fill ${ regionData.load > 0.85 ? "progress-critical" : regionData.load > 0.65 ? "progress-warning" : "progress-healthy" }`}
                        style={{ width: `${regionData.load * 100}%` }} />
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right panel: globe + DC list */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Globe view */}
        <div className="relative flex-1 globe-zone" style={{ minHeight: 300, maxHeight: showGlobe ? 420 : 0, transition: "max-height 0.3s" }}>
          {showGlobe && (
            <GlobeView onDataCenterClick={(dcId) => {
              const dc = dataCenters.find((d) => d.id === dcId);
              if (dc) setSelectedRegion(dc.region);
            }} />
          )}
          <button onClick={() => setShowGlobe(!showGlobe)}
            className="absolute top-3 right-3 z-20 px-3 py-1.5 glass-panel-neon text-xs text-gray-300 rounded-lg hover:bg-white/10">
            {showGlobe ? "Hide Globe" : "Show Globe"}
          </button>
        </div>

        {/* DC list for selected region */}
        <div className="flex-1 overflow-y-auto bg-slate-50 p-4">
          {!selectedRegion ? (
            <div className="flex flex-col items-center justify-center h-40 text-slate-400">
              <Globe className="w-8 h-8 mb-2 opacity-40" />
              <p className="text-sm">Select a region to view data centers</p>
            </div>
          ) : (
            <>
              <h3 className="font-semibold text-slate-900 mb-3">{REGION_LABELS[selectedRegion]} Data Centers ({regionDCs.length})</h3>
              <div className="grid grid-cols-2 gap-3">
                {regionDCs.map((dc) => (
                  <div key={dc.id} className="card p-4 hover:shadow-md transition-all">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold text-slate-900 text-sm">{dc.name}</p>
                        <p className="text-xs text-slate-400">{dc.location}</p>
                      </div>
                      <span className={`badge ${ dc.status === "healthy" ? "badge-healthy" : dc.status === "warning" ? "badge-warning" : "badge-critical" }`}>
                        {dc.status}
                      </span>
                    </div>
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Load</span>
                        <span className="font-mono font-medium">{(dc.load * 100).toFixed(0)}%</span>
                      </div>
                      <div className="progress-bar">
                        <div className={`progress-bar-fill ${ dc.load > 0.85 ? "progress-critical" : dc.load > 0.65 ? "progress-warning" : "progress-healthy" }`}
                          style={{ width: `${dc.load * 100}%` }} />
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Rooms</span>
                        <span className="font-mono">{dc.rooms.length}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Linked DCs</span>
                        <span className="font-mono">{dc.linked_dc_ids.length}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Isolated</span>
                        <span className={`font-mono font-medium ${ dc.is_isolated ? "text-amber-600" : "text-green-600" }`}>
                          {dc.is_isolated ? "Yes" : "No"}
                        </span>
                      </div>
                    </div>
                    <button onClick={() => handleEnterDC(dc.id)}
                      className="btn-primary w-full py-2 text-xs flex items-center justify-center gap-1.5">
                      <Server className="w-3.5 h-3.5" /> Enter DC Interior
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
