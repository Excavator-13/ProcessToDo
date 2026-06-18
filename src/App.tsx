import { useState, useCallback } from "react";
import { useAppStore } from "./store/useAppStore";
import KanbanColumn from "./components/KanbanColumn";
import TaskCard from "./components/TaskCard";
import CreateTaskModal from "./components/CreateTaskModal";
import BlockTaskModal from "./components/BlockTaskModal";
import ReadyQueue from "./components/ReadyQueue";
import RunningPanel from "./components/RunningPanel";
import EventPanel from "./components/EventPanel";
import SettingsModal from "./components/SettingsModal";
import TimeSliceModal from "./components/TimeSliceModal";
import Toast from "./components/Toast";
import { useToast } from "./hooks/useToast";
import { useTimeSlice } from "./hooks/useTimeSlice";
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
  const settings = useAppStore((s) => s.settings);
  const promoteTask = useAppStore((s) => s.promoteTask);
  const startScheduler = useAppStore((s) => s.startScheduler);
  const stopTask = useAppStore((s) => s.stopTask);
  const completeTask = useAppStore((s) => s.completeTask);
  const blockTask = useAppStore((s) => s.blockTask);
  const resolveEvent = useAppStore((s) => s.resolveEvent);
  const activateEmergency = useAppStore((s) => s.activateEmergency);
  const resolveEmergency = useAppStore((s) => s.resolveEmergency);
  const switchTask = useAppStore((s) => s.switchTask);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [blockTarget, setBlockTarget] = useState<{
    taskId: string;
    taskTitle: string;
  } | null>(null);
  const { toasts, showToast, removeToast } = useToast();
  const { isExpired, reset } = useTimeSlice();

  const showTimeSliceModal =
    isExpired &&
    settings.runningMode === "timeSlicing" &&
    settings.currentRunningTaskId !== null;

  const currentRunningTask = settings.currentRunningTaskId
    ? (tasks.find((t) => t.id === settings.currentRunningTaskId) ?? null)
    : null;

  const recommendedTask =
    tasks
      .filter((t) => t.state === "Ready")
      .sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        return (
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      })[0] ?? null;

  const handlePromote = useCallback(
    (id: string) => {
      try {
        promoteTask(id);
        showToast("Task promoted to Ready", "success");
      } catch (err) {
        showToast(
          err instanceof Error ? err.message : "Failed to promote task",
          "error",
        );
      }
    },
    [promoteTask, showToast],
  );

  const handleStartScheduler = useCallback(() => {
    try {
      startScheduler();
      showToast("Scheduler started", "success");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to start scheduler",
        "error",
      );
    }
  }, [startScheduler, showToast]);

  const handleStop = useCallback(
    (id: string) => {
      try {
        stopTask(id);
        showToast("Task stopped, returned to Ready", "info");
      } catch (err) {
        showToast(
          err instanceof Error ? err.message : "Failed to stop task",
          "error",
        );
      }
    },
    [stopTask, showToast],
  );

  const handleComplete = useCallback(
    (id: string) => {
      try {
        completeTask(id);
        showToast("Task completed! 🎉", "success");
      } catch (err) {
        showToast(
          err instanceof Error ? err.message : "Failed to complete task",
          "error",
        );
      }
    },
    [completeTask, showToast],
  );

  const handleBlock = useCallback(
    (id: string) => {
      const task = tasks.find((t) => t.id === id);
      if (!task) return;
      setBlockTarget({ taskId: task.id, taskTitle: task.title });
    },
    [tasks],
  );

  const handleBlocked = useCallback(
    (id: string, eventName: string) => {
      try {
        blockTask(id, eventName);
        showToast("Task blocked", "info");
      } catch (err) {
        showToast(
          err instanceof Error ? err.message : "Failed to block task",
          "error",
        );
      }
    },
    [blockTask, showToast],
  );

  const handleResolveEvent = useCallback(
    (eventId: string) => {
      try {
        const { tasks: currentTasks } = useAppStore.getState();
        const blockedCount = currentTasks.filter(
          (t) => t.eventId === eventId && t.state === "Blocked",
        ).length;
        resolveEvent(eventId);
        showToast(
          `Event resolved, ${blockedCount} task(s) restored to Ready`,
          "success",
        );
      } catch (err) {
        showToast(
          err instanceof Error ? err.message : "Failed to resolve event",
          "error",
        );
      }
    },
    [resolveEvent, showToast],
  );

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

  const handleResolveEmergency = useCallback(
    (id: string) => {
      try {
        const { tasks: currentTasks, events } = useAppStore.getState();
        const emergencyEvent = events.find(
          (e) => e.name === "emergency" && e.isSystemGenerated && !e.isResolved,
        );
        const blockedCount = emergencyEvent
          ? currentTasks.filter(
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
    reset();
  }, [currentRunningTask, recommendedTask, switchTask, showToast, reset]);

  const handleContinueTask = useCallback(() => {
    showToast("继续运行，倒计时重置", "info");
    reset();
  }, [showToast, reset]);

  const renderColumnContent = (state: TaskState) => {
    const columnTasks = tasks.filter((t) => t.state === state);

    switch (state) {
      case "New":
        return (
          <>
            <button
              onClick={() => setShowCreateModal(true)}
              className="w-full py-3 rounded-lg border-2 border-dashed border-neon-cyan/30 text-neon-cyan/60 font-mono text-sm hover:border-neon-cyan/60 hover:text-neon-cyan hover:bg-neon-cyan/5 hover:shadow-neon-cyan transition-all"
            >
              + 新建任务
            </button>
            {columnTasks.length === 0 ? (
              <div className="flex items-center justify-center h-24 text-text-muted/40 font-mono text-xs">
                暂无任务
              </div>
            ) : (
              columnTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onPromote={handlePromote}
                  onActivateEmergency={handleActivateEmergency}
                />
              ))
            )}
          </>
        );

      case "Ready":
        return (
          <ReadyQueue
            onPromote={handlePromote}
            onBlock={handleBlock}
            onActivateEmergency={handleActivateEmergency}
          />
        );

      case "Running":
        return (
          <RunningPanel
            onPromote={handlePromote}
            onStart={handleStartScheduler}
            onStop={handleStop}
            onComplete={handleComplete}
            onBlock={handleBlock}
            onResolveEmergency={handleResolveEmergency}
          />
        );

      case "Blocked":
        return (
          <>
            <EventPanel onResolveEvent={handleResolveEvent} />
            {columnTasks.length === 0 ? (
              <div className="flex items-center justify-center h-24 text-text-muted/40 font-mono text-xs">
                暂无阻塞
              </div>
            ) : (
              columnTasks.map((task) => <TaskCard key={task.id} task={task} />)
            )}
          </>
        );

      case "Exit":
        return columnTasks.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-text-muted/40 font-mono text-xs">
            暂无完成
          </div>
        ) : (
          columnTasks.map((task) => (
            <div key={task.id} className="animate-fade-up">
              <TaskCard task={task} />
            </div>
          ))
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {settings.activeEmergencyTaskId && (
        <div className="bg-neon-red/15 border-b border-neon-red/40 animate-pulse">
          <div className="max-w-[1920px] mx-auto px-4 py-1.5 flex items-center justify-center gap-2">
            <span className="text-sm">🚨</span>
            <span className="font-mono text-xs font-bold text-neon-red tracking-wider">
              紧急模式 —{" "}
              {tasks.find((t) => t.id === settings.activeEmergencyTaskId)
                ?.title ?? "未知任务"}{" "}
              运行中
            </span>
          </div>
        </div>
      )}
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
            <span className="font-mono text-[10px] text-text-muted/60">
              {settings.runningMode === "free"
                ? "自由模式"
                : `时间片 ${settings.timeSliceDuration}min`}
            </span>
            <span className="font-mono text-xs text-text-muted">
              Tasks: <span className="text-neon-cyan">{tasks.length}</span>
            </span>
            <button
              onClick={() => setShowSettingsModal(true)}
              className="font-mono text-sm text-text-muted hover:text-neon-cyan transition-colors"
              title="系统设置"
            >
              ⚙
            </button>
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
                {renderColumnContent(col.state)}
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

      <CreateTaskModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />

      <BlockTaskModal
        open={blockTarget !== null}
        onClose={() => setBlockTarget(null)}
        taskId={blockTarget?.taskId ?? null}
        taskTitle={blockTarget?.taskTitle ?? ""}
        onBlocked={handleBlocked}
      />

      <SettingsModal
        open={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />

      <TimeSliceModal
        open={showTimeSliceModal}
        currentTask={currentRunningTask}
        recommendedTask={recommendedTask}
        onSwitch={handleSwitchTask}
        onContinue={handleContinueTask}
      />

      <Toast toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
