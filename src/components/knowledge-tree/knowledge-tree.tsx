"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { embeddingService } from "@/lib/embedding-service";
import { useSessionStore } from "@/store/sessionStore";
import { Branch } from "./branch";
import { Fireflies } from "./fireflies";
import { TreeNode } from "./tree-node";

function TreeScene() {
  const { session, enterChat, currentViewType } = useSessionStore();
  const [modelReady, setModelReady] = useState(false);

  useEffect(() => {
    if (!session) {
      return;
    }
    let cancelled = false;
    embeddingService.loadModel().then(() => {
      if (!cancelled) {
        setModelReady(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [session]);

  const treeLayout = useMemo(() => {
    if (!(session && modelReady)) {
      return null;
    }

    const topics = Array.from(session.nodes.values()).map((node) => ({
      id: node.id,
      title: node.title,
      embedding: node.embedding || null,
      depth: node.depth,
    }));

    const viewEmbedding =
      currentViewType === "default"
        ? topics.find((t) => t.depth === 0)?.embedding || undefined
        : undefined;

    return embeddingService.buildTree(topics, viewEmbedding);
  }, [session, modelReady, currentViewType]);

  const treeModel = useMemo(() => {
    if (!(treeLayout && session)) {
      return null;
    }

    const nodePositions = new Map<string, THREE.Vector3>();
    for (const node of treeLayout.nodes) {
      nodePositions.set(
        node.id,
        new THREE.Vector3(node.position[0], node.position[1], node.position[2])
      );
    }

    const branches: Array<{
      start: THREE.Vector3;
      end: THREE.Vector3;
      thickness: number;
      weight: number;
      depth: number;
    }> = [];

    for (const edge of treeLayout.edges) {
      const fromPos = nodePositions.get(edge.from);
      const toPos = nodePositions.get(edge.to);
      if (!(fromPos && toPos)) {
        continue;
      }

      const fromNode = session.nodes.get(edge.from);
      const depth = fromNode?.depth ?? 0;
      const thickness = 0.015 + (edge.weight || 0.5) * 0.04;

      branches.push({
        start: fromPos.clone(),
        end: toPos.clone(),
        thickness,
        weight: edge.weight || 0.5,
        depth,
      });
    }

    return { nodePositions, branches, nodes: treeLayout.nodes };
  }, [treeLayout, session]);

  const handleNodeClick = useCallback(
    (nodeId: string, title: string) => {
      enterChat(nodeId, title);
    },
    [enterChat]
  );

  if (!(treeModel && session)) {
    return null;
  }

  return (
    <>
      {/* 暗色森林背景 */}
      <color args={["#0A1A0F"]} attach="background" />
      <fog args={["#0A1A0F", 8, 30]} attach="fog" />

      {/* 月光（顶光 - 冷白） */}
      <directionalLight color="#E2E8F0" intensity={0.6} position={[0, 20, 0]} />
      {/* 月光辅助补光 */}
      <directionalLight
        color="#94A3B8"
        intensity={0.25}
        position={[-8, 15, -8]}
      />

      {/* 琥珀底光（暖橙上照） */}
      <pointLight
        color="#F97316"
        distance={30}
        intensity={0.8}
        position={[0, -8, 0]}
      />

      {/* 环境光（极弱轮廓） */}
      <ambientLight color="#1A3A2A" intensity={0.15} />

      {/* 萤火虫粒子 */}
      <Fireflies count={80} />

      {/* 藤蔓 */}
      {treeModel.branches.map((branch, i) => (
        <Branch
          depth={branch.depth}
          end={branch.end}
          key={`branch-${i}`}
          start={branch.start}
          thickness={branch.thickness}
          weight={branch.weight}
        />
      ))}

      {/* 节点 */}
      {treeModel.nodes.map((node) => {
        const nodeData = session.nodes.get(node.id);
        if (!nodeData) {
          return null;
        }
        const pos = treeModel.nodePositions.get(node.id);
        if (!pos) {
          return null;
        }
        return (
          <TreeNode
            key={node.id}
            node={nodeData}
            onClick={() => handleNodeClick(node.id, node.title)}
            position={pos}
          />
        );
      })}

      <OrbitControls
        enablePan={true}
        enableRotate={true}
        enableZoom={true}
        maxDistance={40}
        minDistance={4}
        target={[0, 0, 0]}
      />
    </>
  );
}

export function KnowledgeTree() {
  return (
    <div className="h-screen w-full bg-slate-50">
      <Canvas
        camera={{ position: [0, 2, 14], fov: 55 }}
        gl={{ antialias: true, alpha: true }}
      >
        <TreeScene />
      </Canvas>
    </div>
  );
}
