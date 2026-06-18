# Phase 6: 运行模式与时间片轮转 — 开发任务清单

## 前置说明

- **已完成**: Phase 1（项目初始化、五列看板布局）、Phase 2（类型拆分、addTask、CreateTaskModal、持久化验证）、Phase 3（New → Ready → Running → Exit 核心流转、Ready 三优先级子列、RunningPanel、Toast 错误提示、Exit 完成动画）、Phase 4（Blocked/Event 机制、BlockTaskModal、EventPanel、resolveEvent 级联恢复）、Phase 5（紧急任务机制、activateEmergency/resolveEmergency、全局紧急横幅、EventPanel 紧急展示）。
- **当前状态**: `updateSettings(partial)` 已在 Store 中实现（简单的 shallow merge）；`runningMode` 和 `timeSliceDuration` 字段已存在于 `AppSettings` 类型中，默认值分别为 `"free"` 和 `25`；但无 UI 入口修改这些设置；无时间片倒计时组件；无时间片到期弹窗。
- **本阶段目标**: 实现系统设置面板（切换运行模式、配置时间片时长）、时间片倒计时组件、时间片到期弹窗（含上下文切换优化）、任务切换逻辑。

---

## Task 6.1: 创建 `useTimeSlice` Hook — 倒计时核心逻辑

**目标**: 封装时间片倒计时的核心逻辑为独立 Hook，供 RunningPanel 和 TimeSliceModal 使用。

**文件变更**:

- 新建 `src/hooks/useTimeSlice.ts`：
  - 导出 `useTimeSlice()` Hook，返回值：
    ```typescript
    {
      remainingSeconds: number;       // 剩余秒数
      isRunning: boolean;            // 倒计时是否在运行
      isExpired: boolean;            // 时间片是否已到期
      start: () => void;             // 开始/重置倒计时
      pause: () => void;             // 暂停倒计时
      reset: () => void;             // 重置倒计时（重新从 timeSliceDuration 开始）
    }
    ```
  - 内部逻辑：
    1. 从 `useAppStore` 读取 `settings.runningMode` 和 `settings.timeSliceDuration`。
    2. 仅当 `runningMode === "timeSlicing"` 且存在 Running 任务时，倒计时才有效。
    3. 使用 `useRef` 存储 `setInterval` ID，`useState` 存储 `remainingSeconds`。
    4. `start()`: 以 `timeSliceDuration * 60` 秒初始化 `remainingSeconds`，启动 `setInterval` 每秒递减。
    5. 当 `remainingSeconds` 降至 0 时：
       - 清除 interval。
       - 设置 `isExpired = true`。
    6. `reset()`: 将 `remainingSeconds` 重置为 `timeSliceDuration * 60`，清除 `isExpired`。
    7. `pause()`: 清除 interval 但保留 `remainingSeconds`。
    8. 使用 `useEffect` 清理：组件卸载时清除 interval。
    9. 当 `runningMode` 不是 `"timeSlicing"` 时，所有返回值无意义（`remainingSeconds = 0`, `isRunning = false`, `isExpired = false`）。
  - 当 Running 任务变化（新任务进入 Running）时，自动调用 `start()` 重置倒计时。
  - 当 Running 任务消失（任务完成/停止/阻塞）时，自动调用 `pause()` 并重置。

**验证**: 在浏览器控制台手动调用 Hook（通过临时测试组件），确认：

- `runningMode = "free"` 时，倒计时不运行
- `runningMode = "timeSlicing"` 时，任务进入 Running 后倒计时开始
- 倒计时每秒递减，到 0 时 `isExpired = true`
- `reset()` 后重新开始计时
- 任务完成后倒计时停止并重置

---

## Task 6.2: 创建 `playAlertSound` 工具函数 — 提示音

**目标**: 使用 Web Audio API 实现简单提示音，时间片到期时播放。

**文件变更**:

- 新建 `src/utils/audio.ts`：
  - 导出 `playAlertSound()`：
    ```typescript
    export function playAlertSound(): void {
      try {
        const ctx = new AudioContext();
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.5);
      } catch {
        // Web Audio API 不可用时静默降级
      }
    }
    ```
  - 使用 880Hz 正弦波，持续 0.5 秒，音量从 0.3 衰减至 0.01。
  - `try-catch` 包裹，浏览器不支持时静默降级。

**验证**: 在控制台调用 `playAlertSound()` 能听到短促提示音；无 AudioContext 时无报错。

---

## Task 6.3: 创建 `SettingsModal` 组件 — 系统设置弹窗

