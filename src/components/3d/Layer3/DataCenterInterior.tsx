"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Html } from "@react-three/drei";
import { Suspense, useState, useMemo, useRef } from "react";
import { useAppStore } from "@/store";
import { useDCStore } from "@/store/dcStore";
import type { Room, Rack, ServerSlot } from "@/store/dcStore";
import ServerRackCuboid from "./ServerRack";
import * as THREE from "three";

function RoomFloor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
      <planeGeometry args={[18, 14]} />
      <meshStandardMaterial color="#1e293b" metalness={0.4} roughness={0.6} />
    </mesh>
  );
}

function RoomGlassCuboid() {
  return (
    <mesh position={[0, 5, 0]}>
      <boxGeometry args={[18.2, 10, 14.2]} />
      <meshStandardMaterial
        color="#ffffff"
        transparent
        opacity={0.1}
        roughness={0.1}
        metalness={0.9}
        depthWrite={false}
      />
      {/* Wireframe edges to make it look like glass panels */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(18.2, 10, 14.2)]} />
        <lineBasicMaterial color="#ffffff" transparent opacity={0.3} />
      </lineSegments>
    </mesh>
  );
}

function NeonCable({ numRooms }: { numRooms: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame(({ clock }) => {
    if (meshRef.current && meshRef.current.material) {
      // Pulsating data flow effect
      const mat = meshRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 2.0 + Math.sin(clock.elapsedTime * 5.0) * 1.5;
    }
  });

  // Center cable should run from the start of the first room to the end of the last room.
  // Each room is 14 units long in Z (-7 to +7).
  const startZ = -7;
  const endZ = Math.max(0, numRooms - 1) * 20 + 7;
  const length = endZ - startZ;
  const zCenter = startZ + length / 2;

  return (
    <mesh ref={meshRef} position={[0, 0.2, zCenter]} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[0.08, 0.08, length, 16]} />
      <meshStandardMaterial
        color="#00f3ff"
        emissive="#00f3ff"
        emissiveIntensity={3}
        transparent
        opacity={0.9}
        roughness={0.1}
        metalness={0.8}
      />
    </mesh>
  );
}

function RackCable({ x, z }: { x: number; z: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame(({ clock }) => {
    if (meshRef.current && meshRef.current.material) {
      const mat = meshRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 1.5 + Math.sin(clock.elapsedTime * 6.0 + x + z) * 1.0;
    }
  });

  const length = Math.abs(x);
  const posX = x / 2;

  // If the rack is on the center line, no horizontal cable is needed
  if (length === 0) return null;

  return (
    <mesh ref={meshRef} position={[posX, 0.2, z]} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.04, 0.04, length, 8]} />
      <meshStandardMaterial
        color="#00f3ff"
        emissive="#00f3ff"
        emissiveIntensity={2}
        transparent
        opacity={0.8}
        roughness={0.2}
      />
    </mesh>
  );
}

function RoomLabel({ text, position }: { text: string; position: [number, number, number] }) {
  return (
    <Html position={position} center>
      <div className="px-3 py-1.5 bg-slate-800/90 border border-slate-600 rounded text-sm text-slate-200 font-bold pointer-events-none whitespace-nowrap shadow-lg">
        {text}
      </div>
    </Html>
  );
}

