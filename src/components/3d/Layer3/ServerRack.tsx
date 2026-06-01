"use client";

import { useMemo } from "react";
import ServerUnit from "./ServerUnit";

interface ServerData {
  id: string;
  name: string;
  status: 'active' | 'idle' | 'offline' | 'provisioning';
  unit_position: number;
  unit_size: number;
}

interface ServerRackProps {
  position: [number, number, number];
  servers: ServerData[];
}

export default function ServerRack({ position, servers }: ServerRackProps) {
  // A standard 42U rack is about 2 meters tall. 
  // Let's scale 1U = 0.25 units in 3D space.
  const UNIT_HEIGHT = 0.25;
  const TOTAL_UNITS = 42;
  const RACK_HEIGHT = TOTAL_UNITS * UNIT_HEIGHT;

  return (
    <group position={position}>
      {/* Rack Frame - Left */}
      <mesh position={[-1.0, RACK_HEIGHT / 2, 0]}>
        <boxGeometry args={[0.1, RACK_HEIGHT + 0.2, 2.6]} />
        <meshStandardMaterial color="#0a0a0f" metalness={0.9} roughness={0.5} />
      </mesh>

      {/* Rack Frame - Right */}
      <mesh position={[1.0, RACK_HEIGHT / 2, 0]}>
        <boxGeometry args={[0.1, RACK_HEIGHT + 0.2, 2.6]} />
        <meshStandardMaterial color="#0a0a0f" metalness={0.9} roughness={0.5} />
      </mesh>
      
      {/* Rack Frame - Top */}
      <mesh position={[0, RACK_HEIGHT + 0.15, 0]}>
        <boxGeometry args={[2.1, 0.1, 2.6]} />
        <meshStandardMaterial color="#0a0a0f" metalness={0.9} roughness={0.5} />
      </mesh>

      {/* Rack Frame - Bottom */}
      <mesh position={[0, -0.05, 0]}>
        <boxGeometry args={[2.1, 0.1, 2.6]} />
        <meshStandardMaterial color="#0a0a0f" metalness={0.9} roughness={0.5} />
      </mesh>

      {/* Servers in the Rack */}
      {servers.map((server) => {
        // unit_position is 1-indexed from bottom to top usually, or top to bottom.
        // Let's do bottom to top. 1U is at the bottom.
        const yPos = (server.unit_position - 1) * UNIT_HEIGHT + (UNIT_HEIGHT / 2);
        
        return (
          <ServerUnit 
            key={server.id}
            position={[0, yPos, 0]} 
            status={server.status}
            name={server.name}
          />
        );
      })}
      
      {/* Empty slot indicators (optional, for aesthetics) */}
      <mesh position={[0, RACK_HEIGHT / 2, 0]}>
        <boxGeometry args={[1.9, RACK_HEIGHT, 2.4]} />
        <meshBasicMaterial color="#000000" opacity={0.5} transparent />
      </mesh>
    </group>
  );
}
