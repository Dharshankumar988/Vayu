"use client";

import { useEffect, useRef, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useDCStore } from "@/store/dcStore";
import { useSimulationStore } from "@/store/simulationStore";
import { useAppStore } from "@/store";
import { useUIStore } from "@/store/uiStore";
import * as THREE from "three";

const Globe = dynamic(() => import("react-globe.gl"), { ssr: false });

const ARC_COLOR_MAP = {
  normal: '#00ff66',
  ai:     '#00f3ff',
  threat: '#ff0033',
  alloc:  '#b52aff',
  backup: '#00ffff',
};

export default function GlobeView({ onDataCenterClick }: { onDataCenterClick?: (dcId: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<any>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const dataCenters = useDCStore((s) => s.dataCenters);
  const { regions, simulationEvents, activeArcs } = useSimulationStore();
  const { selectedRegionId } = useAppStore();
  const { showGlobeLegend, toggleGlobeLegend } = useUIStore();

  // Handle container resize
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      if (entries[0]) {
        const { width, height } = entries[0].contentRect;
        setDimensions({ width, height });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Region zoom effect
  useEffect(() => {
    if (!globeRef.current) return;
    if (selectedRegionId && regions[selectedRegionId]) {
      const r = regions[selectedRegionId];
      globeRef.current.pointOfView({ lat: r.lat, lng: r.lng, altitude: 0.9 }, 1800);
      globeRef.current.controls().autoRotate = false;
    } else {
      globeRef.current.pointOfView({ altitude: 2.2 }, 1800);
      globeRef.current.controls().autoRotate = true;
    }
  }, [selectedRegionId, regions]);

  // Build active arcs: meaningful routes only
  const arcsData = useMemo(() => {
    const arcs = [...activeArcs];
    const dcArr = dataCenters.filter((dc) => !dc.is_isolated);
    if (dcArr.length < 2) return arcs;

    // Normal traffic: 4-6 random healthy routes between non-critical DCs
    const healthyDCs = dcArr.filter((dc) => dc.status === 'healthy');
    for (let i = 0; i < Math.min(5, healthyDCs.length - 1); i++) {
      const src = healthyDCs[i];
      const dst = healthyDCs[(i + 1) % healthyDCs.length];
      if (src.id !== dst.id) {
        arcs.push({
          id: `normal-${src.id}-${dst.id}`,
          startLat: src.lat, startLng: src.lng,
          endLat: dst.lat, endLng: dst.lng,
          arcType: 'normal', color: ARC_COLOR_MAP.normal,
        });
      }
    }

    // Backup routes for linked DCs when primary is under load
    dataCenters.forEach((dc) => {
      if (dc.load > 0.75 && dc.linked_dc_ids.length > 0) {
        const linkedDC = dataCenters.find((d) => d.id === dc.linked_dc_ids[0]);
        if (linkedDC) {
          arcs.push({
            id: `backup-${dc.id}`,
            startLat: dc.lat, startLng: dc.lng,
            endLat: linkedDC.lat, endLng: linkedDC.lng,
            arcType: 'backup', color: ARC_COLOR_MAP.backup,
          });
        }
      }
    });

    return arcs;
  }, [dataCenters, activeArcs]);

  const handleGlobeReady = () => {
    if (!globeRef.current) return;
    const ctrl = globeRef.current.controls();
    ctrl.autoRotate = !selectedRegionId;
    ctrl.autoRotateSpeed = 0.4;
    ctrl.enableDamping = true;
    ctrl.dampingFactor = 0.08;
    ctrl.enableZoom = true;
    ctrl.minDistance = 150;
    ctrl.maxDistance = 800;
    globeRef.current.pointOfView({ altitude: 2.2 }, 3000);
  };

  const zoomIn  = () => globeRef.current?.pointOfView({ altitude: Math.max(0.5, (globeRef.current?.pointOfView()?.altitude ?? 2) - 0.5) }, 400);
  const zoomOut = () => globeRef.current?.pointOfView({ altitude: Math.min(4.0, (globeRef.current?.pointOfView()?.altitude ?? 2) + 0.5) }, 400);
  const reset   = () => { globeRef.current?.pointOfView({ lat: 0, lng: 0, altitude: 2.2 }, 1000); if (globeRef.current) globeRef.current.controls().autoRotate = true; };

  return (
    <div ref={containerRef} className="absolute inset-0 cursor-grab active:cursor-grabbing overflow-hidden">
      {dimensions.width > 0 && (
        <Globe
          ref={globeRef}
          width={dimensions.width}
          height={dimensions.height}
          onGlobeReady={handleGlobeReady}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-day.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundColor="rgba(0,0,0,0)"
        atmosphereColor="#4466ff"
        atmosphereAltitude={0.12}

        // Data Centers as pyramids
        customLayerData={dataCenters}
        customThreeObject={(dc: any) => {
          const geometry = new THREE.ConeGeometry(0.4, 1.2, 4);
          // Point pyramid upward from globe surface
          geometry.applyMatrix4(new THREE.Matrix4().makeTranslation(0, 0.6, 0));

          let color = '#22c55e'; // healthy = green
          if (dc.load > 0.70 || dc.status === 'warning') color = '#f59e0b'; // warning = yellow
          if (dc.load > 0.88 || dc.status === 'critical') color = '#ef4444'; // critical = red
          if (dc.status === 'offline') color = '#6b7280'; // offline = gray

          // Check if DC is under active simulation
          const simStore = useSimulationStore.getState();
          const activeSim = simStore.simulationEvents.find((e) => e.active && e.target_dc_id === dc.id);
          if (activeSim?.type === 'ddos') color = '#ff0033';
          if (activeSim?.type === 'physical_damage') color = '#ff6600';

          const material = new THREE.MeshPhysicalMaterial({
            color,
            emissive: color,
            emissiveIntensity: 0.9,
            transparent: true,
            opacity: 0.92,
            roughness: 0.2,
            metalness: 0.6,
          });
          return new THREE.Mesh(geometry, material);
        }}
        customThreeObjectUpdate={(obj: any, dc: any) => {
          Object.assign(obj.position, globeRef.current?.getCoords(dc.lat, dc.lng, 0.01));
        }}
        onCustomLayerClick={(dc: any) => {
          globeRef.current?.pointOfView({ lat: dc.lat, lng: dc.lng, altitude: 0.7 }, 1200);
          onDataCenterClick?.(dc.id);
        }}

        // Labels
        labelsData={dataCenters}
        labelLat={(d: any) => d.lat}
        labelLng={(d: any) => d.lng}
        labelText={(d: any) => d.name}
        labelSize={0.9}
        labelDotRadius={0.25}
        labelColor={() => '#ffffff'}
        labelResolution={2}
        labelAltitude={0.04}

        // Traffic arcs
        arcsData={arcsData}
        arcStartLat="startLat"
        arcStartLng="startLng"
        arcEndLat="endLat"
        arcEndLng="endLng"
        arcColor="color"
        arcDashLength={0.5}
        arcDashGap={1.2}
        arcDashInitialGap={() => Math.random() * 4}
        arcDashAnimateTime={1400}
        arcStroke={0.45}
        arcAltitudeAutoScale={0.35}

        // Region rings
        ringsData={Object.values(regions)}
        ringLat="lat"
        ringLng="lng"
        ringColor={(d: any) => d.trafficAnomaly ? '#ff0033' : d.load > 0.80 ? '#f59e0b' : 'rgba(0,243,255,0.15)'}
        ringMaxRadius={(d: any) => d.trafficAnomaly ? 12 : 8}
        ringPropagationSpeed={0.6}
        ringRepeatPeriod={1800}

      />
      )}

      {/* Globe Controls HUD */}
      <div className="absolute bottom-6 right-6 flex flex-col gap-2 z-20">
        <button onClick={zoomIn} className="w-9 h-9 rounded-full glass-panel-neon text-white font-bold text-lg flex items-center justify-center hover:bg-white/10 transition-colors">+</button>
        <button onClick={zoomOut} className="w-9 h-9 rounded-full glass-panel-neon text-white font-bold text-lg flex items-center justify-center hover:bg-white/10 transition-colors">−</button>
        <button onClick={reset} className="w-9 h-9 rounded-full glass-panel-neon text-white text-xs flex items-center justify-center hover:bg-white/10 transition-colors" title="Reset camera">⌂</button>
      </div>

      {/* Globe Legend */}
      <div className="absolute bottom-6 left-6 z-20">
        <button
          onClick={toggleGlobeLegend}
          className="px-3 py-1.5 glass-panel-neon text-xs text-gray-300 rounded-lg hover:bg-white/5 transition-colors flex items-center gap-2"
        >
          <span>📍</span> Legend {showGlobeLegend ? '▲' : '▼'}
        </button>
        {showGlobeLegend && (
          <div className="mt-2 glass-panel-neon rounded-xl p-4 w-56 animate-slide-in-up">
            <p className="text-xs font-bold text-gray-400 uppercase mb-3">Routes</p>
            {[
              { color: '#00ff66', label: 'Normal Traffic' },
              { color: '#00f3ff', label: 'AI Optimization' },
              { color: '#ff0033', label: 'Threat / DDoS' },
              { color: '#b52aff', label: 'Server Allocation' },
              { color: '#00ffff', label: 'Backup Connection' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2 mb-1.5">
                <div className="w-3 h-1.5 rounded-full" style={{ background: item.color, boxShadow: `0 0 6px ${item.color}` }} />
                <span className="text-xs text-gray-300">{item.label}</span>
              </div>
            ))}
            <div className="border-t border-white/10 mt-3 pt-3">
              <p className="text-xs font-bold text-gray-400 uppercase mb-2">DC Status</p>
              {[
                { color: '#22c55e', label: 'Healthy' },
                { color: '#f59e0b', label: 'High Load' },
                { color: '#ef4444', label: 'Critical / Attack' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2 mb-1.5">
                  <div className="w-2.5 h-2.5 rotate-45" style={{ background: item.color, boxShadow: `0 0 6px ${item.color}` }} />
                  <span className="text-xs text-gray-300">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
