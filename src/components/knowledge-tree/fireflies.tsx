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
  new THREE.Color("#fefcb0"),
  new THREE.Color("#fff7cc"),
  new THREE.Color("#ffe888"),
  new THREE.Color("#ffdd77"),
];

const SPREAD = 12;

// 顶点着色器、片元着色器（示例占位，你原有代码保留）
const vertexShader = `
attribute float size;
attribute vec3 color;
varying vec3 vColor;
varying float vAlpha;
void main() {
  vColor = color;
  vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = size * (300.0 / -mvPos.z);
  gl_Position = projectionMatrix * mvPos;
}
`;

const fragmentShader = `
uniform float uOpacity; // 接收JS传进来的透明度
varying vec3 vColor;
void main() {
  // 圆形光斑，去掉方块硬边
  float dist = length(gl_PointCoord - vec2(0.5));
  if (dist > 0.5) discard;
  float alpha = 1.0 - smoothstep(0.2, 0.5, dist);
  gl_FragColor = vec4(vColor, alpha * uOpacity); // 乘外部透明度
}
`;
function createShaderMaterial(opacity: number) {
  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uOpacity: { value: opacity }, // key 和 glsl uniform 名称对应
    },
    transparent: true,
    depthTest: false,
    blending: THREE.AdditiveBlending,
  });
}

export function Fireflies({ count = 80 }: FirefliesProps) {
  const pointsCoreRef = useRef<THREE.Points>(null);
  const pointsGlowRef = useRef<THREE.Points>(null);

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
        speed: 0.25 + Math.random() * 0.6,
        driftOffset: [
          Math.random() * 100,
          Math.random() * 100,
          Math.random() * 100,
        ],
        color:
          FIREFLY_COLORS[Math.floor(Math.random() * FIREFLY_COLORS.length)],
        baseSize: 0.06 + Math.random() * 0.12,
      });
    }
    return result;
  }, [count]);

  const driftPositions = useMemo(
    () => fireflies.map((f) => f.position.clone()),
    [fireflies.map]
  );

  const coreBuffer = useMemo(() => {
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
    return { pos, col, siz };
  }, [fireflies, count]);

  const glowBuffer = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const siz = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const f = fireflies[i];
      pos[i * 3] = f.position.x;
      pos[i * 3 + 1] = f.position.y;
      pos[i * 3 + 2] = f.position.z;
      col[i * 3] = f.color.r * 0.6;
      col[i * 3 + 1] = f.color.g * 0.6;
      col[i * 3 + 2] = f.color.b * 0.4;
      siz[i] = f.baseSize * 4.5;
    }
    return { pos, col, siz };
  }, [fireflies, count]);

  const coreAttrs = useMemo(
    () => ({
      pos: new THREE.BufferAttribute(coreBuffer.pos.slice(), 3),
      col: new THREE.BufferAttribute(coreBuffer.col.slice(), 3),
      size: new THREE.BufferAttribute(coreBuffer.siz.slice(), 1),
    }),
    [coreBuffer]
  );

  const glowAttrs = useMemo(
    () => ({
      pos: new THREE.BufferAttribute(glowBuffer.pos.slice(), 3),
      col: new THREE.BufferAttribute(glowBuffer.col.slice(), 3),
      size: new THREE.BufferAttribute(glowBuffer.siz.slice(), 1),
    }),
    [glowBuffer]
  );

  const coreGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", coreAttrs.pos);
    g.setAttribute("color", coreAttrs.col);
    g.setAttribute("size", coreAttrs.size);
    return g;
  }, [coreAttrs]);

  const glowGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", glowAttrs.pos);
    g.setAttribute("color", glowAttrs.col);
    g.setAttribute("size", glowAttrs.size);
    return g;
  }, [glowAttrs]);

  const coreMaterial = useMemo(() => createShaderMaterial(1), []);
  const glowMaterial = useMemo(() => createShaderMaterial(0.3), []);

  useFrame((state) => {
    if (!(pointsCoreRef.current && pointsGlowRef.current)) {
      return;
    }
    const time = state.clock.elapsedTime;
    const corePosAttr = pointsCoreRef.current.geometry.attributes
      .position as THREE.BufferAttribute;
    const coreSizeAttr = pointsCoreRef.current.geometry.attributes
      .size as THREE.BufferAttribute;
    const glowPosAttr = pointsGlowRef.current.geometry.attributes
      .position as THREE.BufferAttribute;
    const glowSizeAttr = pointsGlowRef.current.geometry.attributes
      .size as THREE.BufferAttribute;

    for (let i = 0; i < count; i++) {
      const f = fireflies[i];
      const dp = driftPositions[i];

      const dx =
        Math.sin(time * f.speed * 0.3 + f.driftOffset[0]) *
        Math.cos(time * f.speed * 0.2) *
        0.004;
      const dy =
        Math.sin(time * f.speed * 0.25 + f.driftOffset[1]) *
        Math.cos(time * f.speed * 0.35) *
        0.003;
      const dz =
        Math.sin(time * f.speed * 0.4 + f.driftOffset[2]) *
        Math.cos(time * f.speed * 0.15) *
        0.004;

      dp.x += dx;
      dp.y += dy;
      dp.z += dz;

      const bound = SPREAD;
      const softFactor = 0.008;
      if (dp.x > bound) {
        dp.x -= softFactor * (dp.x - bound);
      }
      if (dp.x < -bound) {
        dp.x += softFactor * (-bound - dp.x);
      }
      if (dp.y > bound - 2) {
        dp.y -= softFactor * (dp.y - (bound - 2));
      }
      if (dp.y < -bound + 2) {
        dp.y += softFactor * (-bound + 2 - dp.y);
      }
      if (dp.z > bound) {
        dp.z -= softFactor * (dp.z - bound);
      }
      if (dp.z < -bound) {
        dp.z += softFactor * (-bound - dp.z);
      }

      corePosAttr.setXYZ(i, dp.x, dp.y, dp.z);
      glowPosAttr.setXYZ(i, dp.x, dp.y, dp.z);

      const pulse = Math.sin(time * f.speed + f.phase) * 0.5 + 0.5;
      coreSizeAttr.setX(i, f.baseSize * (0.4 + pulse * 0.6));
      glowSizeAttr.setX(i, f.baseSize * 4.5 * (0.6 + pulse * 0.4));
    }

    corePosAttr.needsUpdate = true;
    coreSizeAttr.needsUpdate = true;
    glowPosAttr.needsUpdate = true;
    glowSizeAttr.needsUpdate = true;
  });

  return (
    <>
      <points
        frustumCulled={false}
        geometry={glowGeo}
        material={glowMaterial}
        ref={pointsGlowRef}
      />

      <points
        frustumCulled={false}
        geometry={coreGeo}
        material={coreMaterial}
        ref={pointsCoreRef}
      />
    </>
  );
}
