# 统一数据结构设计

## 核心理念

**AtomMessage 和 Topic 是同一个数据结构在不同场景下的视图。**

- AtomMessage = 原子消息（不可变）
- Topic = 有 children 的 AtomMessage
- ChatMessage = 没有 children 的 AtomMessage

**一种数据结构，两种 UI：**
- 聊天视图:飞书式嵌套话题聊天
- 3D 视图：星系嵌套可视化

## 数据结构

### AtomMessage（原子消息，不可变）

```typescript
interface AtomMessage {
  id: string;                  // 唯一ID
  sessionId: string;
  content: string;
  role: "user" | "assistant";  // 角色：用户或AI
  timestamp: Date;

  title: string;               // 简述目的（AI生成）
  embedding: number[];          // 语义向量（384维）

  children?: AtomMessage[];     // 有children就是话题，没有就是消息
}
```

### Topic = 有 children 的 AtomMessage

- **没有 children** → 单条消息（ChatMessage）
- **有 children** → 话题（Topic）
- **children 的顺序 = 对话的顺序**（按 timestamp 排列）
- 话题可以嵌套（children 里的 AtomMessage 也可以有 children）

### 示例

```
Topic: 反函数（AtomMessage 有 children）
  ├── AtomMessage 1: user "反函数是什么？" (timestamp: 10:00)
  ├── AtomMessage 2: assistant "反函数就是..." (timestamp: 10:01)
  ├── AtomMessage 3: user "为什么单调函数有反函数？" (timestamp: 10:02)
  └── AtomMessage 4: assistant "因为..." (timestamp: 10:03)

children 的顺序就是对话顺序。
```

## 天干地支五阶段（AI 提示词策略）

天干地支不是数据结构，而是 **AI 的提示词策略**，告诉 AI 如何判断话题边界和生长阶段。

| 阶段 | 代码 | 对话中的样子 | 例子 |
|------|------|-------------|------|
| **甲（萌发）** | jia | 学生提到一个新概念，或问一个新问题 | "那反函数是什么？" |
| **乙（展开）** | yi | 开始讨论，交换信息，有问有答 | "反函数就是把输入输出互换" |
| **丙（深入）** | bing | 追问机制、因果、关联——"为什么" | "为什么单调函数一定有反函数？" |
| **丁（关联）** | ding | 把当前概念和已有知识连起来 | "哦，那单调性和一一对应是一回事啊" |
| **戊（收敛）** | wu | 理解达成，讨论自然结束 | "明白了" "差不多了" |

### AI 的任务

1. **拆分**：如果用户一条消息包含多个问题，拆分成多个 Q&A 对
2. **归类**：把每个 AtomMessage 归到对应的话题（设置 children）
3. **判断生长阶段**：判断当前话题处于哪个生长阶段
4. **检测话题边界**：检测是否出现新的甲阶段（跳话题）
5. **构建嵌套结构**：检测话题之间的父子关系

### 划分规则（AI 提示词）

- 一个原子话题 = 至少经历了 **甲→乙** 的完整生长段（只萌发没展开的不算）
- 两个话题的边界 = **新的甲阶段出现**（学生提出了一个与当前话题不同的新方向）
- **聊出去的内容**（侧枝）也是一次完整的生长，不要扔掉
- **回头聊**之前的话题 → 归到已有话题，不新建
- **性质转变**：如果一个段里包含了两个可独立检验的概念，检查中间是否有性质转变
  - 有转变 → 拆成两个
  - 没有转变 → 就是一个，保持完整

## 视图渲染

### 聊天视图（飞书式嵌套）

```
┌──────────────────────────────┐
│ 📌 反函数 [展开]              │
│   用户：那反函数是什么？       │
│   AI：反函数就是把输入输出互换 │
│   📎 单调性（关联）[展开]     │
│     用户：为什么单调函数一定有反函数？ │
│     AI：因为单调函数是一一对应的... │
│ 📌 定义域 [折叠]              │
│ 📌 值域 [折叠]                │
│                              │
│ [反函数] 输入... [发送]       │
└──────────────────────────────┘
```

渲染逻辑：
- 遍历 AtomMessage 树
- 有 children → 显示为话题（可折叠/展开）
- 没有 children → 显示为消息
- children 按 timestamp 排序显示

### 3D视图（星系嵌套）

```
AtomMessage.children === undefined → 星球（ChatMessage）
AtomMessage.children && children.length > 0 → 星系（Topic）
  ├── 星系大小 = children.length
  └── 星系位置 = embedding 计算（相似话题靠近）
```

渲染逻辑：
- 遍历 AtomMessage 树
- 有 children → 显示为星系
- 没有 children → 显示为星球
- 星系大小由 children.length 决定
- 星系位置由 embedding 计算（相似话题在空间中靠近）

### 进入/退出星系

```
点击星系 → 进入（放大，显示其children）
点击空白/返回 → 退出（缩小，显示父级）
```

## Embedding 的作用

### 仅用于 3D 布局

Embedding 不用于话题划分（由天干地支策略负责），仅用于：

| 作用 | 说明 |
|------|------|)
| **3D布局** | 相似的消息/话题在空间中靠近 |
| **关系发现** | 发现消息/话题间的潜在关联（提示用户） |

### 3D 位置计算

```typescript
// 星系的位置 = embedding 向量映射到 3D 空间
// 相似话题在空间中靠近（embedding 距离小）
// 星系大小 = children.length * 基础大小
```

## 用户可干预

虽然 AI 自动归类，但用户可以手动调整：

| 操作 | 说明 |
|------|------|
| **移动消息** | 把消息从一个话题拖到另一个话题 |
| **合并话题** | 把两个话题合并成一个 |
| **拆分话题** | 把一个话题拆成两个 |
| **创建话题** | 手动创建新话题 |
| **删除话题** | 手动删除话题 |
| **调整层级** | 拖拽调整话题的父子关系 |
| **编辑标题** | 手动编辑话题标题 |

## Markdown 导出（Slidev PPT）

### 导出格式

```markdown
---
layout: cover
---

# {{ rootTopic.title }}

---

## {{ topic.title }}

{{ topic.messages }}

---

## {{ subTopic.title }}

{{ subTopic.messages }}

---

## 总结

{{ summary }}
```

### 导出流程

```
1. 遍历 AtomMessage 树结构
2. 每个话题（有children）生成一张幻灯片
3. 子话题嵌套在父话题下
4. 导出为 Markdown 文件
5. 使用 Slidev 转换为 PPT
```

## 核心原则

| 原则 | 说明 |
|------|------|
| **AtomMessage不可变** | 原始消息只增不改 |
| **话题可重建** | 可以用 AtomMessage 重新计算 |
| **天干地支为策略** | AI 提示词策略，不是数据结构 |
| **Embedding为辅** | 仅用于3D布局和关系发现 |
| **用户可干预** | 用户可以手动调整所有关系 |
| **一种数据两种UI** | 聊天嵌套和3D星系嵌套共享同一数据 |