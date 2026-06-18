# Construct.md: 基于进程调度的任务管理 App MVP 构建规格书

## 1. 项目概述

构建一个**基于进程调度概念**的任务管理 Web App MVP。核心是将日常任务视为"进程"，使其具备五种状态（New、Ready、Blocked、Running、Exit），并支持自由模式与时间片轮转模式两种调度机制。UI 设计应直观体现操作系统的调度看板风格。

## 2. 技术栈（已确定）

| 层面     | 选型                           | 说明                       |
| -------- | ------------------------------ | -------------------------- |
| 前端框架 | **React 18+**                  | 函数组件 + Hooks           |
| 类型系统 | **TypeScript**（strict）       | 全量类型覆盖               |
| 构建工具 | **Vite**                       | 快速 HMR                   |
| 样式方案 | **TailwindCSS**                | 暗色科技感主题             |
| 状态管理 | **Zustand** + `persist` 中间件 | 持久化至 LocalStorage      |
| 数据存储 | **LocalStorage**               | MVP 不引入后端             |
| 后端     | **无**（纯前端 SPA）           | 未来扩展见 API_Contract.md |

## 3. 核心数据模型

> 以下为 TypeScript 类型定义，对应 Zustand store 中的数据结构。
> 详细字段约束见 `Database_Schema.md`。

```typescript
// ---- 枚举 ----
type TaskState = "New" | "Ready" | "Blocked" | "Running" | "Exit";
type Priority = 1 | 2 | 3; // 1=高, 2=中, 3=低
type RunningMode = "free" | "timeSlicing";

// ---- 实体 ----
interface Task {
  id: string;
  title: string;
  description: string;
  state: TaskState;
  isExecutable: boolean;
  priority: Priority;
  isEmergency: boolean;
  deadline: string | null; // ISO 8601
  isHighContextCost: boolean;
  eventId: string | null; // FK -> Event.id, 仅 Blocked 状态非空
  lastRunningAt: string | null; // ISO 8601, 用于防饥饿
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

interface Event {
  id: string;
  name: string;
  isSystemGenerated: boolean;
  isResolved: boolean;
  createdAt: string; // ISO 8601
}

interface AppSettings {
  runningMode: RunningMode;
  readyQueueLimit: number; // 默认 9
  timeSliceDuration: number; // 分钟, 默认 25
  currentRunningTaskId: string | null;
  activeEmergencyTaskId: string | null;
}
```

## 4. 核心功能与状态流转

### 4.1 五态定义

```
                    ┌──────────┐
                    │   New    │ 孵化池（想法收集）
                    └────┬─────┘
                         │ promote（需 isExecutable=true 且 Ready 队列未满）
                         ▼
┌──────────┐      ┌──────────┐      ┌──────────┐
│ Blocked  │◄─────│  Ready   │─────►│ Running  │
│ 阻塞等待 │ block│ 就绪队列  │ start│ 运行中   │
└────┬─────┘      └──────────┘      └────┬─────┘
     │ resolve              stop/complete │
     ▼                                    ▼
┌──────────┐                       ┌──────────┐
│  Ready   │                       │   Exit   │ 终止完成
└──────────┘                       └──────────┘
```

- **New（新建/孵化池）**: 创建任务默认状态。`isExecutable=false` 的任务停留于此，仅作想法收集，不参与调度。
- **Ready（就绪队列）**: 分三个优先级子队列（高/中/低），总量上限默认 9。任务按优先级排队，队首优先被调度。
- **Running（运行中）**: 全局唯一。当前正在执行的任务。
- **Blocked（阻塞/等待）**: 因外部依赖阻塞，需关联一个 Event。Event 解决后自动回到 Ready。
- **Exit（终止/完成）**: 任务终态，触发庆祝动画。

### 4.2 状态流转规则

| 流转                    | 触发方式                    | 条件/约束                                                  |
| ----------------------- | --------------------------- | ---------------------------------------------------------- |
| New → Ready             | 手动点击"提入就绪"          | `isExecutable=true`，Ready 队列未满（< `readyQueueLimit`） |
| Ready → Running         | 手动点击"启动调度器"        | 当前无 Running 任务，取最高优先级队首                      |
| Running → Ready         | 手动"停止" / 时间片到期切换 | 任务回到原优先级队列队尾                                   |
| Running → Exit          | 手动"标记完成"              | 清空 `currentRunningTaskId`                                |
| Running/Ready → Blocked | 手动"阻塞"                  | 创建/关联 Event                                            |
| Blocked → Ready         | Event 被标记"已解决"        | 系统自动恢复（需检查队列容量）                             |
| 任意 → Exit（紧急）     | 紧急任务完成                | 自动恢复被紧急阻塞的任务                                   |

### 4.3 紧急任务机制

- **约束**: 全局仅允许一个紧急任务，且必须 `isExecutable=true`。
- **触发**: 将 Ready 队列所有任务转为 Blocked（关联系统 Event `"emergency"`），紧急任务直接进入 Running。
- **恢复**: 紧急任务 Exit 后，自动将因 `"emergency"` 阻塞的任务恢复为 Ready，并标记该 Event 已解决。

### 4.4 调度模式

#### 模式一：自由模式（默认）

- 任务进入 Running 后持续运行，不限制时间。
- 用户手动停止或完成。

#### 模式二：时间片轮转模式

- 任务进入 Running 后开始倒计时（默认 25 分钟）。
- 时间片结束时：
  1. 响铃提示。
  2. 系统计算推荐下一个最高优先级任务并弹窗。
  3. 用户选择"切换任务"（原任务回 Ready，启动新任务）或"不切换"（重置倒计时）。
- **上下文切换优化**: 若当前任务 `isHighContextCost=true`，弹窗主动询问"该任务需要深度思考，是否继续？"（降低切换倾向）。

### 4.5 防饥饿机制（自动提权）

定期检查 Ready 队列中的任务：

- **DDL 临期**: `deadline` 在未来 24 小时内 且 `priority > 1` → 优先级提升一级。
- **长期未运行**: 距今超过 3 天未进入 Running 且 `priority > 1` → 优先级提升一级。

## 5. UI/UX 需求

- **主界面看板**: 五列布局（New / Ready / Blocked / Running / Exit）。
- **Ready 区域**: 三个优先级子列，显示 `当前数量 / 上限`，队首高亮。
- **Running 区域**: 醒目展示当前任务，含"停止"、"完成"按钮。时间片模式下显示倒计时。
- **Blocked 区域**: 旁附 Event 列表面板，点击可解决 Event 并恢复关联任务。
- **创建任务弹窗**: 标题、描述、是否可执行、优先级、DDL、是否高切换开销。紧急任务需联动判断（不可执行则不可紧急）。
- **Exit 区域**: 任务完成时展示庆祝动画（如彩纸特效或 Toast）。
- **主题**: 暗色科技感，响应式布局。

## 6. MVP 交付目标

一个可交互的单页应用，完整实现：

- ✅ 五态流转（含所有边界条件校验）
- ✅ 优先级调度（三队列 + 队列上限）
- ✅ 紧急任务机制（触发 + 自动恢复现场）
- ✅ 双运行模式（自由 / 时间片轮转）
- ✅ 防饥饿自动提权
- ✅ 数据 LocalStorage 持久化
- ✅ 暗色科技感 UI，响应式布局
