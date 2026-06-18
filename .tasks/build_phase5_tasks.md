# Phase 5: 紧急任务机制 — 开发任务清单

## 前置说明

- **已完成**: Phase 1（项目初始化、五列看板布局）、Phase 2（类型拆分、addTask、CreateTaskModal、持久化验证）、Phase 3（New → Ready → Running → Exit 核心流转、Ready 三优先级子列、RunningPanel、Toast 错误提示、Exit 完成动画）、Phase 4（Blocked/Event 机制、BlockTaskModal、EventPanel、resolveEvent 级联恢复）。
- **当前状态**: `activateEmergency` 和 `resolveEmergency` 在 Store 中为空实现（`() => {}`）；`isEmergency` 字段已存在于 Task 类型；`activeEmergencyTaskId` 已存在于 AppSettings；TaskCard 已渲染 SOS 徽章（`task.isEmergency` 为 true 时显示 `animate-pulse` 红色标签）。
- **本阶段目标**: 实现紧急任务的触发（`activateEmergency`）与解除（`resolveEmergency`），含全局唯一约束校验、Ready 队列批量阻塞（系统 Event）、紧急任务直接进入 Running、解除后自动恢复现场。

---

## Task 5.1: 实现 `activateEmergency(taskId)` — Store 层

**目标**: 在 Zustand Store 中实现紧急任务触发逻辑，含全部约束校验与现场保存。

**文件变更**:

- 修改 `src/store/useAppStore.ts`：
  - 实现 `activateEmergency(taskId: string)`：
    1. 通过 `get()` 获取当前 `tasks`、`events`、`settings`。
    2. 找到目标 task，校验其存在性，不存在则 `throw new Error("Task not found")`。
    3. 校验 `task.isExecutable === true`，否则 `throw new Error("Only executable tasks can be emergency")`。
    4. 校验 `task.state === "New" || task.state === "Ready"`，否则 `throw new Error("Only New or Ready tasks can be activated as emergency")`。
    5. 校验当前无其他紧急任务：`tasks.some(t => t.isEmergency && t.id !== taskId)` 为 true 则 `throw new Error("An emergency task already exists")`。
    6. 若当前有 Running 任务（`settings.currentRunningTaskId !== null`），将其停止回 Ready：
       - 找到 Running 任务，更新 `state = "Ready"`、`updatedAt = now`。
       - 清空 `settings.currentRunningTaskId = null`。
    7. 创建系统 Event：
       ```typescript
       const emergencyEvent: AppEvent = {
         id: crypto.randomUUID(),
         name: "emergency",
         isSystemGenerated: true,
         isResolved: false,
         createdAt: now,
       };
       ```
    8. 将 Ready 队列中所有**非紧急任务**转为 Blocked，关联该 emergency Event：
       - 遍历 `tasks.filter(t => t.state === "Ready" && t.id !== taskId)`。
       - 每个任务更新：`state = "Blocked"`、`eventId = emergencyEvent.id`、`updatedAt = now`。
    9. 若紧急任务原本是 New 状态，需先将其提入（类似 promote 但跳过队列容量检查，因为紧急任务不占 Ready 队列）。
    10. 紧急任务本身更新：`isEmergency = true`、`state = "Running"`、`lastRunningAt = now`、`updatedAt = now`。
    11. 更新 `settings.currentRunningTaskId = taskId`、`settings.activeEmergencyTaskId = taskId`。
    12. `set()` 同时更新 `tasks`、`events`、`settings`。

**验证**: 在浏览器控制台调用 `useAppStore.getState().activateEmergency(taskId)`，确认：

- 紧急任务 `state = "Running"`、`isEmergency = true`
- 原 Ready 队列任务全部 `state = "Blocked"`、`eventId` 指向 emergency Event
- 原 Running 任务回 Ready
- `events[]` 新增一条 `name = "emergency"`、`isSystemGenerated = true` 的记录
- `settings.currentRunningTaskId` 和 `settings.activeEmergencyTaskId` 均指向紧急任务
- 对不可执行任务、已有紧急任务时再次触发、对非 New/Ready 状态任务触发均抛错

---

## Task 5.2: 实现 `resolveEmergency(taskId)` — Store 层

**目标**: 在 Zustand Store 中实现紧急任务解除逻辑，含自动恢复现场。

**文件变更**:

