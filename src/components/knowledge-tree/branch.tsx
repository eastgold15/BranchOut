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

/* depth → 藤蔓粗细规格 */
function getVineRadius(depth: number): number {
  if (depth === 0) {
    return 0.04;
  }
  if (depth === 1) {
    return 0.025;
  }
  if (depth === 2) {
    return 0.012;
  }
  return 0.006;
}

/* 藤蔓颜色：根部深褐绿 → 藤绿 → 尖端嫩绿 */
const vineColors = [
  new THREE.Color("#4A3728"), // 根部深褐
  new THREE.Color("#5C7A4A"), // 过渡棕绿
  new THREE.Color("#6B8F5E"), // 藤绿
  new THREE.Color("#8FBA7A"), // 亮绿
  new THREE.Color("#A8E6A0"), // 尖端嫩绿
];

function getVineColor(t: number): THREE.Color {
  const clamped = Math.max(0, Math.min(1, t));
  const index = clamped * (vineColors.length - 1);
  const i = Math.floor(index);
  const f = index - i;
  const a = vineColors[Math.min(i, vineColors.length - 1)];
  const b = vineColors[Math.min(i + 1, vineColors.length - 1)];
  return a.clone().lerp(b, f);
}

export function Branch({
  start,
  end,
  thickness: _thickness,
  depth,
  weight = 0.5,
}: BranchProps) {
  const geometry = useMemo(() => {
    // 三个控制点，让藤蔓呈自然 S 弧
    const mid1 = new THREE.Vector3().lerpVectors(start, end, 0.3);
    const mid2 = new THREE.Vector3().lerpVectors(start, end, 0.7);

    // 扭曲偏移（depth 作为随机种子，每条藤蔓不同）
    const twist = depth * 1.7 + weight * 2.3;
    const offsetMag = 0.15 + depth * 0.08;
    mid1.x += Math.sin(twist) * offsetMag;
    mid1.y += Math.cos(twist * 0.7 + 0.5) * offsetMag * 0.6;
    mid1.z += Math.cos(twist * 1.2) * offsetMag * 0.8;

    mid2.x += Math.sin(twist * 1.4 + 1.0) * offsetMag * 0.7;
    mid2.y += Math.cos(twist * 0.9 + 2.0) * offsetMag * 0.5;
    mid2.z += Math.cos(twist * 1.7) * offsetMag * 0.9;

    const curve = new THREE.CubicBezierCurve3(start, mid1, mid2, end);

    // TubeGeometry — 分段粗细渐变通过缩放实现
    const radialSegments = 6;
    const tubularSegments = 12;
    const radius = getVineRadius(depth);

    const geo = new THREE.TubeGeometry(
      curve,
      tubularSegments,
      radius,
      radialSegments,
      false
    );

    // 顶点颜色渐变：根部 → 尖端
    const positions = geo.attributes.position;
    const colors = new Float32Array(positions.count * 3);

    // 找出每个顶点沿管道的 t 值
    for (let i = 0; i < positions.count; i++) {
      const y = positions.getY(i);
      // 归一化 y 在整条藤蔓中的位置
      const minY = Math.min(start.y, end.y);
      const maxY = Math.max(start.y, end.y);
      const range = maxY - minY || 1;
      const t = (y - minY) / range;

      const vineColor = getVineColor(t);
      colors[i * 3] = vineColor.r;
      colors[i * 3 + 1] = vineColor.g;
      colors[i * 3 + 2] = vineColor.b;
    }

    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    return geo;
  }, [start, end, depth, weight]);

  const opacity = 0.45 + weight * 0.35;

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial
        metalness={0.0}
        opacity={opacity}
        roughness={0.7}
        transparent
        vertexColors
      />
    </mesh>
  );
}
