"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useAppStore } from "@/store";
import { useSimulationStore } from "@/store/simulationStore";

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
  
  const selectedRegionId = useAppStore((state) => state.selectedRegionId);
  const regions = useSimulationStore((state) => state.regions);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle region selection zoom
  useEffect(() => {
    if (!mounted || !globeRef.current) return;
    
    if (selectedRegionId && regions[selectedRegionId]) {
      const region = regions[selectedRegionId];
      globeRef.current.pointOfView({ lat: region.lat, lng: region.lng, altitude: 0.8 }, 2000);
      globeRef.current.controls().autoRotate = false;
    } else {
      globeRef.current.pointOfView({ altitude: 2.2 }, 2000);
      globeRef.current.controls().autoRotate = true;
    }
  }, [selectedRegionId, regions, mounted]);

  // Traffic visualization
  const arcsData = useMemo(() => {
    if (dataCenters.length < 2) return [];
    const arcs = [];
    const numArcs = 10;
    
    // Convert regions to array to pick random traffic routes
    const regionArr = Object.values(regions);
    
    for (let i = 0; i < numArcs; i++) {
      const srcDc = dataCenters[Math.floor(Math.random() * dataCenters.length)];
      const dstDc = dataCenters[Math.floor(Math.random() * dataCenters.length)];
      
      // Determine if a region has anomaly, if so, high chance of red lines
      const anomalyRegion = regionArr.find(r => r.trafficAnomaly);
      const isRed = anomalyRegion && Math.random() > 0.3; // 70% chance of red if anomaly exists globally
      
      // otherwise, shade of green based on some random load proxy
      const greenShade = Math.random() > 0.5 ? '#00ff66' : '#00aa44';

      if (srcDc.id !== dstDc.id) {
        arcs.push({
          startLat: srcDc.lat,
          startLng: srcDc.lng,
          endLat: dstDc.lat,
          endLng: dstDc.lng,
          color: isRed ? '#ff0033' : greenShade
        });
      }
    }
    return arcs;
  }, [dataCenters, regions]);

  // Regional Boundaries (Orange rings)
  const regionalRings = useMemo(() => {
    return Object.values(regions).map(r => ({
      lat: r.lat,
      lng: r.lng,
      name: r.name,
      anomaly: r.trafficAnomaly
    }));
  }, [regions]);

  if (!mounted) return null;

  return (
    <div className="absolute inset-0 cursor-grab active:cursor-grabbing">
      <Globe
        ref={globeRef}
        onGlobeReady={() => {
          if (globeRef.current) {
            globeRef.current.controls().autoRotate = !selectedRegionId;
            globeRef.current.controls().autoRotateSpeed = 0.5;
            globeRef.current.controls().enableDamping = true;
            if (!selectedRegionId) {
              globeRef.current.pointOfView({ altitude: 2.2 }, 3000);
            }
          }
        }}
        // Globe styling - blue/black theme
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundColor="rgba(0,0,0,0)"
        
        // Data Centers (Blue/Purple Glowing Cylinders)
        customLayerData={dataCenters}
        customThreeObject={(d: any) => {
          const height = d.size * 4;
          const geometry = new THREE.CylinderGeometry(0.3, 0.3, height, 32);
          geometry.applyMatrix4(new THREE.Matrix4().makeRotationX(Math.PI / 2));
          geometry.applyMatrix4(new THREE.Matrix4().makeTranslation(0, 0, height / 2));
          
          let color = '#7b2cbf'; // Purple
          if (d.status === 'offline') color = '#ff0033';
          if (d.status === 'degraded') color = '#ff9900';
          if (d.status === 'operational') color = '#00f3ff'; // Blue
          
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
        
        // Data Center Labels
        labelsData={dataCenters}
        labelLat={(d: any) => d.lat}
        labelLng={(d: any) => d.lng}
        labelText={(d: any) => ` ${d.name} `}
        labelSize={(d: any) => 1.2}
        labelDotRadius={0.3}
        labelColor={(d: any) => '#ffffff'}
        labelResolution={2}
        labelAltitude={(d: any) => (d.size * 4) / 100 + 0.05}
        
        // Traffic (Arcs)
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
        arcStroke={0.5}
        arcAltitudeAutoScale={0.4}
        
        // Regional Boundaries (Orange rings)
        ringsData={regionalRings}
        ringLat="lat"
        ringLng="lng"
        ringColor={(d: any) => d.anomaly ? '#ff0033' : '#ff8800'} // Orange or Red
        ringMaxRadius={(d: any) => 10} // Large radius for region
        ringPropagationSpeed={0.5}
        ringRepeatPeriod={2000}

        // Atmosphere
        atmosphereColor="#0033ff" 
        atmosphereAltitude={0.15}
        
        width={typeof window !== 'undefined' ? window.innerWidth : 800}
        height={typeof window !== 'undefined' ? window.innerHeight : 800}
      />
    </div>
  );
}