export default function DataCenterInterior() {
  const user = useAppStore((s) => s.user);
  const selectedDCId = useAppStore((s) => s.selectedDataCenterId);
  const dataCenters = useDCStore((s) => s.dataCenters);
  const selectedSlotIds = useAppStore((s) => s.selectedSlotIds);
  const toggleSelectedSlotId = useAppStore((s) => s.toggleSelectedSlotId);
  const clearSelectedSlots = useAppStore((s) => s.clearSelectedSlots);

  const dc = useMemo(() => {
    if (selectedDCId) return dataCenters.find((d) => d.id === selectedDCId);
    return dataCenters[0];
  }, [selectedDCId, dataCenters]);

  const selectedSlot = useMemo(() => {
    if (selectedSlotIds.length === 0 || !dc) return null;
    const lastId = selectedSlotIds[selectedSlotIds.length - 1];
    for (const room of dc.rooms) {
      for (const rack of room.racks) {
        for (const slot of rack.slots) {
          if (slot.id === lastId) return slot;
        }
      }
    }
    return null;
  }, [selectedSlotIds, dc]);

  const rooms = useMemo(() => {
    if (!dc || !user) return [];
    // Admin sees everything; client sees only their slots (others shown as occupied)
    if (user.role === 'admin') return dc.rooms;
    return dc.rooms.map((room) => ({
      ...room,
      racks: room.racks.map((rack) => ({
        ...rack,
        slots: rack.slots.map((slot) => {
          if (slot.status === 'occupied' && slot.client_id !== user.id) {
            return { ...slot, server_name: null, client_name: null };
          }
          return slot;
        }),
      })),
    }));
  }, [dc, user]);

  if (!dc) return <div className="text-white p-8">No data center selected.</div>;

  return (
    <div className="absolute inset-0 z-0" style={{ background: '#bdd8f2' }}>
      {/* DC name top left */}
      <div className="absolute top-4 left-4 z-20">
        <div className="px-4 py-2 bg-slate-800/90 border border-slate-700 rounded-xl shadow-xl">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Data Center</p>
          <p className="text-lg font-bold text-white">{dc.name}</p>
        </div>
      </div>

      {/* Slot info panel */}
      {selectedSlot && (
        <div className="absolute top-4 right-4 z-20 w-64 bg-slate-900/95 border border-blue-500/30 rounded-xl p-5 shadow-2xl animate-slide-in-right backdrop-blur-md">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h4 className="text-md font-bold text-white">Slot {selectedSlot.position}</h4>
              {selectedSlotIds.length > 1 && (
                <p className="text-xs text-blue-400 font-medium">({selectedSlotIds.length} slots selected)</p>
              )}
            </div>
            <button onClick={() => clearSelectedSlots()} className="text-slate-400 hover:text-white text-sm">✕</button>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-medium">Status</span>
              <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                selectedSlot.status === 'available' ? 'bg-green-500/20 text-green-400'
                : selectedSlot.status === 'occupied' ? 'bg-blue-500/20 text-blue-400'
                : 'bg-yellow-500/20 text-yellow-400'
              }`}>{selectedSlot.status}</span>
            </div>
            {selectedSlot.server_name && (
              <div className="flex justify-between border-t border-slate-700/50 pt-2">
                <span className="text-slate-400">Server</span>
                <span className="text-white font-mono">{selectedSlot.server_name}</span>
              </div>
            )}
            {selectedSlot.client_name && (
              <div className="flex justify-between border-t border-slate-700/50 pt-2">
                <span className="text-slate-400">Client</span>
                <span className="text-white text-right">{selectedSlot.client_name}</span>
              </div>
            )}
            {selectedSlot.status === 'occupied' && (
              <div className="pt-2 mt-2 border-t border-slate-700/50 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">CPU</span>
                  <span className="text-white font-mono">{(selectedSlot.cpu_util * 100).toFixed(0)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Memory</span>
                  <span className="text-white font-mono">{(selectedSlot.mem_util * 100).toFixed(0)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Health</span>
                  <span className={`font-medium ${
                    selectedSlot.health === 'healthy' ? 'text-green-400'
                    : selectedSlot.health === 'unhealthy' ? 'text-yellow-400'
                    : 'text-red-400'
                  }`}>{selectedSlot.health}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <Canvas shadows>
        {/* Adjusted camera to see multiple rooms better */}
        <PerspectiveCamera makeDefault position={[-15, 12, 20]} fov={50} />
        <OrbitControls target={[0, 0, (rooms.length - 1) * 10]} minDistance={5} maxDistance={60} maxPolarAngle={Math.PI * 0.48} />

        {/* Lighting */}
        <ambientLight intensity={0.5} color="#cbd5e1" />
        <directionalLight position={[10, 20, 10]} intensity={1.5} color="#ffffff" castShadow />
        <pointLight position={[-10, 10, -10]} intensity={0.8} color="#60a5fa" />
        <pointLight position={[10, 10, 10]} intensity={0.6} color="#34d399" />

        <Suspense fallback={null}>
          
          {/* Central Pulsating Neon Cable connecting all rooms */}
          <NeonCable numRooms={rooms.length} />

          {/* Render All Rooms */}
          {rooms.map((room, roomIdx) => {
            const zOffset = roomIdx * 20;

            return (
              <group key={room.id} position={[0, 0, zOffset]}>
                <RoomFloor />
                <RoomGlassCuboid />
                <RoomLabel text={room.name} position={[0, 10.5, 0]} />

                {/* Racks in the room */}
                {room.racks.map((rack, i) => {
                  const col = i % 3;
                  const row = Math.floor(i / 3);
                  // Position racks in a grid: X spacing 4.5, Z spacing 5
                  const x = (col - 1) * 4.5;
                  const z = row === 0 ? -3.5 : 3.5;
                  
                  return (
                    <group key={rack.id}>
                      <ServerRackCuboid
                        position={[x, 0, z]}
                        rack={rack}
                        onSlotClick={(slot) => toggleSelectedSlotId(slot.id)}
                        currentUserId={user?.id ?? null}
                      />
                      <RackCable x={x} z={z} />
                    </group>
                  );
                })}
              </group>
            );
          })}

        </Suspense>
      </Canvas>
    </div>
  );
}
