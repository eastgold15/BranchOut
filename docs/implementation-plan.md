# 3D 知识树实现计划

## 目标

实现完整的 3D 知识树交互系统，包含：
1. **Embedding 语义布局** - AI 自动计算节点位置和关系
2. **鼠标滚轮控制** - 缩放/旋转/平移
3. **进入/退出星系** - 层级导航
4. **移动星系** - 拖拽偏移
5. **分组话题操作** - 自定义分组管理

---

## 架构设计

### 核心原则

**Embedding 默认值 + 用户自定义覆盖** 的双层架构：
- Embedding 层提供语义骨架（自动计算合理位置）
- 用户交互层提供个性化覆盖（拖拽、分组、视角）

### 数据结构

```typescript
interface KnowledgeSession {
  id: string;
  rootTopic: string;
  nodes: Map<string, TopicNodeData>;
  rootNodeId: string;

  // 用户交互数据
  nodeOffsets: Map<string, [number, number, number]>;  // 拖拽偏移量
  currentGalaxyId: string | null;                       // 当前进入的星系
  galaxyHistory: string[];                              // 星系导航历史

  // 视角数据
  views: CustomView[];
  currentViewId: string;
}

interface CustomView {
  id: string;
  name: string;
  description: string;           // 用户描述
  viewVector: number[];          // AI 生成的视角向量（384维）
  groups: CustomGroup[];         // 自定义分组
}

interface CustomGroup {
  id: string;
  viewId: string;
  title: string;
  nodeIds: string[];
  color: string;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 实现步骤

### Phase 1: Embedding 层扩展

**目标**：修改 embedding-service.ts，支持用户偏移量和自定义分组

| 任务 | 文件 | 说明 |
|------|------|------|
| 1.1 | `src/lib/embedding-service.ts` | 增加 `userOffsets` 参数，叠加用户拖拽偏移 |
| 1.2 | `src/lib/embedding-service.ts` | 增加 `customGroups` 参数，支持按分组重新组织节点 |
| 1.3 | `src/store/sessionStore.ts` | 增加 `nodeOffsets` 状态管理 |

### Phase 2: 进入/退出星系

**目标**：实现滚轮缩放触发层级切换

| 任务 | 文件 | 说明 |
|------|------|------|
| 2.1 | `src/components/knowledge-tree/knowledge-tree.tsx` | 增加 `currentGalaxyId` 和 `galaxyHistory` 状态 |
| 2.2 | `src/components/knowledge-tree/knowledge-tree.tsx` | 实现 `enterGalaxy()` 和 `exitGalaxy()` 函数 |
| 2.3 | `src/components/knowledge-tree/knowledge-tree.tsx` | 实现相机动画（聚焦到星系中心） |
| 2.4 | `src/components/knowledge-tree/tree-node.tsx` | 星系节点渲染为星云效果（有子节点 = 星云） |

### Phase 3: 移动星系

**目标**：实现拖拽移动星系，存储偏移量

| 任务 | 文件 | 说明 |
|------|------|------|
| 3.1 | `src/components/knowledge-tree/tree-node.tsx` | 实现节点拖拽事件处理 |
| 3.2 | `src/store/sessionStore.ts` | 实现 `startDrag()` / `onDrag()` / `endDrag()` |
| 3.3 | `src/components/knowledge-tree/knowledge-tree.tsx` | 星系拖拽时子节点跟随移动 |

### Phase 4: 分组话题操作

**目标**：实现自定义分组的 CRUD 操作

| 任务 | 文件 | 说明 |
|------|------|------|
| 4.1 | `src/db/schema.ts` | 创建 `view_groups` 表 |
| 4.2 | `src/app/api/views/route.ts` | 扩展 API 支持分组操作 |
| 4.3 | `src/app/api/views/[viewId]/groups/route.ts` | 新增分组 CRUD API |
| 4.4 | `src/components/view-selector.tsx` | 增加分组管理界面 |
| 4.5 | `src/components/knowledge-tree/knowledge-tree.tsx` | 渲染分组边界/颜色 |

### Phase 5: 星系渲染优化

**目标**：提升视觉效果和用户体验

| 任务 | 文件 | 说明 |
|------|------|------|
| 5.1 | `src/components/knowledge-tree/tree-node.tsx` | 星云外壳渲染（半透明发光球体） |
| 5.2 | `src/components/knowledge-tree/knowledge-tree.tsx` | 进入/退出星系的平滑过渡动画 |
| 5.3 | `src/components/knowledge-tree/branch.tsx` | 星系内部连线优化 |

### Phase 6: 聊天界面同步

**目标**：聊天界面与 3D 树同步显示分组结构

| 任务 | 文件 | 说明 |
|------|------|------|
| 6.1 | `src/components/nested-chat-view.tsx` | 按当前分组渲染话题 |
| 6.2 | `src/components/chat-card.tsx` | 显示节点所属分组标签 |

---

## 优先顺序

| 阶段 | 优先级 | 依赖 |
|------|--------|------|
| Phase 1 | 🔴 高 | 无 |
| Phase 2 | 🔴 高 | Phase 1 |
| Phase 3 | 🟡 中 | Phase 2 |
| Phase 4 | 🟡 中 | Phase 1 |
| Phase 5 | 🟢 低 | Phase 2 |
| Phase 6 | 🟢 低 | Phase 4 |

---

## 验收标准

### Phase 1
- [ ] `buildTree()` 支持 `userOffsets` 参数
- [ ] `buildTree()` 支持 `customGroups` 参数
- [ ] 拖拽偏移量正确叠加到 embedding 位置

### Phase 2
- [ ] 滚轮放大进入星系（有子节点的节点）
- [ ] 滚轮缩小退出星系
- [ ] 相机动画平滑过渡
- [ ] 进入星系后外层节点淡出

### Phase 3
- [ ] 拖拽单个节点时位置正确更新
- [ ] 拖拽星系时所有子节点跟随移动
- [ ] 偏移量持久化到 sessionStore

### Phase 4
- [ ] 数据库表 `view_groups` 创建成功
- [ ] 分组 CRUD API 正常工作
- [ ] 3D 树中按分组渲染节点颜色

### Phase 5
- [ ] 星系节点显示为半透明星云效果
- [ ] 进入/退出星系有平滑过渡动画
- [ ] 星系内部连线清晰可见

### Phase 6
- [ ] 聊天界面按分组渲染话题
- [ ] 聊天卡片显示分组标签
- [ ] 切换分组时聊天界面同步更新

---

## 风险评估

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| Embedding 偏移叠加计算错误 | 中 | 中 | 单元测试覆盖位置计算逻辑 |
| 星系进入/退出状态混乱 | 高 | 高 | 严格的状态机管理 |
| 大量节点拖拽性能下降 | 低 | 中 | 使用 Three.js 实例化渲染 |
| 分组与 embedding 布局冲突 | 低 | 低 | 双层架构设计，分组作为覆盖层 |

---

## 预估时间

| 阶段 | 预估时间 |
|------|----------|
| Phase 1 | 2 小时 |
| Phase 2 | 3 小时 |
| Phase 3 | 2 小时 |
| Phase 4 | 4 小时 |
| Phase 5 | 2 小时 |
| Phase 6 | 2 小时 |
| **总计** | **15 小时** |
