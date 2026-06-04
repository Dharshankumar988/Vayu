"use client";

import { useEffect, useRef, useMemo, useState, useCallback } from "react";
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
  const glowAnimRef = useRef<number>(0);
  const [countries, setCountries] = useState({ features: [] });

  const dataCenters = useDCStore((s) => s.dataCenters);
  const { regions, simulationEvents, activeArcs } = useSimulationStore();
  const { selectedRegionId } = useAppStore();
  const { showGlobeLegend, toggleGlobeLegend } = useUIStore();

  useEffect(() => {
    fetch('https://raw.githubusercontent.com/vasturiano/react-globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson')
      .then(res => res.json())
      .then(setCountries)
      .catch(e => console.error("Failed to load countries", e));
  }, []);

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

  // Region zoom — smoothly moves camera but NEVER disables controls
  useEffect(() => {
    if (!globeRef.current) return;
    if (selectedRegionId && regions[selectedRegionId]) {
      const r = regions[selectedRegionId];
      // Smoothly pan to region but keep controls fully enabled
      globeRef.current.pointOfView({ lat: r.lat, lng: r.lng, altitude: 1.6 }, 1800);
      // Do NOT disable autoRotate or any controls — user can still interact freely
    } else {
      globeRef.current.pointOfView({ altitude: 2.8 }, 1800);
    }
  }, [selectedRegionId, regions]);

  // Animate glow rings on pyramids
  useEffect(() => {
    let frameId: number;
    const animate = () => {
      glowAnimRef.current = performance.now() * 0.001;
      frameId = requestAnimationFrame(animate);
    };
    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, []);

  // Build active arcs: meaningful routes only
  const arcsData = useMemo(() => {
    const arcs = [...activeArcs];
    const dcArr = dataCenters.filter((dc) => !dc.is_isolated);
    if (dcArr.length < 2) return arcs;

    // Normal traffic: 4-6 healthy routes between non-critical DCs
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

  const handleGlobeReady = useCallback(() => {
    if (!globeRef.current) return;
    const ctrl = globeRef.current.controls();
    // ALWAYS keep controls fully enabled — never lock
    ctrl.autoRotate = true;
    ctrl.autoRotateSpeed = 0.3;
    ctrl.enableDamping = true;
    ctrl.dampingFactor = 0.12;
    ctrl.enableZoom = true;
    ctrl.enableRotate = true;
    ctrl.enablePan = true;
    ctrl.minDistance = 150;
    ctrl.maxDistance = 800;
    globeRef.current.pointOfView({ altitude: 2.8 }, 3000);
  }, []);

  // Reusable geometries and materials for pyramids (memoized)
  const pyramidGeometry = useMemo(() => {
    // Make them VERY large as requested: 1.5 radius, 4.0 height
    const geo = new THREE.ConeGeometry(1.5, 4.0, 4);
    geo.applyMatrix4(new THREE.Matrix4().makeTranslation(0, 2.0, 0));
    return geo;
  }, []);

  const glowRingGeometry = useMemo(() => {
    return new THREE.RingGeometry(1.0, 2.5, 32);
  }, []);

  const zoomIn  = () => globeRef.current?.pointOfView({ altitude: Math.max(0.8, (globeRef.current?.pointOfView()?.altitude ?? 2.8) - 0.5) }, 400);
  const zoomOut = () => globeRef.current?.pointOfView({ altitude: Math.min(4.0, (globeRef.current?.pointOfView()?.altitude ?? 2.8) + 0.5) }, 400);
  const reset   = () => {
    globeRef.current?.pointOfView({ lat: 0, lng: 0, altitude: 2.8 }, 1000);
    if (globeRef.current) {
      const ctrl = globeRef.current.controls();
      ctrl.autoRotate = true;
      // Always keep all controls enabled
      ctrl.enableRotate = true;
      ctrl.enablePan = true;
      ctrl.enableZoom = true;
    }
  };

  return (
    <div ref={containerRef} className="absolute inset-0 cursor-grab active:cursor-grabbing overflow-hidden">
      {dimensions.width > 0 && (
        <Globe
          ref={globeRef}
          width={dimensions.width}
          height={dimensions.height}
          onGlobeReady={handleGlobeReady}
          globeImageUrl=""
          backgroundColor="rgba(0,0,0,0)"
          showGlobe={true}
          showAtmosphere={true}
          atmosphereColor="#4466ff"
          atmosphereAltitude={0.12}
          globeMaterial={
            new THREE.MeshPhongMaterial({
              color: '#000000', // Black ocean
              transparent: false,
            })
          }
          polygonsData={countries.features}
          polygonCapColor={() => '#555555'} // Grey land
          polygonSideColor={() => '#333333'}
          polygonStrokeColor={() => '#222222'}
          
          // Data Centers as VERY LARGE pyramids with pulsing glow rings
          customLayerData={dataCenters}
          customThreeObject={(dc: any) => {
            const group = new THREE.Group();

            // Determine status color
            let color = '#22c55e'; // healthy = green
            if (dc.load > 0.70 || dc.status === 'warning') color = '#f59e0b'; // warning = yellow
            if (dc.load > 0.88 || dc.status === 'critical') color = '#ef4444'; // critical = red
            if (dc.status === 'offline') color = '#6b7280'; // offline = gray

            // Check active simulations
            const simStore = useSimulationStore.getState();
            const activeSim = simStore.simulationEvents.find((e) => e.active && e.target_dc_id === dc.id);
            if (activeSim?.type === 'ddos') color = '#ff0033';
            if (activeSim?.type === 'physical_damage') color = '#ff6600';

            // VERY LARGE Pyramid
            const pyramidMat = new THREE.MeshPhysicalMaterial({
              color,
              emissive: color,
              emissiveIntensity: 0.9,
              transparent: true,
              opacity: 0.92,
              roughness: 0.2,
              metalness: 0.6,
            });
            const pyramid = new THREE.Mesh(pyramidGeometry, pyramidMat);
            group.add(pyramid);

            // Pulsing glow ring beneath pyramid
            const ringMat = new THREE.MeshBasicMaterial({
              color,
              transparent: true,
              opacity: 0.5,
              side: THREE.DoubleSide,
            });
            const ring = new THREE.Mesh(glowRingGeometry, ringMat);
            ring.rotation.x = -Math.PI / 2;
            ring.position.y = 0.05;
            ring.name = 'glowRing';
            group.add(ring);

            // Store color for updates
            group.userData = { baseColor: color, dcId: dc.id };

            return group;
          }}
          customThreeObjectUpdate={(obj: any, dc: any) => {
            const coords = globeRef.current?.getCoords(dc.lat, dc.lng, 0.01);
            if (coords) Object.assign(obj.position, coords);

            // Animate glow ring opacity (pulsing)
            const time = glowAnimRef.current;
            const ring = obj.getObjectByName('glowRing');
            if (ring && ring.material) {
              const pulse = 0.3 + Math.sin(time * 2.5 + dc.lat * 0.1) * 0.3;
              ring.material.opacity = pulse;
            }

            // Selected DC: floating bob animation + brighter glow
            const appStore = useAppStore.getState();
            const isSelected = appStore.selectedDataCenterId === dc.id;
            if (isSelected) {
              const bob = Math.sin(time * 3.0) * 0.3;
              obj.position.y += bob;
              if (ring && ring.material) {
                ring.material.opacity = 0.6 + Math.sin(time * 4.0) * 0.4;
              }
              // Brighten pyramid emissive
              const pyramid = obj.children[0];
              if (pyramid?.material) {
                pyramid.material.emissiveIntensity = 1.6 + Math.sin(time * 3.0) * 0.4;
              }
            } else {
                // Reset Y if not selected
                if(coords) obj.position.y = coords.y;
            }
          }}
          onCustomLayerClick={(dc: any) => {
            // Smoothly move camera to DC but NEVER lock/disable controls
            globeRef.current?.pointOfView({ lat: dc.lat, lng: dc.lng, altitude: 1.2 }, 1200);
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

          // Traffic arcs — same neon colors, NOT softened
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

      {/* Globe Legend — exact same neon color scheme */}
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
