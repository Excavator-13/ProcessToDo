# Build_Prompt_by_Phase.md: 基于进程调度的任务管理 App MVP 构建分步指令

本文件用于指导 Agent Builder 分阶段构建应用。每个阶段包含背景描述和具体任务指令。

> **技术栈**: React 18+ + TypeScript (strict) + Vite + TailwindCSS + Zustand (persist) + LocalStorage
> **数据模型**: 详见 `Database_Schema.md`（Zustand store 字段定义与业务约束）
> **UI 规格**: 详见 `Construct.md`

---

### Phase 1: 项目初始化与基础布局

**参考文档**:

- 技术栈和总体要求: `Construct.md` 第2节
- 数据模型接口: `Database_Schema.md` 第3节

【项目背景和已完成的工作】
我们正在构建一个基于进程调度概念的任务管理 App。当前项目刚刚启动，还没有任何代码。

【当前任务】

1. 使用 Vite 初始化一个 React + TypeScript 项目（`npm create vite@latest . -- --template react-ts`）。
2. 安装并配置 TailwindCSS（v3），设定暗色科技感主题（深色背景 + 霓虹色强调）。
3. 安装 Zustand：`npm install zustand`。
4. 创建全局状态管理 Store（`src/store/useAppStore.ts`）：
   - 定义 `Task`、`Event`、`AppSettings` 的 TypeScript 接口（参考 `Database_Schema.md` 第3节）。
   - 使用 Zustand `persist` 中间件，localStorage key 为 `"process-todo-storage"`。
   - 初始化默认数据：空 `tasks[]`、空 `events[]`、默认 `settings`。
5. 构建主界面基础 UI 布局（`src/App.tsx`）：
   - 看板视图，横向分为五个列：**New（孵化池）**、**Ready（就绪队列）**、**Blocked（阻塞/等待）**、**Running（运行中）**、**Exit（终止/完成）**。
   - 每列有标题和任务卡片容器。
6. 确保布局响应式，使用偏暗色或科技感主题，体现操作系统调度风格。

---

### Phase 2: 数据模型与基础 CRUD

**参考文档**:

- 字段定义与默认值: `Database_Schema.md` 第2节
- 完整 TypeScript 类型: `Database_Schema.md` 第3节
- 业务约束: `Database_Schema.md` 第4节
- 功能概述: `Construct.md` 第3节

【项目背景和已完成的工作】
项目基础框架已搭建完成，主界面五个区域的骨架已就位。Zustand Store 已建立但逻辑为空。

【当前任务】

1. 在 `src/types/` 下创建 `task.ts`，定义 `Task`、`Event`、`AppSettings`、`TaskState`、`Priority`、`RunningMode` 等 TypeScript 类型（参考 `Database_Schema.md` 第3节）。
2. 在 Zustand Store 中实现 `addTask` action：
   - 输入：`title`（必填）、`description`（可选）、`deadline`（可选）、`isExecutable`（默认 false）、`isHighContextCost`（默认 false）。
   - 新任务 `state` 默认 `'New'`，`priority` 默认 `3`（低），`id` 使用 `crypto.randomUUID()`。
   - `createdAt` 和 `updatedAt` 设为当前时间 ISO 字符串。
3. 在 New 区域开发"创建任务"功能：
   - 提供"+"按钮打开弹窗表单。
   - 表单字段：`title`（输入框）、`description`（文本域）、`deadline`（日期时间选择器）。
   - `isExecutable`（checkbox）：勾选后任务可参与调度。
   - `isHighContextCost`（checkbox）：**仅当 `isExecutable=true` 时可勾选**（联动逻辑）。
4. 实现简单的 `TaskCard` 组件，在 New 区域渲染所有 `state === 'New'` 的任务卡片。
5. 验证 Zustand persist 生效：刷新页面后数据不丢失。

---

### Phase 3: 核心状态流转与就绪队列

**参考文档**:

- 状态流转图和规则: `Construct.md` 第4.1-4.2节
- Ready 队列容量约束: `Database_Schema.md` 第4.5节
- 唯一 Running 约束: `Database_Schema.md` 第4.1节
- Store action 签名: `Database_Schema.md` 第3节 (AppStore)

