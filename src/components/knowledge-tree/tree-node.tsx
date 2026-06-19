"use client";

import { Html, useGLTF } from "@react-three/drei";
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

function getNodeScale(depth: number): number {
  const baseScale = 0.42;
  return Math.max(baseScale * (1 - depth * 0.08), baseScale * 0.65);
}

export function TreeNode({ node, position, onClick }: TreeNodeProps) {
  const groupRef = useRef<THREE.Group>(null);
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

  // 加载 3D 模型（R3F 缓存，只加载一次）
  const { scene: orangeScene } = useGLTF("/models/Orange.glb");

  // 克隆并缩放模型，每个节点独立实例
  const modelClone = useMemo(() => {
    const clone = orangeScene.clone(true);
    const s = nodeScale * 0.48;
    clone.scale.set(s, s, s);
    clone.rotation.set(
      Math.random() * 0.4,
      Math.random() * Math.PI * 2,
      Math.random() * 0.2
    );

    // 克隆材质以便每个节点独立控制 emissive
    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = child.material.clone();
        const mat = child.material as THREE.MeshStandardMaterial;
        mat.transparent = true;
        mat.opacity = 0.92;
        mat.envMapIntensity = 0.3;
      }
    });

    return clone;
  }, [orangeScene, nodeScale]);

  // 模型内所有 Mesh 引用缓存（避免每帧 traverse）
  const modelMeshes = useMemo(() => {
    if (!modelClone) {
      return [];
    }
    const meshes: THREE.Mesh[] = [];
    modelClone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        meshes.push(child);
      }
    });
    return meshes;
  }, [modelClone]);

  const coreColor = useMemo(() => new THREE.Color(colors.core), [colors.core]);

  useFrame((state) => {
    if (!groupRef.current) {
      return;
    }

    const time = state.clock.elapsedTime;
    const float = floatRef.current;
    const floatY = Math.sin(time * float.speed + float.offset) * float.amp;

    const dist = camera.position.distanceTo(basePosition);
    const t = 1 - Math.min(Math.max((dist - 5) / 20, 0), 1);

    // 核心 + 模型 同步呼吸脉冲
    const pulse = Math.sin(time * 1.5 + float.offset) * 0.3 + 0.7;

    // 发光核心
    if (coreRef.current) {
      const mat = coreRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = (hovered ? pulse * 1.2 : pulse * 0.6) * t;
    }

    // 模型 emissive 跟随核心
    for (const mesh of modelMeshes) {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.emissive = coreColor;
      mat.emissiveIntensity = hovered ? pulse * 0.5 : pulse * 0.25 * t;
    }

    // 光环动画
    if (
      ringRef.current &&
      (node.status === "explored" || node.status === "mastered")
    ) {
      ringRef.current.rotation.z = time * 0.6;
      ringRef.current.rotation.x = Math.sin(time * 0.4) * 0.3;
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
  });

  return (
    <group position={basePosition} ref={groupRef}>
      {/* Orange 3D 模型 */}
      {modelClone && <primitive object={modelClone} />}

      {/* 透明点击区域 */}
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
      >
        <sphereGeometry args={[nodeScale * 0.42, 8, 8]} />
        <meshBasicMaterial depthWrite={false} opacity={0} transparent />
      </mesh>

      {/* 内部发光核心 */}
      <mesh ref={coreRef}>
        <sphereGeometry args={[nodeScale * 0.15, 12, 12]} />
        <meshBasicMaterial
          color={colors.core}
          depthWrite={false}
          opacity={0.5}
          transparent
        />
      </mesh>

      {/* 已探索/已掌握状态的光环 */}
      {(node.status === "explored" || node.status === "mastered") && (
        <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[nodeScale * 1.4, 0.012, 8, 48]} />
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
        position={[0, nodeScale + 0.5, 0]}
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
          }}
        >
          {node.title}
        </div>
      </Html>
    </group>
  );
}
