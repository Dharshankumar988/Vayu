"use client";

import { useState, useMemo } from "react";
import { Html } from "@react-three/drei";
import type { Rack, ServerSlot } from "@/store/dcStore";

interface ServerRackProps {
  position: [number, number, number];
  rack: Rack;
  onSlotClick: (slot: ServerSlot) => void;
  currentUserId: string | null;
}

function ServerSlotMesh({
  slot,
  position,
  onClick,
  currentUserId,
  isHoveredRack,
}: {
  slot: ServerSlot;
  position: [number, number, number];
  onClick: () => void;
  currentUserId: string | null;
  isHoveredRack: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  const isOwned = slot.client_id === currentUserId;
  let color = '#334155';  
  let emissive = '#000000';
  let emissiveInt = 0;

  if (slot.status === 'available') {
    color = '#22c55e'; emissive = '#16a34a'; emissiveInt = hovered ? 0.8 : 0.3;
  } else if (isOwned) {
    color = '#3b82f6'; emissive = '#2563eb'; emissiveInt = hovered ? 1.0 : 0.5;
    if (slot.health === 'critical') { color = '#ef4444'; emissive = '#dc2626'; }
    if (slot.health === 'unhealthy') { color = '#f59e0b'; emissive = '#d97706'; }
  } else if (slot.status === 'occupied') {
    color = '#475569'; emissive = '#1e293b'; emissiveInt = 0.1;
  } else if (slot.status === 'maintenance') {
    color = '#f59e0b'; emissive = '#b45309'; emissiveInt = 0.4;
  } else if (slot.status === 'reserved') {
    color = '#8b5cf6'; emissive = '#7c3aed'; emissiveInt = 0.3;
  }

  if (hovered) emissiveInt = Math.min(1.5, emissiveInt + 0.5);

  const randTemp = useMemo(() => (20 + Math.random() * 15).toFixed(1), []);
  const randPower = useMemo(() => (150 + Math.random() * 300).toFixed(0), []);

  return (
    <group position={position}>
      <mesh
        castShadow
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
        onPointerOut={() => setHovered(false)}
      >
        <boxGeometry args={[0.85, 0.12, 0.55]} />
        <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={emissiveInt} roughness={0.3} metalness={0.8} />
      </mesh>

      {/* LED indicator strip */}
      <mesh position={[0.4, 0, 0]}>
        <boxGeometry args={[0.02, 0.08, 0.1]} />
        <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={2.0} />
      </mesh>

      {/* Detailed HTML Tooltip when hovered */}
      {hovered && (
        <Html position={[0, 0.1, 0.3]} center style={{ pointerEvents: 'none', zIndex: 50 }}>
          <div className="w-56 bg-slate-900/90 backdrop-blur-md border border-slate-700 shadow-2xl rounded-xl p-3 text-white">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-slate-400">{slot.server_name || (slot.status === 'available' ? 'Available Slot' : 'Occupied')}</span>
              <span className={`w-2 h-2 rounded-full ${slot.status === 'available' ? 'bg-green-500' : isOwned ? 'bg-blue-500' : 'bg-slate-500'}`} />
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-800/50 p-2 rounded">
                <span className="block text-slate-500 mb-0.5">Temp</span>
                <span className={`font-mono font-medium ${parseFloat(randTemp) > 30 ? 'text-red-400' : 'text-green-400'}`}>{randTemp}°C</span>
              </div>
              <div className="bg-slate-800/50 p-2 rounded">
                <span className="block text-slate-500 mb-0.5">Power</span>
                <span className="font-mono font-medium text-blue-400">{randPower}W</span>
              </div>
            </div>
            
            {isOwned && (
              <div className="mt-2 pt-2 border-t border-slate-700/50 text-xs flex justify-between">
                <span className="text-slate-400">Health</span>
                <span className={slot.health === 'healthy' ? 'text-green-400' : 'text-red-400'}>{slot.health}</span>
              </div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}

export default function ServerRackCuboid({ position, rack, onSlotClick, currentUserId }: ServerRackProps) {
  const [rackHovered, setRackHovered] = useState(false);
  const SLOT_OFFSET = 0.15;
  
  // Base rack height based on 10 slots + padding
  const rackHeight = (10 * SLOT_OFFSET) + 0.2; 

  const avgTemp = useMemo(() => (22 + Math.random() * 5).toFixed(1), []);

  return (
    <group 
      position={position}
      onPointerOver={(e) => { e.stopPropagation(); setRackHovered(true); }}
      onPointerOut={() => setRackHovered(false)}
    >
      {/* Translucent Glass Rack Enclosure */}
      <mesh castShadow position={[0, 0, 0]}>
        <boxGeometry args={[1.0, rackHeight, 0.7]} />
        <meshPhysicalMaterial 
          color="#3b82f6" 
          transmission={0.8} 
          opacity={1} 
          transparent 
          roughness={0.1} 
          ior={1.5} 
          thickness={0.05} 
        />
      </mesh>

      {/* Solid Rack Frame Pillars */}
      {[-0.48, 0.48].map((x) => (
        <mesh key={x} position={[x, 0, 0]}>
          <boxGeometry args={[0.04, rackHeight, 0.7]} />
          <meshStandardMaterial color="#1e293b" roughness={0.6} metalness={0.8} />
        </mesh>
      ))}

      {/* 10 Server Slots */}
      {rack.slots.map((slot, i) => (
        <ServerSlotMesh
          key={slot.id}
          slot={slot}
          position={[0, -(rackHeight/2) + 0.1 + (i * SLOT_OFFSET), 0]}
          onClick={() => onSlotClick(slot)}
          currentUserId={currentUserId}
          isHoveredRack={rackHovered}
        />
      ))}

      {/* Rack Overview Hover Label */}
      {rackHovered && (
        <Html position={[0, rackHeight / 2 + 0.3, 0]} center style={{ pointerEvents: 'none', zIndex: 40 }}>
          <div className="bg-slate-900/80 backdrop-blur-md border border-blue-500/30 shadow-lg px-3 py-2 rounded-lg text-white flex items-center gap-4">
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase">Rack ID</p>
              <p className="text-sm font-mono font-bold text-blue-400">{rack.name}</p>
            </div>
            <div className="w-px h-6 bg-slate-700" />
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase">Avg Temp</p>
              <p className="text-sm font-mono font-medium text-green-400">{avgTemp}°C</p>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}
