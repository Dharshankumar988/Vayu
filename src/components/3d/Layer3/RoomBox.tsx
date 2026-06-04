"use client";

import { useMemo } from "react";
import { Html } from "@react-three/drei";
import type { Room, ServerSlot } from "@/store/dcStore";
import ServerRackCabinet from "./ServerRack";

interface RoomBoxProps {
  position: [number, number, number];
  room: Room;
  onSlotClick: (slot: ServerSlot) => void;
  currentUserId: string | null;
  isSelected?: boolean;
}

export default function RoomBox({ position, room, onSlotClick, currentUserId, isSelected = false }: RoomBoxProps) {
  const rackCount = room.racks.length;

  // Dynamic sizing based on rack count
  const layout = useMemo(() => {
    // 2 rows facing each other (hot/cold aisle)
    let racksPerRow: number;
    if (rackCount <= 6) {
      racksPerRow = Math.ceil(rackCount / 2);
    } else {
      racksPerRow = Math.min(6, Math.ceil(rackCount / 2));
    }
    racksPerRow = Math.max(3, racksPerRow); // min 3 per row

    const spacingX = 1.5;
    const rowGap = 2.5;
    const width = Math.max(6, racksPerRow * spacingX + 1.5);
    const depth = rowGap + 2.5;
    const height = 3.5;

    return { racksPerRow, spacingX, rowGap, width, depth, height };
  }, [rackCount]);

  // Compute rack positions — 2 rows facing each other
  const rackPositions = useMemo(() => {
    const positions: { rack: (typeof room.racks)[0]; pos: [number, number, number]; rotY: number }[] = [];
    const { racksPerRow, spacingX, rowGap } = layout;

    room.racks.forEach((rack, i) => {
      const row = i < racksPerRow ? 0 : 1;
      const col = row === 0 ? i : i - racksPerRow;
      if (col >= racksPerRow) return; // safety

      const totalWidth = (racksPerRow - 1) * spacingX;
      const x = col * spacingX - totalWidth / 2;
      const z = row === 0 ? -rowGap / 2 : rowGap / 2;
      const rotY = row === 0 ? 0 : Math.PI; // face each other

      positions.push({ rack, pos: [x, 0, z], rotY });
    });

    return positions;
  }, [room.racks, layout]);

  // Capacity calculation
  const capacity = useMemo(() => {
    let total = 0;
    let occupied = 0;
    room.racks.forEach((rack) => {
      const slots = rack.slots.slice(0, 4); // 4 slots per rack
      total += slots.length;
      occupied += slots.filter((s) => s.status !== 'available').length;
    });
    return { total, occupied, pct: total > 0 ? occupied / total : 0 };
  }, [room.racks]);

  const edgeColor = isSelected ? '#60a5fa' : '#ffffff';
  const edgeOpacity = isSelected ? 0.5 : 0.3;
  const boxOpacity = isSelected ? 0.12 : 0.08;

  return (
    <group position={position}>
      {/* Semi-transparent cuboid enclosure */}
      <mesh position={[0, layout.height / 2, 0]}>
        <boxGeometry args={[layout.width, layout.height, layout.depth + 1.0]} />
        <meshStandardMaterial
          color="#bfdbfe"
          transparent
          opacity={boxOpacity}
          depthWrite={false}
        />
      </mesh>

      {/* Wireframe edges */}
      <lineSegments position={[0, layout.height / 2, 0]}>
        <edgesGeometry args={[new (await_boxGeo(layout.width, layout.height, layout.depth + 1.0))]} />
        <lineBasicMaterial color={edgeColor} transparent opacity={edgeOpacity} />
      </lineSegments>

      {/* Frosted glass header bar with room name */}
      <Html
        position={[0, layout.height + 0.3, 0]}
        center
        style={{ pointerEvents: 'none' }}
      >
        <div className={`px-4 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap backdrop-blur-md border transition-all ${
          isSelected
            ? 'bg-blue-500/30 border-blue-400/50 text-blue-100 shadow-lg shadow-blue-500/20'
            : 'bg-slate-800/70 border-slate-600/40 text-slate-300'
        }`}>
          {room.name}
        </div>
      </Html>

      {/* Racks in hot/cold aisle layout */}
      {rackPositions.map(({ rack, pos, rotY }) => (
        <group key={rack.id} position={pos} rotation={[0, rotY, 0]}>
          <ServerRackCabinet
            position={[0, 0, 0]}
            rack={rack}
            onSlotClick={onSlotClick}
            currentUserId={currentUserId}
          />
        </group>
      ))}

      {/* Capacity indicator bar at base */}
      <group position={[0, 0.02, (layout.depth + 1.0) / 2 + 0.3]}>
        {/* Track */}
        <mesh>
          <boxGeometry args={[layout.width * 0.6, 0.06, 0.08]} />
          <meshStandardMaterial color="#374151" />
        </mesh>
        {/* Fill */}
        <mesh position={[-(layout.width * 0.6 * (1 - capacity.pct)) / 2, 0, 0.001]}>
          <boxGeometry args={[layout.width * 0.6 * capacity.pct, 0.06, 0.09]} />
          <meshStandardMaterial
            color={capacity.pct > 0.85 ? '#ef4444' : capacity.pct > 0.6 ? '#f59e0b' : '#22c55e'}
            emissive={capacity.pct > 0.85 ? '#ef4444' : capacity.pct > 0.6 ? '#f59e0b' : '#22c55e'}
            emissiveIntensity={0.5}
          />
        </mesh>
      </group>
    </group>
  );
}
