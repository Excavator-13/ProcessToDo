# Phase 7: 防饥饿机制与全局打磨 — 开发任务清单 ✅ 已完成

## 前置说明

- **已完成**: Phase 1-6，核心业务逻辑、五态流转、Blocked/Event 机制、紧急任务机制、双模式调度（自由/时间片轮转）均已实现。
- **当前状态**:
  - `checkStarvation()` 在 Store 中为空实现（`() => {}`）。
  - TaskCard 已有状态徽章色（`stateBadgeColor`）和优先级左边框色（`priorityConfig`），但不同状态卡片整体视觉差异不够明显。
  - Exit 区域已有 `animate-fade-up` 动画，RunningPanel 有 `animate-celebrate` 动画，但 Exit 完成时无彩纸特效或醒目 Toast。
  - 边界条件校验已在 Store 层通过 `throw new Error()` 实现，App 层通过 `try-catch` + Toast 展示错误信息，但部分场景提示文案不够友好。
  - 代码结构已按 `src/components/`、`src/store/`、`src/types/`、`src/hooks/`、`src/utils/` 组织。
- **本阶段目标**: 实现防饥饿自动提权机制、打磨 UI/UX 视觉效果、完善边界条件提示、增强 Exit 庆祝反馈。

---

## Task 7.1: 实现 `checkStarvation()` — 防饥饿自动提权核心逻辑

**目标**: 在 Store 中实现防饥饿机制，遍历 Ready 队列任务，对 DDL 临期或长期未运行的任务自动提升优先级。

**文件变更**:

- 修改 `src/store/useAppStore.ts`：
  - 实现 `checkStarvation()`：
    1. 通过 `get()` 获取 `tasks`。
    2. 筛选 `state === "Ready"` 的任务。
    3. 对每个 Ready 任务检查两条规则：
       - **DDL 临期**: `deadline` 不为 `null` 且 `new Date(deadline).getTime() - Date.now() < 24 * 60 * 60 * 1000`（未来 24 小时内）且 `priority > 1` → `priority -= 1`。
       - **长期未运行**: `lastRunningAt` 不为 `null` 且 `Date.now() - new Date(lastRunningAt).getTime() > 3 * 24 * 60 * 60 * 1000`（超过 3 天）且 `priority > 1` → `priority -= 1`。
       - 若 `lastRunningAt` 为 `null`（从未运行过），则用 `createdAt` 代替：`Date.now() - new Date(createdAt).getTime() > 3 * 24 * 60 * 60 * 1000` 且 `priority > 1` → `priority -= 1`。
    4. 两条规则独立判断，但同一任务最多提升一级（即 `priority` 只减 1，不会从 3 直接跳到 1）。
    5. 收集需要更新的任务 ID 和新优先级，一次性 `set()` 更新 `tasks`。

**实现要点**:

```typescript
checkStarvation: () => {
  const { tasks } = get();
  const now = Date.now();
  const ONE_DAY = 24 * 60 * 60 * 1000;
  const THREE_DAYS = 3 * ONE_DAY;

  const updates = new Map<string, number>();

  tasks
    .filter((t) => t.state === "Ready")
    .forEach((t) => {
      if (t.priority <= 1) return;

      let shouldPromote = false;

      if (t.deadline) {
        const deadlineTime = new Date(t.deadline).getTime();
        if (deadlineTime - now < ONE_DAY && deadlineTime > now) {
          shouldPromote = true;
        }
      }

      if (!shouldPromote) {
        const referenceTime = t.lastRunningAt
          ? new Date(t.lastRunningAt).getTime()
          : new Date(t.createdAt).getTime();
        if (now - referenceTime > THREE_DAYS) {
          shouldPromote = true;
        }
      }

      if (shouldPromote) {
        updates.set(t.id, (t.priority - 1) as Priority);
      }
    });

  if (updates.size === 0) return;

  const nowISO = new Date().toISOString();
  set((state) => ({
    tasks: state.tasks.map((t) => {
      const newPriority = updates.get(t.id);
      if (newPriority !== undefined) {
        return { ...t, priority: newPriority, updatedAt: nowISO };
      }
      return t;
    }),
  }));
},
```

**验证**:

- 创建一个 Ready 任务，`priority = 3`，`deadline` 设为 1 小时后 → 调用 `checkStarvation()` → `priority` 变为 2
- 创建一个 Ready 任务，`priority = 2`，`lastRunningAt` 设为 4 天前 → 调用 `checkStarvation()` → `priority` 变为 1
- 创建一个 Ready 任务，`priority = 1` → 调用 `checkStarvation()` → `priority` 不变
- 创建一个 New 任务 → 调用 `checkStarvation()` → 不受影响

