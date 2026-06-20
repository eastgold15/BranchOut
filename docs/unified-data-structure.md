# 统一数据结构设计

## 核心理念

**ChatMessage 和 Topic 是同一个数据结构在不同场景下的视图。**

- UMessage = 统一消息（最小原子）
- Topic = 有 children 的 UMessage
- ChatMessage = 没有 children 的 UMessage

同一个 UMessage 数据，可以渲染为：
- 聊天视图的话题树
- 3D 视图的星球/星系

## 数据层级

```
┌─────────────────────────────────────────────────────────────┐
│  第一层：原子层（AtomMessage）                                │
│  不可变，只增不改，永远保留                                   │
├─────────────────────────────────────────────────────────────┤
│  原始属性：id, content, role, timestamp                     │
│  增强属性：title（简述目的）, embedding（语义向量）          │
└─────────────────────────────────────────────────────────────┘
                            ↓ 函数式转换
┌─────────────────────────────────────────────────────────────┐
│  第二层：统一层（UMessage）                                  │
│  可变，可重建，可更新                                        │
├─────────────────────────────────────────────────────────────┤
│  原子层 + 话题关系 + 3D渲染 + 状态                          │
└─────────────────────────────────────────────────────────────┘
                            ↓ AI管理
┌─────────────────────────────────────────────────────────────┐
│  第三层：话题层（Topic = 有children的UMessage）              │
│  AI自动聚类，用户可手动调整                                   │
└─────────────────────────────────────────────────────────────┘
                            ↓ 函数式转换
┌─────────────────────────────────────────────────────────────┐
│  第四层：视图层（Views + Groups）                            │
│  话题的不同组织方式                                          │
└─────────────────────────────────────────────────────────────┘
```

## 数据结构

### 第一层：原子层（不可变）

```typescript
interface AtomMessage {
  id: string;
  sessionId: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;

  title: string;              // 简述目的（AI生成）
  embedding: number[];        // 语义向量（384维）
}
```

### 第二层：统一层

```typescript
interface UMessage extends AtomMessage {
  // 话题关系（AI管理）
  topicId: string | null;     // 归属话题
  replyTo: string | null;     // 回复哪条消息
  relatedTo: string[];        // 相关消息

  // 嵌套结构（AI管理，用户可调整）
  parentId: string | null;    // 父UMessage
  children?: UMessage[];      // 子UMessage

  // 3D渲染
  position: [number, number, number];
  scale: number;
  offset?: [number, number, number];
  rotation?: [number, number, number];
  visible?: boolean;

  // 外观状态
  status?: "untouched" | "mentioned" | "explored" | "mastered" | "weak";
  isGalaxy?: boolean;
  isCollapsed?: boolean;

  // 视角分组
  groupIds?: string[];

  // 时间
  createdAt: Date;
  updatedAt: Date;
}
```

### 视图层

```typescript
interface View {
  id: string;
  name: string;
  topicIds: string[];
  groupIds: string[];
}

interface ViewGroup {
  id: string;
  viewId: string;
  title: string;
  nodeIds: string[];
  color: string;
  position: number;
}
```

## 函数式流水线

### 接口抽象

```typescript
// 步骤1：原始 → 原子层
type AtomizeFn = (raw: { content: string; role: "user" | "assistant"; timestamp: Date }) => Promise<AtomMessage>;

// 步骤2：原子层 → 统一层
type UnifyFn = (atom: AtomMessage) => Promise<UMessage>;

// 步骤3：统一层 → 话题检测
type DetectTopicFn = (uMessages: UMessage[]) => Promise<{ topicId: string; replyTo: string | null; relatedTo: string[] }[]>;

// 步骤4：话题检测 → 话题聚合
type AggregateFn = (uMessages: UMessage[]) => Promise<UMessage[]>;

// 步骤5：话题聚合 → 视图生成
type GenerateViewsFn = (uMessages: UMessage[]) => Promise<View[]>;
```

