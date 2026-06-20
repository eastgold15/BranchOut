"use client";

let pipelineInstance: any = null;
let pipelineLoading: Promise<any> | null = null;

/**
 * 在浏览器中用 transformers.js 做文本嵌入（纯本地，零外部请求）
 *
 * 模型: Xenova/all-MiniLM-L6-v2 (23MB, 384 维)
 * 首次使用需下载，之后从浏览器缓存加载
 */
export class EmbeddingService {
  private static instance: EmbeddingService;
  private modelLoaded = false;

  static getInstance(): EmbeddingService {
    if (!EmbeddingService.instance) {
      EmbeddingService.instance = new EmbeddingService();
    }
    return EmbeddingService.instance;
  }

  async loadModel(): Promise<any> {
    if (pipelineInstance) {
      return pipelineInstance;
    }
    if (pipelineLoading) {
      return pipelineLoading;
    }

    pipelineLoading = (async () => {
      try {
        const transformersModule = await import("@huggingface/transformers");
        if (
          !transformersModule ||
          typeof transformersModule.pipeline !== "function"
        ) {
          throw new Error("Failed to load transformers module");
        }
        const { pipeline } = transformersModule;

        pipelineInstance = await pipeline(
          "feature-extraction",
          "Xenova/all-MiniLM-L6-v2",
          {
            dtype: "q4",
            device: "webgpu",
          }
        );
        this.modelLoaded = true;
        return pipelineInstance;
      } catch (error) {
        console.error("Failed to load embedding model:", error);
        pipelineLoading = null;
        throw error;
      }
    })();

    return pipelineLoading;
  }

  get isLoaded(): boolean {
    return this.modelLoaded;
  }

