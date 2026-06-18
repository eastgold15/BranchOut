# 基于 transformers.js 的本地嵌入方案

## 概要

用户的浏览器是 next.js 应用。使用 transformers.js 在浏览器中加载一个轻量级嵌入模型，所有向量计算在本地完成，不依赖任何后端服务或外部 API。

---

## 1. 技术选型

| 组件 | 选择 | 原因 |
|------|------|------|
| **模型** | `Xenova/all-MiniLM-L6-v2` | 仅 23MB，384 维，CPU 推理约 30-50ms，质量对概念级别的嵌入足够 |
| **运行时** | `@xenova/transformers` | 浏览器中运行 ONNX 模型，WebAssembly 加速，无 GPU 要求 |
| **向量存储** | SQLite（已有）存 JSON 文本 | 384 个 float 序列化后约 1.5KB/条，1000 条仅 1.5MB |
| **相似度计算** | 纯 JS 实现 cosine similarity | 384 维 × 50 节点 ~ 1ms，不需要向量数据库 |

## 2. 关键权衡

| 角度 | transformers.js | Ollama（本地服务） | DeepSeek API |
|------|----------------|-------------------|-------------|
| 模型大小 | 23MB（首次需下载） | 274MB | 0 |
| 推理位置 | 浏览器主线程/Worker | 独立进程 | 云端 |
| 离线可用 | 是（模型缓存后） | 是 | 否 |
| 首次加载 | 需下载 23MB 模型 | 需下载 274MB | 无 |
| 隐私 | 完全本地 | 完全本地 | 数据出本地 |
| 部署复杂度 | `npm install` 即可 | 需安装 Ollama | 需 API Key |

## 3. 架构图

```
┌─────────────────────────────────────────────────────┐
│                  浏览器（用户设备）                    │
│                                                      │
│  ┌──────────────┐    ┌──────────────────────────┐    │
│  │  TopicNode   │    │  EmbeddingService        │    │
│  │  （原子话题）  │    │                          │    │
│  │              │    │  transformers.js 模型     │    │
│  │  - id        │◄──►│  - encode(text)          │    │
│  │  - title     │    │  - cosineSimilarity(a,b) │    │
│  │  - content   │    │  - findRelated(id, k)    │    │
│  │  - embedding──┼───►│  - buildTree(viewType)  │    │
│  │  - created_at │    └──────────┬───────────────┘    │
│  └──────┬───────┘               │                    │
│         │                       │                    │
│         ▼                       ▼                    │
│  ┌──────────────────────────────────────┐           │
│  │       3D 知识树渲染（Three.js）        │           │
│  │    实时从 embedding 拉取关系拓扑      │           │
│  └──────────────────────────────────────┘           │
│                                                      │
│  ┌──────────────────────────────────────┐           │
│  │       ViewController（视角切换）      │           │
│  │  - "主动探索" → 默认语义相似         │           │
│  │  - "解题思路" → 向解题向量偏移        │           │
│  │  - "教材章节" → 向教材结构向量偏移     │           │
│  └──────────────────────────────────────┘           │
└─────────────────────────────────────────────────────┘
```

## 4. 实现步骤

### Step 1: 安装依赖

```bash
npm install @xenova/transformers
```

一个包，无其他依赖。

### Step 2: 创建 EmbeddingService（纯客户端）

`src/lib/embedding-service.ts`

```typescript
class EmbeddingService {
  private pipeline: Pipeline | null = null;

  // 1. 懒加载模型（第一次调用时下载）
  async getModel(): Promise<Pipeline> { ... }

  // 2. 将文本转为 384 维向量
  async encode(text: string): Promise<number[]> { ... }

  // 3. 计算两个向量的余弦相似度
  cosineSimilarity(a: number[], b: number[]): number { ... }

  // 4. 找出与某话题最相关的 k 个话题
  findRelated(
    topicId: string,
    allTopics: TopicNodeData[],
    k: number
  ): Array<{ topic: TopicNodeData; score: number }> { ... }

  // 5. 根据视角构建树结构
  buildTree(
    topics: TopicNodeData[],
    viewType: ViewType,       // "semantic" | "chronological" | "problem-solving"
    timeSequence?: string[]   // 用户聊的顺序
  ): { nodes: TreeNodeData[]; edges: EdgeData[] } { ... }
}
```

### Step 3: 修改数据库 Schema

在 `schema.ts` 中给 `topicNodes` 加字段：

```diff
+ embedding: text("embedding")   // JSON 字符串: "[0.023,-0.056,...]"
```

**注意**：为了向下兼容，现有节点 embedding 为 null，触发时自动计算。

