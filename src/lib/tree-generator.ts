import * as THREE from "three";
import type { TopicNodeData } from "@/types";

interface Branch {
  depth: number;
  end: THREE.Vector3;
  start: THREE.Vector3;
  thickness: number;
}

interface TreeNodePosition {
  id: string;
  node: TopicNodeData;
  position: THREE.Vector3;
}

/**
 * 递归分支算法生成真实树模型
 * 使用 L-system 风格的递归分形树
 */
export function generateTreeModel(nodes: Map<string, TopicNodeData>): {
  branches: Branch[];
  nodePositions: TreeNodePosition[];
} {
  const branches: Branch[] = [];
  const nodePositions: TreeNodePosition[] = [];

  const rootNode = Array.from(nodes.values()).find((n) => n.depth === 0);
  if (!rootNode) {
    return { branches, nodePositions };
  }

  // 根节点在树干底部
  const trunkBase = new THREE.Vector3(0, -6, 0);
  const trunkTop = new THREE.Vector3(0, -2, 0);

  // 树干
  branches.push({
    start: trunkBase,
    end: trunkTop,
    thickness: 0.15,
    depth: 0,
  });

  // 根节点位置在树干顶部
  nodePositions.push({
    id: rootNode.id,
    position: trunkTop.clone(),
    node: rootNode,
  });

  // 获取一级子节点
  const childNodes = Array.from(nodes.values()).filter(
    (n) => n.parentId === rootNode.id
  );

  if (childNodes.length === 0) {
    return { branches, nodePositions };
  }

  // 为每个子节点分配一个扇形区域
  const angleStep = (Math.PI * 2) / childNodes.length;
  const baseRadius = 2.5;
  const heightRange = 4;

  for (const [index, childNode] of childNodes.entries()) {
    const baseAngle = angleStep * index + (Math.random() - 0.5) * 0.3;

    // 第一层分支：从树干顶部向外延伸
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
      id: childNode.id,
      position: branchEnd.clone(),
      node: childNode,
    });

    // 检查是否有二级子节点
    const grandChildren = Array.from(nodes.values()).filter(
      (n) => n.parentId === childNode.id
    );

    if (grandChildren.length > 0) {
      generateSubBranches(
        branchEnd,
        baseAngle,
        grandChildren,
        2,
        branches,
        nodePositions
      );
    }
  }

  return { branches, nodePositions };
}

function generateSubBranches(
  parentEnd: THREE.Vector3,
  parentAngle: number,
  childNodes: TopicNodeData[],
  depth: number,
  branches: Branch[],
  nodePositions: TreeNodePosition[]
) {
  const spreadAngle = Math.PI * 0.6; // 分支扇形展开角度
  const branchLength = 1.8 - depth * 0.3;
  const thickness = 0.04 - depth * 0.01;

  for (const [index, childNode] of childNodes.entries()) {
    const angleOffset =
      childNodes.length === 1
        ? 0
        : (index / (childNodes.length - 1) - 0.5) * spreadAngle;

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
      id: childNode.id,
      position: branchEnd.clone(),
      node: childNode,
    });

    // 递归生成更深层分支（暂不递归，保持两层）
    const grandChildren: TopicNodeData[] = [];
    if (grandChildren.length > 0) {
      generateSubBranches(
        branchEnd,
        angle,
        grandChildren,
        depth + 1,
        branches,
        nodePositions
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

  // 创建曲线路径（带轻微弯曲）
  const midPoint = new THREE.Vector3()
    .addVectors(branch.start, branch.end)
    .multiplyScalar(0.5);

  // 添加随机弯曲
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
