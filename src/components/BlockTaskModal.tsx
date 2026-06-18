import { useState, useEffect } from "react";

interface BlockTaskModalProps {
  open: boolean;
  onClose: () => void;
  taskId: string | null;
  taskTitle: string;
  onBlocked: (id: string, eventName: string) => void;
}

export default function BlockTaskModal({
  open,
  onClose,
  taskId,
  taskTitle,
  onBlocked,
}: BlockTaskModalProps) {
  const [eventName, setEventName] = useState("");

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskId || !eventName.trim()) return;
    onBlocked(taskId, eventName.trim());
    setEventName("");
    onClose();
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleOverlayClick}
    >
      <div className="w-full max-w-md mx-4 bg-bg-secondary rounded-xl border border-border-glow shadow-neon-yellow p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-mono font-bold text-lg text-neon-yellow tracking-wider">
            🚧 阻塞任务
          </h2>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary transition-colors text-xl leading-none"
          >
            ✕
          </button>
        </div>

        <div className="mb-4 px-3 py-2 rounded-lg bg-neon-yellow/5 border border-neon-yellow/20">
          <p className="font-mono text-xs text-neon-yellow/70 tracking-wider uppercase mb-1">
            目标任务
          </p>
          <p className="font-sans text-sm text-text-primary">{taskTitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-mono text-xs text-text-muted mb-1.5 tracking-wider uppercase">
              阻塞原因 <span className="text-neon-red">*</span>
            </label>
            <input
              type="text"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder="输入阻塞原因（如：等待审批）..."
              autoFocus
              className="w-full bg-bg-primary border border-border-glow rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted/40 focus:outline-none focus:border-neon-yellow focus:shadow-neon-yellow transition-all"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border border-border-glow font-mono text-xs text-text-muted hover:text-text-primary hover:border-text-muted transition-all"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={!eventName.trim() || !taskId}
              className="flex-1 px-4 py-2 rounded-lg border border-neon-yellow/50 bg-neon-yellow/10 font-mono text-xs text-neon-yellow hover:bg-neon-yellow/20 hover:shadow-neon-yellow transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-neon-yellow/10 disabled:hover:shadow-none"
            >
              确认阻塞
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