**目标**: 实现系统设置弹窗，支持切换运行模式和时间片时长配置。

**文件变更**:

- 新建 `src/components/SettingsModal.tsx`：
  - Props：
    ```typescript
    interface SettingsModalProps {
      open: boolean;
      onClose: () => void;
    }
    ```
  - 从 `useAppStore` 读取 `settings`，解构 `updateSettings`。
  - UI 布局（参照 CreateTaskModal 风格）：
    1. **标题区**: `⚙ 系统设置`，neon-cyan 色调。
    2. **运行模式切换**:
       - 两个选项按钮（radio 风格）：
         - `自由模式 (free)`: 任务持续运行，不限制时间。默认选中。
         - `时间片轮转 (timeSlicing)`: 任务按时间片轮流执行。
       - 选中态：neon-cyan 高亮边框 + 背景；未选中态：border-glow。
       - 切换时调用 `updateSettings({ runningMode: "free" | "timeSlicing" })`。
       - 若当前有 Running 任务时切换模式，应提示"模式将在下次启动调度时生效"（Toast 提示，不阻止切换）。
    3. **时间片时长配置**:
       - 仅在 `runningMode === "timeSlicing"` 时显示/可用。
       - 数字输入框，单位"分钟"，范围 1-120，步进 5。
       - 值绑定到 `settings.timeSliceDuration`。
       - 修改时调用 `updateSettings({ timeSliceDuration: value })`。
       - 下方显示提示文字："时间片到期后将提示切换任务"。
    4. **Ready 队列上限配置**:
       - 数字输入框，范围 1-20，步进 1。
       - 值绑定到 `settings.readyQueueLimit`。
       - 修改时调用 `updateSettings({ readyQueueLimit: value })`。
    5. **底部按钮**: 关闭按钮。
  - ESC 键关闭弹窗。
  - 点击遮罩层关闭弹窗。
  - 样式与 CreateTaskModal 保持一致（暗色背景、neon 边框、font-mono）。

**验证**:

- 打开设置弹窗，切换运行模式，Store 中 `runningMode` 更新
- 切换到时间片轮转模式后，时间片时长输入框可用
- 修改时间片时长，Store 中 `timeSliceDuration` 更新
- 修改 Ready 队列上限，Store 中 `readyQueueLimit` 更新
- ESC 和遮罩点击可关闭弹窗

---

## Task 6.4: App.tsx 集成设置弹窗 — 齿轮图标入口

**目标**: 在 header 区域添加齿轮图标，点击打开 SettingsModal。

**文件变更**:

- 修改 `src/App.tsx`：
  - 新增 `showSettingsModal` 状态。
  - 在 header 右侧区域（Tasks 计数旁）添加齿轮按钮：
    ```tsx
    <button
      onClick={() => setShowSettingsModal(true)}
      className="font-mono text-sm text-text-muted hover:text-neon-cyan transition-colors"
      title="系统设置"
    >
      ⚙
    </button>
    ```
  - 在 header 区域显示当前运行模式指示：
    ```tsx
    <span className="font-mono text-[10px] text-text-muted/60">
      {settings.runningMode === "free"
        ? "自由模式"
        : `时间片 ${settings.timeSliceDuration}min`}
    </span>
    ```
  - 渲染 `<SettingsModal open={showSettingsModal} onClose={() => setShowSettingsModal(false)} />`。
  - 导入 SettingsModal。

**验证**: header 出现齿轮图标和运行模式指示；点击齿轮打开设置弹窗；关闭弹窗后状态正确。

---

## Task 6.5: 创建 `TimeSliceModal` 组件 — 时间片到期弹窗

**目标**: 时间片到期时弹出推荐框，支持切换任务或继续运行。

**文件变更**:

- 新建 `src/components/TimeSliceModal.tsx`：
  - Props：
    ```typescript
    interface TimeSliceModalProps {
      open: boolean;
      currentTask: Task | null; // 当前 Running 任务
      recommendedTask: Task | null; // 推荐的下一个任务（Ready 队首）
      onSwitch: () => void; // 切换任务回调
      onContinue: () => void; // 不切换，继续运行回调
    }
    ```
  - UI 布局：
    1. **标题区**: `⏱ 时间片到期`，neon-yellow 色调。
    2. **当前任务信息**: 显示当前任务标题、优先级徽章。
    3. **上下文切换优化判断**:
       - 若 `currentTask.isHighContextCost === true`：
         - 显示警告文案：`⚠️ 该任务需要深度思考，是否继续？`
         - neon-yellow 色调，醒目提示。
         - 按钮排列：**"继续运行"**（主按钮，neon-cyan 色调，较大）+ **"切换任务"**（次按钮，neon-yellow 色调，较小）。
         - 降低切换倾向：继续运行按钮更醒目。
       - 若 `currentTask.isHighContextCost === false`：
         - 显示推荐文案：`推荐切换至：{recommendedTask.title}（P{priority}）`
         - 按钮排列：**"切换任务"**（主按钮，neon-green 色调）+ **"不切换"**（次按钮，neon-yellow 色调）。
    4. **推荐任务卡片**（仅 `isHighContextCost === false` 时显示）:
       - 简化版 TaskCard，显示标题、优先级、CTX 标记。
       - neon-green 边框高亮。
    5. **底部按钮区**: 两个操作按钮，如上所述根据 `isHighContextCost` 调整。
  - 不支持 ESC 关闭（强制用户做出选择）。
  - 不支持遮罩关闭（强制用户做出选择）。
  - 弹窗出现时播放提示音（调用 `playAlertSound()`）。

**验证**:

- 普通任务到期：显示推荐任务信息和"切换/不切换"按钮
- 高切换开销任务到期：显示深度思考提示和"继续/切换"按钮
- 按钮样式和排列符合设计
- 弹窗不可通过 ESC 或遮罩关闭

---

## Task 6.6: Store 增加 `switchTask` 方法 — 任务切换逻辑

**目标**: 在 Store 中实现任务切换：当前 Running 任务回 Ready，推荐任务进入 Running。

**文件变更**:

- 修改 `src/types/task.ts`：
  - 在 `AppStore` 接口中增加：
    ```typescript
    switchTask: (fromId: string, toId: string) => void;
    ```
- 修改 `src/store/useAppStore.ts`：
  - 实现 `switchTask(fromId: string, toId: string)`：
    1. 通过 `get()` 获取 `tasks`、`settings`。
    2. 校验 `fromId` 对应任务 `state === "Running"`，否则 `throw new Error("Source task is not running")`。
    3. 校验 `toId` 对应任务 `state === "Ready"`，否则 `throw new Error("Target task is not ready")`。
    4. 校验 `settings.currentRunningTaskId === fromId`。
    5. `now = new Date().toISOString()`。
    6. 更新 `tasks`：
       - `fromId` 任务：`state = "Ready"`、`updatedAt = now`（回到原优先级队列队尾，按 createdAt 排序自然在队尾）。
       - `toId` 任务：`state = "Running"`、`lastRunningAt = now`、`updatedAt = now`。
    7. 更新 `settings.currentRunningTaskId = toId`。
    8. `set()` 更新 `tasks` 和 `settings`。

**验证**: 调用 `switchTask(runningId, readyId)` 后：

- 原 Running 任务变为 Ready
- 目标 Ready 任务变为 Running
- `currentRunningTaskId` 更新为目标任务 ID
- 对非 Running/非 Ready 任务调用抛错

---

## Task 6.7: RunningPanel 集成倒计时组件

**目标**: 在时间片轮转模式下，RunningPanel 中 Running 任务卡片上显示倒计时。

**文件变更**:

- 修改 `src/components/RunningPanel.tsx`：
  - 导入 `useTimeSlice` Hook。
  - 在 RunningPanel 内部调用 `useTimeSlice()` 获取 `remainingSeconds`、`isExpired`。
  - 当 `settings.runningMode === "timeSlicing"` 且有 Running 任务时：
    - 在 Running 任务卡片上方（Running 标签旁）显示倒计时：
      ```tsx
      <span className="font-mono text-xs text-neon-yellow">
        ⏱ {formatTime(remainingSeconds)}
      </span>
      ```
    - `formatTime` 函数：将秒数格式化为 `MM:SS` 格式。
    - 倒计时最后 60 秒时，文字变为 neon-red 色并添加 `animate-pulse`。
    - 倒计时为 0 时，显示 `⏱ 00:00`，neon-red 色。
  - 当 `settings.runningMode === "free"` 时，不显示倒计时。
  - 将 `isExpired` 状态通过回调或状态提升传递给 App 层（用于触发 TimeSliceModal）。

**验证**:

- 自由模式下 Running 任务不显示倒计时
- 时间片轮转模式下显示倒计时，每秒更新
- 最后 60 秒变红并脉冲
- 倒计时归零时显示 00:00

---

## Task 6.8: App.tsx 集成时间片到期弹窗与切换逻辑

