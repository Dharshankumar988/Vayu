"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Line, Sphere, Text } from "@react-three/drei";
import { Suspense, useMemo } from "react";
import * as THREE from "three";

// Mock regional nodes for Layer 2 (e.g. US East Region mapping)
const REGIONAL_NODES = [
  { id: "n1", name: "US-East-Primary", position: [-5, 0, -2], status: "operational", load: 0.8 },
  { id: "n2", name: "US-East-Replica-A", position: [2, 0, -6], status: "operational", load: 0.4 },
  { id: "n3", name: "US-East-Replica-B", position: [4, 0, 3], status: "degraded", load: 0.9 },
  { id: "n4", name: "Edge-Node-NY", position: [-2, 0, 5], status: "operational", load: 0.2 },
  { id: "n5", name: "Edge-Node-DC", position: [6, 0, -1], status: "offline", load: 0.0 },
];

const REGIONAL_CONNECTIONS = [
  ["n1", "n2"],
  ["n1", "n3"],
  ["n1", "n4"],
  ["n2", "n5"],
  ["n3", "n5"],
];

export default function Layer2Regional() {
  
  const lines = useMemo(() => {
    const arr = [];
    for (const [startId, endId] of REGIONAL_CONNECTIONS) {
      const start = REGIONAL_NODES.find(n => n.id === startId);
      const end = REGIONAL_NODES.find(n => n.id === endId);
      if (start && end) {
        // Create a small curve or just straight line for the fiber connection
        arr.push({
          points: [
            new THREE.Vector3(...start.position),
            new THREE.Vector3(...end.position)
          ],
          color: start.status === 'offline' || end.status === 'offline' ? '#330011' : '#00f3ff'
        });
      }
    }
    return arr;
  }, []);

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
        <color attach="background" args={['#030305']} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 20, 10]} intensity={1} color="#00f3ff" />

        <Suspense fallback={null}>
          <group position={[0, -2, 0]}>
            {/* Cyber Grid Floor */}
            <gridHelper args={[100, 50, '#1c1c24', '#0a0a0f']} position={[0, -0.1, 0]} />
            
            {/* Connection Lines */}
            {lines.map((line, i) => (
              <Line 
                key={i} 
                points={line.points} 
                color={line.color} 
                lineWidth={3} 
                dashed={false} 
                transparent 
                opacity={0.6} 
              />
            ))}

            {/* Regional Nodes */}
            {REGIONAL_NODES.map((node) => {
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
                    position={[0, 1.2, 0]} 
                    fontSize={0.4} 
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