### 流水线定义

```typescript
interface Pipeline {
  name: string;
  steps: {
    atomize: AtomizeFn;
    unify: UnifyFn;
    detectTopic: DetectTopicFn;
    aggregate: AggregateFn;
    generateViews: GenerateViewsFn;
  };
}
```

### 默认实现

```typescript
const defaultPipeline: Pipeline = {
  name: "default",
  steps: {
    // 步骤1：生成原子层
    atomize: async (raw) => ({
      id: nanoid(),
      sessionId: currentSessionId,
      content: raw.content,
      role: raw.role,
      timestamp: raw.timestamp,
      title: await generateTitle(raw.content),
      embedding: await generateEmbedding(raw.content),
    }),

    // 步骤2：生成统一层
    unify: async (atom) => ({
      ...atom,
      topicId: null,
      replyTo: null,
      relatedTo: [],
      parentId: null,
      position: await calculatePosition(atom.embedding),
      scale: 1,
      offset: [0, 0, 0],
      visible: true,
      status: "untouched",
      createdAt: new Date(),
      updatedAt: new Date(),
    }),

    // 步骤3：话题检测（天干地支规则）
    detectTopic: async (uMessages) => {
      return await detectTopicsByTianganDizhi(uMessages);
    },

    // 步骤4：话题聚合（基于embedding聚类）
    aggregate: async (uMessages) => {
      return await aggregateByEmbedding(uMessages);
    },

    // 步骤5：视图生成
    generateViews: async (uMessages) => {
      return await generateAllViews(uMessages);
    },
  },
};
```

### 流水线执行

```typescript
// 实时执行（单条消息）
async function processMessage(
  raw: { content: string; role: "user" | "assistant" },
  pipeline: Pipeline
): Promise<UMessage> {
  const atom = await pipeline.steps.atomize(raw);
  const unified = await pipeline.steps.unify(atom);

  const history = await getHistoryMessages();
  const allMessages = [...history, unified];

  const topicInfo = await pipeline.steps.detectTopic(allMessages);
  unified.topicId = topicInfo[topicInfo.length - 1].topicId;
  unified.replyTo = topicInfo[topicInfo.length - 1].replyTo;
  unified.relatedTo = topicInfo[topicInfo.length - 1].relatedTo;

  await pipeline.steps.aggregate(allMessages);
  await pipeline.steps.generateViews(allMessages);

  return unified;
}

// 批量执行（重建）
async function rebuildPipeline(
  atomMessages: AtomMessage[],
  pipeline: Pipeline
): Promise<{ unified: UMessage[]; views: View[] }> {
  const unified = await Promise.all(atomMessages.map(atom => pipeline.steps.unify(atom)));
  const topicInfo = await pipeline.steps.detectTopic(unified);

  unified.forEach((m, i) => {
    m.topicId = topicInfo[i].topicId;
    m.replyTo = topicInfo[i].replyTo;
    m.relatedTo = topicInfo[i].relatedTo;
  });

  const aggregated = await pipeline.steps.aggregate(unified);
  const views = await pipeline.steps.generateViews(aggregated);

  return { unified: aggregated, views };
}
```

## Embedding 的作用

### 在嵌套结构中的作用

| 作用 | 说明 |
|------|------|
| **语义相似度计算** | 判断两条消息是否相关 |
| **自动话题检测** | 基于语义判断是否跳话题 |
| **话题聚合** | 相似的消息聚合成话题 |
| **话题层级** | 相似的话题组成更大的话题 |
| **3D布局** | 相似的消息在空间中靠近 |
| **关系发现** | 发现消息/话题间的潜在关联 |

### 具体工作流程

```
1. 每条消息生成 embedding
2. 计算新消息与所有历史消息的相似度
3. 相似度 > 阈值 → 归到同一话题
4. 相似度 < 阈值 → 新建话题或提示用户
5. 话题的 embedding = children 的平均 embedding
6. 话题间相似度计算 → 组成话题层级
```

