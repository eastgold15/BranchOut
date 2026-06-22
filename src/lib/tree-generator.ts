import * as THREE from "three";
import type { AtomMessageData } from "@/types";

interface Branch {
  depth: number;
  end: THREE.Vector3;
  start: THREE.Vector3;
  thickness: number;
}

interface TreeNodePosition {
  id: string;
  message: AtomMessageData;
  position: THREE.Vector3;
}

/**
 * 递归分支算法生成真实树模型
 * 使用 L-system 风格的递归分形树
 */
export function generateTreeModel(messages: AtomMessageData[]): {
  branches: Branch[];
  nodePositions: TreeNodePosition[];
} {
  const branches: Branch[] = [];
  const nodePositions: TreeNodePosition[] = [];

  // 找到根话题（parentId === null && role === "topic")
  const rootTopic = messages.find(
    (m) => m.parentId === null && m.role === "topic"
  );
  if (!rootTopic) {
    return { branches, nodePositions };
  }

  const trunkBase = new THREE.Vector3(0, -6, 0);
  const trunkTop = new THREE.Vector3(0, -2, 0);

  branches.push({
    start: trunkBase,
    end: trunkTop,
    thickness: 0.15,
    depth: 0,
  });

  nodePositions.push({
    id: rootTopic.id,
    position: trunkTop.clone(),
    message: rootTopic,
  });

  // 找到根话题的子话题
  const childTopics = messages.filter(
    (m) => m.parentId === rootTopic.id && m.role === "topic"
  );

  if (childTopics.length === 0) {
    return { branches, nodePositions };
  }

  const angleStep = (Math.PI * 2) / childTopics.length;
  const baseRadius = 2.5;
  const heightRange = 4;

  for (const [index, childTopic] of childTopics.entries()) {
    const baseAngle = angleStep * index + (Math.random() - 0.5) * 0.3;

    const branchEnd = new THREE.Vector3(
      Math.cos(baseAngle) * baseRadius,
      trunkTop.y + 1.5 + Math.random() * heightRange,
      Math.sin(baseAngle) * baseRadius
    );

    branches.push({
      start: trunkTop.clone(),
      end: branchEnd.clone(),
      thickness: 0.08,
      depth: 1,
    });

    nodePositions.push({
      id: childTopic.id,
      position: branchEnd.clone(),
      message: childTopic,
    });

    // 找到子话题的子话题
    const grandChildren = messages.filter(
      (m) => m.parentId === childTopic.id && m.role === "topic"
    );

    if (grandChildren.length > 0) {
      generateSubBranches(
        branchEnd,
        baseAngle,
        grandChildren,
        2,
        branches,
        nodePositions,
        messages
      );
    }
  }

  return { branches, nodePositions };
}

function generateSubBranches(
  parentEnd: THREE.Vector3,
  parentAngle: number,
  childTopics: AtomMessageData[],
  depth: number,
  branches: Branch[],
  nodePositions: TreeNodePosition[],
  allMessages: AtomMessageData[]
) {
  const spreadAngle = Math.PI * 0.6;
  const branchLength = 1.8 - depth * 0.3;
  const thickness = 0.04 - depth * 0.01;

  for (const [index, childTopic] of childTopics.entries()) {
    const angleOffset =
      childTopics.length === 1
        ? 0
        : (index / (childTopics.length - 1) - 0.5) * spreadAngle;

    const angle = parentAngle + angleOffset + (Math.random() - 0.5) * 0.2;
    const elevation = (Math.random() - 0.3) * 1.5;

    const branchEnd = new THREE.Vector3(
      parentEnd.x + Math.cos(angle) * branchLength,
      parentEnd.y + elevation,
      parentEnd.z + Math.sin(angle) * branchLength
    );

    branches.push({
      start: parentEnd.clone(),
      end: branchEnd.clone(),
      thickness: Math.max(thickness, 0.02),
      depth,
    });

    nodePositions.push({
      id: childTopic.id,
      position: branchEnd.clone(),
      message: childTopic,
    });

    // 找到子话题的子话题
    const grandChildren = allMessages.filter(
      (m) => m.parentId === childTopic.id && m.role === "topic"
    );

    if (grandChildren.length > 0) {
      generateSubBranches(
        branchEnd,
        angle,
        grandChildren,
        depth + 1,
        branches,
        nodePositions,
        allMessages
      );
    }
  }
}

/**
 * 将分支数据转换为 Three.js TubeGeometry 的参数
 */
export function createBranchGeometry(branch: Branch): THREE.TubeGeometry {
  const direction = new THREE.Vector3().subVectors(branch.end, branch.start);
  const _length = direction.length();
  void _length;

  const midPoint = new THREE.Vector3()
    .addVectors(branch.start, branch.end)
    .multiplyScalar(0.5);

  const perpendicular = new THREE.Vector3(
    Math.sin(branch.depth * 1.5) * 0.2,
    0.1,
    Math.cos(branch.depth * 1.5) * 0.2
  );
  midPoint.add(perpendicular);

  const curve = new THREE.QuadraticBezierCurve3(
    branch.start,
    midPoint,
    branch.end
  );

  const radialSegments = 6;
  const tubularSegments = 8;

  return new THREE.TubeGeometry(
    curve,
    tubularSegments,
    branch.thickness,
    radialSegments,
    false
  );
}