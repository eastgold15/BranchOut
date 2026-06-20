"use client";

import { useThree } from "@react-three/fiber";
import { useCallback, useRef, useState } from "react";
import * as THREE from "three";
import { useSessionStore } from "@/store/sessionStore";

interface DraggableNodeProps {
  basePosition: THREE.Vector3;
  children: React.ReactNode;
  nodeId: string;
  nodeScale: number;
}

/**
 * DraggableNode - 可拖拽节点组件
 * 处理鼠标拖拽事件，更新节点偏移量
 */
export function DraggableNode({
  nodeId,
  children,
  basePosition,
  nodeScale,
}: DraggableNodeProps) {
  const { camera, gl } = useThree();
  const startDrag = useSessionStore((s) => s.startDrag);
  const onDrag = useSessionStore((s) => s.onDrag);
  const endDrag = useSessionStore((s) => s.endDrag);
  const draggingNodeId = useSessionStore((s) => s.draggingNodeId);

  const isDragging = draggingNodeId === nodeId;
  const [hovered, setHovered] = useState(false);
  const dragPlane = useRef(new THREE.Plane());
  const intersection = useRef(new THREE.Vector3());
  const prevPosition = useRef<THREE.Vector3 | null>(null);

  const getWorldPosition = useCallback(
    (clientX: number, clientY: number): THREE.Vector3 | null => {
      // 创建一个始终面向相机的平面
      const normal = camera.position.clone().sub(basePosition).normalize();
      dragPlane.current.setFromNormalAndCoplanarPoint(normal, basePosition);

      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2();

      const rect = gl.domElement.getBoundingClientRect();
      mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      if (
        raycaster.ray.intersectPlane(dragPlane.current, intersection.current)
      ) {
        return intersection.current.clone();
      }
      return null;
    },
    [camera, gl, basePosition]
  );

  const handlePointerDown = useCallback(
    (e: { stopPropagation: () => void; nativeEvent: PointerEvent }) => {
      e.stopPropagation();
      const worldPos = getWorldPosition(
        e.nativeEvent.clientX,
        e.nativeEvent.clientY
      );
      if (worldPos) {
        startDrag(nodeId, [worldPos.x, worldPos.y, worldPos.z]);
        prevPosition.current = worldPos;
        gl.domElement.style.cursor = "grabbing";
      }
    },
    [getWorldPosition, gl, nodeId, startDrag]
  );

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (!(isDragging && prevPosition.current)) {
        // 处理 hover 状态
        if (e.buttons === 0) {
          if (hovered) {
            gl.domElement.style.cursor = "grab";
          } else {
            gl.domElement.style.cursor = "auto";
          }
        }
        return;
      }

      const worldPos = getWorldPosition(e.clientX, e.clientY);
      if (worldPos) {
        const delta = new THREE.Vector3().subVectors(
          worldPos,
          prevPosition.current
        );
        onDrag([delta.x, delta.y, delta.z]);
        prevPosition.current = worldPos;
      }
    },
    [isDragging, hovered, gl, getWorldPosition, onDrag]
  );

  const handlePointerUp = useCallback(() => {
    if (isDragging) {
      endDrag();
      prevPosition.current = null;
      gl.domElement.style.cursor = hovered ? "grab" : "auto";
    }
  }, [isDragging, hovered, gl, endDrag]);

  return (
    <group
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(false);
        if (!isDragging) {
          gl.domElement.style.cursor = "auto";
        }
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        if (!isDragging) {
          gl.domElement.style.cursor = "grab";
        }
      }}
      onPointerUp={handlePointerUp}
    >
      {/* 拖拽时的视觉反馈 */}
      {isDragging && (
        <mesh scale={[nodeScale * 1.3, nodeScale * 1.3, nodeScale * 1.3]}>
          <sphereGeometry args={[1, 16, 16]} />
          <meshBasicMaterial
            color="#60A5FA"
            depthWrite={false}
            opacity={0.3}
            transparent
          />
        </mesh>
      )}
      {children}
    </group>
  );
}
