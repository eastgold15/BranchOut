# 自然生长风 · 3D 知识树主题设计

> BranchOut 知识树系统 `feature/embedding` 分支的 3D 场景视觉重构
> 从明亮/工具感风格 → 沉浸式暗色森林生态

## 设计目标

将当前 3D 知识树的视觉效果从"工具感八面体水晶"转变为"夜间森林生态"：
节点是发光果实，连接是自然藤蔓，空间中飘散萤火虫粒子。

## 氛围与灯光

### 场景基调

| 属性 | 值 |
|------|-----|
| 背景色 | `#0A1A0F` — 极深墨绿 |
| 顶部渐变 | 从 `#0F2027` 向 `#0A1A0F` 过渡，模拟树冠遮挡月光 |
| Fog | 颜色 `#0A1A0F`，近端 8，远端 30 |
| 地面薄雾 | 场景底部半透明雾面，增加景深感 |

### 灯光系统

- **月光（顶光）**：`#E2E8F0`，强度 0.6，位置 `[0, 20, 0]`，冷白偏蓝
- **琥珀（底光）**：`#F97316`，强度 0.8，位置 `[0, -8, 0]`，暖橙上照
- **环境光**：`#1A3A2A`，强度 0.2，最低限度轮廓光
- **节点自发光**：每个果实自身 emissive 发光

## 果实节点

替代原有的八面体水晶 + 光晕球体。

### 结构

- **外层**：极薄半透明 SphereGeometry，`MeshPhysicalMaterial`
  - `transmission: 0.3`，`roughness: 0.4`，`emissive` 弱
- **核心**：内部小 20% 的 SphereGeometry
  - 强 `emissive` + `emissiveIntensity: 2-3`，呼吸脉冲动画
- 去掉旧的光晕球体（`glowRef` 对应的 `sphereGeometry`）

### 状态颜色（发光版）

| 状态 | 外层色 | 核心发光 |
|------|--------|---------|
| untouched | `#5C6B4F` | 无，暗哑 |
| mentioned | `#6EE7B7` → `#34D399` | 淡绿微光 |
| explored | `#A78BFA` | 紫光脉动 |
| mastered | `#FCD34D` | 暖金黄强光 |
| weak | `#FB7185` | 淡玫瑰光，微颤 |

### 动画

- 果实整体上下浮动（保留现有 float 逻辑）
- 核心光呼吸脉冲：`sin(time) * 0.3 + 0.7`
- mastered 状态：保留 ring 光环逻辑，改为细金色光环
- 悬浮时果实微微朝向 camera（轻柔 billboard）

### 删除

- 删除 `glowRef` 对应的 sphereGeometry 光晕球（透明保护球）
- 删除或简化 `glowRef` 相关的 pulse 逻辑
- 不再需要外部的 glow/光晕 mesh

## 藤蔓连接

替代现有的光滑管状曲线。

- **曲线**：`CubicBezierCurve3` 或 `CatmullRomCurve3`，多控制点自然弧度
- **粗细渐变**：根部 `0.03` → 尖端 `0.008`
- **颜色渐变**：`#4A3728`（深褐绿）→ `#6B8F5E`（藤绿）→ `#A8E6A0`（嫩绿）
- **扭曲**：控制点小幅度随机偏移，模拟自然弯曲
- **depth 对应**：
  - depth 0：粗壮主藤 `radius: 0.04`
  - depth 1：分支藤 `radius: 0.025`
  - depth 2+：细枝藤 `radius: 0.012`
  - depth 3+：极细卷须 `radius: 0.006`

## 萤火虫粒子系统

- **数量**：80 个
- **形状**：圆形软光斑（`PointsMaterial` + `sizeAttenuation`）
- **大小**：`0.08 ~ 0.25` 随机
- **颜色**：`#CDEA68` → `#FCD34D` → `#F97316` 随机
- **渲染**：`AdditiveBlending` + `DepthTest: false`
- **行为**：
  - 噪声驱动的平滑随机游走
  - 独立呼吸闪烁（`sin(time * speed + phase) * 0.5 + 0.5`）
  - 偏好在节点周围聚集
- **交互**：与节点不碰撞，camera 靠近时不变大

## 文件变更清单

### 修改的文件

| 文件 | 变更 |
|------|------|
| `src/components/knowledge-tree/knowledge-tree.tsx` | 背景色、灯光、fog 配置；新增粒子系统集成 |
| `src/components/knowledge-tree/tree-node.tsx` | 果实节点替换八面体；删除 glowRef；状态颜色更新 |
| `src/components/knowledge-tree/branch.tsx` | 藤蔓曲线增强；粗细+颜色渐变；扭曲逻辑 |

### 新增的文件

| 文件 | 说明 |
|------|------|
| `src/components/knowledge-tree/fireflies.tsx` | 萤火虫粒子系统组件 |
| `src/components/knowledge-tree/fruit-node.tsx` | （可选）抽离果实节点为独立组件 |

### 不修改的文件

- `src/components/knowledge-tree/tree-edge.tsx` — 未使用，但保留；不影响新主题
- `src/app/page.tsx` — 布局不变
- `src/app/layout.tsx` — 布局不变
- `src/types/index.ts` — 类型不变
- `src/store/sessionStore.ts` — 状态管理不变

## 技术选型

- 果实材质：`MeshPhysicalMaterial`（利用 transmission + emissive）
- 藤蔓：`TubeGeometry` 手动构建 + 顶点颜色
- 萤火虫：`THREE.Points` + 自定义 ShaderMaterial 或 drei `Sparkles`
- 动画：`useFrame` 驱动，无需额外动画库

## 后续可能增强

- [ ] 藤蔓表面纹理扰动（bump map）
- [ ] 卷须细节（末端小螺旋）
- [ ] 鼠标附近萤火虫加速聚集
- [ ] 果实成熟动画（untouched → mastered 渐变色过渡）