- 修改 `src/store/useAppStore.ts`：
  - 实现 `resolveEmergency(taskId: string)`：
    1. 通过 `get()` 获取当前 `tasks`、`events`、`settings`。
    2. 找到目标 task，校验其存在性，不存在则 `throw new Error("Task not found")`。
    3. 校验 `task.isEmergency === true`，否则 `throw new Error("Task is not an emergency task")`。
    4. 校验 `task.state === "Running"`，否则 `throw new Error("Emergency task is not running")`。
    5. 紧急任务更新：`state = "Exit"`、`isEmergency = false`、`updatedAt = now`。
    6. 查找 emergency Event：`events.find(e => e.name === "emergency" && e.isSystemGenerated && !e.isResolved)`。
    7. 若找到 emergency Event：
       - 标记 `isResolved = true`。
       - 查找所有因该 Event 阻塞的任务：`tasks.filter(t => t.eventId === emergencyEvent.id && t.state === "Blocked")`。
       - 检查 Ready 队列容量：当前 Ready 数 + 待恢复数 是否 <= `readyQueueLimit`。若超出，仅恢复前 N 个（按原优先级排序，高优先级优先），剩余保持 Blocked 并提示。MVP 阶段可直接抛错要求用户手动处理。
       - 将可恢复的任务更新：`state = "Ready"`、`eventId = null`、`updatedAt = now`。
    8. 清空 `settings.currentRunningTaskId = null`、`settings.activeEmergencyTaskId = null`。
    9. `set()` 同时更新 `tasks`、`events`、`settings`。

**验证**: 调用 `resolveEmergency(taskId)` 后：

- 紧急任务 `state = "Exit"`、`isEmergency = false`
- 因 emergency 阻塞的任务恢复为 `state = "Ready"`、`eventId = null`
- emergency Event 标记 `isResolved = true`
- `settings.currentRunningTaskId = null`、`settings.activeEmergencyTaskId = null`
- 对非紧急任务、非 Running 状态任务调用均抛错

---

## Task 5.3: TaskCard 增加"设为紧急"按钮

**目标**: 在可执行任务（New 或 Ready 状态）卡片上增加"设为紧急"操作入口。

**文件变更**:

- 修改 `src/components/TaskCard.tsx`：
  - Props 增加 `onActivateEmergency?: (id: string) => void`（可选回调）。
  - 当满足以下所有条件时，在卡片底部渲染"🚨 设为紧急"按钮：
    - `task.isExecutable === true`
    - `task.state === "New" || task.state === "Ready"`
    - `task.isEmergency === false`（非紧急任务才显示）
  - 按钮样式：neon-red 色调，小号字体，hover 发光效果，与"提入就绪"/"阻塞"按钮同级区域。
  - 点击调用 `onActivateEmergency(task.id)`。
  - 按钮排列优先级：New 状态 → "提入就绪" + "设为紧急"并排；Ready 状态 → "阻塞" + "设为紧急"并排。
  - 当已有紧急任务运行时（可通过 store 读取 `settings.activeEmergencyTaskId`），"设为紧急"按钮应 disabled 并显示提示。

**验证**: 可执行的 New/Ready 任务卡片出现"设为紧急"按钮；不可执行任务不显示；已有紧急任务时按钮 disabled。

---

## Task 5.4: RunningPanel 增加"完成紧急任务"按钮

**目标**: 紧急任务运行时，在 RunningPanel 中提供专属的"完成紧急任务"按钮，替代普通"完成"按钮。

**文件变更**:

- 修改 `src/components/RunningPanel.tsx`：
  - Props 增加 `onResolveEmergency: (id: string) => void`。
  - 当 `runningTask.isEmergency === true` 时：
    - 隐藏普通"停止"和"完成"按钮（紧急任务不允许普通停止/完成）。
    - 显示醒目的"🚨 完成紧急任务"按钮，neon-red 色调，较大尺寸。
    - 可选：显示紧急状态提示文字，如"⚠️ 紧急模式 — Ready 队列已暂停"。
  - 点击"完成紧急任务"调用 `onResolveEmergency(runningTask.id)`。

**验证**: 紧急任务运行时，RunningPanel 显示专属按钮；普通任务运行时按钮不变。

---

## Task 5.5: App.tsx 集成紧急任务流程

**目标**: 在 App 层面串联紧急任务的触发与解除，含错误处理和 Toast 反馈。

**文件变更**:

