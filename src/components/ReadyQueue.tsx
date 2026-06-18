import { useAppStore } from "../store/useAppStore";
import TaskCard from "./TaskCard";
import type { Priority } from "../types";

const priorityColumns: {
  priority: Priority;
  label: string;
  color: string;
  border: string;
  badge: string;
}[] = [
  {
    priority: 1,
    label: "P1:高",
    color: "text-neon-red",
    border: "border-neon-red/30",
    badge: "bg-neon-red/10 text-neon-red border-neon-red/30",
  },
  {
    priority: 2,
    label: "P2:中",
    color: "text-neon-yellow",
    border: "border-neon-yellow/30",
    badge: "bg-neon-yellow/10 text-neon-yellow border-neon-yellow/30",
  },
  {
    priority: 3,
    label: "P3:低",
    color: "text-neon-blue",
    border: "border-neon-blue/30",
    badge: "bg-neon-blue/10 text-neon-blue border-neon-blue/30",
  },
];

interface ReadyQueueProps {
  onPromote?: (id: string) => void;
  onBlock?: (id: string) => void;
}

export default function ReadyQueue({ onPromote, onBlock }: ReadyQueueProps) {
  const tasks = useAppStore((s) => s.tasks);
  const readyQueueLimit = useAppStore((s) => s.settings.readyQueueLimit);

  const readyTasks = tasks.filter((t) => t.state === "Ready");
  const totalCount = readyTasks.length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <span className="font-mono text-[10px] text-text-muted tracking-wider">
          QUEUE CAPACITY
        </span>
        <span
          className={`font-mono text-[10px] px-1.5 py-0.5 rounded border ${
            totalCount >= readyQueueLimit
              ? "bg-neon-red/10 text-neon-red border-neon-red/30"
              : "bg-neon-green/10 text-neon-green border-neon-green/30"
          }`}
        >
          {totalCount}/{readyQueueLimit}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {priorityColumns.map((col) => {
          const groupTasks = readyTasks
            .filter((t) => t.priority === col.priority)
            .sort(
              (a, b) =>
                new Date(a.createdAt).getTime() -
                new Date(b.createdAt).getTime(),
            );

          return (
            <div
              key={col.priority}
              className={`flex flex-col rounded-lg border ${col.border} bg-bg-primary/30 p-2 min-h-[120px]`}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`font-mono text-[10px] font-semibold tracking-wider ${col.color}`}
                >
                  {col.label}
                </span>
                <span
                  className={`font-mono text-[9px] px-1 py-0.5 rounded border ${col.badge}`}
                >
                  {groupTasks.length}
                </span>
              </div>

              <div className="flex-1 space-y-1.5">
                {groupTasks.length === 0 ? (
                  <div className="flex items-center justify-center h-16 text-text-muted/30 font-mono text-[9px]">
                    空
                  </div>
                ) : (
                  groupTasks.map((task, index) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onPromote={onPromote}
                      onBlock={onBlock}
                      isQueueHead={index === 0}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
