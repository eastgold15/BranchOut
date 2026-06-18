"use client";

import { Html, Sphere } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { TopicNodeData } from "@/types";

interface TreeNodeProps {
  node: TopicNodeData;
  onClick: () => void;
  position: THREE.Vector3;
}

const statusColors: Record<string, string> = {
  untouched: "#64748b",
  mentioned: "#38bdf8",
  explored: "#a78bfa",
  mastered: "#34d399",
  weak: "#f87171",
};

const statusGlow: Record<string, string> = {
  untouched: "#475569",
  mentioned: "#38bdf8",
  explored: "#818cf8",
  mastered: "#34d399",
  weak: "#f87171",
};

export function TreeNode({ node, position, onClick }: TreeNodeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const { camera } = useThree();

  // 磁性吸附效果：鼠标靠近时节点微微向鼠标方向移动
  const pointerWorld = useRef(new THREE.Vector3());
  const basePosition = useMemo(() => position.clone(), [position]);

  useFrame((state) => {
    if (!groupRef.current) {
      return;
    }

    // 计算摄像头到节点的距离
    const dist = camera.position.distanceTo(basePosition);
    // 距离越近越不透明（0.3 ~ 0.95）
    const minDist = 5;
    const maxDist = 25;
    const t =
      1 - Math.min(Math.max((dist - minDist) / (maxDist - minDist), 0), 1);

    // 发光脉冲动画
    if (glowRef.current) {
      const pulse = Math.sin(state.clock.elapsedTime * 2) * 0.1 + 0.3;
      glowRef.current.scale.setScalar(hovered ? 2.2 : 1.5 + pulse);
      (glowRef.current.material as THREE.MeshBasicMaterial).opacity = hovered
        ? 0.4
        : 0.15 * t;
    }

    // 磁性吸附：悬浮时微微靠近鼠标
    if (hovered) {
      const raycaster = state.raycaster;
      if (raycaster.ray) {
        raycaster.ray.at(10, pointerWorld.current);
        const dir = pointerWorld.current
          .clone()
          .sub(basePosition)
          .normalize()
          .multiplyScalar(0.15);
        groupRef.current.position.lerpVectors(
          basePosition,
          basePosition.clone().add(dir),
          0.3
        );
      }
    } else {
      groupRef.current.position.lerp(basePosition, 0.1);
    }
  });

  const color = statusColors[node.status] || statusColors.untouched;
  const glowColor = statusGlow[node.status] || statusGlow.untouched;

  return (
    <group position={basePosition} ref={groupRef}>
      {/* 主球体 - 半透明玻璃质感 */}
      <Sphere
        args={[0.35, 32, 32]}
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
      >
        <meshPhysicalMaterial
          clearcoat={1}
          clearcoatRoughness={0.1}
          color={color}
          envMapIntensity={0.8}
          metalness={0.1}
          opacity={0.55}
          roughness={0.1}
          side={THREE.DoubleSide}
          transparent
        />
      </Sphere>

      {/* 发光光晕 */}
      <Sphere args={[0.45, 16, 16]} ref={glowRef}>
        <meshBasicMaterial
          color={glowColor}
          opacity={0.15}
          side={THREE.BackSide}
          transparent
        />
      </Sphere>

      {/* 文字标签 - 始终显示 */}
      <Html
        center
        distanceFactor={12}
        position={[0, 0.6, 0]}
        style={{ pointerEvents: "none" }}
      >
        <div
          className="whitespace-nowrap rounded-md px-2 py-1 text-center font-medium text-xs shadow-lg transition-all"
          style={{
            color: hovered ? "#fff" : color,
            background: hovered
              ? "rgba(15, 23, 42, 0.92)"
              : "rgba(15, 23, 42, 0.6)",
            border: `1px solid ${hovered ? color : "transparent"}`,
            textShadow: hovered ? `0 0 8px ${glowColor}` : "none",
            transform: hovered ? "scale(1.15)" : "scale(1)",
          }}
        >
          {node.title}
        </div>
      </Html>
    </group>
  );
}