【项目背景和已完成的工作】
已实现任务的创建和在 New 区域的展示，数据已持久化。目前任务无法流转。

【当前任务】

1. **Ready 队列实现**：
   - 在 Ready 区域展示三个优先级子列：高（`priority=1`）、中（`priority=2`）、低（`priority=3`）。
   - 显示当前数量 / 上限（`settings.readyQueueLimit`，默认 9）。
   - 队首任务高亮显示。
2. **状态流转（New → Ready）**：
   - 在 New 区域的任务卡片上增加"提入就绪"按钮（仅 `isExecutable=true` 的任务显示）。
   - 在 Store 中实现 `promoteTask(id)`：
     - 校验 `isExecutable === true`。
     - 校验 Ready 队列未满（`< readyQueueLimit`）。
     - 若满，throw error / 返回错误提示。
     - 更新 `state = 'Ready'`，`updatedAt` 刷新。
3. **Running 状态实现**：
   - 在 Store 中实现 `startScheduler()`：
     - 校验当前无 Running 任务（`settings.currentRunningTaskId === null`）。
     - 取 Ready 队列中最高优先级队首任务，更新 `state = 'Running'`。
     - 更新 `settings.currentRunningTaskId` 和 `lastRunningAt`。
   - 在主界面提供"启动调度器"按钮。
   - Running 任务卡片上提供"手动停止"和"标记完成"按钮。
4. **停止/完成流转**：
   - `stopTask(id)`：任务 `state` 回到 `'Ready'`（原优先级队尾），清空 `currentRunningTaskId`。
   - `completeTask(id)`：任务 `state = 'Exit'`，清空 `currentRunningTaskId`。

---

### Phase 4: 阻塞状态与事件管理

**参考文档**:

- Event 实体字段: `Database_Schema.md` 第2.2节
- Event 联动机制: `Database_Schema.md` 第4.3节
- Blocked 状态流转: `Construct.md` 第4.2节 (流转规则表)

【项目背景和已完成的工作】
已实现 New → Ready → Running → Exit 的基本流转，Ready 队列有数量限制和优先级划分。

【当前任务】

1. **Blocked 状态实现**：
   - 在 Running 和 Ready 任务卡片上增加"阻塞"按钮。
   - 点击后弹窗输入 Event 名称（如"等待审批"）。
   - 在 Store 中实现 `blockTask(id, eventName)`：
     - 在 `events[]` 中创建一条新 Event（`isSystemGenerated=false`, `isResolved=false`）。
     - 任务 `state = 'Blocked'`，`eventId` 指向新 Event。
     - 若任务原本是 Running，清空 `currentRunningTaskId`。
2. **Event 管理面板**：
   - 在 Blocked 区域旁边展示未解决的 Event 列表（`isResolved === false`）。
   - 每个 Event 显示关联的任务数量，并提供"已解决"按钮。
3. **Event 解决逻辑**：
   - 在 Store 中实现 `resolveEvent(eventId)`：
     - 将该 Event 标记为 `isResolved = true`。
     - 查找所有关联该 `eventId` 且 `state === 'Blocked'` 的任务。
     - 检查 Ready 队列容量：若空间不足，提示用户。
     - 空间足够则将任务恢复为 `state = 'Ready'`，清空 `eventId`。

---

### Phase 5: 紧急任务机制

**参考文档**:

- 紧急任务约束: `Database_Schema.md` 第4.2节
- 紧急任务业务逻辑: `Construct.md` 第4.3节
- Store action 签名: `Database_Schema.md` 第3节 (AppStore)

【项目背景和已完成的工作】
已实现基础五态流转、Ready 队列限制及 Blocked/Event 机制。

【当前任务】

1. **触发紧急任务**：
   - 在可执行任务（New 或 Ready 状态）卡片上增加"设为紧急"按钮。
   - 约束：全局仅允许一个紧急任务（`isEmergency === true` 唯一）。
   - 在 Store 中实现 `activateEmergency(taskId)`：
     - 校验任务 `isExecutable === true`。
     - 校验当前无其他紧急任务。
     - 若当前有 Running 任务，将其停止（回 Ready 或标记处理）。
     - 将 Ready 队列所有任务转为 Blocked 状态，创建系统 Event（`name="emergency"`, `isSystemGenerated=true`）。
     - 紧急任务 `isEmergency = true`，`state = 'Running'`。
     - 更新 `settings.activeEmergencyTaskId`。
