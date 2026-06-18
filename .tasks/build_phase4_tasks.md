# Phase 4: 阻塞状态与事件管理 — 开发任务清单

## 前置说明

- **已完成**: Phase 1（项目初始化、五列看板布局）、Phase 2（类型拆分、addTask、CreateTaskModal、持久化验证）、Phase 3（New → Ready → Running → Exit 核心流转、Ready 三优先级子列、RunningPanel、Toast 错误提示、Exit 完成动画）。
- **当前状态**: `blockTask` 和 `resolveEvent` 在 Store 中为空实现；Blocked 列仅展示任务卡片无交互；Event 实体类型已定义但无管理 UI。
- **本阶段目标**: 实现 Ready/Running → Blocked 的阻塞流转、Event 创建与关联、Event 管理面板、Event 解决后任务自动恢复 Ready。

---

## Task 4.1: 实现 `blockTask(id, eventName)` — Store 层

**目标**: 在 Zustand Store 中实现 Ready/Running → Blocked 的状态流转，含 Event 创建与关联。

**文件变更**:

- 修改 `src/store/useAppStore.ts`：
  - 实现 `blockTask(id: string, eventName: string)`：
    1. 通过 `get()` 获取当前 `tasks`、`events`、`settings`。
    2. 找到目标 task，校验其存在性，不存在则 `throw new Error("Task not found")`。
    3. 校验 `task.state === "Running" || task.state === "Ready"`，否则 `throw new Error("Only Running or Ready tasks can be blocked")`。
    4. 校验 `eventName` 非空，否则 `throw new Error("Event name is required")`。
    5. 在 `events[]` 中创建一条新 Event：
       ```typescript
       const newEvent: AppEvent = {
         id: crypto.randomUUID(),
         name: eventName.trim(),
         isSystemGenerated: false,
         isResolved: false,
         createdAt: new Date().toISOString(),
       };
       ```
    6. 更新 task：`state = "Blocked"`、`eventId = newEvent.id`、`updatedAt = now`。
    7. 若任务原本是 Running，需同步清空 `settings.currentRunningTaskId = null`。
    8. `set()` 同时更新 `tasks`、`events`、`settings`（若需要）。

**验证**: 在浏览器控制台调用 `useAppStore.getState().blockTask(runningTaskId, "等待审批")`，确认任务 state 变为 `"Blocked"`、`eventId` 非空、`events[]` 新增一条记录、`currentRunningTaskId` 被清空；对 New/Blocked/Exit 状态任务调用应抛错。

---

## Task 4.2: 创建 BlockTaskModal 组件

**目标**: 点击"阻塞"按钮后弹出模态框，输入 Event 名称并确认阻塞。

**文件变更**:

- 创建 `src/components/BlockTaskModal.tsx`：
  - Props: `open: boolean`、`onClose: () => void`、`taskId: string | null`、`taskTitle: string`。
  - 内部维护 `eventName` 输入状态。
  - 表单包含：
    - 标题区：显示被阻塞任务的名称，如 `🚧 阻塞任务: {taskTitle}`。
    - 输入框：Event 名称（必填），placeholder 如 "输入阻塞原因（如：等待审批）..."。
    - 取消/确认按钮：确认按钮 disabled 直到 eventName 非空。
  - 确认时调用 `useAppStore.getState().blockTask(taskId, eventName)`，成功后 `onClose()`。
  - 错误处理：try/catch 包裹，失败时通过回调通知父组件（或直接用 toast）。
  - 样式：与 CreateTaskModal 一致的暗色科技感风格，neon-yellow 色调（阻塞=黄色语义）。
  - ESC 关闭、点击遮罩关闭。

**验证**: 点击阻塞按钮 → 弹出模态框 → 输入 Event 名称 → 确认后任务移至 Blocked 列，Event 列表新增一条。

---

## Task 4.3: TaskCard 与 RunningPanel 增加"阻塞"按钮

**目标**: 在 Running 和 Ready 任务卡片上增加"阻塞"操作入口。

**文件变更**:

- 修改 `src/components/TaskCard.tsx`：
  - Props 增加 `onBlock?: (id: string) => void`（可选回调）。
  - 当 `task.state === "Ready"` 时，在卡片底部（与 New 的"提入就绪"按钮同级区域）渲染"阻塞"按钮。
  - 按钮样式：neon-yellow 色调，小号字体，hover 发光效果，图标 `🚧 阻塞`。
  - 点击调用 `onBlock(task.id)`。
- 修改 `src/components/RunningPanel.tsx`：
  - 在 Running 任务的"停止"和"完成"按钮旁增加"阻塞"按钮。
  - 按钮样式：neon-yellow 色调，与停止/完成按钮同排。
  - Props 增加 `onBlock: (id: string) => void`。
  - 点击调用 `onBlock(runningTask.id)`。