---

## Task 7.2: 创建 `useStarvationCheck` Hook — 定时触发防饥饿检查

**目标**: 封装防饥饿检查的触发逻辑，支持页面加载时和定时器每 5 分钟自动执行。

**文件变更**:

- 新建 `src/hooks/useStarvationCheck.ts`：
  - 导出 `useStarvationCheck()` Hook：
    ```typescript
    export function useStarvationCheck(): void;
    ```
  - 内部逻辑：
    1. 从 `useAppStore` 获取 `checkStarvation`。
    2. 使用 `useEffect` 在组件挂载时（页面加载时）立即调用一次 `checkStarvation()`。
    3. 使用 `useEffect` 设置 `setInterval`，每 5 分钟（300000ms）调用一次 `checkStarvation()`。
    4. 组件卸载时清除 `setInterval`。
    5. 使用 `useRef` 存储 interval ID 以确保清理。

**实现要点**:

```typescript
import { useEffect, useRef } from "react";
import { useAppStore } from "../store/useAppStore";

export function useStarvationCheck(): void {
  const checkStarvation = useAppStore((s) => s.checkStarvation);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    checkStarvation();

    intervalRef.current = setInterval(
      () => {
        checkStarvation();
      },
      5 * 60 * 1000,
    );

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
    };
  }, [checkStarvation]);
}
```

**验证**:

- 页面加载后，Ready 队列中满足条件的任务优先级自动提升
- 等待 5 分钟后，再次检查并提权
- 组件卸载后定时器被清除

---

## Task 7.3: 在 `startScheduler` 中集成防饥饿检查

**目标**: 每次启动调度器前先执行防饥饿检查，确保优先级最新。

**文件变更**:

- 修改 `src/store/useAppStore.ts`：
  - 在 `startScheduler()` 方法开头调用 `get().checkStarvation()`：
    ```typescript
    startScheduler: () => {
      get().checkStarvation();
      const { tasks, settings } = get();
      // ... 后续逻辑不变
    },
    ```
  - 这确保调度器选择队首任务时，优先级已按防饥饿规则更新。

**验证**:

- 一个任务 `priority = 3`，DDL 在 1 小时内 → 点击"启动调度器" → 该任务优先级先被提升为 2 → 然后被调度

---

## Task 7.4: App.tsx 集成防饥饿 Hook

**目标**: 在 App 组件中启用防饥饿定时检查。

**文件变更**:

- 修改 `src/App.tsx`：
  - 导入 `useStarvationCheck`。
  - 在 App 组件内调用 `useStarvationCheck()`。

**验证**:

- 页面加载后自动执行一次防饥饿检查
- 每 5 分钟自动执行一次

---

## Task 7.5: TaskCard 状态视觉增强 — 不同状态使用不同背景/边框色

**目标**: 增强不同状态 TaskCard 的视觉区分度，使状态一目了然。

**文件变更**:

- 修改 `src/components/TaskCard.tsx`：
  - 新增状态背景色映射 `stateBgColor`：
    ```typescript
    const stateBgColor: Record<string, string> = {
      New: "bg-neon-cyan/5 hover:bg-neon-cyan/10",
      Ready: "bg-neon-green/5 hover:bg-neon-green/10",
      Blocked: "bg-neon-yellow/5 hover:bg-neon-yellow/10",
      Running: "bg-neon-red/5 hover:bg-neon-red/10",
      Exit: "bg-neon-blue/5 opacity-60",
    };
    ```
  - 新增状态边框色映射 `stateBorderColor`：
    ```typescript
    const stateBorderColor: Record<string, string> = {
      New: "border-neon-cyan/20",
      Ready: "border-neon-green/20",
      Blocked: "border-neon-yellow/20",
      Running: "border-neon-red/20",
      Exit: "border-neon-blue/20",
    };
    ```
  - 修改卡片根元素的 `className`：
    - 将 `bg-bg-primary/60` 替换为 `stateBgColor[task.state]`。
    - 将 `border-border-glow`（除 `border-l-4` 外的边框）替换为 `stateBorderColor[task.state]`。
    - 保留 `border-l-4 ${priority.border}` 优先级左边框。
    - Exit 状态卡片保持 `opacity-60`（已存在），背景色改为 `bg-neon-blue/5`。
  - Blocked 状态卡片增加微弱脉冲动画提示等待：
    ```typescript
    const stateAnimation = task.state === "Blocked" ? "animate-pulse" : "";
    ```

