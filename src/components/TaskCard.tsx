import type { Task } from "../types";

interface TaskCardProps {
  task: Task;
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

export default function TaskCard({ task }: TaskCardProps) {
  const priority = priorityConfig[task.priority] ?? priorityConfig[3];
  const hoverShadow = hoverShadowClass[task.priority] ?? hoverShadowClass[3];

  const stateBadgeColor: Record<string, string> = {
    New: "bg-neon-cyan/10 text-neon-cyan border-neon-cyan/30",
    Ready: "bg-neon-green/10 text-neon-green border-neon-green/30",
    Blocked: "bg-neon-yellow/10 text-neon-yellow border-neon-yellow/30",
    Running: "bg-neon-red/10 text-neon-red border-neon-red/30",
    Exit: "bg-neon-blue/10 text-neon-blue border-neon-blue/30",
  };

  return (
    <div
      className={`group relative bg-bg-primary/60 rounded-lg border border-border-glow border-l-4 ${priority.border} p-3 transition-all duration-200 hover:border-l-4 ${hoverShadow} hover:bg-bg-primary/90`}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <h3 className="font-sans font-medium text-sm text-text-primary leading-tight truncate">
          {task.title}
        </h3>
        {task.isEmergency && (
          <span className="shrink-0 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-neon-red/20 text-neon-red border border-neon-red/40 animate-pulse">
            SOS
          </span>
        )}
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
    </div>
  );
}
