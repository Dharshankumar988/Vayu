"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Html } from "@react-three/drei";
import { Suspense, useState, useMemo } from "react";
import { useAppStore } from "@/store";
import { useDCStore } from "@/store/dcStore";
import type { Room, Rack, ServerSlot } from "@/store/dcStore";
import ServerRackCuboid from "./ServerRack";

function RoomDivider() {
  return (
    <mesh position={[0, 2, 0]}>
      <boxGeometry args={[0.15, 4, 8]} />
      <meshStandardMaterial color="#94a3b8" transparent opacity={0.4} />
    </mesh>
  );
}

function Floor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
      <planeGeometry args={[22, 12]} />
      <meshStandardMaterial color="#1e293b" metalness={0.3} roughness={0.7} />
    </mesh>
  );
}

function RoomLabel({ text, position }: { text: string; position: [number, number, number] }) {
  return (
    <Html position={position} center>
      <div className="px-2 py-1 bg-slate-800/80 border border-slate-600 rounded text-xs text-slate-300 font-medium pointer-events-none whitespace-nowrap">
        {text}
      </div>
    </Html>
  );
}

export default function DataCenterInterior() {
  const user = useAppStore((s) => s.user);
  const selectedDCId = useAppStore((s) => s.selectedDataCenterId);
  const dataCenters = useDCStore((s) => s.dataCenters);
  const [selectedRoomIdx, setSelectedRoomIdx] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState<ServerSlot | null>(null);

  const dc = useMemo(() => {
    if (selectedDCId) return dataCenters.find((d) => d.id === selectedDCId);
    return dataCenters[0];
  }, [selectedDCId, dataCenters]);

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

  const currentRoom = rooms[selectedRoomIdx];
  const isLeftRoom  = selectedRoomIdx === 0;

  return (
    <div className="absolute inset-0 z-0" style={{ background: '#0f172a' }}>
      {/* 2D overlay: room selector + slot info */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
        {rooms.map((room, idx) => (
          <button
            key={room.id}
            onClick={() => setSelectedRoomIdx(idx)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              idx === selectedRoomIdx
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                : 'bg-slate-700/80 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {room.name}
          </button>
        ))}
      </div>

      {/* DC name */}
      <div className="absolute top-4 left-4 z-20">
        <div className="px-3 py-1.5 bg-slate-800/90 border border-slate-700 rounded-lg">
          <p className="text-xs text-slate-400">Data Center</p>
          <p className="text-sm font-semibold text-white">{dc.name}</p>
        </div>
      </div>

      {/* Slot info panel */}
      {selectedSlot && (
        <div className="absolute top-4 right-4 z-20 w-60 bg-slate-900/95 border border-slate-700 rounded-xl p-4 animate-slide-in-right">
          <div className="flex justify-between items-start mb-3">
            <h4 className="text-sm font-semibold text-white">Slot {selectedSlot.position}</h4>
            <button onClick={() => setSelectedSlot(null)} className="text-slate-400 hover:text-white text-xs">✕</button>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Status</span>
              <span className={`font-medium ${
                selectedSlot.status === 'available' ? 'text-green-400'
                : selectedSlot.status === 'occupied' ? 'text-blue-400'
                : 'text-yellow-400'
              }`}>{selectedSlot.status}</span>
            </div>
            {selectedSlot.server_name && (
              <div className="flex justify-between">
                <span className="text-slate-400">Server</span>
                <span className="text-white font-mono">{selectedSlot.server_name}</span>
              </div>
            )}
            {selectedSlot.client_name && (
              <div className="flex justify-between">
                <span className="text-slate-400">Client</span>
                <span className="text-white">{selectedSlot.client_name}</span>
              </div>
            )}
            {selectedSlot.status === 'occupied' && (
              <>
                <div className="flex justify-between">
                  <span className="text-slate-400">CPU</span>
                  <span className="text-white">{(selectedSlot.cpu_util * 100).toFixed(0)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Memory</span>
                  <span className="text-white">{(selectedSlot.mem_util * 100).toFixed(0)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Health</span>
                  <span className={`font-medium ${
                    selectedSlot.health === 'healthy' ? 'text-green-400'
                    : selectedSlot.health === 'unhealthy' ? 'text-yellow-400'
                    : 'text-red-400'
                  }`}>{selectedSlot.health}</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[0, 6, 14]} fov={55} />
        <OrbitControls target={[0, 1, 0]} minDistance={4} maxDistance={22} maxPolarAngle={Math.PI * 0.55} />

        {/* Lighting */}
        <ambientLight intensity={0.6} color="#e2e8f0" />
        <directionalLight position={[8, 12, 8]} intensity={1.4} color="#ffffff" castShadow />
        <pointLight position={[-6, 4, -4]} intensity={0.8} color="#60a5fa" />
        <pointLight position={[6, 4, 4]} intensity={0.6} color="#34d399" />

        <Suspense fallback={null}>
          <Floor />
          <RoomDivider />

          {/* Room Label */}
          <RoomLabel text={`${currentRoom?.name ?? 'Room'} — ${dc.name}`} position={[0, 5.5, 0]} />

          {/* Racks in current room — 6 racks in 2 rows of 3 */}
          {currentRoom?.racks.map((rack, i) => {
            const col = i % 3;
            const row = Math.floor(i / 3);
            const x = (col - 1) * 4.5 + (isLeftRoom ? -5.5 : 5.5);
            const z = row === 0 ? -2.5 : 2.5;
            return (
              <ServerRackCuboid
                key={rack.id}
                position={[x, 0, z]}
                rack={rack}
                onSlotClick={(slot) => setSelectedSlot(slot)}
                currentUserId={user?.id ?? null}
              />
            );
          })}
        </Suspense>
      </Canvas>
    </div>
  );
}
