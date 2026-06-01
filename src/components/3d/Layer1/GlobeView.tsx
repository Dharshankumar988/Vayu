"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { useThree } from "@react-three/fiber";

// Dynamically import react-globe.gl to avoid SSR issues
const Globe = dynamic(() => import("react-globe.gl"), { ssr: false });

export interface DataCenter {
  id: string;
  name: string;
  lat: number;
  lng: number;
  status: 'operational' | 'degraded' | 'offline';
  size: number;
}

export interface GlobeViewProps {
  dataCenters: DataCenter[];
  onDataCenterClick?: (dc: DataCenter) => void;
}

export default function GlobeView({ dataCenters, onDataCenterClick }: GlobeViewProps) {
  const globeRef = useRef<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Mock Arc Data for traffic visualization
  const arcsData = useMemo(() => {
    if (dataCenters.length < 2) return [];
    const arcs = [];
    for (let i = 0; i < 15; i++) {
      const src = dataCenters[Math.floor(Math.random() * dataCenters.length)];
      const dst = dataCenters[Math.floor(Math.random() * dataCenters.length)];
      if (src.id !== dst.id) {
        arcs.push({
          startLat: src.lat,
          startLng: src.lng,
          endLat: dst.lat,
          endLng: dst.lng,
          color: ['#00f3ff', '#b52aff', '#00ff66'][Math.floor(Math.random() * 3)]
        });
      }
    }
    return arcs;
  }, [dataCenters]);

  if (!mounted) return null;

  return (
    <div className="absolute inset-0 cursor-grab active:cursor-grabbing">
      <Globe
        ref={globeRef}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        
        // Data Centers (Points)
        pointsData={dataCenters}
        pointLat="lat"
        pointLng="lng"
        pointColor={(d: any) => {
          if (d.status === 'offline') return '#ff0055';
          if (d.status === 'degraded') return '#ffaa00';
          return '#00ff66';
        }}
        pointAltitude={(d: any) => d.size * 0.1}
        pointRadius={(d: any) => d.size * 1.5}
        pointsMerge={false}
        pointResolution={32}
        onPointClick={(point) => onDataCenterClick?.(point as DataCenter)}
        
        // Traffic (Arcs)
        arcsData={arcsData}
        arcStartLat="startLat"
        arcStartLng="startLng"
        arcEndLat="endLat"
        arcEndLng="endLng"
        arcColor="color"
        arcDashLength={0.4}
        arcDashGap={4}
        arcDashInitialGap={() => Math.random() * 5}
        arcDashAnimateTime={1000}
        
        // Rings around points to make them glow
        ringsData={dataCenters}
        ringLat="lat"
        ringLng="lng"
        ringColor={(d: any) => d.status === 'offline' ? '#ff0055' : '#00f3ff'}
        ringMaxRadius={(d: any) => d.size * 5}
        ringPropagationSpeed={2}
        ringRepeatPeriod={1000}

        atmosphereColor="#00f3ff"
        atmosphereAltitude={0.15}
        
        // Styling options
        width={typeof window !== 'undefined' ? window.innerWidth : 800}
        height={typeof window !== 'undefined' ? window.innerHeight : 800}
      />
    </div>
  );
}
