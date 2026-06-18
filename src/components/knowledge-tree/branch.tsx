"use client";

import { useMemo } from "react";
import * as THREE from "three";

interface BranchProps {
  depth: number;
  end: THREE.Vector3;
  start: THREE.Vector3;
  thickness: number;
}

export function Branch({ start, end, thickness, depth }: BranchProps) {
  const geometry = useMemo(() => {
    // 创建带弯曲的树枝路径
    const midPoint = new THREE.Vector3()
      .addVectors(start, end)
      .multiplyScalar(0.5);

    // 添加轻微弯曲，让树枝更自然
    const perpendicular = new THREE.Vector3(
      Math.sin(depth * 1.5) * 0.2,
      0.1,
      Math.cos(depth * 1.5) * 0.2
    );
    midPoint.add(perpendicular);

    const curve = new THREE.QuadraticBezierCurve3(start, midPoint, end);
    return new THREE.TubeGeometry(
      curve,
      8,
      Math.max(thickness, 0.01),
      6,
      false
    );
  }, [start, end, thickness, depth]);

  // 越深的分支颜色越浅
  const color = depth === 0 ? "#5c4033" : depth === 1 ? "#6b5240" : "#7a6350";

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial
        color={color}
        metalness={0.05}
        opacity={0.85}
        roughness={0.8}
        transparent
      />
    </mesh>
  );
}
