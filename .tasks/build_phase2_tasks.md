# Phase 2: 数据模型与基础 CRUD — 开发任务清单

## 前置说明

- 类型定义已存在于 `src/types/index.ts`，本次将其拆分为 `src/types/task.ts`（核心类型）+ `src/types/index.ts`（统一 re-export），保持现有 import 路径兼容。
- TaskCard、KanbanColumn 组件已就位，无需重写。
- 重点：实现 addTask action + 创建任务弹窗 + 联动逻辑。

---

## Task 2.1: 拆分类型文件

**目标**: 将类型定义从 `index.ts` 拆分到 `task.ts`，`index.ts` 改为 re-export。

**文件变更**:

- 创建 `src/types/task.ts`：将 `TaskState`、`Priority`、`RunningMode`、`Task`、`AppEvent`、`AppSettings`、`CreateTaskInput`、`AppStore` 全部移入。
- 修改 `src/types/index.ts`：改为 `export * from "./task"`，保持所有 import 路径不变。

**验证**: `npm run build` 无类型错误。

---

## Task 2.2: 实现 addTask action

**目标**: 在 Zustand Store 中实现 `addTask`，按 `Database_Schema.md` 第2节默认值创建任务。

**文件变更**:

- 修改 `src/store/useAppStore.ts`：
  - 实现 `addTask(data: CreateTaskInput)`：
    - `id` = `crypto.randomUUID()`
    - `state` = `"New"`
    - `priority` = `data.priority ?? 3`
    - `isEmergency` = `false`
    - `eventId` = `null`
    - `lastRunningAt` = `null`
    - `createdAt` / `updatedAt` = `new Date().toISOString()`
    - 将 `isExecutable`、`isHighContextCost`、`deadline` 从 input 映射，缺省使用默认值
    - `set(state => ({ tasks: [...state.tasks, newTask] }))`

**验证**: 在浏览器控制台调用 `useAppStore.getState().addTask({title: "测试"})` 后，`tasks` 数组长度 +1，新任务 state 为 `"New"`。

---

## Task 2.3: 创建 CreateTaskModal 组件

**目标**: 开发创建任务弹窗，含表单字段与联动逻辑。

**文件变更**:

- 创建 `src/components/CreateTaskModal.tsx`：
  - Props: `open: boolean` / `onClose: () => void`
  - 表单字段：
    - `title`（input，必填，空值时禁用提交按钮）
    - `description`（textarea，可选）
    - `deadline`（`<input type="datetime-local">`，可选）
    - `isExecutable`（checkbox，默认不勾选）
    - `isHighContextCost`（checkbox，**仅当 isExecutable=true 时可勾选**；isExecutable=false 时 disabled 且自动置 false）
  - 提交逻辑：调用 `useAppStore.getState().addTask(formData)`，成功后 `onClose()` 并重置表单。
  - 样式：暗色科技感，与现有 UI 风格一致（bg-bg-secondary, border-border-glow, neon-cyan 强调色）。
  - 弹窗使用 `fixed inset-0` 遮罩 + 居中卡片布局，点击遮罩或 ESC 关闭。

**验证**: 点击 New 区域的 "+" 按钮后弹窗出现，填写表单提交后 New 区域出现新 TaskCard。

---

## Task 2.4: 在 New 区域集成 "+" 按钮与弹窗

**目标**: 在 New 看板列添加创建任务入口。

**文件变更**:

- 修改 `src/App.tsx`：
  - 引入 `CreateTaskModal`，添加 `showCreateModal` / `setShowCreateModal` state。
  - 在 New 列（`state === "New"`）的 KanbanColumn children 区域顶部添加 "+" 按钮，点击设置 `setShowCreateModal(true)`。
  - 渲染 `<CreateTaskModal open={showCreateModal} onClose={() => setShowCreateModal(false)} />`。
  - "+" 按钮样式：与 TaskCard 等宽，虚线边框，neon-cyan 色，hover 发光效果。

**验证**: New 列出现 "+" 按钮 → 点击弹出表单 → 提交后 New 列新增一张 TaskCard。

---

## Task 2.5: 验证 Zustand persist 持久化

**目标**: 确认刷新页面后数据不丢失。

**步骤**:

1. 启动 `npm run dev`。
2. 通过弹窗创建 2-3 个任务。
3. 打开 DevTools → Application → Local Storage → 确认 `process-todo-storage` key 下有数据。
4. 刷新页面（F5）→ 任务卡片仍在，数据完整。
5. 关闭标签页后重新打开 → 数据仍在。

**注意**: 若 persist 未生效，检查 `useAppStore.ts` 中 `persist` 中间件的 `name` 和 `version` 配置是否正确。

---

## 依赖关系

```
Task 2.1 (类型拆分)
  └→ Task 2.2 (addTask action)
       └→ Task 2.3 (CreateTaskModal)
            └→ Task 2.4 (集成到 New 区域)
                 └→ Task 2.5 (验证 persist)
```

## 预估工作量

| Task                | 预估时间    | 复杂度 |
| ------------------- | ----------- | ------ |
| 2.1 类型拆分        | 5 min       | 低     |
| 2.2 addTask action  | 10 min      | 低     |
| 2.3 CreateTaskModal | 30 min      | 中     |
| 2.4 集成 "+" 按钮   | 10 min      | 低     |
| 2.5 验证 persist    | 5 min       | 低     |
| **合计**            | **~60 min** |        |