**验证**:

- New 任务卡片：青色微背景 + 青色边框
- Ready 任务卡片：绿色微背景 + 绿色边框
- Blocked 任务卡片：黄色微背景 + 黄色边框 + 微脉冲
- Running 任务卡片：红色微背景 + 红色边框
- Exit 任务卡片：蓝色微背景 + 蓝色边框 + 半透明
- 优先级左边框色保持不变（红/黄/蓝）

---

## Task 7.6: Exit 庆祝动画增强 — CSS 彩纸特效

**目标**: 任务完成进入 Exit 时，展示更醒目的庆祝动画效果。

**文件变更**:

- 修改 `src/index.css`：
  - 新增彩纸粒子关键帧动画：

    ```css
    @keyframes confetti-fall {
      0% {
        transform: translateY(-10px) rotate(0deg);
        opacity: 1;
      }
      100% {
        transform: translateY(30px) rotate(360deg);
        opacity: 0;
      }
    }

    .animate-confetti {
      animation: confetti-fall 1s ease-out forwards;
    }
    ```

- 新建 `src/components/CelebrationEffect.tsx`：
  - 导出 `CelebrationEffect` 组件：
    ```typescript
    interface CelebrationEffectProps {
      active: boolean;
    }
    ```
  - 当 `active = true` 时，渲染 8-12 个小彩纸粒子（绝对定位），随机颜色（neon-cyan/green/red/yellow/blue）、随机水平偏移、使用 `animate-confetti` 动画。
  - 1.5 秒后自动消失。
  - 使用 `useEffect` + `setTimeout` 控制。

- 修改 `src/App.tsx`：
  - 在 Exit 列的 `renderColumnContent` 中，为 Exit 任务卡片包裹 `CelebrationEffect`：
    - 新增 `celebratingTaskId` 状态。
    - 当 `handleComplete` 成功后，设置 `celebratingTaskId = id`。
    - 1.5 秒后清除 `celebratingTaskId`。
    - 在 Exit 列渲染时，对 `celebratingTaskId` 匹配的任务卡片渲染 `CelebrationEffect`。

**验证**:

- 任务完成进入 Exit 时，卡片上方出现彩纸粒子动画
- 1.5 秒后动画消失
- 不影响其他列的渲染

---

## Task 7.7: 边界条件提示文案优化

**目标**: 将 Store 层抛出的技术性错误文案替换为用户友好的中文提示。

**文件变更**:

- 修改 `src/store/useAppStore.ts`：
  - 优化各方法的 `throw new Error()` 文案：

    | 方法                | 原文案                                                    | 新文案                                       |
    | ------------------- | --------------------------------------------------------- | -------------------------------------------- |
    | `promoteTask`       | `"Task not found"`                                        | `"任务不存在"`                               |
    | `promoteTask`       | `"Task is not in New state"`                              | `"仅 New 状态的任务可提入就绪"`              |
    | `promoteTask`       | `"Task is not executable"`                                | `"不可执行的任务无法提入就绪"`               |
    | `promoteTask`       | `"Ready queue is full"`                                   | `"Ready 队列已满"`                           |
    | `startScheduler`    | `"A task is already running"`                             | `"已有任务在运行"`                           |
    | `startScheduler`    | `"No tasks in Ready queue"`                               | `"Ready 队列为空"`                           |
    | `stopTask`          | `"Task not found"`                                        | `"任务不存在"`                               |
    | `stopTask`          | `"Task is not in Running state"`                          | `"当前无运行中的任务"`                       |
    | `completeTask`      | `"Task not found"`                                        | `"任务不存在"`                               |
    | `completeTask`      | `"Task is not in Running state"`                          | `"当前无运行中的任务"`                       |
    | `blockTask`         | `"Task not found"`                                        | `"任务不存在"`                               |
    | `blockTask`         | `"Only Running or Ready tasks can be blocked"`            | `"仅 Running/Ready 状态的任务可阻塞"`        |
    | `blockTask`         | `"Event name is required"`                                | `"请输入阻塞原因"`                           |
    | `resolveEvent`      | `"Event not found"`                                       | `"事件不存在"`                               |
    | `resolveEvent`      | `"Event is already resolved"`                             | `"事件已解决"`                               |
    | `resolveEvent`      | `"Ready queue capacity insufficient..."`                  | `"Ready 队列容量不足，无法恢复所有阻塞任务"` |
    | `activateEmergency` | `"Task not found"`                                        | `"任务不存在"`                               |
    | `activateEmergency` | `"Only executable tasks can be emergency"`                | `"不可执行的任务无法设为紧急"`               |
    | `activateEmergency` | `"Only New or Ready tasks can be activated as emergency"` | `"仅 New/Ready 状态的任务可设为紧急"`        |
    | `activateEmergency` | `"An emergency task already exists"`                      | `"已存在紧急任务"`                           |
    | `resolveEmergency`  | `"Task not found"`                                        | `"任务不存在"`                               |
    | `resolveEmergency`  | `"Task is not an emergency task"`                         | `"该任务不是紧急任务"`                       |
    | `resolveEmergency`  | `"Emergency task is not running"`                         | `"紧急任务未在运行"`                         |
    | `switchTask`        | `"Source task not found"`                                 | `"源任务不存在"`                             |
    | `switchTask`        | `"Target task not found"`                                 | `"目标任务不存在"`                           |
    | `switchTask`        | `"Source task is not running"`                            | `"源任务未在运行"`                           |
    | `switchTask`        | `"Target task is not ready"`                              | `"目标任务未就绪"`                           |
    | `switchTask`        | `"Source task is not the current running task"`           | `"源任务不是当前运行任务"`                   |

