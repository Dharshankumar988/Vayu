"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

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
        // Globe styling
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        
        // Data Centers (Cylindrical Rods)
        customLayerData={dataCenters}
        customThreeObject={(d: any) => {
          const height = d.size * 2;
          const geometry = new THREE.CylinderGeometry(0.8, 0.8, height, 16);
          // Rotate to align with Z axis (pointing outwards from globe)
          geometry.applyMatrix4(new THREE.Matrix4().makeRotationX(Math.PI / 2));
          // Translate so base is on the globe surface
          geometry.applyMatrix4(new THREE.Matrix4().makeTranslation(0, 0, height / 2));
          
          let color = '#00ff66';
          if (d.status === 'offline') color = '#ff0055';
          if (d.status === 'degraded') color = '#ffaa00';
          
          const material = new THREE.MeshLambertMaterial({ 
            color: color, 
            transparent: true, 
            opacity: 0.8,
            emissive: color,
            emissiveIntensity: 0.5
          });
          
          return new THREE.Mesh(geometry, material);
        }}
        customThreeObjectUpdate={(obj: any, d: any) => {
          // You could animate height here if needed
        }}
        onCustomLayerClick={(point: any) => onDataCenterClick?.(point as DataCenter)}
        
        // Disable old points
        pointsData={[]}
        
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
        ringColor={(d: any) => {
          if (d.status === 'offline') return '#ff0055';
          if (d.status === 'degraded') return '#ffaa00';
          return '#00f3ff';
        }}
        ringMaxRadius={(d: any) => d.size * 6}
        ringPropagationSpeed={2.5}
        ringRepeatPeriod={800}

        atmosphereColor="#00f3ff"
        atmosphereAltitude={0.25}
        
        // Styling options
        width={typeof window !== 'undefined' ? window.innerWidth : 800}
        height={typeof window !== 'undefined' ? window.innerHeight : 800}
      />
    </div>
  );
}
