"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface ServerUnitProps {
  position: [number, number, number];
  status: 'active' | 'idle' | 'offline' | 'provisioning';
  name: string;
  unit_size: number;
}

export default function ServerUnit({ position, status, name, unit_size }: ServerUnitProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  // Determine colors based on status
  const colors = useMemo(() => {
    switch (status) {
      case 'active': return { body: '#1a1a24', led: '#00f3ff', intensity: 1 };
      case 'idle': return { body: '#15151c', led: '#00ff66', intensity: 0.5 };
      case 'offline': return { body: '#0f0f14', led: '#ff0055', intensity: 0 };
      case 'provisioning': return { body: '#1a1a24', led: '#b52aff', intensity: 0.8 };
      default: return { body: '#15151c', led: '#555555', intensity: 0 };
    }
  }, [status]);

  useFrame(({ clock }) => {
    if (status === 'active' && lightRef.current) {
      // Simulate blinking activity lights
      lightRef.current.intensity = Math.sin(clock.elapsedTime * 10) * 0.5 + 0.5;
    } else if (status === 'provisioning' && lightRef.current) {
      lightRef.current.intensity = Math.sin(clock.elapsedTime * 2) * 0.8 + 0.2;
    }
  });

  const UNIT_HEIGHT = 0.25;
  const height = unit_size * UNIT_HEIGHT - 0.05;

  return (
    <group position={position}>
      {/* Server Chassis */}
      <mesh ref={meshRef}>
        <boxGeometry args={[1.9, height, 2.5]} />
        <meshStandardMaterial 
          color={colors.body} 
          metalness={0.8} 
          roughness={0.2} 
        />
      </mesh>
      
      {/* Front Panel detail */}
      <mesh position={[0, 0, 1.26]}>
        <planeGeometry args={[1.8, height - 0.02]} />
        <meshStandardMaterial color="#050508" />
      </mesh>

      {/* Status LED */}
      <mesh position={[0.7, 0, 1.27]}>
        <circleGeometry args={[0.03, 16]} />
        <meshBasicMaterial color={colors.led} />
      </mesh>
      
      <pointLight 
        ref={lightRef}
        position={[0.7, 0, 1.3]} 
        color={colors.led} 
        distance={1} 
        intensity={colors.intensity} 
      />
    </group>
  );
}
