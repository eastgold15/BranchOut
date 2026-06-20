"use client";

import { OrbitControls, Stars } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { embeddingService } from "@/lib/embedding-service";
import { useSessionStore } from "@/store/sessionStore";
import { PlanetNode } from "./components/PlanetNode";
import { ConstellationEdge } from "./constellation-edge";
import { Fireflies } from "./fireflies";

function GalaxyNavigator() {
  const {
    session,
    enterChat,
    currentViewType,
    nodeOffsets,
    currentGalaxyId,
    enterGalaxy,
    exitGalaxy,
  } = useSessionStore();
  const { camera, gl } = useThree();
  const controlsRef = useRef<any>(null);
  const [modelReady, setModelReady] = useState(false);
  const [targetCameraPos, setTargetCameraPos] = useState<THREE.Vector3 | null>(
    null
  );
  const [targetCameraTarget, setTargetCameraTarget] =
    useState<THREE.Vector3 | null>(null);

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

    return embeddingService.buildTree(
      topics,
      viewEmbedding,
      undefined,
      nodeOffsets
    );
  }, [session, modelReady, currentViewType, nodeOffsets]);

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

  useEffect(() => {
    if (!(constellationModel && currentGalaxyId)) {
      setTargetCameraPos(null);
      setTargetCameraTarget(null);
      return;
    }

    const galaxyPos = constellationModel.nodePositions.get(currentGalaxyId);
    if (!galaxyPos) {
      return;
    }

    setTargetCameraPos(
      new THREE.Vector3(galaxyPos.x, galaxyPos.y + 4, galaxyPos.z + 8)
    );
    setTargetCameraTarget(galaxyPos.clone());
  }, [currentGalaxyId, constellationModel]);

  useEffect(() => {
    if (!(targetCameraPos && targetCameraTarget)) {
      return;
    }

    const animate = () => {
      camera.position.lerp(targetCameraPos, 0.05);
      controlsRef.current?.target?.lerp(targetCameraTarget, 0.05);

      if (
        camera.position.distanceTo(targetCameraPos) > 0.01 ||
        controlsRef.current?.target?.distanceTo(targetCameraTarget) > 0.01
      ) {
        requestAnimationFrame(animate);
      }
    };
    animate();
  }, [targetCameraPos, targetCameraTarget, camera]);

  const getVisibleNodes = useCallback(() => {
    if (!(session && currentGalaxyId)) {
      return new Set(session?.nodes.keys());
    }

    const visible = new Set<string>();
    const addNodeAndChildren = (nodeId: string) => {
      visible.add(nodeId);
      const node = session.nodes.get(nodeId);
      if (node?.children) {
        for (const childId of node.children) {
          addNodeAndChildren(childId);
        }
      }
    };

    addNodeAndChildren(currentGalaxyId);
    return visible;
  }, [session, currentGalaxyId]);

  const handleWheel = useCallback(
    (event: WheelEvent) => {
      if (!(constellationModel && session)) {
        return;
      }

      const rect = gl.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
      );

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);

      const meshMap = new Map<THREE.Mesh, string>();
      const meshes: THREE.Mesh[] = [];
      for (const node of constellationModel.nodes) {
        const pos = constellationModel.nodePositions.get(node.id);
        if (pos) {
          const dummyMesh = new THREE.Mesh(
            new THREE.SphereGeometry(0.3),
            new THREE.MeshBasicMaterial()
          );
          dummyMesh.position.copy(pos);
          meshes.push(dummyMesh);
          meshMap.set(dummyMesh, node.id);
        }
      }

      const intersects = raycaster.intersectObjects(meshes);

      if (event.deltaY < 0 && intersects.length > 0) {
        const mesh = intersects[0].object as THREE.Mesh;
        const nodeId = meshMap.get(mesh);
        if (nodeId) {
          const node = session.nodes.get(nodeId);
          if (node?.children && node.children.length > 0) {
            enterGalaxy(nodeId);
          }
        }
      } else if (event.deltaY > 0 && currentGalaxyId) {
        exitGalaxy();
      }
    },
    [
      constellationModel,
      session,
      enterGalaxy,
      exitGalaxy,
      currentGalaxyId,
      gl,
      camera,
    ]
  );

  useEffect(() => {
    gl.domElement.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      gl.domElement.removeEventListener("wheel", handleWheel);
    };
  }, [handleWheel, gl]);

  const handleNodeClick = useCallback(
    (nodeId: string, title: string) => {
      const node = session?.nodes.get(nodeId);
      if (node?.children && node.children.length > 0) {
        enterGalaxy(nodeId);
      } else {
        enterChat(nodeId, title);
      }
    },
    [enterChat, enterGalaxy, session]
  );

  const visibleNodes = getVisibleNodes();

  if (!(constellationModel && session)) {
    return null;
  }

  return (
    <>
      <color args={["#050814"]} attach="background" />
      <fog args={["#050814", 15, 45]} attach="fog" />

      <Stars
        count={3000}
        depth={50}
        factor={3}
        fade
        radius={80}
        saturation={0}
        speed={0.5}
      />

      <ambientLight color="#1a2040" intensity={0.08} />

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

      <Fireflies count={60} />

      {constellationModel.edges.map((edge, i) => {
        if (!(visibleNodes.has(edge.fromId) && visibleNodes.has(edge.toId))) {
          return null;
        }
        return (
          <ConstellationEdge from={edge.from} key={`edge-${i}`} to={edge.to} />
        );
      })}

      {constellationModel.nodes.map((node) => {
        if (!visibleNodes.has(node.id)) {
          return null;
        }
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
            isGalaxy={nodeData.children.length > 0}
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
        ref={controlsRef}
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
        <GalaxyNavigator />
      </Canvas>
    </div>
  );
}
