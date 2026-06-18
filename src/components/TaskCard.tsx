import { useAppStore } from "../store/useAppStore";
import type { Task } from "../types";

interface TaskCardProps {
  task: Task;
  onPromote?: (id: string) => void;
  onBlock?: (id: string) => void;
  onActivateEmergency?: (id: string) => void;
  isQueueHead?: boolean;
}

const priorityConfig: Record<
  number,
  { label: string; color: string; border: string }
> = {
  1: {
    label: "高",
    color: "text-neon-red",
    border: "border-l-neon-red",
  },
  2: {
    label: "中",
    color: "text-neon-yellow",
    border: "border-l-neon-yellow",
  },
  3: {
    label: "低",
    color: "text-neon-blue",
    border: "border-l-neon-blue",
  },
};

const hoverShadowClass: Record<number, string> = {
  1: "hover:shadow-neon-red",
  2: "hover:shadow-neon-yellow",
  3: "hover:shadow-neon-blue",
};

export default function TaskCard({
  task,
  onPromote,
  onBlock,
  onActivateEmergency,
  isQueueHead,
}: TaskCardProps) {
  const events = useAppStore((s) => s.events);
  const activeEmergencyTaskId = useAppStore(
    (s) => s.settings.activeEmergencyTaskId,
  );
  const priority = priorityConfig[task.priority] ?? priorityConfig[3];
  const hoverShadow = hoverShadowClass[task.priority] ?? hoverShadowClass[3];

  const stateBadgeColor: Record<string, string> = {
    New: "bg-neon-cyan/10 text-neon-cyan border-neon-cyan/30",
    Ready: "bg-neon-green/10 text-neon-green border-neon-green/30",
    Blocked: "bg-neon-yellow/10 text-neon-yellow border-neon-yellow/30",
    Running: "bg-neon-red/10 text-neon-red border-neon-red/30",
    Exit: "bg-neon-blue/10 text-neon-blue border-neon-blue/30",
  };

  const queueHeadGlow = isQueueHead
    ? "ring-1 ring-neon-green/40 shadow-neon-green"
    : "";

  return (
    <div
      className={`group relative bg-bg-primary/60 rounded-lg border border-border-glow border-l-4 ${priority.border} p-3 transition-all duration-200 hover:border-l-4 ${hoverShadow} hover:bg-bg-primary/90 ${queueHeadGlow} ${task.state === "Exit" ? "opacity-70" : ""}`}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <h3 className="font-sans font-medium text-sm text-text-primary leading-tight truncate">
          {task.title}
        </h3>
        <div className="flex items-center gap-1 shrink-0">
          {task.state === "Exit" && <span className="text-[10px]">✅</span>}
          {task.isEmergency && (
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-neon-red/20 text-neon-red border border-neon-red/40 animate-pulse">
              SOS
            </span>
          )}
        </div>
      </div>

      {task.description && (
        <p className="text-xs text-text-muted mb-2 line-clamp-2">
          {task.description}
        </p>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <span
          className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${stateBadgeColor[task.state] ?? ""}`}
        >
          {task.state}
        </span>

        <span className={`text-[10px] font-mono ${priority.color}`}>
          P{task.priority}:{priority.label}
        </span>

        {task.isExecutable && (
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neon-green/10 text-neon-green border border-neon-green/30">
            EXE
          </span>
        )}

        {task.isHighContextCost && (
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neon-yellow/10 text-neon-yellow border border-neon-yellow/30">
            CTX
          </span>
        )}

        {task.deadline && (
          <span className="text-[10px] font-mono text-text-muted">
            📅 {new Date(task.deadline).toLocaleDateString()}
          </span>
        )}
      </div>

      {task.state === "Blocked" && task.eventId && (
        <div className="mt-1.5">
          <span className="text-[10px] font-mono text-neon-yellow">
            🚧 {events.find((e) => e.id === task.eventId)?.name ?? "Unknown"}
          </span>
        </div>
      )}

      {task.state === "New" && (
        <div className="mt-2 pt-2 border-t border-border-glow">
          {task.isExecutable ? (
            <div className="flex gap-1.5">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPromote?.(task.id);
                }}
                className="flex-1 py-1.5 rounded font-mono text-[11px] border border-neon-green/40 bg-neon-green/10 text-neon-green hover:bg-neon-green/20 hover:shadow-neon-green transition-all"
              >
                ⏎ 提入就绪
              </button>
              {onActivateEmergency && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onActivateEmergency(task.id);
                  }}
                  disabled={activeEmergencyTaskId !== null}
                  className="flex-1 py-1.5 rounded font-mono text-[11px] border border-neon-red/40 bg-neon-red/10 text-neon-red hover:bg-neon-red/20 hover:shadow-neon-red transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-neon-red/10 disabled:hover:shadow-none"
                >
                  🚨 紧急
                </button>
              )}
            </div>
          ) : (
            <span className="block text-center font-mono text-[10px] text-text-muted/50 py-1.5">
              不可执行 · 仅收集
            </span>
          )}
        </div>
      )}

      {task.state === "Ready" && (onBlock || onActivateEmergency) && (
        <div className="mt-2 pt-2 border-t border-border-glow">
          <div className="flex gap-1.5">
            {onBlock && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onBlock(task.id);
                }}
                className="flex-1 py-1.5 rounded font-mono text-[11px] border border-neon-yellow/40 bg-neon-yellow/10 text-neon-yellow hover:bg-neon-yellow/20 hover:shadow-neon-yellow transition-all"
              >
                🚧 阻塞
              </button>
            )}
            {onActivateEmergency && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onActivateEmergency(task.id);
                }}
                disabled={activeEmergencyTaskId !== null}
                className="flex-1 py-1.5 rounded font-mono text-[11px] border border-neon-red/40 bg-neon-red/10 text-neon-red hover:bg-neon-red/20 hover:shadow-neon-red transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-neon-red/10 disabled:hover:shadow-none"
              >
                🚨 紧急
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