- 修改 `src/App.tsx`：
  - 新增 `blockTarget` 状态：`{ taskId: string; taskTitle: string } | null`，控制 BlockTaskModal 的显隐。
  - 新增 `handleBlock` 回调：设置 `blockTarget` 并打开 BlockTaskModal。
  - 在 Ready 列（ReadyQueue）和 Running 列（RunningPanel）传入 `onBlock` 回调。
  - 渲染 `<BlockTaskModal />`，确认后调用 `blockTask` 并 showToast。

**验证**: Ready 任务卡片出现"阻塞"按钮 → 点击弹出模态框 → 确认后任务移至 Blocked；Running 任务面板出现"阻塞"按钮 → 同样流程。

---

## Task 4.4: Blocked 列展示优化 — 显示关联 Event 信息

**目标**: Blocked 列的任务卡片显示关联的 Event 名称，增强信息可读性。

**文件变更**:

- 修改 `src/components/TaskCard.tsx`：
  - 当 `task.state === "Blocked"` 且 `task.eventId` 非空时，在卡片中显示关联 Event 名称。
  - TaskCard 内部直接 `useAppStore(s => s.events)` 查找 Event 名称（减少 props 传递）。
  - 显示样式：在 badge 区域下方增加一行，`🚧 {event.name}`，neon-yellow 色调小号字体。

**验证**: Blocked 任务卡片显示阻塞原因 Event 名称；无 eventId 时不显示。

---

## Task 4.5: 创建 EventPanel 组件 — Event 管理面板

**目标**: 在 Blocked 区域旁展示未解决的 Event 列表，提供"已解决"操作。

**文件变更**:

- 创建 `src/components/EventPanel.tsx`：
  - 从 store 读取 `events`（筛选 `isResolved === false`）和 `tasks`。
  - 渲染未解决 Event 列表，每个 Event 卡片包含：
    - Event 名称（`event.name`）。
    - 关联任务数量：`tasks.filter(t => t.eventId === event.id && t.state === "Blocked").length`。
    - 关联任务名称列表（可折叠/展开，MVP 直接显示）。
    - "已解决"按钮：调用 `resolveEvent(event.id)`。
    - 系统生成的 Event（`isSystemGenerated === true`）显示特殊标记（如 `🔧 系统`）。
  - 空状态：无未解决 Event 时显示 "暂无阻塞事件"。
  - 样式：neon-yellow 色调，暗色背景，与主看板风格一致。
- 修改 `src/App.tsx`：
  - 在 Blocked 列的 KanbanColumn children 中，将 EventPanel 放在任务列表上方。
  - 布局方案：Blocked 列内上方为 EventPanel（未解决事件列表），下方为 Blocked 任务卡片列表。

**验证**: 有 Blocked 任务时，EventPanel 显示关联的未解决 Event；点击"已解决"后 Event 消失，关联任务恢复为 Ready。

---

## Task 4.6: 实现 `resolveEvent(eventId)` — Store 层

**目标**: 实现 Event 解决逻辑，含级联恢复关联任务和 Ready 队列容量检查。

**文件变更**:

- 修改 `src/store/useAppStore.ts`：
  - 实现 `resolveEvent(eventId: string)`：
    1. 通过 `get()` 获取当前 `tasks`、`events`、`settings`。
    2. 找到目标 Event，校验其存在性，不存在则 `throw new Error("Event not found")`。
    3. 校验 `event.isResolved === false`，否则 `throw new Error("Event is already resolved")`。
    4. 将该 Event 标记为 `isResolved = true`。
    5. 查找所有关联该 `eventId` 且 `state === "Blocked"` 的任务：`blockedTasks = tasks.filter(t => t.eventId === eventId && t.state === "Blocked")`。
    6. 检查 Ready 队列容量：
       - 当前 Ready 数量：`tasks.filter(t => t.state === "Ready").length`。
       - 可恢复数量：`readyQueueLimit - currentReadyCount`。
       - 若 `blockedTasks.length > 可恢复数量`，则 `throw new Error("Ready queue capacity insufficient: can only restore ${可恢复数量} of ${blockedTasks.length} tasks")`。
    7. 将所有关联任务恢复为 `state = "Ready"`，清空 `eventId = null`，更新 `updatedAt`。
    8. `set()` 同时更新 `tasks` 和 `events`。

**验证**: 调用 `resolveEvent(eventId)` 后，Event 标记为已解决，关联任务恢复为 Ready；Ready 队列满时调用应抛错提示容量不足。

---

## Task 4.7: EventPanel 与 Store 联动 — 解决 Event 的 UI 反馈

**目标**: EventPanel 中点击"已解决"按钮后，正确触发 `resolveEvent` 并给出用户反馈。

**文件变更**:

- 修改 `src/components/EventPanel.tsx`：
  - Props 增加 `onResolveEvent: (eventId: string) => void` 回调。
  - "已解决"按钮点击时调用 `onResolveEvent(event.id)`，由 App.tsx 统一处理。
