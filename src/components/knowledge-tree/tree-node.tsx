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

/* 暗色森林 - 果实发光状态色 */
const fruitColors: Record<
  string,
  { shell: string; core: string; ring: string }
> = {
  untouched: { shell: "#5C6B4F", core: "#2D3A28", ring: "" },
  mentioned: { shell: "#34D399", core: "#6EE7B7", ring: "" },
  explored: { shell: "#A78BFA", core: "#C4B5FD", ring: "#A78BFA" },
  mastered: { shell: "#FCD34D", core: "#FDE68A", ring: "#FCD34D" },
  weak: { shell: "#FB7185", core: "#FDA4AF", ring: "" },
};

// 根据节点深度计算大小
function getNodeScale(depth: number): number {
  const baseScale = 0.42;
  return Math.max(baseScale * (1 - depth * 0.08), baseScale * 0.65);
}

// 轻柔 billboard —— 让果实微微朝向 camera
function gentleLookAt(obj: THREE.Object3D, camera: THREE.Camera, lerp = 0.04) {
  const target = new THREE.Vector3();
  target.copy(camera.position);
  obj.parent?.localToWorld(target.clone());
  const q = new THREE.Quaternion();
  obj.quaternion.slerp(
    q.setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      target.clone().sub(obj.position).normalize()
    ),
    lerp
  );
}

export function TreeNode({ node, position, onClick }: TreeNodeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const outerShellRef = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);
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

  const colors = fruitColors[node.status] || fruitColors.untouched;

  useFrame((state) => {
    if (!groupRef.current) {
      return;
    }

    const time = state.clock.elapsedTime;
    const float = floatRef.current;
    const floatY = Math.sin(time * float.speed + float.offset) * float.amp;

    const dist = camera.position.distanceTo(basePosition);
    const minDist = 5;
    const maxDist = 25;
    const t =
      1 - Math.min(Math.max((dist - minDist) / (maxDist - minDist), 0), 1);

    // 核心呼吸脉冲 (emissiveIntensity)
    if (coreRef.current) {
      const pulse = Math.sin(time * 1.5 + float.offset) * 0.3 + 0.7;
      const mat = coreRef.current.material as THREE.MeshPhysicalMaterial;
      mat.emissiveIntensity = hovered ? pulse * 1.5 : pulse * 0.8 * t;
    }

    // 外层微弱的 emissive 跟随核心
    if (outerShellRef.current) {
      const shellMat = outerShellRef.current
        .material as THREE.MeshPhysicalMaterial;
      shellMat.opacity = 0.15 + t * 0.2;
    }

    // 旋转光环动画（仅在 explored/mastered 状态）
    if (
      ringRef.current &&
      (node.status === "explored" || node.status === "mastered")
    ) {
      ringRef.current.rotation.z = time * 0.6;
      ringRef.current.rotation.x = Math.sin(time * 0.4) * 0.3;
      // 光环脉冲透明度
      const ringMat = ringRef.current.material as THREE.MeshBasicMaterial;
      ringMat.opacity = 0.3 + Math.sin(time * 1.2 + float.offset) * 0.15;
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

    // 果实微微朝向 camera（轻柔 billboard）
    gentleLookAt(groupRef.current, camera);
  });

  return (
    <group position={basePosition} ref={groupRef}>
      {/* 果实外壳 — 极薄半透明 */}
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
        ref={outerShellRef}
      >
        <sphereGeometry args={[nodeScale, 24, 24]} />
        <meshPhysicalMaterial
          color={colors.shell}
          emissive={colors.core}
          emissiveIntensity={0.05}
          envMapIntensity={0.5}
          ior={1.8}
          metalness={0.0}
          opacity={0.25}
          roughness={0.3}
          thickness={0.5}
          transmission={0.6}
          transparent
        />
      </mesh>

      {/* 发光核心 — 内部小 30% 强自发光 */}
      <mesh ref={coreRef}>
        <sphereGeometry args={[nodeScale * 0.7, 16, 16]} />
        <meshPhysicalMaterial
          color={colors.core}
          emissive={colors.core}
          emissiveIntensity={2.0}
          metalness={0.0}
          opacity={0.85}
          roughness={0.1}
          transparent
        />
      </mesh>

      {/* 已探索/已掌握状态的旋转光环 */}
      {(node.status === "explored" || node.status === "mastered") && (
        <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[nodeScale * 1.6, 0.015, 8, 48]} />
          <meshBasicMaterial
            color={colors.ring}
            depthWrite={false}
            opacity={0.4}
            transparent
          />
        </mesh>
      )}

      {/* 文字标签 */}
      <Html
        center
        distanceFactor={14}
        position={[0, nodeScale + 0.6, 0]}
        style={{ pointerEvents: "none" }}
      >
        <div
          className="whitespace-nowrap text-center font-bold text-sm transition-all duration-200"
          style={{
            color: hovered ? colors.shell : "#9CA3AF",
            textShadow: hovered
              ? `0 0 10px ${colors.core}, 0 0 20px ${colors.core}`
              : "0 1px 3px rgba(0,0,0,0.8)",
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
