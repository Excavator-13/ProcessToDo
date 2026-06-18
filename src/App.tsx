import { useAppStore } from "./store/useAppStore";
import KanbanColumn from "./components/KanbanColumn";
import TaskCard from "./components/TaskCard";
import type { TaskState } from "./types";

const columns: {
  title: string;
  icon: string;
  state: TaskState;
  accentColor: string;
}[] = [
  { title: "New · 孵化池", icon: "🥚", state: "New", accentColor: "cyan" },
  {
    title: "Ready · 就绪队列",
    icon: "⏳",
    state: "Ready",
    accentColor: "green",
  },
  {
    title: "Blocked · 阻塞等待",
    icon: "🚧",
    state: "Blocked",
    accentColor: "yellow",
  },
  {
    title: "Running · 运行中",
    icon: "⚡",
    state: "Running",
    accentColor: "red",
  },
  { title: "Exit · 终止完成", icon: "✅", state: "Exit", accentColor: "blue" },
];

export default function App() {
  const tasks = useAppStore((s) => s.tasks);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border-glow bg-bg-secondary/60 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-[1920px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🖥️</span>
            <div>
              <h1 className="font-mono font-bold text-lg tracking-tight text-neon-cyan">
                ProcessToDo
              </h1>
              <p className="font-mono text-[10px] text-text-muted tracking-widest uppercase">
                进程调度式任务管理
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-text-muted">
              Tasks: <span className="text-neon-cyan">{tasks.length}</span>
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1920px] w-full mx-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {columns.map((col) => {
            const columnTasks = tasks.filter((t) => t.state === col.state);
            return (
              <KanbanColumn
                key={col.state}
                title={col.title}
                icon={col.icon}
                state={col.state}
                accentColor={col.accentColor}
                count={columnTasks.length}
              >
                {columnTasks.length === 0 ? (
                  <div className="flex items-center justify-center h-24 text-text-muted/40 font-mono text-xs">
                    暂无任务
                  </div>
                ) : (
                  columnTasks.map((task) => (
                    <TaskCard key={task.id} task={task} />
                  ))
                )}
              </KanbanColumn>
            );
          })}
        </div>
      </main>

      <footer className="border-t border-border-glow bg-bg-secondary/40 py-2">
        <p className="text-center font-mono text-[10px] text-text-muted/50">
          ProcessToDo v0.1.0 · OS-Inspired Task Scheduler
        </p>
      </footer>
    </div>
  );
}