## AI 的管理范围

### AI 负责的

| 任务 | 说明 |
|------|------|
| **消息归属** | 每条消息属于哪个话题 |
| **话题层级** | 话题属于哪个更大的话题 |
| **关系发现** | 消息/话题间的关联 |
| **标题生成** | 为话题生成标题 |
| **跳话题检测** | 实时检测话题转移 |
| **合并/拆分建议** | 建议话题合并或拆分 |

### 用户负责的

| 任务 | 说明 |
|------|------|
| **修改归属** | 手动调整消息的话题归属 |
| **调整层级** | 拖拽调整话题层级 |
| **创建话题** | 手动创建话题 |
| **删除话题** | 手动删除话题 |
| **编辑标题** | 手动编辑标题 |
| **自定义分组** | 创建自定义分组 |

## 核心原则

| 原则 | 说明 |
|------|------|
| **原子层不可变** | AtomMessage 只增不改 |
| **统一层可重建** | UMessage 可以用原子层重新计算 |
| **AI 自动管理** | 话题关系由 AI 自动处理 |
| **用户可干预** | 用户可以手动调整所有关系 |
| **视图不污染结构** | Views 只是额外的组织方式 |
| **流水线可替换** | 每个步骤可独立替换 |

## 实现计划

### 阶段1：设计新表
- [ ] 设计 `atom_messages` 表（不可变）
- [ ] 设计 `unified_messages` 表（可变）

### 阶段2：迁移数据
- [ ] 迁移 `chat_messages` → `atom_messages`
- [ ] 迁移 `topic_nodes` → `unified_messages`

### 阶段3：实现流水线
- [ ] 实现 `atomize` 步骤
- [ ] 实现 `unify` 步骤
- [ ] 实现 `detectTopic` 步骤（天干地支规则）
- [ ] 实现 `aggregate` 步骤（embedding聚类）
- [ ] 实现 `generateViews` 步骤

### 阶段4：统一视图
- [ ] 聊天视图：基于 children 渲染树
- [ ] 3D 视图：基于 position/scale/isGalaxy 渲染

### 阶段5：用户交互
- [ ] 拖拽调整 position/offset
- [ ] 拖拽重组父子关系
- [ ] 进入/退出星系
- [ ] 展开/折叠 children

## 3D视图渲染规则

### 星球 vs 星系
```
children.length === 0 → 星球（ChatMessage）
children.length > 0 → 根据 scale 判断：
  ├── scale < 星系阈值 → 小星球（小Topic）
  └── scale >= 星系阈值 → 星系（大Topic）
```

### 可见性过滤
```
当前在星系内 → 只显示 children
当前在星系外 → 只显示直接 children 和星系统一显示
```

### 进入/退出星系
```
点击星球 → 进入（放大，显示其children）
点击空白/返回 → 退出（缩小，显示父级）
```

## 文件组织

```
src/
├── pipeline/
│   ├── types/
│   │   ├── atom.ts           # AtomMessage
│   │   ├── unified.ts        # UMessage
│   │   └── view.ts           # View
│   ├── interfaces.ts         # 函数接口
│   ├── default.ts            # 默认实现
│   ├── alternatives/         # 替代实现
│   │   ├── detect-topic.ts
│   │   ├── aggregate.ts
│   │   └── generate-views.ts
│   └── executor.ts           # 执行器
├── services/
│   ├── embedding.ts          # Embedding生成
│   ├── title.ts              # Title生成
│   ├── position.ts           # 3D位置计算
│   ├── topic-detection.ts    # 天干地支检测
│   └── aggregation.ts        # 聚类算法
└── store/
    ├── atomStore.ts          # 原子层存储（不可变）
    └── unifiedStore.ts       # 统一层存储（可变）
```
