"use client";

import { Line } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";

interface ConstellationEdgeProps {
  from: THREE.Vector3;
  to: THREE.Vector3;
}

export function ConstellationEdge({ from, to }: ConstellationEdgeProps) {
  const points = useMemo(
    () => [
      new THREE.Vector3(from.x, from.y, from.z),
      new THREE.Vector3(to.x, to.y, to.z),
    ],
    [from, to]
  );

  return (
    <Line
      color="#6b8cce"
      lineWidth={1.5}
      opacity={0.5}
      points={points}
      transparent
    />
  );
}
