"use client";

import { Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { TopicNodeData } from "@/types";

interface TreeNodeProps {
  node: TopicNodeData;
  onClick: () => void;
  position: THREE.Vector3;
}

/* 亮色系状态颜色 */
const statusColors: Record<string, string> = {
  untouched: "#94a3b8",
  mentioned: "#0ea5e9",
  explored: "#8b5cf6",
  mastered: "#10b981",
  weak: "#f43f5e",
};

const statusGlow: Record<string, string> = {
  untouched: "#cbd5e1",
  mentioned: "#bae6fd",
  explored: "#ddd6fe",
  mastered: "#a7f3d0",
  weak: "#fecdd3",
};

// 根据节点深度计算大小
function getNodeScale(depth: number): number {
  const baseScale = 0.42;
  return Math.max(baseScale * (1 - depth * 0.08), baseScale * 0.65);
}

export function TreeNode({ node, position, onClick }: TreeNodeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const crystalRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const floatRef = useRef({
    offset: Math.random() * Math.PI * 2,
    speed: 0.5 + Math.random() * 0.5,
    amp: 0.05 + Math.random() * 0.05,
  });
  const [hovered, setHovered] = useState(false);
  const { camera } = useThree();

  const pointerWorld = useRef(new THREE.Vector3());
  const basePosition = useMemo(() => position.clone(), [position]);
  const nodeScale = useMemo(() => getNodeScale(node.depth ?? 0), [node.depth]);

  const color = statusColors[node.status] || statusColors.untouched;
  const glowColor = statusGlow[node.status] || statusGlow.untouched;

  useFrame((state) => {
    if (!groupRef.current) {
      return;
    }

    const time = state.clock.elapsedTime;
    const float = floatRef.current;
    const floatY = Math.sin(time * float.speed + float.offset) * float.amp;

    // 水晶缓慢旋转
    if (crystalRef.current) {
      crystalRef.current.rotation.y = time * 0.3 + node.depth;
      crystalRef.current.rotation.x = Math.sin(time * 0.2 + node.depth) * 0.2;
    }

    const dist = camera.position.distanceTo(basePosition);
    const minDist = 5;
    const maxDist = 25;
    const t =
      1 - Math.min(Math.max((dist - minDist) / (maxDist - minDist), 0), 1);

    // 柔和光晕脉冲
    if (glowRef.current) {
      const pulse = Math.sin(time * 2 + node.depth * 0.7) * 0.1 + 0.3;
      const scale = hovered ? 2.0 : 1.4 + pulse;
      glowRef.current.scale.setScalar(scale);
      const mat = glowRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = hovered ? 0.35 : 0.18 * t;
    }

    // 旋转光环动画（仅在 explored/mastered 状态）
    if (
      ringRef.current &&
      (node.status === "explored" || node.status === "mastered")
    ) {
      ringRef.current.rotation.z = time * 0.6;
      ringRef.current.rotation.x = Math.sin(time * 0.4) * 0.3;
    }

    // 磁性吸附 + 浮动
    const targetPos = basePosition.clone();
    targetPos.y += floatY;

    if (hovered) {
      const raycaster = state.raycaster;
      if (raycaster.ray) {
        raycaster.ray.at(10, pointerWorld.current);
        const dir = pointerWorld.current
          .clone()
          .sub(basePosition)
          .normalize()
          .multiplyScalar(0.25);
        targetPos.add(dir);
      }
      groupRef.current.position.lerp(targetPos, 0.2);
    } else {
      groupRef.current.position.lerp(targetPos, 0.08);
    }
  });

  return (
    <group position={basePosition} ref={groupRef}>
      {/* 水晶主体 - 八面体 */}
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHovered(false);
          document.body.style.cursor = "auto";
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        ref={crystalRef}
      >
        <octahedronGeometry args={[nodeScale, 0]} />
        <meshPhysicalMaterial
          clearcoat={1}
          clearcoatRoughness={0.05}
          color={color}
          envMapIntensity={1.5}
          ior={2.4}
          metalness={0.05}
          opacity={0.9}
          roughness={0.02}
          thickness={1.2}
          transmission={0.55}
          transparent
        />
        {/* 水晶线框切面 - 随父级一起旋转 */}
        <mesh>
          <octahedronGeometry args={[nodeScale * 1.01, 0]} />
          <meshBasicMaterial
            color="#ffffff"
            opacity={0.15}
            transparent
            wireframe
          />
        </mesh>
      </mesh>

      {/* 柔和光晕 */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[nodeScale * 1.3, 16, 16]} />
        <meshBasicMaterial
          color={glowColor}
          depthWrite={false}
          opacity={0.18}
          transparent
        />
      </mesh>

      {/* 已探索/已掌握状态的光环 */}
      {(node.status === "explored" || node.status === "mastered") && (
        <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[nodeScale * 1.8, 0.02, 8, 48]} />
          <meshBasicMaterial
            color={node.status === "mastered" ? "#34d399" : "#a78bfa"}
            depthWrite={false}
            opacity={0.5}
            transparent
          />
        </mesh>
      )}

      {/* 文字标签 - 纯文字无框 */}
      <Html
        center
        distanceFactor={14}
        position={[0, nodeScale + 0.6, 0]}
        style={{ pointerEvents: "none" }}
      >
        <div
          className="whitespace-nowrap text-center font-bold text-sm transition-all duration-200"
          style={{
            color: hovered ? color : "#334155",
            textShadow: hovered
              ? `0 0 10px ${glowColor}, 0 0 20px ${glowColor}`
              : `0 1px 3px rgba(255,255,255,0.9), 0 0 6px ${glowColor}`,
            transform: hovered ? "scale(1.2) translateY(-2px)" : "scale(1)",
            letterSpacing: "0.03em",
          }}
        >
          {node.title}
        </div>
      </Html>
    </group>
  );
}
