"use client";

import { Environment, OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useCallback, useMemo, useState, useRef, useEffect } from "react";
import * as THREE from "three";
import { useSessionStore } from "@/store/sessionStore";
import { generateTreeModel } from "@/lib/tree-generator";
import { TreeNode } from "./tree-node";
import type { AtomMessageData, TopicType } from "@/types";
import { isGalaxyTopic, hasChildTopics } from "@/types";

interface DragState {
  isDragging: boolean;
  isCtrlPressed: boolean;
  draggedMessage: AtomMessageData | null;
  draggedNodeId: string | null;
  startPosition: THREE.Vector3 | null;
}

interface TreeSceneProps {
  messages: AtomMessageData[];
  currentTopicId: string | null;
  onNodeClick: (message: AtomMessageData) => void;
  onMergeTopics: (sourceId: string, targetId: string) => void;
}

function DragPlane() {
  const meshRef = useRef<THREE.Mesh>(null);

  return (
    <mesh ref={meshRef} visible={false}>
      <planeGeometry args={[100, 100]} />
      <meshBasicMaterial color="#ffffff" opacity={0} transparent />
    </mesh>
  );
}

function TreeScene({ messages, currentTopicId, onNodeClick, onMergeTopics }: TreeSceneProps) {
  const { branches, nodePositions } = useMemo(
    () => generateTreeModel(messages),
    [messages]
  );

  const { gl, camera, scene } = useThree();

  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    isCtrlPressed: false,
    draggedMessage: null,
    draggedNodeId: null,
    startPosition: null,
  });

  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2());
  const draggedGroupRef = useRef<THREE.Group | null>(null);
  const nodeGroupRefs = useRef<Map<string, THREE.Group>>(new Map());
  const dragPlaneRef = useRef<THREE.Mesh | null>(null);
  const ctrlReleasedRef = useRef(false);

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

  const handlePointerDown = useCallback((event: PointerEvent) => {
    if (!dragState.isCtrlPressed) return;

    const rect = gl.domElement.getBoundingClientRect();
    mouse.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.current.setFromCamera(mouse.current, camera);

    const meshes: THREE.Mesh[] = [];
    nodeGroupRefs.current.forEach((group) => {
      group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          meshes.push(child);
        }
      });
    });

    const intersects = raycaster.current.intersectObjects(meshes);
    if (intersects.length > 0) {
      let parentGroup: THREE.Group | null = null;
      let current = intersects[0].object;
      while (current.parent) {
        if (current.parent instanceof THREE.Group && nodeGroupRefs.current.has(current.parent.userData.nodeId)) {
          parentGroup = current.parent;
          break;
        }
        current = current.parent;
      }

      if (parentGroup) {
        const nodeId = parentGroup.userData.nodeId;
        const message = messages.find((m) => m.id === nodeId);
        if (message && message.role === "topic") {
          setDragState((prev) => ({
            ...prev,
            isDragging: true,
            draggedMessage: message,
            draggedNodeId: nodeId,
            startPosition: parentGroup.position.clone(),
          }));
          draggedGroupRef.current = parentGroup;
        }
      }
    }
  }, [dragState.isCtrlPressed, messages, gl, camera]);

  const handlePointerMove = useCallback((event: PointerEvent) => {
    if (!dragState.isDragging || !dragState.draggedNodeId) return;

    const rect = gl.domElement.getBoundingClientRect();
    mouse.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.current.setFromCamera(mouse.current, camera);

    if (!dragPlaneRef.current) {
      const planeGeometry = new THREE.PlaneGeometry(100, 100);
      const planeMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, opacity: 0, transparent: true });
      dragPlaneRef.current = new THREE.Mesh(planeGeometry, planeMaterial);
      dragPlaneRef.current.visible = false;
      scene.add(dragPlaneRef.current);
    }

    if (dragPlaneRef.current && dragState.startPosition) {
      const normal = new THREE.Vector3(0, 1, 0);
      const distance = -dragState.startPosition.y;
      dragPlaneRef.current.position.y = dragState.startPosition.y;
      dragPlaneRef.current.lookAt(camera.position);

      const intersects = raycaster.current.intersectObject(dragPlaneRef.current);
      if (intersects.length > 0) {
        const point = intersects[0].point;
        if (draggedGroupRef.current) {
          draggedGroupRef.current.position.x = point.x;
          draggedGroupRef.current.position.z = point.z;
        }
      }
    }
  }, [dragState.isDragging, dragState.draggedNodeId, dragState.startPosition, gl, camera, scene]);

  const handlePointerUp = useCallback(() => {
    if (!dragState.isDragging || !dragState.draggedNodeId || !dragState.draggedMessage) {
      setDragState({
        isDragging: false,
        isCtrlPressed: false,
        draggedMessage: null,
        draggedNodeId: null,
        startPosition: null,
      });
      return;
    }

    const rect = gl.domElement.getBoundingClientRect();
    mouse.current.x = ((gl.domElement.clientWidth / 2) / rect.width) * 2 - 1;
    mouse.current.y = -((gl.domElement.clientHeight / 2) / rect.height) * 2 + 1;

    raycaster.current.setFromCamera(mouse.current, camera);

    const meshes: THREE.Mesh[] = [];
    nodeGroupRefs.current.forEach((group, id) => {
      if (id !== dragState.draggedNodeId) {
        group.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            meshes.push(child);
          }
        });
      }
    });

    const intersects = raycaster.current.intersectObjects(meshes);
    let targetTopicId: string | null = null;

    if (intersects.length > 0) {
      let parentGroup: THREE.Group | null = null;
      let current = intersects[0].object;
      while (current.parent) {
        if (current.parent instanceof THREE.Group && nodeGroupRefs.current.has(current.parent.userData.nodeId)) {
          parentGroup = current.parent;
          break;
        }
        current = current.parent;
      }

      if (parentGroup) {
        const nodeId = parentGroup.userData.nodeId;
        const message = messages.find((m) => m.id === nodeId);
        if (message && message.role === "topic" && nodeId !== dragState.draggedNodeId) {
          const distance = draggedGroupRef.current?.position.distanceTo(parentGroup.position) || Infinity;
          if (distance < 1.5) {
            targetTopicId = nodeId;
          }
        }
      }
    }

    if (targetTopicId) {
      onMergeTopics(dragState.draggedNodeId, targetTopicId);
    }

    if (draggedGroupRef.current && dragState.startPosition) {
      draggedGroupRef.current.position.copy(dragState.startPosition);
    }

    setDragState({
      isDragging: false,
      isCtrlPressed: false,
      draggedMessage: null,
      draggedNodeId: null,
      startPosition: null,
    });
  }, [dragState, messages, onMergeTopics, gl, camera]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Control") {
        setDragState((prev) => ({ ...prev, isCtrlPressed: true }));
        ctrlReleasedRef.current = false;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Control") {
        setDragState((prev) => {
          const wasDragging = prev.isDragging;
          const newState = { ...prev, isCtrlPressed: false };
          if (wasDragging) {
            ctrlReleasedRef.current = true;
          }
          return newState;
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  useEffect(() => {
    if (ctrlReleasedRef.current && dragState.isDragging) {
      handlePointerUp();
      ctrlReleasedRef.current = false;
    }
  }, [dragState.isDragging, handlePointerUp]);

  useFrame(() => {
    if (dragState.isDragging && draggedGroupRef.current) {
      draggedGroupRef.current.scale.setScalar(1.3);
    }
  });

  useEffect(() => {
    const handleGlobalPointerDown = (e: PointerEvent) => {
      if (e.target === gl.domElement) {
        handlePointerDown(e);
      }
    };

    const handleGlobalPointerMove = (e: PointerEvent) => {
      if (e.target === gl.domElement) {
        handlePointerMove(e);
      }
    };

    const handleGlobalPointerUp = (e: PointerEvent) => {
      handlePointerUp();
    };

    window.addEventListener("pointerdown", handleGlobalPointerDown);
    window.addEventListener("pointermove", handleGlobalPointerMove);
    window.addEventListener("pointerup", handleGlobalPointerUp);

    return () => {
      window.removeEventListener("pointerdown", handleGlobalPointerDown);
      window.removeEventListener("pointermove", handleGlobalPointerMove);
      window.removeEventListener("pointerup", handleGlobalPointerUp);
    };
  }, [handlePointerDown, handlePointerMove, handlePointerUp, gl]);

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight intensity={0.8} position={[10, 10, 5]} />

      {branchMeshes.map(({ geometry, key }) => (
        <mesh key={key} geometry={geometry}>
          <meshStandardMaterial color="#4a5568" roughness={0.8} />
        </mesh>
      ))}

      {nodePositions.map((pos) => {
        const message = messages.find((m) => m.id === pos.id);
        if (!message) return null;

        const isSelected = currentTopicId === pos.id;
        const isGalaxy = isGalaxyTopic(message);
        const hasChildren = hasChildTopics(message);

        return (
          <TreeNode
            key={pos.id}
            message={message}
            position={pos.position}
            isSelected={isSelected}
            isDragging={dragState.isDragging && dragState.draggedNodeId === pos.id}
            onRef={(group) => {
              if (group) {
                group.userData.nodeId = pos.id;
                nodeGroupRefs.current.set(pos.id, group);
              }
            }}
            onClick={() => onNodeClick(message)}
          />
        );
      })}

      <OrbitControls enableZoom={true} enablePan={true} />
      <Environment preset="forest" />
    </>
  );
}

