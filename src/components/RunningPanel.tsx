import { useState } from "react";
import { useAppStore } from "../store/useAppStore";
import TaskCard from "./TaskCard";

interface RunningPanelProps {
  onPromote?: (id: string) => void;
  onStart: () => void;
  onStop: (id: string) => void;
  onComplete: (id: string) => void;
  onBlock: (id: string) => void;
  onResolveEmergency: (id: string) => void;
}

export default function RunningPanel({
  onPromote,
  onStart,
  onStop,
  onComplete,
  onBlock,
  onResolveEmergency,
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

  const handleResolveEmergency = () => {
    if (!runningTask) return;
    onResolveEmergency(runningTask.id);
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 1500);
  };

  if (runningTask) {
    const isEmergency = runningTask.isEmergency;

    return (
      <div className="space-y-3">
        <div
          className={`animate-pulse-glow rounded-lg border ${isEmergency ? "border-neon-red/70 bg-neon-red/10" : "border-neon-red/40 bg-neon-red/5"} p-3`}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-red opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-neon-red" />
            </span>
            <span className="font-mono text-[10px] text-neon-red tracking-widest uppercase">
              Running
            </span>
            {isEmergency && (
              <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-neon-red/20 text-neon-red border border-neon-red/40 animate-pulse">
                🚨 EMERGENCY
              </span>
            )}
          </div>
          <TaskCard task={runningTask} onPromote={onPromote} />
        </div>

        {isEmergency ? (
          <>
            <div className="text-center py-1.5 rounded-lg bg-neon-red/5 border border-neon-red/20">
              <span className="font-mono text-[10px] text-neon-red/80">
                ⚠️ 紧急模式 — Ready 队列已暂停
              </span>
            </div>
            <button
              onClick={handleResolveEmergency}
              className="w-full py-3 rounded-lg font-mono text-sm font-bold border border-neon-red/60 bg-neon-red/15 text-neon-red hover:bg-neon-red/25 hover:shadow-neon-red transition-all animate-pulse"
            >
              🚨 完成紧急任务
            </button>
          </>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleStop}
              className="flex-1 py-2 rounded-lg font-mono text-xs border border-neon-yellow/40 bg-neon-yellow/10 text-neon-yellow hover:bg-neon-yellow/20 hover:shadow-neon-yellow transition-all"
            >
              ⏸ 停止
            </button>
            <button
              onClick={() => onBlock(runningTask.id)}
              className="flex-1 py-2 rounded-lg font-mono text-xs border border-neon-yellow/40 bg-neon-yellow/10 text-neon-yellow hover:bg-neon-yellow/20 hover:shadow-neon-yellow transition-all"
            >
              🚧 阻塞
            </button>
            <button
              onClick={handleComplete}
              className="flex-1 py-2 rounded-lg font-mono text-xs border border-neon-green/40 bg-neon-green/10 text-neon-green hover:bg-neon-green/20 hover:shadow-neon-green transition-all"
            >
              ✓ 完成
            </button>
          </div>
        )}

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
