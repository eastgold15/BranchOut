"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { getBarkTexture } from "@/lib/bark-texture";

interface BranchProps {
  depth: number;
  end: THREE.Vector3;
  start: THREE.Vector3;
  thickness: number;
  weight?: number;
}

/* depth → 树枝粗细规格 */
function getBranchRadius(depth: number): number {
  if (depth === 0) {
    return 0.05; // 主干
  }
  if (depth === 1) {
    return 0.03; // 主枝
  }
  if (depth === 2) {
    return 0.015; // 细枝
  }
  return 0.008; // 末梢
}

/** 对 TubeGeometry 做锥度缩放：根部粗 → 尖端细 */
function applyTaper(
  geo: THREE.TubeGeometry,
  curve: THREE.Curve<THREE.Vector3>,
  tubularSegments: number,
  radialSegments: number
): void {
  const positions = geo.attributes.position;
  const vertex = new THREE.Vector3();
  for (let i = 0; i <= tubularSegments; i++) {
    const t = i / tubularSegments;
    const taper = 1 - t * 0.7; // 根部 1.0 → 尖端 0.3
    const center = curve.getPoint(t);
    for (let j = 0; j <= radialSegments; j++) {
      const idx = i * (radialSegments + 1) + j;
      vertex.fromBufferAttribute(positions, idx);
      const dir = vertex.clone().sub(center).multiplyScalar(taper);
      vertex.copy(center).add(dir);
      vertex.toArray(positions.array as Float32Array, idx * 3);
    }
  }
  positions.needsUpdate = true;
  geo.computeVertexNormals();
}

export function Branch({
  start,
  end,
  thickness: _thickness,
  depth,
  weight = 0.5,
}: BranchProps) {
  const geometry = useMemo(() => {
    const mid1 = new THREE.Vector3().lerpVectors(start, end, 0.3);
    const mid2 = new THREE.Vector3().lerpVectors(start, end, 0.7);

    // 自然扭曲（depth 做随机种子）
    const twist = depth * 1.7 + weight * 2.3;
    const offsetMag = 0.12 + depth * 0.06;
    mid1.x += Math.sin(twist) * offsetMag;
    mid1.y += Math.cos(twist * 0.7 + 0.5) * offsetMag * 0.5;
    mid1.z += Math.cos(twist * 1.2) * offsetMag * 0.7;

    mid2.x += Math.sin(twist * 1.4 + 1.0) * offsetMag * 0.6;
    mid2.y += Math.cos(twist * 0.9 + 2.0) * offsetMag * 0.4;
    mid2.z += Math.cos(twist * 1.7) * offsetMag * 0.8;

    const curve = new THREE.CubicBezierCurve3(start, mid1, mid2, end);

    const radialSegments = 6;
    const tubularSegments = 12;
    const radius = getBranchRadius(depth);

    const geo = new THREE.TubeGeometry(
      curve,
      tubularSegments,
      radius,
      radialSegments,
      false
    );

    // 锥度渐变
    applyTaper(geo, curve, tubularSegments, radialSegments);

    return geo;
  }, [start, end, depth, weight]);

  const barkTexture = useMemo(() => getBarkTexture(), []);

  // depth 越深颜色越浅（末梢比主干亮）
  const colorTint = useMemo(() => {
    const factor = Math.max(0, 1 - depth * 0.2);
    return new THREE.Color().setHSL(0.07, 0.25, 0.18 + factor * 0.15);
  }, [depth]);

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial
        color={colorTint}
        map={barkTexture}
        metalness={0.0}
        roughness={0.85}
      />
    </mesh>
  );
}
