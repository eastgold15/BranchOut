"use client";

import { useMemo } from "react";
import * as THREE from "three";

interface BranchProps {
  depth: number;
  end: THREE.Vector3;
  start: THREE.Vector3;
  thickness: number;
  weight?: number;
}

const brightColors = [
  new THREE.Color("#93c5fd"), // 柔蓝
  new THREE.Color("#c4b5fd"), // 柔紫
  new THREE.Color("#fca5a5"), // 柔粉
  new THREE.Color("#86efac"), // 柔绿
];

export function Branch({
  start,
  end,
  thickness,
  depth,
  weight = 0.5,
}: BranchProps) {
  const geometry = useMemo(() => {
    const midPoint = new THREE.Vector3()
      .addVectors(start, end)
      .multiplyScalar(0.5);

    const perpendicular = new THREE.Vector3(
      Math.sin(depth * 1.5) * 0.25,
      0.12,
      Math.cos(depth * 1.5) * 0.25
    );
    midPoint.add(perpendicular);

    const curve = new THREE.QuadraticBezierCurve3(start, midPoint, end);
    const geo = new THREE.TubeGeometry(
      curve,
      16,
      Math.max(thickness, 0.006),
      8,
      false
    );
    return geo;
  }, [start, end, thickness, depth]);

  const color = useMemo(() => {
    const baseColor = brightColors[depth % brightColors.length];
    const lightColor = new THREE.Color("#f1f5f9");
    return lightColor.clone().lerp(baseColor, 0.4 + weight * 0.6);
  }, [weight, depth]);

  const opacity = 0.5 + weight * 0.35;

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial
        color={color}
        metalness={0.1}
        opacity={opacity}
        roughness={0.3}
        transparent
      />
    </mesh>
  );
}
