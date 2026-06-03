"use client";

import { useRef, useState } from "react";
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
}: {
  slot: ServerSlot;
  position: [number, number, number];
  onClick: () => void;
  currentUserId: string | null;
}) {
  const [hovered, setHovered] = useState(false);

  const isOwned = slot.client_id === currentUserId;
  let color = '#e2e8f0';  // available = light
  let emissive = '#000000';
  let emissiveInt = 0;

  if (slot.status === 'available') {
    color = '#22c55e'; emissive = '#16a34a'; emissiveInt = hovered ? 0.6 : 0.2;
  } else if (isOwned) {
    color = '#3b82f6'; emissive = '#2563eb'; emissiveInt = hovered ? 0.8 : 0.4;
    if (slot.health === 'critical') { color = '#ef4444'; emissive = '#dc2626'; }
    if (slot.health === 'unhealthy') { color = '#f59e0b'; emissive = '#d97706'; }
  } else if (slot.status === 'occupied') {
    color = '#475569'; emissive = '#000000'; emissiveInt = 0;
  } else if (slot.status === 'maintenance') {
    color = '#f59e0b'; emissive = '#b45309'; emissiveInt = 0.3;
  } else if (slot.status === 'reserved') {
    color = '#8b5cf6'; emissive = '#7c3aed'; emissiveInt = 0.2;
  }

  if (hovered) emissiveInt = Math.min(1, emissiveInt + 0.3);

  return (
    <group position={position}>
      <mesh
        castShadow
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
        onPointerOut={() => setHovered(false)}
      >
        <boxGeometry args={[0.85, 0.22, 0.55]} />
        <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={emissiveInt} roughness={0.4} metalness={0.7} />
      </mesh>
      {/* Slot label */}
      {hovered && (
        <Html position={[0, 0.3, 0]} center style={{ pointerEvents: 'none' }}>
          <div className="px-2 py-1 bg-slate-900 border border-slate-600 rounded text-xs text-white whitespace-nowrap">
            {slot.server_name ?? (slot.status === 'available' ? '[ Available ]' : '[ Occupied ]')}
          </div>
        </Html>
      )}
      {/* LED indicator strip */}
      <mesh position={[0.4, 0, 0]}>
        <boxGeometry args={[0.04, 0.12, 0.1]} />
        <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={1.5} />
      </mesh>
    </group>
  );
}

export default function ServerRackCuboid({ position, rack, onSlotClick, currentUserId }: ServerRackProps) {
  const SLOT_H = 0.28;
  const SLOT_OFFSET = 0.32;

  return (
    <group position={position}>
      {/* Rack frame — dark gray cuboid */}
      <mesh castShadow>
        <boxGeometry args={[1.0, 1.5, 0.7]} />
        <meshStandardMaterial color="#1e293b" roughness={0.8} metalness={0.5} />
      </mesh>

      {/* Rack side pillars */}
      {[-0.45, 0.45].map((x) => (
        <mesh key={x} position={[x, 0, 0]}>
          <boxGeometry args={[0.06, 1.52, 0.72]} />
          <meshStandardMaterial color="#334155" roughness={0.6} metalness={0.8} />
        </mesh>
      ))}

      {/* 4 Server Slots */}
      {rack.slots.map((slot, i) => (
        <ServerSlotMesh
          key={slot.id}
          slot={slot}
          position={[0, -0.52 + i * SLOT_OFFSET, 0.01]}
          onClick={() => onSlotClick(slot)}
          currentUserId={currentUserId}
        />
      ))}

      {/* Rack name label */}
      <Html position={[0, 1.0, 0.38]} center>
        <div className="text-[9px] text-slate-400 bg-slate-900/80 px-1.5 py-0.5 rounded font-mono pointer-events-none">
          {rack.name}
        </div>
      </Html>
    </group>
  );
}