### Step 4: 原子话题提取

当用户在一次聊天会话中积累了足够内容后，AI（DeepSeek）负责从对话中提取原子话题。这不是实时嵌入的任务，是**批处理**任务：

```typescript
// 用户聊完一轮后，AI 提取原子话题
async function extractAtomicTopics(chatHistory: Message[]): Promise<AtomicTopic[]> {
  // 调用 DeepSeek API，传入聊天记录
  // 返回 [{title, content}, ...]
}

// 提取后自动计算 embedding
for (const topic of atomicTopics) {
  topic.embedding = await embeddingService.encode(topic.title + " " + topic.content);
  await saveToDB(topic);
}
```

### Step 5: 视角系统

视角不是硬编码的规则，而是**向量偏移**：

```
主动探索视角：直接用 embedding 的余弦相似度
解题思路视角：embedding + "解题方法" 偏移向量
教材章节视角：embedding + "教材结构" 偏移向量
```

视角向量由 AI（DeepSeek）根据用户的一句话描述生成：

```typescript
async function generateViewVector(description: string): Promise<number[]> {
  // 调用 DeepSeek API: "请用 20 个字以内描述你想从什么角度看待这些知识点"
  // 用户回答"我想按解题思路来看"
  // 对回答做 embedding，作为视角向量
}
```

### Step 6: 3D 树渲染适配

当前的 `KnowledgeTree` 组件从 `session.nodes`（Map）直接读父子关系。

改为从 `EmbeddingService.buildTree()` 获取：

```diff
- const treeData = generateTreeModel(session.nodes);  // 旧的
+ const treeData = await embeddingService.buildTree(
+   Array.from(session.nodes.values()),
+   currentViewType
+ );
```

树组件本身**不需要大改**，`generateTreeModel` 仍然接收 `{branches, nodePositions}` 结构。

### Step 7: Web Worker（可选优化）

模型推理是 CPU 密集的。如果界面出现卡顿，可以把 `EmbeddingService` 放到 Web Worker 中：

```
src/
├── workers/
│   └── embedding.worker.ts    # 在此加载 transformers.js
├── lib/
│   └── embedding-service.ts   # 封装 worker 通信
```

### Step 8: 关系可视化

在 UI 上增加一个**视角选择器**：

```
┌─────────────────────┐
│  当前视角: 主动探索 ▼ │
│  ┌─────────────────┐│
│  │  主动探索        ││
│  │  解题思路        ││
│  │  教材章节        ││
│  │  自定义...       ││
│  └─────────────────┘│
└─────────────────────┘
```

切换视角时，视角向量改变 → `buildTree()` 重新计算 → 3D 树重新渲染。

## 5. 模型加载体验

23MB 的模型文件在**第一次**使用时需要下载。之后浏览器会缓存（IndexedDB）。体验设计：

```
首次使用：
  1. 用户输入主题开始学习
  2. 弹窗提示："首次使用需要加载嵌入模型（23MB），约 10-20 秒"
  3. 显示加载进度条
  4. 模型缓存后，后续使用无感

后续使用：
  模型从缓存加载，约 100-300ms
```

## 6. 与现有代码的兼容性

| 现有代码 | 改动量 | 说明 |
|---------|--------|------|
| `schema.ts` | 小 | 加一个 `embedding` 字段 |
| `db/index.ts` | 无 | 不涉及 |
| `sessionStore.ts` | 小 | 增加 `viewType` 状态 |
| `tree-node.tsx` | 无 | 不需要改 |
| `branch.tsx` | 无 | 不需要改 |
| `knowledge-tree.tsx` | 中 | `generateTreeModel` 改为从 embedding 服务获取 |
| `tree-generator.ts` | 无 | `generateTreeModel` 函数签名不变 |
| `chat-card.tsx` | 小 | 聊天结束后触发原子话题提取 |
| `ai-service.ts` | 中 | 新增 `extractAtomicTopics`、`generateViewVector` 函数 |
| `chat/route.ts` | 无 | 不需要改 |

## 7. 风险

| 风险 | 概率 | 影响 | 缓解 |
|------|------|------|------|
| 23MB 模型下载失败 | 低 | 中 | 提供重试、显示进度、回退到 DeepSeek API |
| 浏览器不支持 WASM | 极低 | 高 | transformers.js 自动降级 |
| 模型在低端手机上慢 | 中 | 中 | 用 Web Worker、只在空闲时计算 |
| 384 维 embedding 不足以区分细粒度概念 | 中 | 中 | 可换 `all-mpnet-base-v2`（80MB），但先测试 |