export function KnowledgeTree() {
  const session = useSessionStore((s) => s.session);
  const messages = useSessionStore((s) => s.session?.messages || []);
  const currentTopicId = useSessionStore((s) => s.currentTopicId);
  const enterChat = useSessionStore((s) => s.enterChat);
  const setViewMode = useSessionStore((s) => s.setViewMode);
  const mergeTopics = useSessionStore((s) => s.mergeTopics);

  const handleNodeClick = useCallback((message: AtomMessageData) => {
    if (message.role === "topic") {
      enterChat(message.id, message.title);
      setViewMode("chat");
    }
  }, [enterChat, setViewMode]);

  const handleMergeTopics = useCallback((sourceId: string, targetId: string) => {
    mergeTopics(sourceId, targetId);
  }, [mergeTopics]);

  return (
    <div className="relative h-full w-full">
      <Canvas camera={{ position: [0, 5, 10], fov: 50 }}>
        <color attach="background" args={["#0f172a"]} />
        <TreeScene
          messages={messages}
          currentTopicId={currentTopicId}
          onNodeClick={handleNodeClick}
          onMergeTopics={handleMergeTopics}
        />
      </Canvas>
      {session && (
        <div className="absolute bottom-4 left-4 rounded-lg bg-slate-900/90 px-4 py-2 text-slate-300 text-sm">
          <p className="mb-1 font-medium">3D 视图操作</p>
          <ul className="text-xs">
            <li>🖱️ 拖拽旋转视角</li>
            <li>🔍 滚轮缩放</li>
            <li>Ctrl + 拖拽星球 → 组合星系</li>
            <li>点击星球 → 切换聊天话题</li>
          </ul>
        </div>
      )}
    </div>
  );
}