"use client";

import * as THREE from "three";

interface NebulaShellProps {
  colors: { shell: string; core: string };
  scale: number;
}

export function NebulaShell({ scale, colors }: NebulaShellProps) {
  return (
    <mesh>
      <sphereGeometry args={[scale * 2.2, 32, 32]} />
      <meshStandardMaterial
        color={colors.shell}
        emissive={colors.core}
        emissiveIntensity={0.2}
        metalness={0}
        opacity={0.08}
        roughness={1}
        side={THREE.BackSide}
        transparent
      />
    </mesh>
  );
}
