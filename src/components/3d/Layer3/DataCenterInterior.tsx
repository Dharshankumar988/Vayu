"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, ContactShadows, PerspectiveCamera, Line } from "@react-three/drei";
import ServerRack from "./ServerRack";
import { Suspense, useMemo } from "react";
import { useAppStore } from "@/store";

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
  const user = useAppStore(state => state.user);

  // RBAC Filtering
  const authorizedRacks = useMemo(() => {
    if (!user) return [];
    
    // Admin sees everything
    if (user.role === 'admin') return MOCK_RACKS;
    
    // Provider sees their DC (we'll just show everything for this mock DC)
    if (user.role === 'provider') return MOCK_RACKS;
    
    // Client sees only their specific servers
    if (user.role === 'client') {
      // Let's pretend Web-1, Web-2, DB-1 belong to "Stark Industries"
      // Cache-1, Analytics-1 belong to "Wayne Enterprises"
      // Since it's a mock, we filter servers based on some arbitrary rule or just randomly assign for the demo.
      // For demo, if user is Stark, they get rack-1. If Wayne, rack-2.
      return MOCK_RACKS.map(rack => {
        const filteredServers = rack.servers.map(s => {
          // If not owned, return offline/invisible state or mask it
          // We'll mask it by setting status to 'offline' and name to 'Restricted'
          const isOwned = (user.company_name === 'Stark Industries' && rack.id === 'rack-1') || 
                          (user.company_name === 'Wayne Enterprises' && rack.id === 'rack-2');
          
          if (!isOwned) {
            return { ...s, name: "Restricted", status: "offline" as const };
          }
          return s;
        });
        return { ...rack, servers: filteredServers };
      });
    }
    return [];
  }, [user]);

  // Fiber optics routing (Flow lines)
  const fiberLines = useMemo(() => {
    const lines = [];
    for (const rack of authorizedRacks) {
      lines.push({
        points: [
          [rack.position[0], 2.5, rack.position[2]] as [number, number, number],
          [rack.position[0], 5.0, rack.position[2]] as [number, number, number],
          [0, 5.0, -5] as [number, number, number],
        ],
        color: '#00f3ff'
      });
    }
    return lines;
  }, [authorizedRacks]);

  return (
    <div className="absolute inset-0 z-0 bg-[#070715]">
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[8, 12, 15]} fov={50} />
        <OrbitControls 
          target={[0, 4, 0]} 
          maxPolarAngle={Math.PI / 2 - 0.05} // Prevent camera from going under the floor
          minDistance={5} 
          maxDistance={30} 
        />
        
        {/* Environment and Lighting */}
        <color attach="background" args={['#070715']} />
        <ambientLight intensity={0.8} color="#ffffff" />
        <directionalLight 
          position={[10, 20, 10]} 
          intensity={1.2} 
          color="#00f3ff" 
          castShadow 
        />
        <pointLight position={[-10, 10, -10]} intensity={0.8} color="#b52aff" />

        <Suspense fallback={null}>
          <group position={[0, -2, 0]}>
            {/* Fiber Optics Flow Lines */}
            {fiberLines.map((line, i) => (
              <Line 
                key={`fiber-${i}`}
                points={line.points}
                color={line.color}
                lineWidth={3}
                transparent
                opacity={0.6}
              />
            ))}

            {/* Server Racks */}
            {authorizedRacks.map((rack) => (
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
