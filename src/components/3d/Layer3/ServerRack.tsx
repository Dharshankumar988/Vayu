"use client";

import { useState, useMemo, useRef } from "react";
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import type { Rack, ServerSlot } from "@/store/dcStore";
import * as THREE from "three";

interface ServerRackProps {
  position: [number, number, number];
  rack: Rack;
  onSlotClick: (slot: ServerSlot) => void;
  currentUserId: string | null;
  selectedSlotIds?: string[];
}

// --- Slot component ---
function SlotMesh({
  slot,
  position,
  onClick,
  currentUserId,
  isSelected,
}: {
  slot: ServerSlot;
  position: [number, number, number];
  onClick: () => void;
  currentUserId: string | null;
  isSelected?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const [clicked, setClicked] = useState(false);
  const meshRef = useRef<THREE.Mesh>(null);
  const clickTimerRef = useRef<number>(0);

  const isOwned = slot.client_id === currentUserId;

  // Color coding
  const { color, emissive } = useMemo(() => {
    // If it's owned by this user, always green (even if selected for viewing)
    if (slot.status === 'occupied' && isOwned) {
      return { color: '#4ade80', emissive: '#16a34a' }; // Green for owned
    }
    // If it's selected to be bought (available + selected)
    if (isSelected && slot.status === 'available') {
      return { color: '#fde047', emissive: '#eab308' }; // Bright Yellow for selected slots
    }
    // If it's selected to be viewed but occupied by someone else (shouldn't really happen, but just in case)
    if (isSelected && slot.status === 'occupied') {
      return { color: '#cbd5e1', emissive: '#94a3b8' }; // Keep it grey
    }
    
    if (slot.status === 'available') {
      return { color: '#c084fc', emissive: '#9333ea' }; // Light purple for empty slots
    }
    if (slot.status === 'reserved') {
      return { color: '#8b5cf6', emissive: '#7c3aed' }; // Default reserved purple
    }
    if (slot.status === 'maintenance') {
      return { color: '#f59e0b', emissive: '#b45309' }; // Default amber
    }
    // occupied by other user
    return { color: '#cbd5e1', emissive: '#94a3b8' }; // Grey for occupied
  }, [slot.status, isOwned, isSelected]);

  // Deterministic values from cpu_util
  const temperature = useMemo(() => (slot.cpu_util * 30 + 20).toFixed(1), [slot.cpu_util]);
  const power = useMemo(() => (slot.cpu_util * 300 + 100).toFixed(0), [slot.cpu_util]);

  // Hover elevation + click pulse animation
  useFrame((_state, delta) => {
    if (!meshRef.current) return;
    const targetY = hovered ? position[1] + 0.02 : position[1];
    meshRef.current.position.y += (targetY - meshRef.current.position.y) * 8 * delta;

    if (clicked) {
      clickTimerRef.current += delta;
      if (clickTimerRef.current > 0.3) {
        setClicked(false);
        clickTimerRef.current = 0;
      }
    }
  });

  const emissiveIntensity = useMemo(() => {
    if (clicked) return 2.0;
    if (hovered) return 1.2;
    if (isSelected) return 1.5;
    if (slot.status === 'available') return 0.3;
    if (isOwned) return 0.5;
    return 0.1;
  }, [hovered, clicked, slot.status, isOwned, isSelected]);

  return (
    <group>
      {/* Main slot body */}
      <mesh
        ref={meshRef}
        position={position}
        castShadow
        onClick={(e) => {
          e.stopPropagation();
          setClicked(true);
          clickTimerRef.current = 0;
          onClick();
        }}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
        onPointerOut={() => setHovered(false)}
      >
        <boxGeometry args={[0.85, 0.42, 0.55]} />
        <meshStandardMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={emissiveIntensity}
          roughness={0.3}
          metalness={0.8}
        />
        {/* Subtle metallic outline to make slot clearly distinguishable */}
        <lineSegments>
          <edgesGeometry args={[new THREE.BoxGeometry(0.85, 0.42, 0.55)]} />
          <lineBasicMaterial color="#ffffff" transparent opacity={0.25} />
        </lineSegments>
      </mesh>

      {/* LED indicator strip on the right side */}
      <mesh position={[position[0] + 0.42, position[1], position[2]]}>
        <boxGeometry args={[0.02, 0.38, 0.1]} />
        <meshStandardMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={2.0}
        />
      </mesh>

      {/* Hover tooltip */}
      {hovered && (
        <Html position={[position[0], position[1] + 0.35, position[2] + 0.3]} center style={{ pointerEvents: 'none', zIndex: 50 }}>
          <div className="w-56 bg-slate-900/90 backdrop-blur-md border border-slate-700 shadow-2xl rounded-xl p-3 text-white">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-slate-400">
                {slot.server_name || (slot.status === 'available' ? 'Available Slot' : 'Occupied')}
              </span>
              <span className={`w-2 h-2 rounded-full ${
                slot.status === 'available' ? 'bg-green-500'
                : slot.status === 'reserved' ? 'bg-purple-500'
                : slot.status === 'maintenance' ? 'bg-amber-500'
                : isOwned ? 'bg-blue-500'
                : 'bg-slate-500'
              }`} />
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-800/50 p-2 rounded">
                <span className="block text-slate-500 mb-0.5">Temp</span>
                <span className={`font-mono font-medium ${parseFloat(temperature) > 35 ? 'text-red-400' : 'text-green-400'}`}>
                  {temperature}°C
                </span>
              </div>
              <div className="bg-slate-800/50 p-2 rounded">
                <span className="block text-slate-500 mb-0.5">Power</span>
                <span className="font-mono font-medium text-blue-400">{power}W</span>
              </div>
            </div>

            {slot.status === 'occupied' && (
              <div className="mt-2 pt-2 border-t border-slate-700/50 text-xs space-y-1">
                {isOwned && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-slate-400">CPU</span>
                      <span className="text-white">{(slot.cpu_util * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Memory</span>
                      <span className="text-white">{(slot.mem_util * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Health</span>
                      <span className={slot.health === 'healthy' ? 'text-green-400' : slot.health === 'unhealthy' ? 'text-yellow-400' : 'text-red-400'}>
                        {slot.health}
                      </span>
                    </div>
                  </>
                )}
                {!isOwned && slot.client_name && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Client</span>
                    <span className="text-slate-300">{slot.client_name}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}

// --- Main rack cabinet ---
export default function ServerRackCabinet({ position, rack, onSlotClick, currentUserId, selectedSlotIds = [] }: ServerRackProps) {
  const [rackHovered, setRackHovered] = useState(false);

  const RACK_W = 1.2;
  const RACK_H = 3.6;
  const RACK_D = 0.9;

  // Use only first 4 slots (gracefully handle racks with more)
  const slots = useMemo(() => rack.slots.slice(0, 4), [rack.slots]);

  // Slot positioning — 4 slots evenly distributed
  const SLOT_H = 0.45;
  const DIVIDER_H = 0.04;
  const totalSlotArea = SLOT_H * 4 + DIVIDER_H * 3;
  const slotStartY = -totalSlotArea / 2 + SLOT_H / 2 + 0.05;

  // Rack stats (deterministic)
  const stats = useMemo(() => {
    const total = slots.length;
    const occupied = slots.filter((s) => s.status !== 'available').length;
    return { total, occupied };
  }, [slots]);

  return (
    <group
      position={position}
      onPointerOver={(e) => { e.stopPropagation(); setRackHovered(true); }}
      onPointerOut={() => setRackHovered(false)}
    >
      {/* Main body panels — light blue shades */}
      <mesh position={[0, RACK_H / 2, 0]} castShadow>
        <boxGeometry args={[RACK_W, RACK_H, RACK_D]} />
        <meshStandardMaterial color="#bfdbfe" roughness={0.9} metalness={0.1} />
      </mesh>

      {/* Front face — tinted glass / perforated mesh look */}
      <mesh position={[0, RACK_H / 2, RACK_D / 2 + 0.001]}>
        <planeGeometry args={[RACK_W - 0.1, RACK_H - 0.1]} />
        <meshStandardMaterial
          color="#60a5fa"
          roughness={0.2}
          metalness={0.2}
          transparent
          opacity={0.15}
        />
      </mesh>

      {/* Frame — metallic edges */}
      <mesh position={[0, RACK_H / 2, 0]}>
        <boxGeometry args={[RACK_W + 0.04, RACK_H + 0.04, RACK_D + 0.04]} />
        <meshStandardMaterial
          color="#93c5fd"
          roughness={0.8}
          metalness={0.1}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Top cap panel */}
      <mesh position={[0, RACK_H + 0.02, 0]}>
        <boxGeometry args={[RACK_W + 0.02, 0.04, RACK_D + 0.02]} />
        <meshStandardMaterial color="#60a5fa" roughness={0.8} metalness={0.1} />
      </mesh>

      {/* Two vertical edge pillars */}
      {[-RACK_W / 2 - 0.01, RACK_W / 2 + 0.01].map((x) => (
        <mesh key={x} position={[x, RACK_H / 2, RACK_D / 2]}>
          <boxGeometry args={[0.06, RACK_H, 0.06]} />
          <meshStandardMaterial color="#3b82f6" roughness={0.8} metalness={0.1} />
        </mesh>
      ))}

      {/* 4 Server Slots */}
      {slots.map((slot, i) => {
        const y = RACK_H / 2 + slotStartY + i * (SLOT_H + DIVIDER_H);
        return (
          <SlotMesh
            key={slot.id}
            slot={slot}
            position={[0, y, 0.05]}
            onClick={() => onSlotClick(slot)}
            currentUserId={currentUserId}
            isSelected={selectedSlotIds.includes(slot.id)}
          />
        );
      })}

      {/* Thin metallic divider strips between slots */}
      {[0, 1, 2].map((i) => {
        const y = RACK_H / 2 + slotStartY + SLOT_H / 2 + i * (SLOT_H + DIVIDER_H) + DIVIDER_H / 2;
        return (
          <mesh key={`div-${i}`} position={[0, y, 0.05]}>
            <boxGeometry args={[1.0, DIVIDER_H, 0.6]} />
            <meshStandardMaterial color="#444444" metalness={0.9} roughness={0.3} />
          </mesh>
        );
      })}

      {/* Rack overview tooltip on hover */}
      {rackHovered && (
        <Html position={[0, RACK_H + 0.4, 0]} center style={{ pointerEvents: 'none', zIndex: 40 }}>
          <div className="bg-slate-900/80 backdrop-blur-md border border-blue-500/30 shadow-lg px-3 py-2 rounded-lg text-white flex items-center gap-4">
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase">Rack</p>
              <p className="text-sm font-mono font-bold text-blue-400">{rack.name}</p>
            </div>
            <div className="w-px h-6 bg-slate-700" />
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase">Slots</p>
              <p className="text-sm font-mono font-medium text-white">{stats.total}</p>
            </div>
            <div className="w-px h-6 bg-slate-700" />
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase">Used</p>
              <p className="text-sm font-mono font-medium text-amber-400">{stats.occupied}</p>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}