2. **解除紧急状态**：
   - 在紧急任务的 Running 卡片上提供"完成紧急任务"按钮。
   - 在 Store 中实现 `resolveEmergency(taskId)`：
     - 任务 `state = 'Exit'`，`isEmergency = false`（或保留记录）。
     - 查找所有因 `"emergency"` Event 阻塞的任务，恢复为 `'Ready'`。
     - 标记 `"emergency"` Event 为 `isResolved = true`。
     - 清空 `settings.activeEmergencyTaskId`。

---

### Phase 6: 运行模式与时间片轮转

**参考文档**:

- 调度模式说明: `Construct.md` 第4.4节
- AppSettings 字段: `Database_Schema.md` 第2.3节
- 未来后端调度 API: `API_Contract.md` 第6节 (仅参考)

【项目背景和已完成的工作】
应用已具备完整的五态流转、优先级调度和紧急任务恢复机制。现在需要引入双运行模式。

【当前任务】

1. **设置面板**：
   - 增加一个系统设置弹窗（齿轮图标触发）。
   - 可切换"默认模式（自由模式）"和"时间片轮转模式"。
   - 可配置时间片时长（`timeSliceDuration`，默认 25 分钟）。
   - 在 Store 中实现 `updateSettings(partial)`。
2. **时间片倒计时**：
   - 若 `runningMode === 'timeSlicing'`，Running 任务卡片上显示倒计时组件。
   - 倒计时基于 `timeSliceDuration`（分钟），实时显示剩余时间。
   - 时间片结束响铃（使用 Web Audio API 或 `<audio>` 播放简单提示音）。
3. **时间片到期弹窗**：
   - 时间片结束时弹出推荐框：
     - 显示系统推荐的下一个最高优先级任务（Ready 队首）。
     - 提供两个按钮："切换任务"和"不切换"。
   - **上下文切换优化**：若当前任务 `isHighContextCost === true`，弹窗文案改为"该任务需要深度思考，是否继续？"，降低切换倾向。
4. **切换逻辑**：
   - "切换任务"：原任务 `state = 'Ready'`（回到原队列队尾），推荐任务进入 Running。
   - "不切换"：原任务继续 Running，倒计时重置。

---

### Phase 7: 防饥饿机制与全局打磨

**参考文档**:

- 防饥饿机制规则: `Construct.md` 第4.5节
- 防饥饿约束: `Database_Schema.md` 第4.4节
- UI/UX 需求: `Construct.md` 第5节
- 完整功能清单: `Construct.md` 第6节 (MVP 交付目标)
- 未来后端 API 参考: `API_Contract.md`

【项目背景和已完成的工作】
核心业务逻辑、状态机、双模式调度均已实现。应用功能已完整。

【当前任务】

1. **防饥饿机制（自动提权）**：
   - 在 Store 中实现 `checkStarvation()`。
   - 遍历 Ready 队列任务：
     - 若 `deadline` 在未来 24 小时内且 `priority > 1`，`priority -= 1`。
     - 若 `lastRunningAt` 距今超过 3 天且 `priority > 1`，`priority -= 1`。
   - 在特定操作触发时调用（如 `startScheduler`、页面加载时、定时器每 5 分钟）。
2. **UI/UX 打磨**：
   - 任务卡片视觉优化：不同状态使用不同边框/背景色标识。
   - 优先级用颜色区分：高=红色、中=黄色、低=蓝色。
   - Exit 区域任务展示庆祝动画（如简单 CSS 动画或 Toast 提示）。
   - 检查所有边界条件：
     - Ready 队列满时提入 → 提示"Ready 队列已满"
     - 无 Running 任务时点停止/完成 → 容错
     - 已有 Running 任务时点启动 → 提示"已有任务在运行"
     - 紧急任务触发时已有紧急任务 → 提示"已存在紧急任务"
     - 阻塞无关联事件 → 提示输入事件名
   - 确保代码结构清晰：组件按功能拆分到 `src/components/`，store 逻辑集中在 `src/store/`，类型定义在 `src/types/`。
