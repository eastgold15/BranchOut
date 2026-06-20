# 项目完成状态

> 基于设计决策记录的实现进度跟踪

---

## 核心设计决策实现状态

### 1. 原子话题 = 生长段（天干地支五阶段）✅

- 实现文件：`src/lib/topic-extractor.ts`
- 核心逻辑：从对话中观察完整的生长段，而非切分
- 五阶段：甲（萌发）→ 乙（展开）→ 丙（深入）→ 丁（关联）→ 戊（收敛）
- 验证：14 轮函数学习对话成功提取 5 个原子话题

### 2. 对话顺序 vs 知识结构（双维度）✅

- 实现文件：`src/db/schema.ts`, `src/components/chat/nested-chat-view.tsx`
- 时间维：所有消息带 `timestamp`，保持原始顺序
- 语义维：消息按 `nodeId` 分组，按 embedding 建树
- 两个维度随时可切换

### 3. 双层分类架构（实时 + 全量）✅

- 实时判断：`src/app/api/classify-topic/route.ts` (~2-3s)
- 全量提取：`src/app/api/extract-topics/route.ts` (~20s)
- 执行流程：发送消息 → 后台轻量分类 → 积累 10 轮后全量整理

### 4. 飞书式话题聊天 UI ✅

- 实现文件：`src/components/chat/nested-chat-view.tsx`
- `TopicSection` 递归组件处理嵌套
- 所有话题在同一滚动流，支持折叠/展开
- 子话题缩进显示，输入框始终在底部

### 5. Tab 呼出 3D 知识树 ✅

- 实现文件：`src/app/page.tsx`, `src/components/knowledge-tree/knowledge-tree.tsx`
- Tab 按住显示半透明叠加层，松开关闭
- Canvas 始终保持 mounted，CSS 控制可见性
- 点击节点进入该话题聊天

### 6. 历史会话管理 ✅

- 实现文件：`src/components/topic-selector.tsx`, `src/app/api/sessions/route.ts`
- 首页显示最近学习记录列表
- 支持继续上次学习、新建话题

### 7. 三层 UI 架构 ✅

- 第一层：`TopicSelector`（历史列表 + 新建）
- 第二层：`NestedChatView`（飞书式话题聊天）
- 第三层：`KnowledgeTree` + `ViewSelector`（Tab 临时呼出）

---

## 待办清单

### ✅ 已完成

| 待办项 | 实现位置 | 说明 |
|--------|----------|------|
| 全量 extractAtomicTopics 自动触发 | `nested-chat-view.tsx:168` | 每 10 轮对话自动触发 |
| 分类结果写入 DB | `nested-chat-view.tsx:641` | `classifyInBackground` 自动创建节点 |
| 视角持久化 | `views/route.ts` | 写入 SQLite |
| 手动创建 View | `view-selector.tsx` | 支持自定义视角创建 |

### ❌ 未完成

| 待办项 | 说明 |
|--------|------|
| 自定义视角 Segments 配置 | 创建后无法编辑节点分组 |
| 用户思维模式分析 | 从对话顺序中提取学习风格特征 |

---

## 额外优化

### 3D 知识树

- **语义布局**：PCA 将 384 维 embedding 投影到 3D 空间，相似概念距离更近
- **节点视觉**：大小随掌握程度缩放，已掌握节点带旋转光晕
- **分支效果**：颜色/粗细反映相似度，带发光效果
- **Shader 粒子**：自定义 ShaderMaterial 实现柔和圆形光斑
- **模型归一化**：顶点级处理确保 3D 水果模型正确显示

### API 完整列表

| API | 方法 | 功能 |
|-----|------|------|
| `/api/chat` | POST | AI 流式对话 |
| `/api/classify-topic` | POST | 轻量实时分类 |
| `/api/extract-topics` | POST | 全量话题提取 |
| `/api/messages` | GET/POST | 消息 CRUD |
| `/api/nodes` | GET/POST | 话题节点管理 |
| `/api/session` | GET/POST | 会话管理 |
| `/api/sessions` | GET | 历史会话列表 |
| `/api/views` | GET/POST | 视角管理 |

---

## 进度统计

- **核心功能**：85% 完成
- **设计决策落地**：7/7（100%）
- **待办清单**：4/6（67%）
- **API 完整性**：8/8（100%）

---

## 下一阶段目标

1. **自定义视角 Segments 配置**：提供界面让用户编辑节点分组
2. **用户思维模式分析**：从对话顺序中提取学习风格特征