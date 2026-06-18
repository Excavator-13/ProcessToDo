# Phase 3: 核心状态流转与就绪队列 — 开发任务清单

## 前置说明

- **已完成**: Phase 1（项目初始化、五列看板布局、Zustand Store 骨架）和 Phase 2（类型拆分、addTask、CreateTaskModal、持久化验证）。
- **当前状态**: 任务可创建并展示在 New 区域，但所有状态流转 action 均为空实现（`promoteTask`、`startScheduler`、`stopTask`、`completeTask` 等）。
- **本阶段目标**: 实现 New → Ready → Running → Ready/Exit 的核心流转链路，以及 Ready 队列的三优先级子列展示。

---

## Task 3.1: 实现 `promoteTask(id)` — Store 层 ✅

**目标**: 在 Zustand Store 中实现 New → Ready 的状态流转，含完整边界校验。

**文件变更**:

- 修改 `src/store/useAppStore.ts`：
  - 实现 `promoteTask(id: string)`：
    1. 通过 `get()` 获取当前 `tasks` 和 `settings`。
    2. 找到目标 task，校验其存在性，不存在则 `throw new Error("Task not found")`。
    3. 校验 `task.state === "New"`，否则 `throw new Error("Task is not in New state")`。
    4. 校验 `task.isExecutable === true`，否则 `throw new Error("Task is not executable")`。
    5. 计算 Ready 队列当前数量：`tasks.filter(t => t.state === "Ready").length`。
    6. 校验 `readyCount < settings.readyQueueLimit`，否则 `throw new Error("Ready queue is full")`。
    7. 更新 task：`state = "Ready"`、`updatedAt = new Date().toISOString()`。
    8. `set(state => ({ tasks: state.tasks.map(t => t.id === id ? { ...t, state: "Ready" as TaskState, updatedAt: now } : t) }))`。

**验证**: 在浏览器控制台调用 `useAppStore.getState().promoteTask(taskId)`，确认任务 state 变为 `"Ready"`；对不可执行任务调用应抛错；队列满时调用应抛错。

---

## Task 3.2: 实现 `startScheduler()` — Store 层 ✅

**目标**: 实现 Ready → Running 的调度逻辑，取最高优先级队首任务。

**文件变更**:

- 修改 `src/store/useAppStore.ts`：
  - 实现 `startScheduler()`：
    1. 获取当前 `tasks` 和 `settings`。
    2. 校验 `settings.currentRunningTaskId === null`，否则 `throw new Error("A task is already running")`。
    3. 筛选 `state === "Ready"` 的任务，按 `priority` 升序排列（1=高优先），同优先级按 `createdAt` 升序（FIFO）。
    4. 若无 Ready 任务，`throw new Error("No tasks in Ready queue")`。
    5. 取队首任务（排序后第一个），更新其 `state = "Running"`、`lastRunningAt = now`、`updatedAt = now`。
    6. 更新 `settings.currentRunningTaskId = 队首任务.id`。
    7. `set()` 同时更新 tasks 数组和 settings。

**验证**: 创建多个不同优先级的 Ready 任务后调用 `startScheduler()`，确认最高优先级最先进入 Running；已有 Running 任务时调用应抛错。

---

## Task 3.3: 实现 `stopTask(id)` 和 `completeTask(id)` — Store 层 ✅

**目标**: 实现 Running → Ready（停止）和 Running → Exit（完成）的流转。

**文件变更**:

- 修改 `src/store/useAppStore.ts`：
  - 实现 `stopTask(id: string)`：
    1. 找到目标 task，校验 `task.state === "Running"`，否则抛错。
    2. 更新 task：`state = "Ready"`、`updatedAt = now`。
    3. 清空 `settings.currentRunningTaskId = null`。
    4. `set()` 同时更新 tasks 和 settings。
  - 实现 `completeTask(id: string)`：
    1. 找到目标 task，校验 `task.state === "Running"`，否则抛错。
    2. 更新 task：`state = "Exit"`、`updatedAt = now`。
    3. 清空 `settings.currentRunningTaskId = null`。
    4. `set()` 同时更新 tasks 和 settings。

**验证**: Running 任务调用 `stopTask()` 后回到 Ready 列；调用 `completeTask()` 后进入 Exit 列；`currentRunningTaskId` 均被清空。

---

## Task 3.4: TaskCard 增加"提入就绪"按钮 ✅

**目标**: 在 New 区域的任务卡片上增加操作按钮，触发 `promoteTask`。

**文件变更**:

- 修改 `src/components/TaskCard.tsx`：
  - Props 增加 `onPromote?: (id: string) => void`（可选回调）。
  - 当 `task.state === "New"` 且 `task.isExecutable === true` 时，在卡片底部渲染"提入就绪"按钮。
  - 按钮样式：neon-green 色调，小号字体，hover 发光效果。
  - 点击调用 `onPromote(task.id)`。
  - 当 `task.state === "New"` 且 `task.isExecutable === false` 时，显示灰色禁用提示"不可执行"。
- 修改 `src/App.tsx`：
  - 在 New 列渲染 TaskCard 时传入 `onPromote={(id) => useAppStore.getState().promoteTask(id)}`。
  - 使用 `try/catch` 或在 store 层处理错误，通过 toast/提示展示（MVP 阶段可先用 `alert`）。

**验证**: 可执行任务卡片出现"提入就绪"按钮 → 点击后任务移至 Ready 列；不可执行任务显示禁用提示。

---

## Task 3.5: Ready 队列三优先级子列展示 ✅

**目标**: 将 Ready 区域从单一列表改为三个优先级子列，显示容量和队首高亮。

**文件变更**:

- 创建 `src/components/ReadyQueue.tsx` 组件：
  - 从 store 读取 `tasks`（筛选 `state === "Ready"`）和 `settings.readyQueueLimit`。
  - 将 Ready 任务按 `priority` 分为三组：高（1）、中（2）、低（3）。
  - 渲染三个子列，每列：
    - 标题：`P1:高` / `P2:中` / `P3:低`，带对应霓虹色。
    - 计数 badge：`当前数量 / readyQueueLimit`（如 `2/9`）。
    - 队首任务（每组第一个）高亮显示（更强的边框发光或背景色）。
    - 每组内任务按 `createdAt` 排序（FIFO），渲染 TaskCard。
  - 整体显示总容量：`总 Ready 数 / readyQueueLimit`。
  - 样式：三列等宽网格，暗色背景，与主看板风格一致。
- 修改 `src/App.tsx`：
  - Ready 列不再直接渲染 TaskCard 列表，改为渲染 `<ReadyQueue />` 组件。
  - Ready 列的 KanbanColumn children 区域直接放置 ReadyQueue。

**验证**: Ready 任务按优先级分三列展示；队首任务有视觉高亮；容量显示正确。

---

## Task 3.6: Running 区域与"启动调度器"按钮 ✅

**目标**: 在 Running 区域展示当前运行任务，提供启动/停止/完成操作。

**文件变更**:

- 创建 `src/components/RunningPanel.tsx` 组件：
  - 从 store 读取 `settings.currentRunningTaskId`，据此找到 Running 任务。
  - **无 Running 任务时**：
    - 显示"启动调度器"按钮，点击调用 `startScheduler()`。
    - 按钮样式：neon-red 色调，醒目大号，hover 发光脉冲动画。
    - 若 Ready 队列为空，按钮 disabled 并提示"无就绪任务"。
  - **有 Running 任务时**：
    - 展示该任务的 TaskCard（放大版或特殊样式，醒目显示）。
    - 显示"手动停止"按钮（调用 `stopTask`）和"标记完成"按钮（调用 `completeTask`）。
    - 按钮样式：停止=neon-yellow，完成=neon-green。
- 修改 `src/App.tsx`：
  - Running 列不再直接渲染 TaskCard 列表，改为渲染 `<RunningPanel />` 组件。

**验证**: 无 Running 任务时显示"启动调度器"按钮 → 点击后最高优先级任务进入 Running → 显示任务卡片和停止/完成按钮 → 点击停止任务回 Ready / 点击完成任务进 Exit。

---

## Task 3.7: 错误提示机制 ✅

**目标**: 为状态流转中的校验失败提供用户可见的反馈。

**文件变更**:

- 创建 `src/hooks/useToast.ts`（简易 toast hook）：
  - 提供 `showToast(message: string, type: "error" | "success" | "info")` 方法。
  - 内部维护一个 toast 列表 state，自动 3 秒后消失。
- 创建 `src/components/Toast.tsx` 组件：
  - 渲染当前 toast 列表，固定在屏幕右上角。
  - 样式：error=neon-red 边框，success=neon-green 边框，info=neon-cyan 边框。
- 修改 `src/App.tsx`：
  - 在根组件中渲染 `<Toast />`。
- 修改 `src/store/useAppStore.ts`：
  - 在 `promoteTask`、`startScheduler`、`stopTask`、`completeTask` 中，将 `throw new Error(...)` 改为通过 toast 机制展示错误（或在调用侧 catch 后展示）。
  - **推荐方案**: store action 仍然 throw error，在 UI 组件的调用处 try/catch 并调用 `showToast`，保持 store 纯净。

