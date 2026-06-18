import type { ReactNode } from "react";
import type { TaskState } from "../types";

interface KanbanColumnProps {
  title: string;
  icon: string;
  state: TaskState;
  accentColor: string;
  count: number;
  children: ReactNode;
}

export default function KanbanColumn({
  title,
  icon,
  accentColor,
  count,
  children,
}: KanbanColumnProps) {
  const borderColorClass: Record<string, string> = {
    cyan: "border-t-neon-cyan",
    green: "border-t-neon-green",
    yellow: "border-t-neon-yellow",
    red: "border-t-neon-red",
    blue: "border-t-neon-blue",
  };

  const textColorClass: Record<string, string> = {
    cyan: "text-neon-cyan",
    green: "text-neon-green",
    yellow: "text-neon-yellow",
    red: "text-neon-red",
    blue: "text-neon-blue",
  };

  const shadowClass: Record<string, string> = {
    cyan: "shadow-neon-cyan",
    green: "shadow-neon-green",
    yellow: "shadow-neon-yellow",
    red: "shadow-neon-red",
    blue: "shadow-neon-blue",
  };

  return (
    <div
      className={`flex flex-col bg-bg-secondary/80 rounded-xl border border-border-glow border-t-4 ${borderColorClass[accentColor]} min-h-[60vh]`}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-glow">
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <h2
            className={`font-mono font-semibold text-sm tracking-wider uppercase ${textColorClass[accentColor]}`}
          >
            {title}
          </h2>
        </div>
        <span
          className={`font-mono text-xs px-2 py-0.5 rounded-full bg-bg-primary border border-border-glow ${textColorClass[accentColor]} ${shadowClass[accentColor]}`}
        >
          {count}
        </span>
      </div>
      <div className="flex-1 p-3 space-y-2 overflow-y-auto">{children}</div>
    </div>
  );
}