**验证**:

- Ready 队列满时提入 → Toast 显示"Ready 队列已满"
- 无 Running 任务时点停止 → Toast 显示"当前无运行中的任务"
- 已有 Running 任务时点启动 → Toast 显示"已有任务在运行"
- 已有紧急任务时再触发 → Toast 显示"已存在紧急任务"
- 阻塞时不输入事件名 → Toast 显示"请输入阻塞原因"

---

## Task 7.8: ReadyQueue 容量告警视觉增强

**目标**: 当 Ready 队列接近或达到上限时，增加视觉告警。

**文件变更**:

- 修改 `src/components/ReadyQueue.tsx`：
  - 当 `totalCount >= readyQueueLimit` 时（队列已满）：
    - 容量指示器背景变为 `bg-neon-red/15`，文字变为 `text-neon-red`，添加 `animate-pulse`。
    - 在容量指示器下方显示提示文字：`"⚠ 队列已满，无法提入新任务"`，neon-red 色。
  - 当 `totalCount >= readyQueueLimit * 0.8` 且未满时（队列接近满）：
    - 容量指示器背景变为 `bg-neon-yellow/15`，文字变为 `text-neon-yellow`。
    - 在容量指示器下方显示提示文字：`"⚠ 队列接近上限"`，neon-yellow 色。
  - 正常情况保持现有样式不变。

**验证**:

- 队列使用量 < 80%：绿色指示器，无提示
- 队列使用量 80%-99%：黄色指示器 + "队列接近上限"提示
- 队列已满：红色指示器 + 脉冲动画 + "队列已满"提示

---

## Task 7.9: DDL 临期视觉提示 — TaskCard 截止时间高亮

**目标**: 当任务 DDL 在 24 小时内时，在 TaskCard 上显示醒目的临期提示。

**文件变更**:

- 修改 `src/components/TaskCard.tsx`：
  - 在 deadline 显示逻辑处增加临期判断：
    ```typescript
    const isDeadlineUrgent =
      task.deadline &&
      new Date(task.deadline).getTime() - Date.now() < 24 * 60 * 60 * 1000 &&
      new Date(task.deadline).getTime() > Date.now();
    ```
  - 当 `isDeadlineUrgent` 为 `true` 时：
    - 截止时间显示改为：`📅 ⚠ {date}`，文字颜色为 `text-neon-red`，添加 `animate-pulse`。
    - 在标签行末尾增加 `URGENT` 徽章：`bg-neon-red/15 text-neon-red border-neon-red/30`。
  - 当 DDL 已过期时：
    - 截止时间显示改为：`📅 ❌ {date}`，文字颜色为 `text-neon-red/70`，添加删除线样式。

**验证**:

- DDL 超过 24 小时：正常显示日期
- DDL 在 24 小时内：红色脉冲 + URGENT 徽章
- DDL 已过期：红色删除线

---

## Task 7.10: 端到端集成验证与全局打磨

**目标**: 验证防饥饿机制和所有 UI 打磨的完整链路，确保无回归。

**测试场景**:

1. **防饥饿 — DDL 临期提权**:
   - 创建任务 A，`priority = 3`，`deadline` 设为 1 小时后，提入 Ready
   - 刷新页面 → `checkStarvation()` 自动执行 → 任务 A 优先级变为 2
   - Toast 不需要显示（静默提权）