**验证**: 队列满时点击"提入就绪"→ 右上角出现红色 toast 提示"Ready queue is full"；成功操作出现绿色 toast。

---

## Task 3.8: Exit 区域完成动画 ✅

**目标**: 任务标记完成时展示简单的庆祝反馈。

**文件变更**:

- 修改 `src/components/TaskCard.tsx`：
  - 当 `task.state === "Exit"` 时，卡片添加进入动画（如 `animate-bounce` 或自定义 `@keyframes` 缩放渐入）。
  - 卡片样式调整：降低透明度（`opacity-70`），添加 ✅ 图标，表示已完成。
- 修改 `src/App.tsx` 或 `RunningPanel.tsx`：
  - `completeTask` 成功后，触发一个简单的彩纸/粒子效果（可用 CSS animation 实现，无需引入第三方库）。
  - **MVP 方案**: 完成时在 Running 区域显示一个短暂的 "🎉 Task Completed!" 动画文字，1.5 秒后消失。

**验证**: 点击"标记完成"→ Exit 列新增卡片带入场动画 → Running 区域短暂显示庆祝提示。

---

## Task 3.9: 端到端集成验证 ✅

**目标**: 验证完整流转链路和边界条件。

**测试场景**:

1. **正常流转**: 创建可执行任务 → 提入就绪 → 启动调度器 → 标记完成 ✅
2. **停止流转**: 创建可执行任务 → 提入就绪 → 启动调度器 → 手动停止 → 任务回 Ready ✅
3. **优先级调度**: 创建 P1、P3、P2 三个任务 → 提入就绪 → 启动调度器 → P1 先运行 ✅
4. **队列容量**: 设置 `readyQueueLimit=2`，提入第 3 个任务时提示队列满 ✅
5. **不可执行任务**: 不可执行任务不显示"提入就绪"按钮 ✅
6. **唯一 Running**: 已有 Running 任务时，"启动调度器"按钮不可用 ✅
7. **持久化**: 执行流转操作后刷新页面，状态保持 ✅
8. **空状态**: 各列为空时显示占位提示 ✅

---

## 依赖关系

```
Task 3.1 (promoteTask Store) ─┐
Task 3.2 (startScheduler Store) ─┤
Task 3.3 (stopTask/completeTask Store) ─┼→ Task 3.7 (Toast 错误提示)
                                          │
Task 3.4 (TaskCard 提入就绪按钮) ← 3.1   │
Task 3.5 (ReadyQueue 三子列)    ← 3.1    │
Task 3.6 (RunningPanel)         ← 3.2,3.3┤
Task 3.8 (Exit 完成动画)        ← 3.3    │
                                          │
Task 3.9 (集成验证) ← 3.4,3.5,3.6,3.7,3.8┘
```

**推荐实施顺序**: 3.1 → 3.2 → 3.3 → 3.7 → 3.4 → 3.5 → 3.6 → 3.8 → 3.9

---

## 预估工作量

| Task     | 内容                        | 预估时间     | 复杂度 |
| -------- | --------------------------- | ------------ | ------ |
| 3.1      | promoteTask Store           | 15 min       | 中     |
| 3.2      | startScheduler Store        | 20 min       | 中     |
| 3.3      | stopTask/completeTask Store | 15 min       | 低     |
| 3.4      | TaskCard 提入就绪按钮       | 20 min       | 低     |
| 3.5      | ReadyQueue 三优先级子列     | 40 min       | 高     |
| 3.6      | RunningPanel + 启动调度器   | 35 min       | 中     |
| 3.7      | Toast 错误提示机制          | 25 min       | 中     |
| 3.8      | Exit 完成动画               | 15 min       | 低     |
| 3.9      | 端到端集成验证              | 20 min       | 低     |
| **合计** |                             | **~205 min** |        |

---

## 交付物检查清单

| 检查项          | 预期结果                                |
| --------------- | --------------------------------------- |
| `npm run build` | 无 TS 错误                              |
| New → Ready     | 可执行任务点击"提入就绪"后移至 Ready 列 |
| Ready 三子列    | 高/中/低三列展示，队首高亮，容量显示    |
| 启动调度器      | 取最高优先级队首进入 Running            |
| 手动停止        | Running 任务回到 Ready 原优先级队尾     |
| 标记完成        | Running 任务进入 Exit，触发庆祝反馈     |
| 错误提示        | 队列满/重复运行等边界条件有 toast 反馈  |
| 持久化          | 流转操作后刷新页面状态保持              |
