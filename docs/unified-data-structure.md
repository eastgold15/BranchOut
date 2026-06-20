# 统一数据结构设计

## 核心理念

**ChatMessage 和 Topic 是同一个数据结构在不同场景下的视图。**

- ChatMessage = Message 的叶子版（最小粒度，没有 children）
- Topic = Message 的聚合版（有 children）

同一个 Message 数据，可以渲染为：
- 聊天视图的话题树
- 3D 视图的星球/星系

## 数据结构

```typescript
interface Message {
  // ========== 核心标识 ==========
  id: string;
  sessionId: string;      // 属于哪个会话
  parentId: string | null; // 父节点
  rootId: string;         // 根节点

  // ========== 内容 ==========
  content: string;        // 内容
  title?: string;         // 标题（Topic用，ChatMessage无）

  // ========== 顺序 ==========
  order: number;          // 在父级中的顺序
  depth: number;          // 深度层级

  // ========== 元信息 ==========
  timestamp?: Date;       // 时间戳（ChatMessage用）
  role?: "user" | "assistant"; // 角色（ChatMessage用）
  type?: "text" | "correction" | "question" | "summary"; // 消息类型（ChatMessage用）
  source?: "ai-init" | "user-mention" | "ai-correction"; // 来源

  // ========== 嵌套（Topic用） ==========
  children?: Message[];    // 子消息

  // ========== AI分析（Topic用） ==========
  embedding?: number[];    // 语义向量（384维）

  // ========== 3D渲染 ==========
  position: [number, number, number];  // 位置
  scale: number;          // 大小
  offset?: [number, number, number];  // 拖拽偏移
  rotation?: [number, number, number]; // 旋转
  visible?: boolean;      // 是否可见

  // ========== 外观状态（Topic用） ==========
  status?: "untouched" | "mentioned" | "explored" | "mastered" | "weak";
  isGalaxy?: boolean;      // 是否是星系（由scale自动判断）

  // ========== 折叠 ==========
  isCollapsed?: boolean;  // 是否折叠

  // ========== 视角分组 ==========
  groupIds?: string[];    // 属于哪些分组

  // ========== 时间 ==========
  createdAt: Date;
  updatedAt: Date;
}
```

## 两种视图对比

| 属性 | ChatMessage | Topic | 说明 |
|------|:-----------:|:-----:|------|
| id | ✅ | ✅ | 唯一标识 |
| sessionId | ✅ | ✅ | 所属会话 |
| parentId | ✅ | ✅ | 父节点 |
| content | ✅ | ✅ | 内容 |
| title | ❌ | ✅ | 标题（AI聚合后生成） |
| order | ✅ | ✅ | 顺序 |
| depth | ✅ | ✅ | 深度 |
| timestamp | ✅ | ❌ | 时间戳 |
| role | ✅ | ❌ | 角色 |
| type | ✅ | ❌ | 消息类型 |
| source | ✅ | ✅ | 来源 |
| children | ❌ | ✅ | 子消息 |
| embedding | ❌ | ✅ | 语义向量 |
| position | ✅ | ✅ | 3D位置 |
| scale | ✅ | ✅ | 大小 |
| offset | ✅ | ✅ | 拖拽偏移 |
| rotation | ❌ | ✅ | 旋转 |
| visible | ✅ | ✅ | 可见性 |
| status | ❌ | ✅ | 状态 |
| isGalaxy | ❌ | ✅ | 是否星系 |
| isCollapsed | ✅ | ✅ | 折叠 |
| groupIds | ❌ | ✅ | 分组 |
| createdAt | ✅ | ✅ | 创建时间 |
| updatedAt | ✅ | ✅ | 更新时间 |

## 如何区分

用 `children` 是否为空来区分：

```
Message.children === undefined → ChatMessage（叶子节点）
Message.children !== undefined → Topic（聚合节点）
```

用 `scale` 来判断星系：
```
scale > 阈值 → isGalaxy = true
```

## 数据流程

```
1. 用户对话
   → 创建 ChatMessage（Message，没有 children）
   → 自动生成基础 3D 位置

2. AI 分析（Embedding）
   → 根据语义相似度聚类
   → 生成 embedding 向量

3. 聚合为 Topic
   → 添加 title, children, embedding, status
   → 更新 scale（聚合越多，scale越大）
   → children 数量足够多时 → isGalaxy = true

4. 用户交互
   → 拖拽调整 position/offset
   → 拖拽重组父子关系
   → 进入/退出星系
   → 展开/折叠 children

5. 持久化
   → 所有变更保存到数据库
```

## 视图渲染

同一个 Message 数据，不同视图展示：

| Message 属性 | 聊天视图 | 3D视图 |
|-------------|---------|--------|
| content | 对话内容 | 标签文字 |
| title | 话题标题 | 星球名称 |
| children | 折叠/展开子话题 | 进入子节点 |
| scale | 无 | 星球/星系大小 |
| status | 无（可能高亮） | 星球颜色/外观 |
| isGalaxy | 无 | 渲染为星系 |
| position | 无 | 3D 空间位置 |
| isCollapsed | 折叠图标 | 星系是否展开 |

## Embedding 的作用

### 是什么
- 384 维的语义向量
- 由 AI 模型（Xenova/all-MiniLM-L6-v2）生成
- 语义相似的内容，向量也相似

### 怎么用
1. **自动聚类**：相似的 Message 聚合为 Topic（添加 children）
2. **3D 布局**：基于向量计算 position
3. **关系发现**：AI 自动发现潜在关联

### 用户操作
- AI 自动处理关系
- 用户可以手动调整
- 调整后持久化

## 当前数据库表 vs 目标结构

### 当前（复杂多层）
```
sessions → topic_nodes → chat_messages
                              ↓
views → view_groups
```

### 目标（统一结构）
```
sessions → messages（统一Message表）
              ↓
views → view_groups（仅用于自定义视角分组）
```

## 实现计划

#:# 阶段1：设计新表
- [ ] 设计 `messages` 表
  - 包含所有 Message 属性
  - 支持递归自引用（parentId）

#:# 阶段2：迁移数据
- [ ] 迁移 `chat_messages` → `messages`
- [ ] 迁移 `topic_nodes` → `messages`（作为 Topic）
- [ ] 保留 `view_groups`（自定义分组功能）
:
### 阶段3：更新 Embedding
- [ ] 新消息自动生成 embedding
- [ ] 实现自动聚类逻辑
- [ ] 定期重新聚类（可选）

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
children.length === 0 → 星球（ChatMessage 或小 Topic）
children.length > 0 → 根据 scale 判断：
  ├── scale < 星系阈值 → 小星球
  └── scale >= 星系阈值 → 星系
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
