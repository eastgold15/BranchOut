"use client";

import { OrbitControls, Stars } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { embeddingService } from "@/lib/embedding-service";
import { useSessionStore } from "@/store/sessionStore";
import { ConstellationEdge } from "./constellation-edge";
import { Fireflies } from "./fireflies";
import { PlanetNode } from "./planet-node";

function ConstellationScene() {
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

  const constellationLayout = useMemo(() => {
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

  const constellationModel = useMemo(() => {
    if (!(constellationLayout && session)) {
      return null;
    }

    const nodePositions = new Map<string, THREE.Vector3>();
    for (const node of constellationLayout.nodes) {
      nodePositions.set(
        node.id,
        new THREE.Vector3(node.position[0], node.position[1], node.position[2])
      );
    }

    const edges: Array<{
      from: THREE.Vector3;
      to: THREE.Vector3;
      fromId: string;
      toId: string;
    }> = [];

    for (const edge of constellationLayout.edges) {
      const fromPos = nodePositions.get(edge.from);
      const toPos = nodePositions.get(edge.to);
      if (!(fromPos && toPos)) {
        continue;
      }

      edges.push({
        from: fromPos.clone(),
        to: toPos.clone(),
        fromId: edge.from,
        toId: edge.to,
      });
    }

    return { nodePositions, edges, nodes: constellationLayout.nodes };
  }, [constellationLayout, session]);

  const handleNodeClick = useCallback(
    (nodeId: string, title: string) => {
      enterChat(nodeId, title);
    },
    [enterChat]
  );

  if (!(constellationModel && session)) {
    return null;
  }

  return (
    <>
      {/* 深空背景 */}
      <color args={["#050814"]} attach="background" />
      <fog args={["#050814", 15, 45]} attach="fog" />

      {/* 星空粒子背景 */}
      <Stars
        count={3000}
        depth={50}
        factor={3}
        fade
        radius={80}
        saturation={0}
        speed={0.5}
      />

      {/* 环境光（极弱，让星球自身发光更突出） */}
      <ambientLight color="#1a2040" intensity={0.08} />

      {/* 远处恒星光照 */}
      <directionalLight
        color="#b8c5e8"
        intensity={0.4}
        position={[10, 20, 10]}
      />
      <directionalLight
        color="#6b7db3"
        intensity={0.15}
        position={[-10, -5, -10]}
      />

      {/* 萤火虫粒子 */}
      <Fireflies count={60} />

      {/* 星座连线 */}
      {constellationModel.edges.map((edge, i) => (
        <ConstellationEdge from={edge.from} key={`edge-${i}`} to={edge.to} />
      ))}

      {/* 星球节点 */}
      {constellationModel.nodes.map((node) => {
        const nodeData = session.nodes.get(node.id);
        if (!nodeData) {
          return null;
        }
        const pos = constellationModel.nodePositions.get(node.id);
        if (!pos) {
          return null;
        }
        return (
          <PlanetNode
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
        maxDistance={50}
        minDistance={3}
        target={[0, 0, 0]}
      />
    </>
  );
}

export function KnowledgeTree() {
  return (
    <div className="h-screen w-full bg-slate-950">
      <Canvas
        camera={{ position: [0, 2, 16], fov: 55 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ConstellationScene />
      </Canvas>
    </div>
  );
}
