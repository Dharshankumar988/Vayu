"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, ContactShadows, PerspectiveCamera } from "@react-three/drei";
import ServerRack from "./ServerRack";
import { Suspense } from "react";

// Mock Data for the interior
const MOCK_RACKS = [
  {
    id: "rack-1",
    position: [-3, 0, 0] as [number, number, number],
    servers: [
      { id: "s1", name: "Web-1", status: "active" as const, unit_position: 2, unit_size: 1 },
      { id: "s2", name: "Web-2", status: "active" as const, unit_position: 4, unit_size: 1 },
      { id: "s3", name: "DB-1", status: "idle" as const, unit_position: 6, unit_size: 2 },
    ]
  },
  {
    id: "rack-2",
    position: [0, 0, 0] as [number, number, number],
    servers: [
      { id: "s4", name: "App-1", status: "provisioning" as const, unit_position: 10, unit_size: 1 },
      { id: "s5", name: "Cache-1", status: "active" as const, unit_position: 12, unit_size: 1 },
    ]
  },
  {
    id: "rack-3",
    position: [3, 0, 0] as [number, number, number],
    servers: [
      { id: "s6", name: "Analytics-1", status: "active" as const, unit_position: 5, unit_size: 1 },
      { id: "s7", name: "Analytics-2", status: "offline" as const, unit_position: 7, unit_size: 1 },
    ]
  }
];

export default function DataCenterInterior() {
  return (
    <div className="absolute inset-0 z-0 bg-black">
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[8, 12, 15]} fov={50} />
        <OrbitControls 
          target={[0, 4, 0]} 
          maxPolarAngle={Math.PI / 2 - 0.05} // Prevent camera from going under the floor
          minDistance={5} 
          maxDistance={30} 
        />
        
        {/* Environment and Lighting */}
        <color attach="background" args={['#050508']} />
        <ambientLight intensity={0.2} color="#ffffff" />
        <directionalLight 
          position={[10, 20, 10]} 
          intensity={0.5} 
          color="#00f3ff" 
          castShadow 
        />
        <pointLight position={[-10, 10, -10]} intensity={0.3} color="#b52aff" />

        <Suspense fallback={null}>
          <group position={[0, -2, 0]}>
            {/* Server Racks */}
            {MOCK_RACKS.map((rack) => (
              <ServerRack key={rack.id} position={rack.position} servers={rack.servers} />
            ))}

            {/* Floor */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
              <planeGeometry args={[100, 100]} />
              <meshStandardMaterial color="#0a0a0f" roughness={0.1} metalness={0.8} />
            </mesh>
            
            {/* Grid helper for cyber aesthetic */}
            <gridHelper args={[100, 100, '#00f3ff', '#1c1c24']} position={[0, 0, 0]} />
            
            <ContactShadows resolution={1024} scale={20} blur={2} opacity={0.5} far={10} color="#000000" />
          </group>
        </Suspense>
      </Canvas>
    </div>
  );
}
