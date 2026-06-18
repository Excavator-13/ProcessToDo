# API_Contract.md: 后端 API 接口设计（未来参考）

> ⚠️ **注意**: MVP 阶段为纯前端 SPA，无后端。本文档作为未来引入后端时的 API 设计参考。
> 当前所有数据操作通过 Zustand store + LocalStorage 完成，详见 `Database_Schema.md`。

## 1. 通用约定

### 1.1 基础路径

所有 API 路径前缀为 `/api/v1`

### 1.2 响应格式

统一采用 JSON 格式响应，结构如下：

```json
{
  "code": 200,
  "message": "success",
  "data": {}
}
```

### 1.3 字段命名

API 层使用 `snake_case`（与前端 TypeScript `camelCase` 的映射见 `Database_Schema.md` 第6节）。

### 1.4 通用错误码

| 状态码 | 含义                                                   |
| ------ | ------------------------------------------------------ |
| `400`  | 参数校验失败                                           |
| `404`  | 资源不存在                                             |
| `409`  | 状态冲突（如 Ready 队列已满、已有任务处于 Running 等） |

---

## 2. 任务管理 API

### 2.1 创建任务

- **Method**: `POST /tasks`
- **Description**: 创建任务，初始状态为 `New`。
- **Request Body**:
  ```json
  {
    "title": "撰写产品需求文档",
    "description": "完成V1.0版本的PRD",
    "is_executable": true,
    "priority": 2,
    "deadline": "2023-11-01T10:00:00Z",
    "is_high_context_cost": true
  }
  ```
- **Response Data**: 返回创建成功的 Task 对象。

### 2.2 获取任务列表

- **Method**: `GET /tasks`
- **Query Parameters**:
  - `state` (可选): 过滤任务状态 (`New`, `Ready`, `Blocked`, `Running`, `Exit`)
  - `priority` (可选): 过滤优先级 (`1`, `2`, `3`)
- **Response Data**: Task 数组。

### 2.3 更新任务信息

- **Method**: `PATCH /tasks/{task_id}`
- **Description**: 更新任务的元数据（标题、描述、优先级、截止时间等），不允许通过此接口直接修改 `state`。
- **Request Body**: 需要更新的字段（部分更新）。
  ```json
  {
    "title": "修改后的标题",
    "priority": 1
  }
  ```
- **Response Data**: 更新后的 Task 对象。

---

## 3. 任务状态流转 API

> 状态流转涉及复杂业务校验，独立设计为动作型 API。

### 3.1 提入就绪队列

- **Method**: `POST /tasks/{task_id}/promote`
- **Description**: 将 `New` 状态的可执行任务移入 `Ready` 队列。
- **Business Logic**: 若 Ready 队列已满，返回 `409 Conflict`。
- **Response Data**: 更新后的 Task 对象。

### 3.2 启动调度器

- **Method**: `POST /scheduler/start`
- **Description**: 调度最高优先级队列的队首任务进入 `Running` 状态。
- **Business Logic**: 若当前已有 `Running` 任务，返回 `409 Conflict`。
- **Response Data**: 进入 `Running` 状态的 Task 对象。

### 3.3 停止运行

- **Method**: `POST /tasks/{task_id}/stop`
- **Description**: 停止当前 `Running` 状态的任务，回到 Ready 队列队尾。
- **Response Data**: 更新后的 Task 对象。

### 3.4 完成任务

- **Method**: `POST /tasks/{task_id}/complete`
- **Description**: 标记当前任务为 `Exit` 状态。
- **Business Logic**: 清空 `current_running_task_id`。
- **Response Data**: 更新后的 Task 对象。

### 3.5 阻塞任务

- **Method**: `POST /tasks/{task_id}/block`
- **Description**: 将 `Running` 或 `Ready` 任务置为 `Blocked`。
- **Request Body**:
  ```json
  {
    "event_name": "等待UI设计稿确认"
  }
  ```
- **Business Logic**: 自动创建一条 `Event` 记录并关联。
- **Response Data**: 更新后的 Task 对象。

### 3.6 触发紧急任务

- **Method**: `POST /tasks/{task_id}/activate-emergency`
- **Description**: 将指定的可执行任务标记为紧急，并触发紧急调度。
- **Business Logic**:
  1. 校验该任务 `is_emergency` 全局唯一。
  2. 将 Ready 队列所有任务移入 Blocked，自动生成 Event (`emergency`)。
  3. 将该紧急任务直接置为 `Running`。
- **Response Data**: 更新后的 Task 对象及系统状态。

### 3.7 解除紧急状态

- **Method**: `POST /tasks/{task_id}/resolve-emergency`
- **Description**: 紧急任务完成后，自动恢复现场。
- **Business Logic**:
  1. 将该任务置为 `Exit`。
  2. 查找由 `emergency` 事件导致 Blocked 的任务，将其恢复为 `Ready`。
  3. 标记 `emergency` Event 为已解决。
- **Response Data**: 恢复的任务列表及当前系统状态。

---

## 4. 事件管理 API

### 4.1 获取事件列表

- **Method**: `GET /events`
- **Query Parameters**: `is_resolved` (可选，布尔值，过滤未解决/已解决事件)
- **Response Data**: Event 数组。

### 4.2 解决事件

- **Method**: `POST /events/{event_id}/resolve`
- **Description**: 确认阻塞事件已解除。
- **Business Logic**: 自动将所有因该 Event 处于 `Blocked` 状态的任务恢复为 `Ready`。
- **Response Data**: 恢复的 Task 数组。

---

## 5. 系统设置 API

### 5.1 获取系统设置

- **Method**: `GET /settings`
- **Response Data**:
  ```json
  {
    "running_mode": "time_slicing",
    "ready_queue_limit": 9,
    "time_slice_duration": 25,
    "current_running_task_id": "uuid-xxxx",
    "active_emergency_task_id": null
  }
  ```

### 5.2 更新系统设置

- **Method**: `PATCH /settings`
- **Request Body**: 需要更新的设置项（部分更新）。
  ```json
  {
    "running_mode": "free"
  }
  ```
- **Response Data**: 更新后的完整 Settings 对象。

---

## 6. 调度辅助 API（仅时间片轮转模式）

### 6.1 获取下一个推荐任务

- **Method**: `GET /scheduler/next-recommendation`
- **Description**: 在时间片轮转模式下，当前任务时间片结束时调用。获取系统推荐的下一个最高优先级任务。
- **Business Logic**: 读取 Ready 队列最高优先级队首任务。不改变任何任务状态，仅作推荐展示。
- **Response Data**:
  ```json
  {
    "recommended_task": {
      "id": "uuid-yyyy",
      "title": "下一个任务"
    },
    "current_task_high_context_cost": true
  }
  ```
