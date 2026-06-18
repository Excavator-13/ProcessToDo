# Database_Schema.md: 数据模型设计

> **MVP 阶段**: 数据以 Zustand store 形态存储在 LocalStorage 中，不使用数据库。
> 本文档定义数据实体的字段约束和业务逻辑约束，作为 Zustand store 设计的依据。
> 若未来引入后端，可参照此文档建表，字段名映射为 `snake_case`。

## 1. 实体概览

| 实体          | 存储 Key            | 说明                                           |
| ------------- | ------------------- | ---------------------------------------------- |
| `Task`        | `tasks` (数组)      | 核心任务实体，记录所有任务及其状态             |
| `Event`       | `events` (数组)     | 阻塞原因/事件，管理导致任务进入 Blocked 的原因 |
| `AppSettings` | `settings` (单对象) | 系统全局设置，调度模式、队列限制等             |

## 2. 实体字段定义

### 2.1 Task（任务）

| 字段名              | 类型               | 必填 | 默认值                     | 说明                                                |
| ------------------- | ------------------ | ---- | -------------------------- | --------------------------------------------------- |
| `id`                | `string` (UUID v4) | ✅   | `crypto.randomUUID()`      | 任务唯一标识符                                      |
| `title`             | `string`           | ✅   | -                          | 任务名称                                            |
| `description`       | `string`           | ❌   | `""`                       | 任务描述（最小化输入）                              |
| `state`             | `TaskState`        | ✅   | `"New"`                    | 枚举: `New`, `Ready`, `Blocked`, `Running`, `Exit`  |
| `isExecutable`      | `boolean`          | ✅   | `false`                    | 是否为可执行任务，决定是否参与调度                  |
| `priority`          | `Priority`         | ✅   | `3`                        | 优先级: `1`=高, `2`=中, `3`=低，仅 Ready 状态有效   |
| `isEmergency`       | `boolean`          | ✅   | `false`                    | 是否为紧急任务，全局仅允许一个为 `true`             |
| `deadline`          | `string \| null`   | ❌   | `null`                     | 截止时间（ISO 8601），用于自动提权                  |
| `isHighContextCost` | `boolean`          | ✅   | `false`                    | 是否为高切换开销任务（如深度思考/写作）             |
| `eventId`           | `string \| null`   | ❌   | `null`                     | 关联的 Blocked Event ID，仅 `state=Blocked` 时非空  |
| `lastRunningAt`     | `string \| null`   | ❌   | `null`                     | 最后一次进入 Running 的时间（ISO 8601），用于防饥饿 |
| `createdAt`         | `string`           | ✅   | `new Date().toISOString()` | 任务创建时间                                        |
| `updatedAt`         | `string`           | ✅   | `new Date().toISOString()` | 最后更新时间                                        |

### 2.2 Event（事件）

| 字段名              | 类型               | 必填 | 默认值                     | 说明                                        |
| ------------------- | ------------------ | ---- | -------------------------- | ------------------------------------------- |
| `id`                | `string` (UUID v4) | ✅   | `crypto.randomUUID()`      | 事件唯一标识符                              |
| `name`              | `string`           | ✅   | -                          | 事件名称（如"等待审批"、"外部紧急阻塞"）    |
| `isSystemGenerated` | `boolean`          | ✅   | `false`                    | 是否由系统自动生成（如 `"emergency"` 事件） |
| `isResolved`        | `boolean`          | ✅   | `false`                    | 是否已解决，解决后关联任务自动恢复为 Ready  |
| `createdAt`         | `string`           | ✅   | `new Date().toISOString()` | 创建时间                                    |

### 2.3 AppSettings（系统设置）

| 字段名                  | 类型             | 必填 | 默认值   | 说明                                                |
| ----------------------- | ---------------- | ---- | -------- | --------------------------------------------------- |
| `runningMode`           | `RunningMode`    | ✅   | `"free"` | 调度模式: `free`=自由模式, `timeSlicing`=时间片轮转 |
| `readyQueueLimit`       | `number`         | ✅   | `9`      | Ready 队列数量上限                                  |
| `timeSliceDuration`     | `number`         | ✅   | `25`     | 时间片长度（分钟），仅时间片轮转模式有效            |
| `currentRunningTaskId`  | `string \| null` | ✅   | `null`   | 当前 Running 任务 ID                                |
| `activeEmergencyTaskId` | `string \| null` | ✅   | `null`   | 当前触发的紧急任务 ID                               |

