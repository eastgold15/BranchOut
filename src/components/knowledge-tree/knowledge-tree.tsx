"use client";

import { OrbitControls, Stars } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useCallback, useMemo } from "react";
import { useSessionStore } from "@/store/sessionStore";
import type { TopicNodeData } from "@/types";
import { TreeEdge } from "./tree-edge";
import { TreeNode } from "./tree-node";

function calculateNodePositions(
  nodes: Map<string, TopicNodeData>
): Map<string, [number, number, number]> {
  const positions = new Map<string, [number, number, number]>();
  const rootNode = Array.from(nodes.values()).find((n) => n.depth === 0);

  if (!rootNode) {
    return positions;
  }

  positions.set(rootNode.id, [0, 0, 0]);

  const nodesByDepth = new Map<number, TopicNodeData[]>();
  nodes.forEach((node) => {
    if (!nodesByDepth.has(node.depth)) {
      nodesByDepth.set(node.depth, []);
    }
    nodesByDepth.get(node.depth)?.push(node);
  });

  const maxDepth = Math.max(...nodesByDepth.keys());
  const radiusStep = 3;

  for (let depth = 1; depth <= maxDepth; depth++) {
    const depthNodes = nodesByDepth.get(depth) || [];
    const radius = depth * radiusStep;

    depthNodes.forEach((node, index) => {
      const angle = (index / Math.max(depthNodes.length, 1)) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = -depth * 1.5;
      positions.set(node.id, [x, y, z]);
    });
  }

  return positions;
}

function TreeScene() {
  const { session, enterChat } = useSessionStore();

  const nodePositions = useMemo(() => {
    if (!session) {
      return new Map();
    }
    return calculateNodePositions(session.nodes);
  }, [session?.nodes]);

  const handleNodeClick = useCallback(
    (nodeId: string, title: string) => {
      enterChat(nodeId, title);
    },
    [enterChat]
  );

  if (!session) {
    return null;
  }

  const nodes = Array.from(session.nodes.values());
  const edges: { from: string; to: string }[] = [];

  nodes.forEach((node) => {
    if (node.parentId) {
      edges.push({ from: node.parentId, to: node.id });
    }
  });

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight intensity={1} position={[10, 10, 10]} />
      <pointLight color="#38bdf8" intensity={0.5} position={[-10, -10, -10]} />

      <Stars count={5000} depth={50} factor={4} fade radius={100} speed={1} />

      {nodes.map((node) => {
        const position = nodePositions.get(node.id);
        if (!position) {
          return null;
        }

        return (
          <TreeNode
            key={node.id}
            node={node}
            onClick={() => handleNodeClick(node.id, node.title)}
            position={position}
          />
        );
      })}

      {edges.map((edge, index) => {
        const fromPos = nodePositions.get(edge.from);
        const toPos = nodePositions.get(edge.to);
        if (!(fromPos && toPos)) {
          return null;
        }

        return <TreeEdge from={fromPos} key={index} to={toPos} />;
      })}

      <OrbitControls
        enablePan={true}
        enableRotate={true}
        enableZoom={true}
        maxDistance={50}
        minDistance={5}
      />
    </>
  );
}

export function KnowledgeTree() {
  return (
    <div className="h-screen w-full bg-slate-950">
      <Canvas camera={{ position: [0, 5, 15], fov: 60 }}>
        <TreeScene />
      </Canvas>
    </div>
  );
}
