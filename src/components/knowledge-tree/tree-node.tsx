"use client";

import { Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
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

// ── 模型缓存（只加载一次，所有节点共享） ──────────────
let orangeCachedScene: THREE.Group | null = null;
let modelLoading = false;
const loadQueue: Array<(scene: THREE.Group | null) => void> = [];

function loadOrangeModel(cb: (scene: THREE.Group | null) => void) {
  if (orangeCachedScene) {
    cb(orangeCachedScene);
    return;
  }
  loadQueue.push(cb);
  if (modelLoading) {
    return;
  }
  modelLoading = true;
  const loader = new GLTFLoader();
  loader.load(
    "/models/Orange.glb",
    (gltf) => {
      console.log("Orange model loaded:", gltf);
      orangeCachedScene = gltf.scene;
      for (const queued of loadQueue) {
        queued(orangeCachedScene);
      }
      loadQueue.length = 0;
    },
    undefined,
    () => {
      modelLoading = false;
      for (const queued of loadQueue) {
        queued(null);
      }
      loadQueue.length = 0;
    }
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
  const [modelScene, setModelScene] = useState<THREE.Group | null>(null);
  const { camera } = useThree();

  const pointerWorld = useRef(new THREE.Vector3());
  const basePosition = useMemo(() => position.clone(), [position]);
  const nodeScale = useMemo(() => getNodeScale(node.depth ?? 0), [node.depth]);
  const colors = fruitColors[node.status] || fruitColors.untouched;

  // ── 异步加载模型 ──────────────────────────────
  useEffect(() => {
    let mounted = true;
    loadOrangeModel((scene) => {
      if (mounted && scene) {
        setModelScene(scene);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  // ── 模型克隆 + 材质设置 ──────────────────────
  const modelClone = useMemo(() => {
    if (!modelScene) {
      return null;
    }
    const clone = modelScene.clone(true);
    const s = nodeScale * 0.48;
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
        mat.transparent = true;
        mat.opacity = 0.92;
        mat.envMapIntensity = 0.3;
      }
    });

    return clone;
  }, [modelScene, nodeScale]);

  // ── 模型的 mesh 引用（避免每帧 traverse） ────
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

  const hasModel = modelScene !== null;

  return (
    <group position={basePosition} ref={groupRef}>
      {/* Orange 3D 模型（加载完成后显示） */}
      {hasModel && modelClone && <primitive object={modelClone} />}

      {/* 球体回退 — 实心发光，清晰可见（模型加载前/失败时显示） */}
      {!hasModel && (
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
      )}

      {/* 透明点击区域（模型模式下用） */}
      {hasModel && (
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
          <sphereGeometry args={[nodeScale * 0.5, 8, 8]} />
          <meshBasicMaterial depthWrite={false} opacity={0} transparent />
        </mesh>
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
