"use client";

import { Html, Sphere } from "@react-three/drei";
import { useRef, useState } from "react";
import type { Mesh } from "three";
import type { TopicNodeData } from "@/types";

interface TreeNodeProps {
  node: TopicNodeData;
  onClick: () => void;
  position: [number, number, number];
}

const statusColors = {
  untouched: "#64748b",
  mentioned: "#38bdf8",
  explored: "#818cf8",
  mastered: "#34d399",
  weak: "#f87171",
};

const statusEmissive = {
  untouched: "#1e293b",
  mentioned: "#0ea5e9",
  explored: "#6366f1",
  mastered: "#10b981",
  weak: "#ef4444",
};

export function TreeNode({ node, position, onClick }: TreeNodeProps) {
  const meshRef = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const isFocused = false;

  return (
    <group position={position}>
      <Sphere
        args={[0.4, 32, 32]}
        onClick={onClick}
        onPointerOut={() => setHovered(false)}
        onPointerOver={() => setHovered(true)}
        ref={meshRef}
      >
        <meshStandardMaterial
          color={statusColors[node.status]}
          emissive={statusEmissive[node.status]}
          emissiveIntensity={hovered || isFocused ? 0.5 : 0.2}
          metalness={0.2}
          roughness={0.3}
        />
      </Sphere>

      {(hovered || isFocused) && (
        <Html distanceFactor={10}>
          <div className="pointer-events-none whitespace-nowrap rounded-lg border border-slate-700 bg-slate-900/90 px-3 py-2 text-sm text-white shadow-xl">
            <div className="font-medium">{node.title}</div>
            <div className="text-slate-400 text-xs capitalize">
              {node.status}
            </div>
          </div>
        </Html>
      )}

      {isFocused && (
        <Sphere args={[0.5, 32, 32]}>
          <meshBasicMaterial
            color={statusColors[node.status]}
            opacity={0.2}
            transparent
            wireframe
          />
        </Sphere>
      )}
    </group>
  );
}
