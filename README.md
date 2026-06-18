# ProcessToDo — 进程调度式任务管理

将操作系统进程调度概念融入日常任务管理，让任务具备五种状态与优先级调度机制，以看板形式直观呈现。

## 核心概念

把每个任务视为一个"进程"，拥有五种状态：

```
                    ┌──────────┐
                    │   New    │  孵化池（想法收集）
                    └────┬─────┘
                         │ 提入就绪（需可执行且队列未满）
                         ▼
┌──────────┐      ┌──────────┐      ┌──────────┐
│ Blocked  │◄─────│  Ready   │─────►│ Running  │
│ 阻塞等待 │ 阻塞 │ 就绪队列  │ 调度 │ 运行中   │
└────┬─────┘      └──────────┘      └────┬─────┘
     │ 事件解决              停止/完成 │
     ▼                                ▼
┌──────────┐                   ┌──────────┐
│  Ready   │                   │   Exit   │ 终止完成
└──────────┘                   └──────────┘
```

- **New（孵化池）**：创建任务默认状态，不可执行的任务停留于此，仅作想法收集
- **Ready（就绪队列）**：三个优先级子队列（高/中/低），总量上限默认 9，队首优先调度
- **Running（运行中）**：全局唯一，当前正在执行的任务
- **Blocked（阻塞等待）**：因外部依赖阻塞，需关联一个事件（Event），事件解决后自动恢复
- **Exit（终止完成）**：任务终态，触发庆祝动画

## 功能特性

- **优先级调度**：三级优先级队列（高/中/低），自动选取最高优先级队首任务运行
- **紧急任务机制**：全局仅允许一个紧急任务，触发时暂停就绪队列，完成后自动恢复现场
- **双运行模式**：
  - 自由模式：任务持续运行，手动停止或完成
  - 时间片轮转模式：倒计时到期后弹窗推荐切换，支持高上下文开销任务保护
- **防饥饿自动提权**：截止时间临期或长期未运行的任务自动提升优先级
- **事件驱动阻塞**：任务因外部依赖阻塞，关联事件解决后自动恢复到就绪队列
- **数据持久化**：LocalStorage 持久化，刷新页面数据不丢失
- **暗色科技感 UI**：响应式看板布局，操作系统调度风格

## 技术栈

| 层面     | 选型                       | 说明                  |
| -------- | -------------------------- | --------------------- |
| 前端框架 | React 19                   | 函数组件 + Hooks      |
| 类型系统 | TypeScript（strict）       | 全量类型覆盖          |
| 构建工具 | Vite 8                     | 快速 HMR              |
| 样式方案 | TailwindCSS 3              | 暗色科技感主题        |
| 状态管理 | Zustand 5 + persist 中间件 | 持久化至 LocalStorage |
| 数据存储 | LocalStorage               | 纯前端 SPA，无后端    |

## 项目结构

```
src/
├── components/          # UI 组件
│   ├── KanbanColumn.tsx     # 看板列容器
│   ├── TaskCard.tsx         # 任务卡片
│   ├── ReadyQueue.tsx       # 就绪队列（三级优先级）
│   ├── RunningPanel.tsx     # 运行中面板
│   ├── EventPanel.tsx       # 事件管理面板
│   ├── CreateTaskModal.tsx  # 创建任务弹窗
│   ├── BlockTaskModal.tsx   # 阻塞任务弹窗
│   ├── TimeSliceModal.tsx   # 时间片切换弹窗
│   ├── SettingsModal.tsx    # 系统设置弹窗
│   ├── CelebrationEffect.tsx # 完成庆祝特效
│   └── Toast.tsx            # 消息提示
├── store/
│   └── useAppStore.ts       # Zustand 全局状态
├── hooks/
│   ├── useTimeSlice.ts      # 时间片倒计时
│   ├── useStarvationCheck.ts # 防饥饿检查
│   └── useToast.ts          # 消息提示逻辑
├── types/
│   ├── task.ts              # 类型定义
│   └── index.ts             # 类型导出
├── utils/
│   └── audio.ts             # 音频工具
├── App.tsx                   # 主应用组件
├── main.tsx                  # 入口文件
└── index.css                 # 全局样式
```

## 快速开始

### 环境要求

- Node.js 18+
- npm 或其他包管理器

### 安装与运行

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview

# 代码检查
npm run lint
```

## 状态流转规则

| 流转                    | 触发方式           | 条件/约束                             |
| ----------------------- | ------------------ | ------------------------------------- |
| New → Ready             | 手动"提入就绪"     | `isExecutable=true`，Ready 队列未满   |
| Ready → Running         | 手动"启动调度器"   | 当前无 Running 任务，取最高优先级队首 |
| Running → Ready         | 手动"停止"         | 任务回到原优先级队列队尾              |
| Running → Exit          | 手动"标记完成"     | 清空 `currentRunningTaskId`           |
| Running/Ready → Blocked | 手动"阻塞"         | 创建/关联事件                         |
| Blocked → Ready         | 事件被标记"已解决" | 系统自动恢复（需检查队列容量）        |
| 紧急任务 → Running      | 手动"设为紧急"     | 全局仅一个，暂停就绪队列              |
| 紧急任务 → Exit         | 手动"完成紧急"     | 自动恢复因紧急阻塞的任务              |

## 防饥饿机制

定期检查就绪队列中的任务，满足以下条件时自动提升一级优先级：

- **截止时间临期**：`deadline` 在未来 24 小时内且优先级非最高
- **长期未运行**：距今超过 3 天未进入 Running 且优先级非最高

## 数据模型

### Task（任务）

| 字段                | 类型             | 说明                              |
| ------------------- | ---------------- | --------------------------------- |
| `id`                | `string` (UUID)  | 唯一标识符                        |
| `title`             | `string`         | 任务名称                          |
| `description`       | `string`         | 任务描述                          |
| `state`             | `TaskState`      | 五态之一                          |
| `isExecutable`      | `boolean`        | 是否可执行，决定是否参与调度      |
| `priority`          | `1 \| 2 \| 3`    | 优先级：1=高, 2=中, 3=低          |
| `isEmergency`       | `boolean`        | 是否紧急，全局仅允许一个          |
| `deadline`          | `string \| null` | 截止时间（ISO 8601）              |
| `isHighContextCost` | `boolean`        | 是否高切换开销（深度思考/写作等） |
| `eventId`           | `string \| null` | 关联的阻塞事件 ID                 |
| `lastRunningAt`     | `string \| null` | 最后运行时间，用于防饥饿          |

### Event（事件）

| 字段                | 类型      | 说明                       |
| ------------------- | --------- | -------------------------- |
| `id`                | `string`  | 唯一标识符                 |
| `name`              | `string`  | 事件名称                   |
| `isSystemGenerated` | `boolean` | 是否系统生成（如紧急事件） |
| `isResolved`        | `boolean` | 是否已解决                 |

### AppSettings（系统设置）

| 字段                | 类型                      | 默认值   | 说明               |
| ------------------- | ------------------------- | -------- | ------------------ |
| `runningMode`       | `"free" \| "timeSlicing"` | `"free"` | 调度模式           |
| `readyQueueLimit`   | `number`                  | `9`      | 就绪队列上限       |
| `timeSliceDuration` | `number`                  | `25`     | 时间片长度（分钟） |

## 许可证

私有项目
