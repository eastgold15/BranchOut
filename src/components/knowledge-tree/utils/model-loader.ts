import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

// 模型缓存
const modelCache = new Map<string, THREE.Group>();
const loadingSet = new Set<string>();
const loadQueueMap = new Map<
  string,
  Array<(scene: THREE.Group | null) => void>
>();

export const PLANET_MODELS = [
  "/models/planets/Planet1.glb",
  "/models/planets/Planet2.glb",
  "/models/planets/Planet3.glb",
  "/models/planets/Planet4.glb",
];

/** 归一化模型：克隆 geometry 后将顶点居中到原点并缩放到单位尺寸 */
export function normalizeModel(scene: THREE.Group): THREE.Group {
  const box = new THREE.Box3().setFromObject(scene);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const scale = maxDim > 0 ? 1 / maxDim : 1;

  scene.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      const originalGeo = child.geometry;
      const geo = originalGeo.clone();
      child.geometry = geo;

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

export function loadPlanetModel(
  modelPath: string,
  cb: (scene: THREE.Group | null) => void
): void {
  const cached = modelCache.get(modelPath);
  if (cached) {
    cb(cached);
    return;
  }

  let queue = loadQueueMap.get(modelPath);
  if (!queue) {
    queue = [];
    loadQueueMap.set(modelPath, queue);
  }
  queue.push(cb);

  if (loadingSet.has(modelPath)) {
    return;
  }
  loadingSet.add(modelPath);

  const loader = new GLTFLoader();
  loader.load(
    modelPath,
    (gltf) => {
      console.log("Planet model loaded:", modelPath);
      const normalized = normalizeModel(gltf.scene);
      modelCache.set(modelPath, normalized);
      loadingSet.delete(modelPath);
      const q = loadQueueMap.get(modelPath);
      if (q) {
        for (const queued of q) {
          queued(normalized);
        }
        loadQueueMap.delete(modelPath);
      }
    },
    undefined,
    (err) => {
      console.error("Planet model load failed:", modelPath, err);
      loadingSet.delete(modelPath);
      const q = loadQueueMap.get(modelPath);
      if (q) {
        for (const queued of q) {
          queued(null);
        }
        loadQueueMap.delete(modelPath);
      }
    }
  );
}

/** 为每个节点 ID 分配一个固定的随机星球 */
export function getPlanetForNode(nodeId: string): string {
  let hash = 0;
  for (let i = 0; i < nodeId.length; i++) {
    hash = Math.abs(hash * 31 + nodeId.charCodeAt(i));
  }
  const index = hash % PLANET_MODELS.length;
  return PLANET_MODELS[index];
}
