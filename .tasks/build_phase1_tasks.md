# Phase 1: 项目初始化与基础布局 — 开发任务清单

## 1.0 前置检查

- [x] 1.0.1 确认 Node.js >= 18 已安装（`node -v`）✅ v24.14.0
- [x] 1.0.2 确认 npm 可用（`npm -v`）✅ v11.9.0
- [x] 1.0.3 确认当前目录为 `/Users/watuji/MyGitDev/ProcessToDo`

---

## 1.1 Vite 项目初始化

- [x] 1.1.1 在项目根目录执行 `npm create vite@latest . -- --template react-ts`（注意：目录非空，Vite 会提示覆盖，需确认）
- [x] 1.1.2 执行 `npm install` 安装基础依赖
- [x] 1.1.3 执行 `npm run dev` 验证项目可正常启动，浏览器可访问默认页面
- [x] 1.1.4 清理 Vite 模板默认文件：删除 `src/App.css`、`src/index.css` 中的默认样式，清空 `src/App.tsx` 内容

---

## 1.2 TailwindCSS 安装与配置

- [x] 1.2.1 安装 TailwindCSS 及其依赖：`npm install -D tailwindcss@3 postcss autoprefixer`
- [x] 1.2.2 生成配置文件：`npx tailwindcss init -p`（生成 `tailwind.config.js` 和 `postcss.config.js`）
- [x] 1.2.3 配置 `tailwind.config.js`：
  - `content` 指向 `./index.html`、`./src/**/*.{js,ts,jsx,tsx}`
  - 启用 `darkMode: 'class'`
  - 在 `theme.extend.colors` 中定义科技感主题色：
    - `bg-primary`: `#0a0e17`（深色背景）
    - `bg-secondary`: `#111827`（卡片/列背景）
    - `neon-cyan`: `#00f0ff`（霓虹青，主强调色）
    - `neon-green`: `#39ff14`（霓虹绿，Ready/成功）
    - `neon-red`: `#ff073a`（霓虹红，紧急/高优先级）
    - `neon-yellow`: `#ffd600`（霓虹黄，中优先级）
    - `neon-blue`: `#4d7cff`（霓虹蓝，低优先级）
    - `text-primary`: `#e0e6ed`（主文字）
    - `text-muted`: `#6b7b8d`（次要文字）
    - `border-glow`: `#1e293b`（边框色）
- [x] 1.2.4 在 `src/index.css` 中添加 Tailwind 指令：
  ```css
  @tailwind base;
  @tailwind components;
  @tailwind utilities;
  ```
- [x] 1.2.5 验证 Tailwind 生效：在 `App.tsx` 中临时添加一个带 Tailwind 类的元素，确认样式应用

---

## 1.3 Zustand 安装与 Store 创建

- [x] 1.3.1 安装 Zustand：`npm install zustand`
- [x] 1.3.2 创建目录 `src/store/`
- [x] 1.3.3 创建 `src/types/index.ts`，定义所有 TypeScript 类型：
  - `TaskState`、`Priority`、`RunningMode` 类型别名
  - `Task`、`AppEvent`（避免与全局 `Event` 冲突）、`AppSettings` 接口
  - `CreateTaskInput` 辅助类型（创建任务时的输入参数）
  - `AppStore` 接口（含所有 action 签名，Phase 1 先定义签名，实现留空或 throw）
- [x] 1.3.4 创建 `src/store/useAppStore.ts`：
  - 导入类型
  - 使用 `create` + `persist` 中间件创建 store
  - 初始状态：`tasks: []`、`events: []`、`settings`（默认值见 `Database_Schema.md` 2.3 节）
  - localStorage key 为 `"process-todo-storage"`，version 为 `1`
  - 所有 action 方法先定义签名，方法体暂为空实现（`() => {}`）或返回 `void`
- [x] 1.3.5 验证 Store 可用：在 `App.tsx` 中 `useAppStore` 读取 `tasks.length`，确认无报错

---

## 1.4 主界面看板布局

- [x] 1.4.1 创建目录 `src/components/`
- [x] 1.4.2 创建 `src/components/KanbanColumn.tsx` 组件：
  - Props：`title`（列标题）、`state`（对应 TaskState）、`color`（强调色）
  - 渲染：列标题（带状态图标/emoji）、任务计数 badge、卡片容器区域
  - 样式：暗色半透明背景、顶部带强调色边线、圆角、最小高度
- [x] 1.4.3 创建 `src/components/TaskCard.tsx` 组件：
  - Props：`task: Task`
  - 渲染：任务标题、优先级标识、紧急标记（如有）、截止时间（如有）
  - 样式：暗色卡片、左边框按优先级着色、hover 发光效果
- [x] 1.4.4 重写 `src/App.tsx`：
  - 顶部 Header：应用标题 "ProcessToDo"、副标题 "进程调度式任务管理"
  - 主体区域：横向五列看板布局
    - 列顺序：New（孵化池）→ Ready（就绪队列）→ Blocked（阻塞/等待）→ Running（运行中）→ Exit（终止/完成）
    - 每列使用 `KanbanColumn` 组件
    - 每列内根据 `tasks` 筛选对应 `state` 的任务，渲染 `TaskCard`
  - Ready 列内部暂不拆分子列（Phase 3 实现），仅展示所有 Ready 任务
- [x] 1.4.5 在 `src/index.css` 中添加全局基础样式：
  - `body` 背景色为 `bg-primary`
  - 全局字体设为等宽/科技感字体栈
  - 自定义滚动条样式（暗色主题适配）

---

## 1.5 响应式与主题验证

- [x] 1.5.1 验证桌面端（≥1280px）：五列横向排列，每列等宽或按需分配
- [x] 1.5.2 验证平板端（768px-1279px）：五列可横向滚动，或折叠为两行布局
- [x] 1.5.3 验证移动端（<768px）：单列纵向堆叠，可上下滚动
- [x] 1.5.4 确认暗色科技感主题整体一致：深色背景 + 霓虹强调色 + 发光边框效果
- [x] 1.5.5 确认无 Tailwind 编译警告、无 TypeScript 类型错误（`npm run build` 通过）

---

## 交付物检查清单

| 检查项          | 预期结果                                        | 状态 |
| --------------- | ----------------------------------------------- | ---- |
| `npm run dev`   | 应用正常启动，无控制台报错                      | ✅   |
| `npm run build` | 构建成功，无 TS 错误                            | ✅   |
| 五列看板        | New / Ready / Blocked / Running / Exit 五列可见 | ✅   |
| 暗色主题        | 深色背景 + 霓虹色强调，科技感风格               | ✅   |
| 响应式          | 桌面/平板/移动端布局合理                        | ✅   |
| Zustand Store   | `useAppStore` 可导入，初始数据正确              | ✅   |
| LocalStorage    | 刷新后 store 数据持久化                         | ✅   |
| TaskCard        | 能正确渲染任务标题、优先级等基本信息            | ✅   |
