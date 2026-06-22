"use client";

import { Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { AtomMessageData } from "@/types";

interface TreeNodeProps {
  message: AtomMessageData;
  onClick: () => void;
  position: THREE.Vector3;
}

/* 话题颜色 */
const topicColors = {
  shell: "#34D399",
  core: "#6EE7B7",
};

/* 消息颜色 */
const messageColors = {
  user: { shell: "#60A5FA", core: "#93C5FD" },
  assistant: { shell: "#A78BFA", core: "#C4B5FD" },
};

function getNodeScale(isTopic: boolean): number {
  return isTopic ? 0.5 : 0.3;
}

// ── 模型缓存 ──────────────
let orangeCachedScene: THREE.Group | null = null;
let modelLoading = false;
const loadQueue: Array<(scene: THREE.Group | null) => void> = [];

function normalizeModel(scene: THREE.Group): THREE.Group {
  const box = new THREE.Box3().setFromObject(scene);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const scale = maxDim > 0 ? 1 / maxDim : 1;

  scene.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      const geo = child.geometry;
      const posAttr = geo.attributes.position;
      for (let i = 0; i < posAttr.count; i++) {
        const x = posAttr.getX(i) - center.x;
        const y = posAttr.getY(i) - center.y;
        const z = posAttr.getZ(i) - center.z;
        posAttr.setXYZ(i, x * scale, y * scale, z * scale);
      }
      posAttr.needsUpdate = true;
      geo.computeVertexNormals();
    }
  });

  scene.position.set(0, 0, 0);
  scene.scale.set(1, 1, 1);
  scene.rotation.set(0, 0, 0);

  return scene;
}

function loadOrangeModel(cb: (scene: THREE.Group | null) => void) {
  if (orangeCachedScene) {
    cb(orangeCachedScene);
    return;
  }
  loadQueue.push(cb);
  if (modelLoading) return;
  modelLoading = true;
  const loader = new GLTFLoader();
  loader.load(
    "/models/Orange.glb",
    (gltf) => {
      orangeCachedScene = normalizeModel(gltf.scene);
      for (const queued of loadQueue) queued(orangeCachedScene);
      loadQueue.length = 0;
    },
    undefined,
    (err) => {
      console.error("Orange model load failed:", err);
      modelLoading = false;
      for (const queued of loadQueue) queued(null);
      loadQueue.length = 0;
    }
  );
}

export function TreeNode({ message, position, onClick }: TreeNodeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [modelScene, setModelScene] = useState<THREE.Group | null>(null);
  const { camera } = useThree();

  const isTopic = message.role === "topic";
  const colors = isTopic
    ? topicColors
    : messageColors[message.role as "user" | "assistant"];
  const nodeScale = useMemo(() => getNodeScale(isTopic), [isTopic]);
  const basePosition = useMemo(() => position.clone(), [position]);

  const floatRef = useRef({
    offset: Math.random() * Math.PI * 2,
    speed: 0.5 + Math.random() * 0.5,
    amp: 0.05 + Math.random() * 0.05,
  });

  useEffect(() => {
    let mounted = true;
    loadOrangeModel((scene) => {
      if (mounted) setModelScene(scene);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const modelClone = useMemo(() => {
    if (!modelScene) return null;
    const clone = modelScene.clone(true);
    const s = nodeScale * 0.6;
    clone.scale.set(s, s, s);
    clone.rotation.set(
      Math.random() * 0.4,
      Math.random() * Math.PI * 2,
      Math.random() * 0.2
    );
    return clone;
  }, [modelScene, nodeScale]);

  const coreColor = useMemo(() => new THREE.Color(colors.core), [colors.core]);

  useFrame((state) => {
    if (!groupRef.current) return;

    const time = state.clock.elapsedTime;
    const float = floatRef.current;
    const floatY = Math.sin(time * float.speed + float.offset) * float.amp;

    const pulse = Math.sin(time * 1.5 + float.offset) * 0.3 + 0.7;

    if (coreRef.current) {
      const mat = coreRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = (hovered ? pulse * 1.2 : pulse * 0.6) * 0.5;
    }

    const targetPos = basePosition.clone();
    targetPos.y += floatY;
    groupRef.current.position.lerp(targetPos, hovered ? 0.2 : 0.08);
  });

  const hasModel = modelClone !== null;

  return (
    <group position={basePosition} ref={groupRef}>
      {/* 3D 模型 */}
      {hasModel && (
        <group
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
          <primitive object={modelClone} />
        </group>
      )}

      {/* 球体回退 */}
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
          {message.title || message.content.slice(0, 20)}
        </div>
      </Html>
    </group>
  );
}