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
  provider?: string;
  clients?: string[];
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

  // Mock Arc Data for traffic visualization (uncrowded neon flows)
  const arcsData = useMemo(() => {
    if (dataCenters.length < 2) return [];
    const arcs = [];
    // Reduced from 15 to 8 for uncrowded look
    for (let i = 0; i < 8; i++) {
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
        onGlobeReady={() => {
          if (globeRef.current) {
            globeRef.current.controls().autoRotate = true;
            globeRef.current.controls().autoRotateSpeed = 0.5;
            globeRef.current.controls().enableDamping = true;
            globeRef.current.pointOfView({ altitude: 2.2 }, 3000);
          }
        }}
        // Globe styling - bright cyber theme
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg" // Keeping dark earth so neon pops
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundImageUrl="" // Removed starry background for cleaner glassmorphic feel
        
        // Data Centers (High-tech Glowing Cylinders)
        customLayerData={dataCenters}
        customThreeObject={(d: any) => {
          const height = d.size * 4; // Taller for better visibility
          const geometry = new THREE.CylinderGeometry(0.3, 0.3, height, 32); // Thinner and smoother
          // Rotate to align with Z axis (pointing outwards from globe)
          geometry.applyMatrix4(new THREE.Matrix4().makeRotationX(Math.PI / 2));
          // Translate so base is on the globe surface
          geometry.applyMatrix4(new THREE.Matrix4().makeTranslation(0, 0, height / 2));
          
          let color = '#00ff66';
          if (d.status === 'offline') color = '#ff0055';
          if (d.status === 'degraded') color = '#ffaa00';
          
          // Use Physical material for premium glass/glow feel
          const material = new THREE.MeshPhysicalMaterial({ 
            color: color, 
            transparent: true, 
            opacity: 0.8,
            emissive: color,
            emissiveIntensity: 1.5,
            roughness: 0.1,
            metalness: 0.8,
            clearcoat: 1.0,
            clearcoatRoughness: 0.1,
          });
          
          return new THREE.Mesh(geometry, material);
        }}
        onCustomLayerClick={(point: any) => onDataCenterClick?.(point as DataCenter)}
        
        // Labels for Data Centers
        labelsData={dataCenters}
        labelLat={(d: any) => d.lat}
        labelLng={(d: any) => d.lng}
        labelText={(d: any) => ` ${d.name} `}
        labelSize={(d: any) => 1.2}
        labelDotRadius={0.3}
        labelColor={(d: any) => {
          if (d.status === 'offline') return '#ff0055';
          if (d.status === 'degraded') return '#ffaa00';
          return '#00ff66';
        }}
        labelResolution={2}
        labelAltitude={(d: any) => (d.size * 4) / 100 + 0.05} // Float just above the cylinder
        
        // Traffic (Arcs) - Smooth, glowing neon energy lines
        arcsData={arcsData}
        arcStartLat="startLat"
        arcStartLng="startLng"
        arcEndLat="endLat"
        arcEndLng="endLng"
        arcColor="color"
        arcDashLength={0.6}
        arcDashGap={1.5}
        arcDashInitialGap={() => Math.random() * 5}
        arcDashAnimateTime={1200}
        arcStroke={0.4}
        arcAltitudeAutoScale={0.4}
        
        // Rings around points to make them pulsate
        ringsData={dataCenters}
        ringLat="lat"
        ringLng="lng"
        ringColor={(d: any) => {
          if (d.status === 'offline') return '#ff0055';
          if (d.status === 'degraded') return '#ffaa00';
          return '#00f3ff';
        }}
        ringMaxRadius={(d: any) => d.size * 8}
        ringPropagationSpeed={2}
        ringRepeatPeriod={1000}

        // Atmosphere
        atmosphereColor="#0055ff" // Deep neon blue atmosphere
        atmosphereAltitude={0.15} // Tighter glowing halo
        
        // Styling options
        width={typeof window !== 'undefined' ? window.innerWidth : 800}
        height={typeof window !== 'undefined' ? window.innerHeight : 800}
      />
    </div>
  );
}
