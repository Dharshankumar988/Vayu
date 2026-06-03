"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
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
      return MOCK_RACKS.map(rack => {
        const filteredServers = rack.servers.map(s => {
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

  return (
    <div className="absolute inset-0 z-0 bg-transparent">
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[0, 5, 12]} fov={50} />
        <OrbitControls 
          target={[0, 4, 0]} 
          minDistance={3} 
          maxDistance={20} 
        />
        
        {/* Clean Lighting focused just on racks */}
        <ambientLight intensity={1.5} color="#ffffff" />
        <directionalLight 
          position={[5, 10, 5]} 
          intensity={2.0} 
          color="#00f3ff" 
        />
        <pointLight position={[-5, 5, -5]} intensity={1.5} color="#b52aff" />

        <Suspense fallback={null}>
          <group position={[0, -4, 0]}>
            {/* Server Racks Only */}
            {authorizedRacks.map((rack) => (
              <ServerRack key={rack.id} position={rack.position} servers={rack.servers} />
            ))}
          </group>
        </Suspense>
      </Canvas>
    </div>
  );
}