- 修改 `src/App.tsx`：
  - 从 store 解构 `activateEmergency` 和 `resolveEmergency`。
  - 新增 `handleActivateEmergency` 回调：
    ```typescript
    const handleActivateEmergency = useCallback(
      (id: string) => {
        try {
          activateEmergency(id);
          showToast("Emergency task activated! Ready queue paused.", "warning");
        } catch (err) {
          showToast(
            err instanceof Error ? err.message : "Failed to activate emergency",
            "error",
          );
        }
      },
      [activateEmergency, showToast],
    );
    ```
  - 新增 `handleResolveEmergency` 回调：
    ```typescript
    const handleResolveEmergency = useCallback(
      (id: string) => {
        try {
          const { tasks, events } = useAppStore.getState();
          const emergencyEvent = events.find(
            (e) =>
              e.name === "emergency" && e.isSystemGenerated && !e.isResolved,
          );
          const blockedCount = emergencyEvent
            ? tasks.filter(
                (t) => t.eventId === emergencyEvent.id && t.state === "Blocked",
              ).length
            : 0;
          resolveEmergency(id);
          showToast(
            `Emergency resolved! ${blockedCount} task(s) restored to Ready.`,
            "success",
          );
        } catch (err) {
          showToast(
            err instanceof Error ? err.message : "Failed to resolve emergency",
            "error",
          );
        }
      },
      [resolveEmergency, showToast],
    );
    ```
  - 将 `onActivateEmergency` 传入 New 列的 TaskCard 和 ReadyQueue。
  - 将 `onResolveEmergency` 传入 RunningPanel。
  - ReadyQueue 需透传 `onActivateEmergency` 给内部 TaskCard。

**验证**: 点击"设为紧急" → 紧急任务进入 Running → Toast 提示 → 点击"完成紧急任务" → 任务 Exit → 原 Ready 任务恢复 → Toast 提示恢复数量。

---

## Task 5.6: ReadyQueue 透传 onActivateEmergency

**目标**: 确保 ReadyQueue 中 TaskCard 的"设为紧急"按钮能正确触发。

**文件变更**:

- 修改 `src/components/ReadyQueue.tsx`：
  - Props 增加 `onActivateEmergency?: (id: string) => void`。
  - 将 `onActivateEmergency` 传递给内部渲染的每个 TaskCard。
- 修改 `src/App.tsx`：
  - 在渲染 `<ReadyQueue />` 时传入 `onActivateEmergency={handleActivateEmergency}`。

**验证**: ReadyQueue 中的任务卡片"设为紧急"按钮可点击并触发紧急流程。

---

## Task 5.7: EventPanel 中 emergency Event 的特殊展示

**目标**: 紧急模式下，EventPanel 中 emergency Event 应有特殊样式，且不允许手动解决（只能通过"完成紧急任务"解除）。

**文件变更**:

- 修改 `src/components/EventPanel.tsx`：
  - 当 Event 的 `name === "emergency" && isSystemGenerated` 时：
    - 显示特殊样式：neon-red 色调，`🚨 紧急阻塞` 标签。
    - 隐藏"已解决"按钮（紧急 Event 只能通过 resolveEmergency 解除）。
    - 显示提示文字："完成紧急任务后自动解除"。
  - 关联任务数量和名称正常显示。

**验证**: 紧急模式下 EventPanel 显示特殊 emergency Event 卡片，无"已解决"按钮；普通 Event 不受影响。

---

## Task 5.8: 紧急模式全局视觉指示

**目标**: 紧急模式激活时，页面有明显的全局视觉提示，让用户清楚当前处于紧急状态。

**文件变更**:

- 修改 `src/App.tsx`：
  - 从 store 读取 `settings.activeEmergencyTaskId`。
  - 当 `activeEmergencyTaskId !== null` 时：
    - 在 header 区域显示紧急状态横幅：`🚨 紧急模式 — 任务 {title} 运行中`，neon-red 背景，脉冲动画。
    - 可选：页面顶部增加一个细红色脉冲边框线。
  - 紧急模式解除后横幅消失。

**验证**: 触发紧急任务后 header 出现红色横幅；解除后横幅消失。

---

## Task 5.9: 端到端集成验证

**目标**: 验证紧急任务机制的完整流转链路和边界条件。

**测试场景**:

