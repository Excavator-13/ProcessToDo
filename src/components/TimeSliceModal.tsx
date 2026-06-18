import { useEffect } from "react";
import type { Task, Priority } from "../types";
import { playAlertSound } from "../utils/audio";

interface TimeSliceModalProps {
  open: boolean;
  currentTask: Task | null;
  recommendedTask: Task | null;
  onSwitch: () => void;
  onContinue: () => void;
}

const priorityLabel: Record<Priority, string> = {
  1: "P1:高",
  2: "P2:中",
  3: "P3:低",
};

const priorityColor: Record<Priority, string> = {
  1: "text-neon-red",
  2: "text-neon-yellow",
  3: "text-neon-blue",
};

export default function TimeSliceModal({
  open,
  currentTask,
  recommendedTask,
  onSwitch,
  onContinue,
}: TimeSliceModalProps) {
  const isHighContextCost = currentTask?.isHighContextCost ?? false;

  useEffect(() => {
    if (open) {
      playAlertSound();
    }
  }, [open]);

  if (!open || !currentTask) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 bg-bg-secondary rounded-xl border border-neon-yellow/40 shadow-neon-yellow p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">⏱</span>
          <h2 className="font-mono font-bold text-lg text-neon-yellow tracking-wider">
            时间片到期
          </h2>
        </div>

        <div className="mb-4 p-3 rounded-lg bg-bg-primary/60 border border-border-glow">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-[10px] text-neon-red/70 uppercase tracking-wider">
              当前任务
            </span>
            {currentTask.isHighContextCost && (
              <span className="font-mono text-[9px] px-1.5 py-0.5 rounded border bg-neon-yellow/10 text-neon-yellow border-neon-yellow/30">
                CTX
              </span>
            )}
          </div>
          <div className="font-sans font-medium text-sm text-text-primary">
            {currentTask.title}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`font-mono text-[10px] ${priorityColor[currentTask.priority]}`}
            >
              {priorityLabel[currentTask.priority]}
            </span>
          </div>
        </div>

        {isHighContextCost ? (
          <div className="mb-5 p-3 rounded-lg bg-neon-yellow/10 border border-neon-yellow/30">
            <p className="font-mono text-xs text-neon-yellow leading-relaxed">
              ⚠️ 该任务需要深度思考，是否继续？
            </p>
          </div>
        ) : (
          <>
            {recommendedTask && (
              <div className="mb-4">
                <span className="font-mono text-[10px] text-neon-green/70 uppercase tracking-wider">
                  推荐切换至
                </span>
                <div className="mt-1.5 p-3 rounded-lg bg-neon-green/5 border border-neon-green/30">
                  <div className="font-sans font-medium text-sm text-text-primary">
                    {recommendedTask.title}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`font-mono text-[10px] ${priorityColor[recommendedTask.priority]}`}
                    >
                      {priorityLabel[recommendedTask.priority]}
                    </span>
                    {recommendedTask.isHighContextCost && (
                      <span className="font-mono text-[9px] px-1.5 py-0.5 rounded border bg-neon-yellow/10 text-neon-yellow border-neon-yellow/30">
                        CTX
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
            {!recommendedTask && (
              <div className="mb-4 p-3 rounded-lg bg-bg-primary/60 border border-border-glow">
                <p className="font-mono text-xs text-text-muted">
                  Ready 队列为空，无推荐任务
                </p>
              </div>
            )}
          </>
        )}

        <div className="flex gap-3">
          {isHighContextCost ? (
            <>
              <button
                onClick={onContinue}
                className="flex-[1.4] px-4 py-2.5 rounded-lg border border-neon-cyan/50 bg-neon-cyan/15 font-mono text-sm text-neon-cyan hover:bg-neon-cyan/25 hover:shadow-neon-cyan transition-all font-semibold"
              >
                继续运行
              </button>
              <button
                onClick={onSwitch}
                disabled={!recommendedTask}
                className="flex-1 px-4 py-2.5 rounded-lg border border-neon-yellow/40 bg-neon-yellow/10 font-mono text-xs text-neon-yellow hover:bg-neon-yellow/20 hover:shadow-neon-yellow transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-neon-yellow/10 disabled:hover:shadow-none"
              >
                切换任务
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onSwitch}
                disabled={!recommendedTask}
                className="flex-[1.4] px-4 py-2.5 rounded-lg border border-neon-green/50 bg-neon-green/15 font-mono text-sm text-neon-green hover:bg-neon-green/25 hover:shadow-neon-green transition-all font-semibold disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-neon-green/15 disabled:hover:shadow-none"
              >
                切换任务
              </button>
              <button
                onClick={onContinue}
                className="flex-1 px-4 py-2.5 rounded-lg border border-neon-yellow/40 bg-neon-yellow/10 font-mono text-xs text-neon-yellow hover:bg-neon-yellow/20 hover:shadow-neon-yellow transition-all"
              >
                不切换
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