## 3. TypeScript 类型定义

```typescript
// ---- 枚举 ----
type TaskState = "New" | "Ready" | "Blocked" | "Running" | "Exit";
type Priority = 1 | 2 | 3;
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
  deadline: string | null;
  isHighContextCost: boolean;
  eventId: string | null;
  lastRunningAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Event {
  id: string;
  name: string;
  isSystemGenerated: boolean;
  isResolved: boolean;
  createdAt: string;
}

interface AppSettings {
  runningMode: RunningMode;
  readyQueueLimit: number;
  timeSliceDuration: number;
  currentRunningTaskId: string | null;
  activeEmergencyTaskId: string | null;
}

// ---- Zustand Store ----
interface AppStore {
  tasks: Task[];
  events: Event[];
  settings: AppSettings;

  // Task CRUD
  addTask: (data: CreateTaskInput) => void;
  updateTask: (id: string, data: Partial<Task>) => void;
  deleteTask: (id: string) => void;

  // 状态流转
  promoteTask: (id: string) => void; // New -> Ready
  startScheduler: () => void; // Ready -> Running
  stopTask: (id: string) => void; // Running -> Ready
  completeTask: (id: string) => void; // Running -> Exit
  blockTask: (id: string, eventName: string) => void; // -> Blocked

  // Event
  resolveEvent: (eventId: string) => void;

  // 紧急
  activateEmergency: (taskId: string) => void;
  resolveEmergency: (taskId: string) => void;

  // 设置
  updateSettings: (data: Partial<AppSettings>) => void;

  // 防饥饿
  checkStarvation: () => void;
}
```

## 4. 核心业务约束

### 4.1 唯一 Running 约束

- `tasks` 数组中 `state === 'Running'` 的记录全局仅允许 1 条。
- `settings.currentRunningTaskId` 必须与该记录 `id` 一致。

### 4.2 紧急任务约束

- `tasks` 数组中 `isEmergency === true` 的记录全局仅允许 1 条。
- 该任务必须满足 `isExecutable === true`。
- 触发时需同步更新 `settings.activeEmergencyTaskId`。

### 4.3 Event 联动机制

- 任务变为 `Blocked` 时，必须在 `events` 数组创建或关联一条记录，并写入 `task.eventId`。
- 将 Event 标记为 `isResolved = true` 时，触发级联更新：所有关联该 `eventId` 且 `state === 'Blocked'` 的任务自动变为 `state = 'Ready'` 并清空 `eventId`。

### 4.4 防饥饿机制

- 定期检查 `state === 'Ready'` 的任务：
  - `deadline` 在未来 24 小时内且 `priority > 1` → `priority -= 1`
  - `lastRunningAt` 距今超过 3 天且 `priority > 1` → `priority -= 1`

### 4.5 Ready 队列容量

- Ready 队列任务数 = `tasks.filter(t => t.state === 'Ready').length`。
- 提入任务时若 `>= settings.readyQueueLimit`，拒绝操作并提示用户。

## 5. Zustand 持久化配置

```typescript
import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // ... store implementation
    }),
    {
      name: "process-todo-storage", // localStorage key
      version: 1, // 数据迁移版本号
    },
  ),
);
```

## 6. 未来扩展：映射到关系型数据库

若将来引入后端，字段名映射规则为 `camelCase → snake_case`：

| 前端 (TS)           | 后端 API / DB          |
| ------------------- | ---------------------- |
| `isExecutable`      | `is_executable`        |
| `isHighContextCost` | `is_high_context_cost` |
| `eventId`           | `event_id`             |
| `lastRunningAt`     | `last_running_at`      |
| `createdAt`         | `created_at`           |
| `updatedAt`         | `updated_at`           |

后端 API 规范见 `API_Contract.md`（未来参考）。
