"use client";

import { OrbitControls, Stars } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useCallback, useMemo } from "react";
import * as THREE from "three";
import { generateTreeModel } from "@/lib/tree-generator";
import { useSessionStore } from "@/store/sessionStore";
import { Branch } from "./branch";
import { TreeNode } from "./tree-node";

function TreeScene() {
  const { session, enterChat } = useSessionStore();

  const treeData = useMemo(() => {
    if (!session) {
      return null;
    }
    return generateTreeModel(session.nodes);
  }, [session]);

  const handleNodeClick = useCallback(
    (nodeId: string, title: string) => {
      enterChat(nodeId, title);
    },
    [enterChat]
  );

  if (!(treeData && session)) {
    return null;
  }

  return (
    <>
      {/* 环境光 */}
      <ambientLight intensity={0.4} />
      <pointLight intensity={1.2} position={[8, 12, 8]} />
      <pointLight color="#38bdf8" intensity={0.4} position={[-8, 5, -8]} />
      <pointLight color="#a78bfa" intensity={0.3} position={[0, -3, 5]} />

      {/* 星空背景 */}
      <Stars count={3000} depth={60} factor={3} fade radius={80} speed={0.5} />

      {/* 树枝 */}
      {treeData.branches.map((branch) => (
        <Branch
          depth={branch.depth}
          end={branch.end}
          key={`${branch.start.x}-${branch.start.y}-${branch.start.z}`}
          start={branch.start}
          thickness={branch.thickness}
        />
      ))}

      {/* 知识节点（球体） */}
      {treeData.nodePositions.map((item) => (
        <TreeNode
          key={item.id}
          node={item.node}
          onClick={() => handleNodeClick(item.id, item.node.title)}
          position={item.position}
        />
      ))}

      {/* 地面参考光圈 */}
      <mesh position={[0, -6.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.5, 3, 64]} />
        <meshBasicMaterial
          color="#38bdf8"
          opacity={0.08}
          side={THREE.DoubleSide}
          transparent
        />
      </mesh>

      <OrbitControls
        enablePan={true}
        enableRotate={true}
        enableZoom={true}
        maxDistance={35}
        minDistance={5}
        target={[0, 0, 0]}
      />
    </>
  );
}

export function KnowledgeTree() {
  return (
    <div className="h-screen w-full bg-slate-950">
      <Canvas
        camera={{ position: [0, 2, 14], fov: 55 }}
        gl={{ antialias: true, alpha: true }}
      >
        <TreeScene />
      </Canvas>
    </div>
  );
}
