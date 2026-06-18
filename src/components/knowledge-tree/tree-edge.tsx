"use client";

import { useMemo } from "react";
import { Line } from "@react-three/drei";
import * as THREE from "three";

interface TreeEdgeProps {
  from: [number, number, number];
  to: [number, number, number];
  color?: string;
}

export function TreeEdge({ from, to, color = "#475569" }: TreeEdgeProps) {
  const points = useMemo(() => {
    return [new THREE.Vector3(...from), new THREE.Vector3(...to)];
  }, [from, to]);

  return (
    <Line
      points={points}
      color={color}
      lineWidth={2}
      transparent
      opacity={0.6}
    />
  );
}
