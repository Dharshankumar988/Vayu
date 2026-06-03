"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Line, Sphere, Text } from "@react-three/drei";
import { Suspense, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useSimulationStore } from "@/store/simulationStore";

// Mock regional nodes for Layer 2 (e.g. US East Region mapping)
const REGIONAL_NODES = [
  { id: "n1", name: "US-East-Primary", position: [-5, 0, -2], status: "operational", load: 0.8 },
  { id: "n2", name: "US-East-Replica-A", position: [2, 0, -6], status: "operational", load: 0.4 },
  { id: "n3", name: "US-East-Replica-B", position: [4, 0, 3], status: "degraded", load: 0.9 },
  { id: "n4", name: "Edge-Node-NY", position: [-2, 0, 5], status: "operational", load: 0.2 },
  { id: "n5", name: "Edge-Node-DC", position: [6, 0, -1], status: "offline", load: 0.0 },
];

const REGIONAL_CONNECTIONS = [
  ["us-east", "us-west"],
  ["us-east", "eu-central"],
  ["eu-central", "ap-tokyo"],
  ["us-west", "ap-tokyo"],
];

function ConnectionLines({ nodes }: { nodes: any[] }) {
  const lines = useMemo(() => {
    const arr = [];
    for (const [startId, endId] of REGIONAL_CONNECTIONS) {
      const start = nodes.find(n => n.id === startId);
      const end = nodes.find(n => n.id === endId);
      if (start && end) {
        arr.push({
          points: [
            start.position as [number, number, number],
            end.position as [number, number, number]
          ],
          color: start.status === 'offline' || end.status === 'offline' ? '#ff0055' : '#00f3ff'
        });
      }
    }
    return arr;
  }, [nodes]);

  return (
    <>
      {lines.map((line, i) => (
        <Line 
          key={i} 
          points={line.points} 
          color={line.color} 
          lineWidth={2} 
          transparent 
          opacity={0.3} 
        />
      ))}
    </>
  );
}

export default function Layer2Regional() {
  const regions = useSimulationStore((state) => state.regions);

  const activeNodes = useMemo(() => {
    // Map simulation store regions to 3D positions
    const posMap: Record<string, [number, number, number]> = {
      "us-east": [-4, 0, -2],
      "us-west": [-8, 0, 2],
      "eu-central": [0, 0, -4],
      "ap-tokyo": [8, 0, 0],
    };
    
    return Object.values(regions).map(r => ({
      ...r,
      position: posMap[r.id] || [0, 0, 0],
      status: r.trafficAnomaly ? 'degraded' : (r.load > 0.9 ? 'offline' : 'operational')
    }));
  }, [regions]);
  


  return (
    <div className="absolute inset-0 z-0 bg-black">
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[0, 15, 15]} fov={45} />
        <OrbitControls 
          target={[0, 0, 0]} 
          maxPolarAngle={Math.PI / 2 - 0.1} 
          minDistance={5} 
          maxDistance={40} 
        />
        
        {/* Atmosphere / Lighting */}
        <color attach="background" args={['#070715']} />
        <ambientLight intensity={0.8} />
        <directionalLight position={[10, 20, 10]} intensity={1.5} color="#00f3ff" />

        <Suspense fallback={null}>
          <group position={[0, -2, 0]}>
            {/* Cyber Grid Floor */}
            <gridHelper args={[100, 50, '#00f3ff', '#0a0a0f']} position={[0, -0.1, 0]} />
            
            <ConnectionLines nodes={activeNodes} />

            {/* Regional Nodes */}
            {activeNodes.map((node) => {
              let color = '#00ff66';
              if (node.status === 'offline') color = '#ff0055';
              if (node.status === 'degraded') color = '#ffaa00';

              return (
                <group key={node.id} position={node.position as [number, number, number]}>
                  {/* Glowing Node Sphere */}
                  <Sphere args={[0.5, 32, 32]}>
                    <meshStandardMaterial 
                      color={color} 
                      emissive={color} 
                      emissiveIntensity={1} 
                      transparent
                      opacity={0.9}
                    />
                  </Sphere>
                  
                  {/* Outer Ring */}
                  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
                    <ringGeometry args={[0.8, 0.9, 32]} />
                    <meshBasicMaterial color={color} transparent opacity={0.5} />
                  </mesh>

                  {/* Node Label */}
                  <Text 
                    position={[0, 1.5, 0]} 
                    fontSize={0.5} 
                    color="#ffffff" 
                    anchorX="center" 
                    anchorY="middle"
                  >
                    {node.name}
                  </Text>
                  <Text 
                    position={[0, 0.8, 0]} 
                    fontSize={0.25} 
                    color={color} 
                    anchorX="center" 
                    anchorY="middle"
                  >
                    Load: {(node.load * 100).toFixed(0)}%
                  </Text>
                </group>
              );
            })}
          </group>
        </Suspense>
      </Canvas>
    </div>
  );
}
