import { useAppStore } from "../store/useAppStore";

interface EventPanelProps {
  onResolveEvent: (eventId: string) => void;
}

export default function EventPanel({ onResolveEvent }: EventPanelProps) {
  const events = useAppStore((s) => s.events);
  const tasks = useAppStore((s) => s.tasks);

  const unresolvedEvents = events.filter((e) => !e.isResolved);

  if (unresolvedEvents.length === 0) return null;

  return (
    <div className="space-y-2 mb-3">
      <div className="flex items-center gap-2 px-1">
        <span className="font-mono text-[10px] text-neon-yellow tracking-wider uppercase">
          BLOCKING EVENTS
        </span>
        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded border bg-neon-yellow/10 text-neon-yellow border-neon-yellow/30">
          {unresolvedEvents.length}
        </span>
      </div>

      {unresolvedEvents.map((event) => {
        const linkedTasks = tasks.filter(
          (t) => t.eventId === event.id && t.state === "Blocked",
        );
        const isEmergencyEvent =
          event.name === "emergency" && event.isSystemGenerated;

        return (
          <div
            key={event.id}
            className={`bg-bg-primary/60 rounded-lg border ${isEmergencyEvent ? "border-neon-red/40 bg-neon-red/5" : "border-neon-yellow/20"} p-2.5`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[11px]">
                    {isEmergencyEvent ? "🚨" : "🚧"}
                  </span>
                  <span
                    className={`font-sans text-xs truncate ${isEmergencyEvent ? "text-neon-red font-bold" : "text-text-primary"}`}
                  >
                    {isEmergencyEvent ? "紧急阻塞" : event.name}
                  </span>
                  {event.isSystemGenerated && (
                    <span
                      className={`text-[9px] font-mono px-1 py-0.5 rounded border ${isEmergencyEvent ? "bg-neon-red/10 text-neon-red border-neon-red/30" : "bg-neon-cyan/10 text-neon-cyan border-neon-cyan/30"}`}
                    >
                      🔧 系统
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`font-mono text-[10px] ${isEmergencyEvent ? "text-neon-red/70" : "text-text-muted"}`}
                  >
                    {linkedTasks.length} 个任务阻塞
                  </span>
                  {linkedTasks.length > 0 && (
                    <span
                      className={`font-mono text-[9px] truncate ${isEmergencyEvent ? "text-neon-red/50" : "text-text-muted/60"}`}
                    >
                      ({linkedTasks.map((t) => t.title).join(", ")})
                    </span>
                  )}
                </div>
                {isEmergencyEvent && (
                  <span className="font-mono text-[9px] text-neon-red/60 mt-1 block">
                    完成紧急任务后自动解除
                  </span>
                )}
              </div>
              {!isEmergencyEvent && (
                <button
                  onClick={() => onResolveEvent(event.id)}
                  className="shrink-0 px-2 py-1 rounded font-mono text-[10px] border border-neon-green/40 bg-neon-green/10 text-neon-green hover:bg-neon-green/20 hover:shadow-neon-green transition-all"
                >
                  ✓ 已解决
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