**目标**: 在 App 层面串联时间片到期检测、弹窗展示、任务切换/继续逻辑。

**文件变更**:

- 修改 `src/App.tsx`：
  - 导入 `useTimeSlice`、`TimeSliceModal`、`playAlertSound`。
  - 在 App 组件中调用 `useTimeSlice()` 获取 `isExpired`、`reset`。
  - 新增 `showTimeSliceModal` 状态。
  - 使用 `useEffect` 监听 `isExpired`：
    ```typescript
    useEffect(() => {
      if (
        isExpired &&
        settings.runningMode === "timeSlicing" &&
        settings.currentRunningTaskId
      ) {
        playAlertSound();
        setShowTimeSliceModal(true);
      }
    }, [isExpired, settings.runningMode, settings.currentRunningTaskId]);
    ```
  - 计算推荐任务（Ready 队首）：
    ```typescript
    const recommendedTask =
      tasks
        .filter((t) => t.state === "Ready")
        .sort((a, b) => {
          if (a.priority !== b.priority) return a.priority - b.priority;
          return (
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        })[0] ?? null;
    ```
  - 获取当前 Running 任务：
    ```typescript
    const currentRunningTask = settings.currentRunningTaskId
      ? (tasks.find((t) => t.id === settings.currentRunningTaskId) ?? null)
      : null;
    ```
  - 实现 `handleSwitchTask` 回调：
    ```typescript
    const handleSwitchTask = useCallback(() => {
      if (!currentRunningTask || !recommendedTask) return;
      try {
        switchTask(currentRunningTask.id, recommendedTask.id);
        showToast(`切换至: ${recommendedTask.title}`, "info");
      } catch (err) {
        showToast(
          err instanceof Error ? err.message : "Failed to switch task",
          "error",
        );
      }
      setShowTimeSliceModal(false);
      reset();
    }, [currentRunningTask, recommendedTask, switchTask, showToast, reset]);
    ```
  - 实现 `handleContinueTask` 回调：
    ```typescript
    const handleContinueTask = useCallback(() => {
      showToast("继续运行，倒计时重置", "info");
      setShowTimeSliceModal(false);
      reset();
    }, [showToast, reset]);
    ```
  - 渲染 `<TimeSliceModal>`：
    ```tsx
    <TimeSliceModal
      open={showTimeSliceModal}
      currentTask={currentRunningTask}
      recommendedTask={recommendedTask}
      onSwitch={handleSwitchTask}
      onContinue={handleContinueTask}
    />
    ```
  - 从 store 解构 `switchTask`。

**验证**:

- 时间片到期后弹窗出现，播放提示音
- 点击"切换任务"：原任务回 Ready，推荐任务进 Running，弹窗关闭，新任务倒计时开始
- 点击"不切换/继续运行"：原任务继续 Running，倒计时重置，弹窗关闭
- 高切换开销任务到期时弹窗显示深度思考提示

---

## Task 6.9: Running 任务变化时自动重置倒计时

**目标**: 确保新任务进入 Running 时倒计时自动开始，任务离开 Running 时倒计时停止。

**文件变更**:

- 修改 `src/hooks/useTimeSlice.ts`：
  - 使用 `useEffect` 监听 `settings.currentRunningTaskId` 的变化：
    - 当 `currentRunningTaskId` 从 `null` 变为有效 ID（新任务开始运行）时，自动调用 `start()`。
    - 当 `currentRunningTaskId` 从有效 ID 变为 `null`（任务完成/停止/阻塞）时，自动调用 `pause()` 并 `reset()`。
    - 当 `currentRunningTaskId` 从一个 ID 变为另一个 ID（任务切换）时，自动调用 `start()`（重置并开始新倒计时）。
  - 使用 `useRef` 记录上一次的 `currentRunningTaskId`，与当前值比较判断变化类型。

**验证**:

- 启动调度器后倒计时自动开始
- 完成任务后倒计时停止并重置
- 切换任务后新任务倒计时自动开始
- 停止任务后倒计时停止

---

## Task 6.10: 端到端集成验证

**目标**: 验证双运行模式的完整流转链路和边界条件。

**测试场景**:

