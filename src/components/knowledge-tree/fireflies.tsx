"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

interface Firefly {
  baseSize: number;
  color: THREE.Color;
  driftOffset: [number, number, number];
  phase: number;
  position: THREE.Vector3;
  speed: number;
}

interface FirefliesProps {
  count?: number;
}

const FIREFLY_COLORS = [
  new THREE.Color("#CDEA68"),
  new THREE.Color("#E3F09B"),
  new THREE.Color("#FCD34D"),
  new THREE.Color("#F97316"),
];

const SPREAD = 14;

export function Fireflies({ count = 80 }: FirefliesProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const fireflies = useMemo<Firefly[]>(() => {
    const result: Firefly[] = [];
    for (let i = 0; i < count; i++) {
      result.push({
        position: new THREE.Vector3(
          (Math.random() - 0.5) * SPREAD * 2,
          Math.random() * SPREAD - 4,
          (Math.random() - 0.5) * SPREAD * 2
        ),
        phase: Math.random() * Math.PI * 2,
        speed: 0.4 + Math.random() * 0.8,
        driftOffset: [
          Math.random() * 100,
          Math.random() * 100,
          Math.random() * 100,
        ],
        color:
          FIREFLY_COLORS[Math.floor(Math.random() * FIREFLY_COLORS.length)],
        baseSize: 0.08 + Math.random() * 0.17,
      });
    }
    return result;
  }, [count]);

  const { positions, colors, sizes } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const siz = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const f = fireflies[i];
      pos[i * 3] = f.position.x;
      pos[i * 3 + 1] = f.position.y;
      pos[i * 3 + 2] = f.position.z;
      col[i * 3] = f.color.r;
      col[i * 3 + 1] = f.color.g;
      col[i * 3 + 2] = f.color.b;
      siz[i] = f.baseSize;
    }
    return { positions: pos, colors: col, sizes: siz };
  }, [fireflies, count]);

  const positionAttr = useMemo(
    () => new THREE.BufferAttribute(positions.slice(), 3),
    [positions]
  );
  const colorAttr = useMemo(
    () => new THREE.BufferAttribute(colors.slice(), 3),
    [colors]
  );
  const sizeAttr = useMemo(
    () => new THREE.BufferAttribute(sizes.slice(), 1),
    [sizes]
  );

  // 存储每个萤火虫的当前游走位置（单独引用，避免闭包）
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally stable reference
  const driftPositions = useMemo(
    () => fireflies.map((f) => f.position.clone()),
    []
  );

  useFrame((state) => {
    if (!pointsRef.current) {
      return;
    }
    const time = state.clock.elapsedTime;
    const posAttr = pointsRef.current.geometry.attributes
      .position as THREE.BufferAttribute;
    const sizeAttr2 = pointsRef.current.geometry.attributes
      .size as THREE.BufferAttribute;

    for (let i = 0; i < count; i++) {
      const f = fireflies[i];
      const dp = driftPositions[i];

      // Perlin-like 平滑随机游走
      const dx =
        Math.sin(time * f.speed * 0.3 + f.driftOffset[0]) *
        Math.cos(time * f.speed * 0.2 + f.driftOffset[0] * 1.3) *
        0.008;
      const dy =
        Math.sin(time * f.speed * 0.25 + f.driftOffset[1]) *
        Math.cos(time * f.speed * 0.35 + f.driftOffset[1] * 0.7) *
        0.006;
      const dz =
        Math.sin(time * f.speed * 0.4 + f.driftOffset[2]) *
        Math.cos(time * f.speed * 0.15 + f.driftOffset[2] * 1.1) *
        0.008;

      dp.x += dx;
      dp.y += dy;
      dp.z += dz;

      // 软边界反弹
      const bound = SPREAD;
      if (dp.x > bound) {
        dp.x = -bound;
      }
      if (dp.x < -bound) {
        dp.x = bound;
      }
      if (dp.y > bound - 2) {
        dp.y = -bound + 2;
      }
      if (dp.y < -bound + 2) {
        dp.y = bound - 2;
      }
      if (dp.z > bound) {
        dp.z = -bound;
      }
      if (dp.z < -bound) {
        dp.z = bound;
      }

      posAttr.setXYZ(i, dp.x, dp.y, dp.z);

      // 呼吸闪烁
      const glow = Math.sin(time * f.speed + f.phase) * 0.5 + 0.5;
      sizeAttr2.setX(i, f.baseSize * (0.3 + glow * 0.7));
    }

    posAttr.needsUpdate = true;
    sizeAttr2.needsUpdate = true;
  });

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", positionAttr);
    geo.setAttribute("color", colorAttr);
    geo.setAttribute("size", sizeAttr);
    return geo;
  }, [positionAttr, colorAttr, sizeAttr]);

  return (
    <points frustumCulled={false} geometry={geometry} ref={pointsRef}>
      <pointsMaterial
        blending={THREE.AdditiveBlending}
        depthTest={false}
        opacity={0.85}
        size={0.2}
        sizeAttenuation
        transparent
        vertexColors
      />
    </points>
  );
}
