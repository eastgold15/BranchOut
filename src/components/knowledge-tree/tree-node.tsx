"use client";

import { useRef, useState } from "react";
import { Sphere, Html } from "@react-three/drei";
import type { Mesh } from "three";
import type { TopicNodeData } from "@/types";
import { useSessionStore } from "@/store/sessionStore";

interface TreeNodeProps {
  node: TopicNodeData;
  position: [number, number, number];
  onClick: () => void;
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
        ref={meshRef}
        args={[0.4, 32, 32]}
        onClick={onClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <meshStandardMaterial
          color={statusColors[node.status]}
          emissive={statusEmissive[node.status]}
          emissiveIntensity={hovered || isFocused ? 0.5 : 0.2}
          roughness={0.3}
          metalness={0.2}
        />
      </Sphere>

      {(hovered || isFocused) && (
        <Html distanceFactor={10}>
          <div className="bg-slate-900/90 text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap border border-slate-700 shadow-xl pointer-events-none">
            <div className="font-medium">{node.title}</div>
            <div className="text-xs text-slate-400 capitalize">{node.status}</div>
          </div>
        </Html>
      )}

      {isFocused && (
        <Sphere args={[0.5, 32, 32]}>
          <meshBasicMaterial
            color={statusColors[node.status]}
            transparent
            opacity={0.2}
            wireframe
          />
        </Sphere>
      )}
    </group>
  );
}