1. **New 任务设为紧急**: 可执行 New 任务点击"设为紧急" → 任务直接进入 Running → 原 Ready 任务全部 Blocked → emergency Event 创建
2. **Ready 任务设为紧急**: 可执行 Ready 任务点击"设为紧急" → 任务进入 Running → 其余 Ready 任务 Blocked
3. **紧急时有 Running 任务**: 有 Running 任务时触发紧急 → 原 Running 任务回 Ready → 再被阻塞为 Blocked → 紧急任务进入 Running
4. **完成紧急任务**: 点击"完成紧急任务" → 紧急任务 Exit → 原 Blocked 任务恢复 Ready → emergency Event 标记已解决 → `activeEmergencyTaskId` 清空
5. **全局唯一紧急**: 已有紧急任务时，对另一任务点击"设为紧急" → 按钮 disabled 或抛错提示
6. **不可执行任务不可紧急**: 不可执行任务的卡片不显示"设为紧急"按钮
7. **紧急模式下 EventPanel**: emergency Event 显示特殊样式，无"已解决"按钮
8. **紧急模式横幅**: 触发后 header 显示红色横幅，解除后消失
9. **紧急模式持久化**: 触发紧急后刷新页面 → 状态保持，紧急任务仍在 Running
10. **解除后可正常调度**: 紧急解除后 → 点击"启动调度器" → 最高优先级 Ready 任务进入 Running

---

## 依赖关系

```
Task 5.1 (activateEmergency Store) ──────┐
Task 5.2 (resolveEmergency Store) ───────┤
                                         │
Task 5.3 (TaskCard 紧急按钮) ← 5.1      │
Task 5.4 (RunningPanel 紧急完成) ← 5.2  │
Task 5.5 (App.tsx 集成) ← 5.1, 5.2, 5.3, 5.4
Task 5.6 (ReadyQueue 透传) ← 5.3, 5.5  │
Task 5.7 (EventPanel 紧急展示) ← 5.1    │
Task 5.8 (全局视觉指示) ← 5.1, 5.2      │
                                         │
Task 5.9 (集成验证) ← all                ┘
```

**推荐实施顺序**: 5.1 → 5.2 → 5.3 → 5.4 → 5.5 → 5.6 → 5.7 → 5.8 → 5.9

---

## 预估工作量

| Task     | 内容                      | 预估时间     | 复杂度 |
| -------- | ------------------------- | ------------ | ------ |
| 5.1      | activateEmergency Store   | 30 min       | 高     |
| 5.2      | resolveEmergency Store    | 25 min       | 高     |
| 5.3      | TaskCard 紧急按钮         | 20 min       | 中     |
| 5.4      | RunningPanel 紧急完成按钮 | 20 min       | 中     |
| 5.5      | App.tsx 集成紧急流程      | 25 min       | 中     |
| 5.6      | ReadyQueue 透传回调       | 10 min       | 低     |
| 5.7      | EventPanel 紧急展示       | 20 min       | 中     |
| 5.8      | 全局视觉指示              | 20 min       | 中     |
| 5.9      | 端到端集成验证            | 20 min       | 低     |
| **合计** |                           | **~190 min** |        |

---

## 交付物检查清单

| 检查项                        | 预期结果                                                    |
| ----------------------------- | ----------------------------------------------------------- |
| `npm run build`               | 无 TS 错误                                                  |
| 可执行 New/Ready 任务设为紧急 | 点击"设为紧急" → 任务进入 Running，其余 Ready 任务 Blocked  |
| 紧急任务全局唯一              | 已有紧急时再次触发被拒绝/按钮 disabled                      |
| 不可执行任务不可紧急          | 卡片不显示"设为紧急"按钮                                    |
| 紧急时 Running 任务处理       | 原 Running 任务先回 Ready 再被阻塞                          |
| emergency Event 创建          | `name="emergency"`, `isSystemGenerated=true`                |
| 完成紧急任务                  | 紧急任务 Exit → 原 Blocked 任务恢复 Ready → Event 已解决    |
| settings 清空                 | `currentRunningTaskId` 和 `activeEmergencyTaskId` 均为 null |
| EventPanel 紧急展示           | emergency Event 特殊样式，无手动解决按钮                    |
| 全局横幅                      | 紧急模式时 header 显示红色横幅                              |
| 错误提示                      | 非法操作有 toast 反馈                                       |
| 持久化                        | 紧急触发/解除后刷新页面状态保持                             |