2. **防饥饿 — 长期未运行提权**:
   - 创建任务 B，`priority = 3`，提入 Ready，`lastRunningAt = null`
   - 手动在 LocalStorage 中将 `createdAt` 改为 4 天前
   - 刷新页面 → 任务 B 优先级变为 2

3. **防饥饿 — 启动调度器时触发**:
   - 任务 C，`priority = 3`，DDL 1 小时内
   - 点击"启动调度器" → 任务 C 先被提权为 2 → 然后按优先级调度

4. **防饥饿 — priority = 1 不再提权**:
   - 任务 D，`priority = 1`，DDL 1 小时内 → `checkStarvation()` 不改变

5. **TaskCard 状态视觉**:
   - 各状态卡片背景色/边框色正确区分
   - Blocked 卡片有微脉冲动画

6. **Exit 庆祝动画**:
   - 完成 Running 任务 → Exit 列出现彩纸粒子动画 → 1.5 秒后消失

7. **边界条件提示**:
   - Ready 队列满时提入 → Toast "Ready 队列已满"
   - 无 Running 时点停止 → Toast "当前无运行中的任务"
   - 已有 Running 时点启动 → Toast "已有任务在运行"
   - 已有紧急时再触发 → Toast "已存在紧急任务"
   - 阻塞无事件名 → Toast "请输入阻塞原因"

8. **ReadyQueue 容量告警**:
   - 队列 < 80%：绿色
   - 队列 80%-99%：黄色 + 提示
   - 队列 100%：红色 + 脉冲 + 提示

9. **DDL 临期提示**:
   - DDL 24 小时内：红色脉冲 + URGENT 徽章
   - DDL 已过期：红色删除线

10. **回归测试**:
    - 五态流转正常
    - 紧急任务机制正常
    - 时间片轮转正常
    - 数据持久化正常
    - `npm run build` 无 TS 错误

---

## 依赖关系

```
Task 7.1 (checkStarvation 实现) ──────────┐
Task 7.2 (useStarvationCheck Hook) ← 7.1  │
Task 7.3 (startScheduler 集成) ← 7.1      │
Task 7.4 (App 集成 Hook) ← 7.2            │
Task 7.5 (TaskCard 状态视觉) ─────────────┤
Task 7.6 (Exit 庆祝动画) ─────────────────┤
Task 7.7 (边界条件文案) ──────────────────┤
Task 7.8 (ReadyQueue 容量告警) ───────────┤
Task 7.9 (DDL 临期提示) ──────────────────┤
Task 7.10 (集成验证) ← all                ┘
```

**推荐实施顺序**: 7.1 → 7.2 → 7.3 → 7.4 → 7.5 → 7.6 → 7.7 → 7.8 → 7.9 → 7.10

---

## 预估工作量

| Task     | 内容                    | 预估时间    | 复杂度 |
| -------- | ----------------------- | ----------- | ------ |
| 7.1      | checkStarvation 实现    | 25 min      | 中     |
| 7.2      | useStarvationCheck Hook | 15 min      | 低     |
| 7.3      | startScheduler 集成     | 10 min      | 低     |
| 7.4      | App 集成 Hook           | 5 min       | 低     |
| 7.5      | TaskCard 状态视觉增强   | 25 min      | 中     |
| 7.6      | Exit 庆祝动画增强       | 30 min      | 中     |
| 7.7      | 边界条件提示文案优化    | 20 min      | 低     |
| 7.8      | ReadyQueue 容量告警     | 15 min      | 低     |
| 7.9      | DDL 临期视觉提示        | 20 min      | 中     |
| 7.10     | 端到端集成验证          | 25 min      | 低     |
| **合计** |                         | **190 min** |        |

---

## 交付物检查清单

| 检查项               | 预期结果                         |
| -------------------- | -------------------------------- |
| `npm run build`      | 无 TS 错误                       |
| `checkStarvation()`  | DDL 临期 / 长期未运行 → 自动提权 |
| 页面加载防饥饿检查   | 自动执行一次                     |
| 定时防饥饿检查       | 每 5 分钟执行一次                |
| 启动调度器防饥饿检查 | 调度前先提权                     |
| TaskCard 状态视觉    | 不同状态不同背景色/边框色        |
| Exit 庆祝动画        | 彩纸粒子特效                     |
| 边界条件提示         | 中文友好文案                     |
| ReadyQueue 容量告警  | 接近满/已满时视觉告警            |
| DDL 临期提示         | 24 小时内红色脉冲 + URGENT 徽章  |