- 修改 `src/App.tsx`：
  - 新增 `handleResolveEvent` 回调：try/catch 包裹 `resolveEvent(eventId)`，成功/失败均 showToast。
  - 成功提示：`"Event resolved, {n} task(s) restored to Ready"`。
  - 失败提示：显示具体错误信息（如队列容量不足）。
  - 将 `handleResolveEvent` 传入 EventPanel。

**验证**: 点击"已解决" → Event 从列表消失 → 关联任务恢复到 Ready 列 → 显示成功 toast；队列满时显示错误 toast。

---

## Task 4.8: ReadyQueue 传递 onBlock 回调

**目标**: 确保 ReadyQueue 中 TaskCard 的"阻塞"按钮能正确触发。

**文件变更**:

- 修改 `src/components/ReadyQueue.tsx`：
  - Props 增加 `onBlock?: (id: string) => void`。
  - 将 `onBlock` 传递给内部渲染的每个 TaskCard。
- 修改 `src/App.tsx`：
  - 在渲染 `<ReadyQueue />` 时传入 `onBlock={handleBlock}`。

**验证**: ReadyQueue 中的任务卡片"阻塞"按钮可点击并触发 BlockTaskModal。

---

## Task 4.9: 端到端集成验证

**目标**: 验证 Blocked 状态的完整流转链路和边界条件。

**测试场景**:

1. **Running → Blocked**: Running 任务点击"阻塞" → 输入 Event 名称 → 任务移至 Blocked 列 → `currentRunningTaskId` 清空 → Event 列表新增一条
2. **Ready → Blocked**: Ready 任务点击"阻塞" → 输入 Event 名称 → 任务移至 Blocked 列 → Event 列表新增一条
3. **Event 解决恢复**: 点击 Event "已解决" → 关联任务恢复到 Ready 列 → Event 从未解决列表消失
4. **多任务同一 Event**: 多个任务关联同一 Event → 解决 Event → 所有任务同时恢复
5. **队列容量不足**: Ready 队列即将满 → 解决关联多个任务的 Event → 若超出容量则提示错误
6. **非法操作**: 对 New/Blocked/Exit 任务尝试阻塞 → 抛错提示
7. **Event 名称必填**: 不输入 Event 名称 → 确认按钮 disabled
8. **持久化**: 阻塞/解决操作后刷新页面 → 状态保持
9. **Running 被阻塞后可重新调度**: Running 任务阻塞后 → 点击"启动调度器" → 下一个 Ready 任务进入 Running

---

## 依赖关系

```
Task 4.1 (blockTask Store) ─────────────┐
Task 4.6 (resolveEvent Store) ──────────┤
                                        │
Task 4.2 (BlockTaskModal) ← 4.1        │
Task 4.3 (TaskCard/RunningPanel 阻塞按钮) ← 4.1, 4.2
Task 4.4 (Blocked 列 Event 信息展示) ← 4.1
Task 4.5 (EventPanel 组件) ← 4.6       │
Task 4.7 (EventPanel 联动反馈) ← 4.5, 4.6
Task 4.8 (ReadyQueue 传递 onBlock) ← 4.3
                                        │
Task 4.9 (集成验证) ← 4.3,4.4,4.5,4.7,4.8┘
```

**推荐实施顺序**: 4.1 → 4.6 → 4.2 → 4.3 → 4.4 → 4.5 → 4.7 → 4.8 → 4.9

---

## 预估工作量

| Task     | 内容                           | 预估时间     | 复杂度 |
| -------- | ------------------------------ | ------------ | ------ |
| 4.1      | blockTask Store                | 20 min       | 中     |
| 4.2      | BlockTaskModal 组件            | 25 min       | 中     |
| 4.3      | TaskCard/RunningPanel 阻塞按钮 | 25 min       | 中     |
| 4.4      | Blocked 列 Event 信息展示      | 15 min       | 低     |
| 4.5      | EventPanel 组件                | 40 min       | 高     |
| 4.6      | resolveEvent Store             | 25 min       | 中     |
| 4.7      | EventPanel 联动反馈            | 20 min       | 中     |
| 4.8      | ReadyQueue 传递 onBlock        | 10 min       | 低     |
| 4.9      | 端到端集成验证                 | 20 min       | 低     |
| **合计** |                                | **~200 min** |        |

---

## 交付物检查清单

| 检查项                 | 预期结果                                               |
| ---------------------- | ------------------------------------------------------ |
| `npm run build`        | 无 TS 错误                                             |
| Running → Blocked      | 点击阻塞 → 输入 Event → 任务移至 Blocked，Running 清空 |
| Ready → Blocked        | 点击阻塞 → 输入 Event → 任务移至 Blocked               |
| Blocked 任务显示 Event | 卡片上显示阻塞原因 Event 名称                          |
| EventPanel 展示        | 未解决 Event 列表，含关联任务数和名称                  |
| Event 解决             | 点击"已解决" → Event 消失，任务恢复 Ready              |
| 队列容量检查           | Ready 满时解决 Event 提示容量不足                      |
| 错误提示               | 非法操作有 toast 反馈                                  |
| 持久化                 | 阻塞/解决操作后刷新页面状态保持                        |
