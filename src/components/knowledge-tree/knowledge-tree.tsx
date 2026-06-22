"use client";

import { Environment, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useCallback, useMemo, useState } from "react";
import * as THREE from "three";
import { useSessionStore } from "@/store/sessionStore";
import { generateTreeModel } from "@/lib/tree-generator";
import { TreeNode } from "./tree-node";
import type { AtomMessageData } from "@/types";

interface TreeSceneProps {
  messages: AtomMessageData[];
  currentTopicId: string | null;
  onNodeClick: (message: AtomMessageData) => void;
}

function TreeScene({ messages, currentTopicId, onNodeClick }: TreeSceneProps) {
  const { branches, nodePositions } = useMemo(
    () => generateTreeModel(messages),
    [messages]
  );

  const branchMeshes = useMemo(() => {
    return branches.map((branch, index) => {
      const geometry = new THREE.TubeGeometry(
        new THREE.QuadraticBezierCurve3(
          branch.start,
          new THREE.Vector3()
            .addVectors(branch.start, branch.end)
            .multiplyScalar(0.5)
            .add(
              new THREE.Vector3(
                Math.sin(branch.depth * 1.5) * 0.2,
                0.1,
                Math.cos(branch.depth * 1.5) * 0.2
              )
            ),
          branch.end
        ),
        8,
        branch.thickness,
        6,
        false
      );
      return { geometry, key: index };
    });
  }, [branches]);

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight intensity={0.8} position={[10, 10, 5]} />

      {/* 树枝 */}
      {branchMeshes.map(({ geometry, key }) => (
        <mesh key={key} geometry={geometry}>
          <meshStandardMaterial
            color="#4A3728"
            roughness={0.8}
            metalness={0.1}
          />
        </mesh>
      ))}

      {/* 节点 */}
      {nodePositions.map(({ id, message, position }) => (
        <TreeNode
          key={id}
          message={message}
          position={position}
          onClick={() => onNodeClick(message)}
          isSelected={id === currentTopicId}
        />
      ))}

      {/* 地面 */}
      <mesh position={[0, -6.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[15, 64]} />
        <meshStandardMaterial
          color="#1a1a2e"
          opacity={0.3}
          transparent
          roughness={1}
        />
      </mesh>

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        maxPolarAngle={Math.PI / 2}
        minDistance={3}
        maxDistance={20}
      />
      <Environment preset="night" />
    </>
  );
}

export function KnowledgeTree() {
  const session = useSessionStore((s) => s.session);
  const currentTopicId = useSessionStore((s) => s.currentTopicId);
  const setViewMode = useSessionStore((s) => s.setViewMode);
  const enterChat = useSessionStore((s) => s.enterChat);
  const [selectedMessage, setSelectedMessage] = useState<AtomMessageData | null>(
    null
  );

  const handleNodeClick = useCallback((message: AtomMessageData) => {
    setSelectedMessage(message);

    if (message.role === "topic") {
      enterChat(message.id, message.title);
      setViewMode("chat");
    }
  }, [enterChat, setViewMode]);

  if (!session || !session.messages || session.messages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-slate-400">
        <p>暂无知识树数据</p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <Canvas camera={{ position: [0, 2, 10], fov: 50 }}>
        <TreeScene
          messages={session.messages}
          currentTopicId={currentTopicId}
          onNodeClick={handleNodeClick}
        />
      </Canvas>

      {/* 选中节点信息 */}
      {selectedMessage && (
        <div className="absolute bottom-4 left-4 right-4 rounded-lg border border-slate-700 bg-slate-900/90 p-4 backdrop-blur">
          <div className="mb-2 flex items-center gap-2">
            <span
              className={`rounded px-2 py-0.5 text-xs ${
                selectedMessage.role === "topic"
                  ? "bg-emerald-500/20 text-emerald-400"
                  : selectedMessage.role === "user"
                    ? "bg-blue-500/20 text-blue-400"
                    : "bg-purple-500/20 text-purple-400"
              }`}
            >
              {selectedMessage.role === "topic"
                ? "话题"
                : selectedMessage.role === "user"
                  ? "用户"
                  : "AI"}
            </span>
            <span className="font-medium text-white">
              {selectedMessage.title || "无标题"}
            </span>
          </div>
          <p className="text-slate-300 text-sm">
            {selectedMessage.content || "无内容"}
          </p>
          {selectedMessage.role === "topic" && (
            <button
              className="mt-2 rounded-lg bg-sky-600 px-4 py-2 text-sm text-white transition-colors hover:bg-sky-500"
              onClick={() => {
                enterChat(selectedMessage.id, selectedMessage.title);
                setViewMode("chat");
              }}
            >
              进入话题聊天
            </button>
          )}
          <button
            className="mt-2 text-slate-400 text-xs hover:text-white"
            onClick={() => setSelectedMessage(null)}
          >
            关闭
          </button>
        </div>
      )}
    </div>
  );
}