1. **自由模式默认行为**: 默认 `runningMode = "free"`，Running 任务不显示倒计时，无时间片弹窗
2. **切换到时间片轮转模式**: 设置弹窗切换模式 → header 显示"时间片 25min" → 启动调度器 → Running 任务显示倒计时
3. **时间片到期弹窗**: 倒计时归零 → 播放提示音 → 弹窗出现 → 显示推荐任务
4. **切换任务**: 点击"切换任务" → 原 Running 任务回 Ready → 推荐任务进 Running → 新倒计时开始
5. **不切换**: 点击"不切换" → 原任务继续 Running → 倒计时重置
6. **高切换开销任务**: `isHighContextCost = true` 的任务到期 → 弹窗显示"该任务需要深度思考，是否继续？" → "继续运行"按钮更醒目
7. **修改时间片时长**: 设置中修改为 1 分钟 → 倒计时按新时长运行
8. **模式切换不影响运行中任务**: Running 任务时切换模式 → 提示"模式将在下次启动调度时生效" → 当前倒计时继续
9. **紧急任务与时间片**: 紧急任务运行时，时间片倒计时不运行（紧急任务不受时间片限制）
10. **持久化**: 切换模式后刷新页面 → 模式设置保持
11. **无 Ready 任务时到期**: 时间片到期但 Ready 队列为空 → 弹窗不显示推荐任务，仅提供"继续运行"选项

---

## 依赖关系

```
Task 6.1 (useTimeSlice Hook) ─────────────┐
Task 6.2 (playAlertSound) ────────────────┤
Task 6.3 (SettingsModal) ─────────────────┤
Task 6.4 (App 集成设置弹窗) ← 6.3        │
Task 6.5 (TimeSliceModal) ← 6.2           │
Task 6.6 (switchTask Store) ──────────────┤
Task 6.7 (RunningPanel 倒计时) ← 6.1     │
Task 6.8 (App 集成时间片弹窗) ← 6.1, 6.2, 6.5, 6.6, 6.7
Task 6.9 (倒计时自动重置) ← 6.1          │
Task 6.10 (集成验证) ← all                ┘
```

**推荐实施顺序**: 6.1 → 6.2 → 6.3 → 6.4 → 6.5 → 6.6 → 6.7 → 6.8 → 6.9 → 6.10

---

## 预估工作量

| Task     | 内容                     | 预估时间     | 复杂度 |
| -------- | ------------------------ | ------------ | ------ |
| 6.1      | useTimeSlice Hook        | 35 min       | 高     |
| 6.2      | playAlertSound 工具函数  | 10 min       | 低     |
| 6.3      | SettingsModal 组件       | 30 min       | 中     |
| 6.4      | App 集成设置弹窗         | 15 min       | 低     |
| 6.5      | TimeSliceModal 组件      | 35 min       | 高     |
| 6.6      | switchTask Store 方法    | 20 min       | 中     |
| 6.7      | RunningPanel 集成倒计时  | 25 min       | 中     |
| 6.8      | App 集成时间片弹窗与切换 | 30 min       | 高     |
| 6.9      | 倒计时自动重置           | 20 min       | 中     |
| 6.10     | 端到端集成验证           | 25 min       | 低     |
| **合计** |                          | **~245 min** |        |

---

## 交付物检查清单

| 检查项                          | 预期结果                                                   |
| ------------------------------- | ---------------------------------------------------------- |
| `npm run build`                 | 无 TS 错误                                                 |
| 设置弹窗                        | 齿轮图标可打开，可切换运行模式，可配置时间片时长和队列上限 |
| header 模式指示                 | 显示当前运行模式（自由/时间片 Nmin）                       |
| 自由模式                        | Running 任务无倒计时，无时间片弹窗                         |
| 时间片轮转模式                  | Running 任务显示倒计时，到期弹窗                           |
| 倒计时显示                      | MM:SS 格式，最后 60 秒变红脉冲                             |
| 提示音                          | 时间片到期时播放短促提示音                                 |
| 时间片到期弹窗 — 普通任务       | 显示推荐任务，"切换任务"/"不切换"按钮                      |
| 时间片到期弹窗 — 高切换开销任务 | 显示深度思考提示，"继续运行"更醒目                         |
| 切换任务                        | 原 Running → Ready，推荐 Ready → Running，新倒计时开始     |
| 不切换                          | 原 Running 继续，倒计时重置                                |
| 新任务进入 Running              | 倒计时自动开始                                             |
| 任务离开 Running                | 倒计时停止并重置                                           |
| 紧急任务不受时间片限制          | 紧急任务运行时倒计时不运行                                 |
| 无 Ready 任务时到期             | 弹窗仅提供"继续运行"选项                                   |
| 持久化                          | 模式和时长设置刷新后保持                                   |
| 弹窗不可 ESC/遮罩关闭           | 时间片到期弹窗强制用户选择                                 |
