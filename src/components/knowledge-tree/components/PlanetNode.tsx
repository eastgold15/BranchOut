"use client";

import { Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useSessionStore } from "@/store/sessionStore";
import type { TopicNodeData } from "@/types";
import { getNodeScale, planetColors } from "../constants/planet-colors";
import { getPlanetForNode, loadPlanetModel } from "../utils/model-loader";
import { DraggableNode } from "./DraggableNode";
import { NebulaShell } from "./NebulaShell";

interface PlanetNodeProps {
  isGalaxy?: boolean;
  node: TopicNodeData;
  onClick: () => void;
  position: THREE.Vector3;
}

export function PlanetNode({
  node,
  position,
  onClick,
  isGalaxy = false,
}: PlanetNodeProps) {
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
  const [modelScene, setModelScene] = useState<THREE.Group | null>(null);
  const { camera } = useThree();

  // 从 store 获取节点偏移量
  const nodeOffsets = useSessionStore((s) => s.nodeOffsets);
  const draggingNodeId = useSessionStore((s) => s.draggingNodeId);
  const isDragging = draggingNodeId === node.id;

  const planetPath = useMemo(() => getPlanetForNode(node.id), [node.id]);
  const pointerWorld = useRef(new THREE.Vector3());
  const basePosition = useMemo(() => position.clone(), [position]);
  const nodeScale = useMemo(() => getNodeScale(node.depth ?? 0), [node.depth]);
  const colors = planetColors[node.status] || planetColors.untouched;

  // 计算最终位置：基础位置 + 偏移量
  const finalPosition = useMemo(() => {
    const offset = nodeOffsets.get(node.id) || [0, 0, 0];
    return new THREE.Vector3(
      basePosition.x + offset[0],
      basePosition.y + offset[1],
      basePosition.z + offset[2]
    );
  }, [basePosition, nodeOffsets, node.id]);

  // 异步加载星球模型
  useEffect(() => {
    let mounted = true;
    loadPlanetModel(planetPath, (scene) => {
      if (mounted) {
        setModelScene(scene);
      }
    });
    return () => {
      mounted = false;
    };
  }, [planetPath]);

  // 模型克隆 + 材质设置
  const modelClone = useMemo(() => {
    if (!modelScene) {
      return null;
    }
    const clone = modelScene.clone(true);
    const s = nodeScale * 1.8;
    clone.scale.set(s, s, s);
    clone.rotation.set(
      Math.random() * 0.4,
      Math.random() * Math.PI * 2,
      Math.random() * 0.2
    );

    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = child.material.clone();
        const mat = child.material as THREE.MeshStandardMaterial;
        mat.transparent = false;
        mat.opacity = 1.0;
        mat.envMapIntensity = 0.3;
        const baseColor = mat.color.clone();
        const brightness = baseColor.r + baseColor.g + baseColor.b;
        if (brightness < 0.3) {
          baseColor.multiplyScalar(2.0);
        }
        mat.emissive = baseColor;
        mat.emissiveIntensity = 0.6;
      }
    });

    return clone;
  }, [modelScene, nodeScale]);

  // 模型的 mesh 引用（避免每帧 traverse）
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

  useFrame((state) => {
    if (!groupRef.current) {
      return;
    }

    const time = state.clock.elapsedTime;
    const float = floatRef.current;
    const floatY = Math.sin(time * float.speed + float.offset) * float.amp;

    const dist = camera.position.distanceTo(finalPosition);
    const t = 1 - Math.min(Math.max((dist - 5) / 20, 0), 1);

    // 呼吸脉冲
    const pulse = Math.sin(time * 1.5 + float.offset) * 0.3 + 0.7;

    // 核心发光（始终显示）
    if (coreRef.current) {
      const mat = coreRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = (hovered ? pulse * 1.2 : pulse * 0.6) * Math.max(t, 0.3);
    }

    // 外壳发光脉冲
    if (outerShellRef.current) {
      const mat = outerShellRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.3 + pulse * 0.5;
    }

    // 模型 emissive 呼吸增强
    for (const mesh of modelMeshes) {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      const baseIntensity = 0.6;
      const breathe = pulse * 0.3;
      const hoverBoost = hovered ? 0.5 : 0;
      const dragBoost = isDragging ? 0.3 : 0;
      mat.emissiveIntensity = baseIntensity + breathe + hoverBoost + dragBoost;
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
    const targetPos = finalPosition.clone();
    targetPos.y += floatY;

    if (hovered && !isDragging) {
      const raycaster = state.raycaster;
      if (raycaster.ray) {
        raycaster.ray.at(10, pointerWorld.current);
        const dir = pointerWorld.current
          .clone()
          .sub(finalPosition)
          .normalize()
          .multiplyScalar(0.25);
        targetPos.add(dir);
      }
      groupRef.current.position.lerp(targetPos, 0.2);
    } else {
      groupRef.current.position.lerp(targetPos, isDragging ? 1 : 0.08);
    }
  });

  const hasModel = modelClone !== null;

  return (
    <DraggableNode
      basePosition={finalPosition}
      nodeId={node.id}
      nodeScale={nodeScale}
    >
      <group ref={groupRef}>
        {/* 星球 3D 模型（加载完成后显示） */}
        {hasModel && (
          <>
            <primitive object={modelClone} />
            {isGalaxy && <NebulaShell colors={colors} scale={nodeScale} />}
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
              <sphereGeometry args={[nodeScale * 1.0, 16, 16]} />
              <meshBasicMaterial depthWrite={false} opacity={0} transparent />
            </mesh>
          </>
        )}

        {/* 球体回退 — 实心发光 */}
        {!hasModel && (
          <>
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
              <meshStandardMaterial
                color={colors.shell}
                emissive={colors.core}
                emissiveIntensity={0.5}
                metalness={0.1}
                opacity={0.85}
                roughness={0.3}
                transparent
              />
            </mesh>
            {isGalaxy && <NebulaShell colors={colors} scale={nodeScale} />}
          </>
        )}

        {/* 发光核心 */}
        <mesh ref={coreRef}>
          <sphereGeometry args={[nodeScale * 0.5, 16, 16]} />
          <meshBasicMaterial
            color={colors.core}
            depthWrite={false}
            opacity={0.6}
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
          position={[0, nodeScale * 0.9 + 0.08, 0]}
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
    </DraggableNode>
  );
}