  async encode(text: string): Promise<number[]> {
    const model = await this.loadModel();
    const result = await model(text, { pooling: "mean", normalize: true });
    return Array.from(result.data) as number[];
  }

  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      return 0;
    }
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dotProduct / denom;
  }

  /**
   * 找出与目标话题最相关的 k 个话题
   */
  findRelated(
    targetId: string,
    topics: Array<{ id: string; title: string; embedding: number[] | null }>,
    k = 5
  ): Array<{ id: string; title: string; score: number }> {
    const target = topics.find((t) => t.id === targetId);
    if (!target?.embedding) {
      return [];
    }

    const scores: Array<{ id: string; title: string; score: number }> = [];
    for (const topic of topics) {
      if (topic.id === targetId || !topic.embedding) {
        continue;
      }
      const score = this.cosineSimilarity(target.embedding, topic.embedding);
      scores.push({ id: topic.id, title: topic.title, score });
    }

    scores.sort((a, b) => b.score - a.score);
    return scores.slice(0, k);
  }

  /**
   * 从向量空间构建树结构（星系式布局 - 基于语义距离）
   *
   * 核心思路：
   * 1. 相似概念靠近，不同概念远离
   * 2. 使用 t-SNE 风格投影到 3D 空间
   * 3. 边权重反映语义相似度
   */
  buildTree(
    topics: Array<{
      id: string;
      title: string;
      embedding: number[] | null;
      depth?: number;
    }>,
    viewEmbedding?: number[] | null,
    timeSequence?: string[],
    userOffsets?: Map<string, [number, number, number]>,
    customGroups?: Array<{ groupId: string; nodeIds: string[]; title: string }>
  ): {
    nodes: Array<{
      id: string;
      title: string;
      position: [number, number, number];
      depth: number;
      similarity?: number;
      groupId?: string;
    }>;
    edges: Array<{ from: string; to: string; weight: number }>;
  } {
    if (topics.length === 0) {
      return { nodes: [], edges: [] };
    }

    // 计算相似度矩阵
    const similarityMap = this.computeSimilarityMatrix(
      topics,
      viewEmbedding,
      timeSequence
    );

    // 找根节点（与根主题最相似的）
    const rootTopic = topics.find((t) => t.depth === 0);
    let rootId = rootTopic?.id || topics[0].id;

    // 如果有根主题embedding，找最相似的作为根
    if (rootTopic?.embedding) {
      let maxSim = -1;
      for (const topic of topics) {
        if (topic.id === rootId || !topic.embedding) {
          continue;
        }
        const sim = this.cosineSimilarity(rootTopic.embedding, topic.embedding);
        if (sim > maxSim) {
          maxSim = sim;
          rootId = topic.id;
        }
      }
    }

    // 构建最小生成树
    const { edges, nodeDepths } = this.buildSemanticTree(
      topics,
      similarityMap,
      rootId
    );

    // 计算节点位置 - 基于语义空间的 3D 投影
    const positions = this.calculateSemanticPositions(topics, edges);

    // 叠加用户偏移量
    const finalPositions = new Map<string, [number, number, number]>();
    for (const [id, pos] of positions) {
      const offset = userOffsets?.get(id) || [0, 0, 0];
      finalPositions.set(id, [
        pos[0] + offset[0],
        pos[1] + offset[1],
        pos[2] + offset[2],
      ]);
    }

    // 如果有自定义分组，按分组重新组织节点
    const nodeGroupMap = new Map<string, string>();
    if (customGroups) {
      for (const group of customGroups) {
        for (const nodeId of group.nodeIds) {
          nodeGroupMap.set(nodeId, group.groupId);
        }
      }
    }

    return {
      nodes: topics.map((t) => ({
        id: t.id,
        title: t.title,
        position: finalPositions.get(t.id) || [0, 0, 0],
        depth: nodeDepths.get(t.id) || 0,
        similarity: similarityMap.get(t.id)?.get(rootId) || 0,
        groupId: nodeGroupMap.get(t.id),
      })),
      edges: edges.map((e) => ({
        from: e.from,
        to: e.to,
        weight: similarityMap.get(e.from)?.get(e.to) || 0.5,
      })),
    };
  }

  /**
   * 计算相似度矩阵
   */
  private computeSimilarityMatrix(
    topics: Array<{
      id: string;
      title: string;
      embedding: number[] | null;
      depth?: number;
    }>,
    viewEmbedding?: number[] | null,
    timeSequence?: string[]
  ): Map<string, Map<string, number>> {
    const similarityMap = new Map<string, Map<string, number>>();

    for (const a of topics) {
      if (!a.embedding) {
        continue;
      }
      const scores = new Map<string, number>();

      for (const b of topics) {
        if (a.id === b.id || !b.embedding) {
          continue;
        }

        let sim = this.cosineSimilarity(a.embedding, b.embedding);

        // 视角加权
        if (viewEmbedding) {
          const viewA = this.cosineSimilarity(a.embedding, viewEmbedding);
          const viewB = this.cosineSimilarity(b.embedding, viewEmbedding);
          sim = sim * 0.7 + ((viewA + viewB) / 2) * 0.3;
        }

        // 时序加权：连续聊过的加分
        if (timeSequence) {
          const iA = timeSequence.indexOf(a.id);
          const iB = timeSequence.indexOf(b.id);
          if (iA >= 0 && iB >= 0 && Math.abs(iA - iB) <= 3) {
            sim = Math.min(sim * 1.15, 1);
          }
        }

        scores.set(b.id, Math.max(0, Math.min(1, sim)));
      }
      similarityMap.set(a.id, scores);
    }

    return similarityMap;
  }

  /**
   * 构建语义树（基于相似度的 Prim 算法变体）
   */
  private buildSemanticTree(
    topics: Array<{ id: string }>,
    similarityMap: Map<string, Map<string, number>>,
    rootId: string
  ): {
    edges: Array<{ from: string; to: string }>;
    nodeDepths: Map<string, number>;
  } {
    const visited = new Set<string>([rootId]);
    const edges: Array<{ from: string; to: string }> = [];
    const nodeDepths = new Map<string, number>();
    nodeDepths.set(rootId, 0);

    while (visited.size < topics.length) {
      let bestEdge: { from: string; to: string; sim: number } | null = null;

      // 从已访问节点找最佳邻居
      for (const fromId of visited) {
        const scores = similarityMap.get(fromId);
        if (!scores) {
          continue;
        }

        for (const [toId, sim] of scores) {
          if (visited.has(toId)) {
            continue;
          }

          if (!bestEdge || sim > bestEdge.sim) {
            bestEdge = { from: fromId, to: toId, sim };
          }
        }
      }

      if (!bestEdge) {
        break;
      }

      edges.push({ from: bestEdge.from, to: bestEdge.to });
      visited.add(bestEdge.to);
      nodeDepths.set(bestEdge.to, (nodeDepths.get(bestEdge.from) || 0) + 1);
    }

    return { edges, nodeDepths };
  }

  /**
   * 计算节点位置 - 使用语义空间投影
   * 核心：相似节点靠近，不同节点远离
   */
  private calculateSemanticPositions(
    topics: Array<{
      id: string;
      title: string;
      embedding: number[] | null;
    }>,
    edges: Array<{ from: string; to: string }>
  ): Map<string, [number, number, number]> {
    const positions = new Map<string, [number, number, number]>();
    const embeddings = new Map<string, number[]>();

    // 收集有 embedding 的节点
    for (const topic of topics) {
      if (topic.embedding) {
        embeddings.set(topic.id, topic.embedding);
      }
    }

    const embeddedTopics = Array.from(embeddings.entries());
    const noEmbedding = topics.filter((t) => !t.embedding);

    // 1. 对有 embedding 的节点做 PCA/均值中心化投影
    if (embeddedTopics.length > 0) {
      // 计算均值中心
      const dim = embeddedTopics[0][1].length;
      const centroid = new Array(dim).fill(0);
      for (const [, emb] of embeddedTopics) {
        for (let i = 0; i < dim; i++) {
          centroid[i] += emb[i];
        }
      }
      for (let i = 0; i < dim; i++) {
        centroid[i] /= embeddedTopics.length;
      }

      // 中心化
      const centered = embeddedTopics.map(([id, emb]) => ({
        id,
        vec: emb.map((v, i) => v - centroid[i]),
      }));

      // 简化的 PCA：取前3个主成分
      const { components } = this.simplePCA(
        centered.map((c) => c.vec),
        3
      );

      // 投影到 3D（缩放到可见范围）
      const scale = 4; // 控制整体大小
      for (const { id, vec } of centered) {
        const x = this.dotProduct(vec, components[0]) * scale;
        const y = this.dotProduct(vec, components[1]) * scale;
        const z =
          this.dotProduct(vec, components[2] ?? components[1]) * scale * 0.5;
        positions.set(id, [x, y, z]);
      }
    }

    // 2. 没有 embedding 的节点，根据边的连接关系放置
    for (const topic of noEmbedding) {
      // 找连接到这个节点的边
      const connectedEdges = edges.filter(
        (e) => e.from === topic.id || e.to === topic.id
      );

      if (connectedEdges.length > 0) {
        // 计算邻居的平均位置
        let sumX = 0,
          sumY = 0,
          sumZ = 0;
        let count = 0;

        for (const edge of connectedEdges) {
          const neighborId = edge.from === topic.id ? edge.to : edge.from;
          const pos = positions.get(neighborId);
          if (pos) {
            sumX += pos[0];
            sumY += pos[1];
            sumZ += pos[2];
            count++;
          }
        }

        if (count > 0) {
          // 在邻居附近添加一些偏移
          const offset = 1.5;
          positions.set(topic.id, [
            sumX / count + (Math.random() - 0.5) * offset,
            sumY / count + (Math.random() - 0.5) * offset,
            sumZ / count + (Math.random() - 0.5) * offset,
          ]);
        }
      } else {
        // 孤岛节点，放到边缘
        positions.set(topic.id, [
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 5,
        ]);
      }
    }

    return positions;
  }

  /**
   * 简化的 PCA 实现
   */
  private simplePCA(
    vectors: number[][],
    nComponents: number
  ): { components: number[][]; variance: number[] } {
    if (vectors.length < 2) {
      return {
        components: [
          [1, 0, 0],
          [0, 1, 0],
          [0, 0, 1],
        ],
        variance: [1, 1, 1],
      };
    }

    const n = vectors.length;
    const dim = vectors[0].length;

    // 计算协方差矩阵（简化版）
    const cov: number[][] = [];
    for (let i = 0; i < dim; i++) {
      cov[i] = new Array(dim).fill(0);
      for (let j = 0; j < dim; j++) {
        let sum = 0;
        for (let k = 0; k < n; k++) {
          sum += vectors[k][i] * vectors[k][j];
        }
        cov[i][j] = sum / (n - 1);
      }
    }

    // 简化的特征向量计算（使用幂迭代）
    const components: number[][] = [];
    const variance: number[] = [];
    const covCopy = cov.map((row) => [...row]);

    for (let c = 0; c < Math.min(nComponents, dim); c++) {
      // 幂迭代找最大特征值对应的特征向量
      let v = new Array(dim).fill(0).map(() => Math.random() - 0.5);
      const len = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
      v = v.map((x) => x / len);

      for (let iter = 0; iter < 50; iter++) {
        const newV = new Array(dim).fill(0);
        for (let i = 0; i < dim; i++) {
          for (let j = 0; j < dim; j++) {
            newV[i] += covCopy[i][j] * v[j];
          }
        }
        const newLen = Math.sqrt(newV.reduce((s, x) => s + x * x, 0));
        if (newLen < 1e-10) {
          break;
        }
        v = newV.map((x) => x / newLen);
      }

      components.push(v);
      variance.push(
        v.reduce(
          (s, vi, i) =>
            s +
            vi * (covCopy[i]?.reduce?.((a, cij, j) => a + cij * v[j], 0) ?? 0),
          0
        )
      );
    }

    return { components, variance };
  }

  private dotProduct(a: number[], b: number[]): number {
    return a.reduce((sum, ai, i) => sum + ai * (b[i] || 0), 0);
  }
}

export const embeddingService = EmbeddingService.getInstance();
