import { useState } from "react";
import { useAppStore } from "../store/useAppStore";
import TaskCard from "./TaskCard";

interface RunningPanelProps {
  onPromote?: (id: string) => void;
  onStart: () => void;
  onStop: (id: string) => void;
  onComplete: (id: string) => void;
}

export default function RunningPanel({
  onPromote,
  onStart,
  onStop,
  onComplete,
}: RunningPanelProps) {
  const tasks = useAppStore((s) => s.tasks);
  const settings = useAppStore((s) => s.settings);

  const [showCelebration, setShowCelebration] = useState(false);

  const runningTask = settings.currentRunningTaskId
    ? tasks.find((t) => t.id === settings.currentRunningTaskId)
    : null;

  const readyCount = tasks.filter((t) => t.state === "Ready").length;

  const handleStop = () => {
    if (!runningTask) return;
    onStop(runningTask.id);
  };

  const handleComplete = () => {
    if (!runningTask) return;
    onComplete(runningTask.id);
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 1500);
  };

  if (runningTask) {
    return (
      <div className="space-y-3">
        <div className="animate-pulse-glow rounded-lg border border-neon-red/40 bg-neon-red/5 p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-red opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-neon-red" />
            </span>
            <span className="font-mono text-[10px] text-neon-red tracking-widest uppercase">
              Running
            </span>
          </div>
          <TaskCard task={runningTask} onPromote={onPromote} />
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleStop}
            className="flex-1 py-2 rounded-lg font-mono text-xs border border-neon-yellow/40 bg-neon-yellow/10 text-neon-yellow hover:bg-neon-yellow/20 hover:shadow-neon-yellow transition-all"
          >
            ⏸ 停止
          </button>
          <button
            onClick={handleComplete}
            className="flex-1 py-2 rounded-lg font-mono text-xs border border-neon-green/40 bg-neon-green/10 text-neon-green hover:bg-neon-green/20 hover:shadow-neon-green transition-all"
          >
            ✓ 完成
          </button>
        </div>

        {showCelebration && (
          <div className="text-center py-3 animate-celebrate">
            <span className="font-mono text-lg text-neon-green">
              🎉 Task Completed!
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        onClick={onStart}
        disabled={readyCount === 0}
        className="w-full py-4 rounded-lg font-mono text-sm border border-neon-red/40 bg-neon-red/10 text-neon-red hover:bg-neon-red/20 hover:shadow-neon-red transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-neon-red/10 disabled:hover:shadow-none"
      >
        ⚡ 启动调度器
      </button>
      {readyCount === 0 && (
        <p className="text-center font-mono text-[10px] text-text-muted/50">
          无就绪任务
        </p>
      )}
      {readyCount > 0 && (
        <p className="text-center font-mono text-[10px] text-text-muted/50">
          {readyCount} 个任务等待调度
        </p>
      )}
    </div>
  );
}
