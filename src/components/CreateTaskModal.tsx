import { useState, useEffect, useCallback } from "react";
import { useAppStore } from "../store/useAppStore";

interface CreateTaskModalProps {
  open: boolean;
  onClose: () => void;
}

export default function CreateTaskModal({
  open,
  onClose,
}: CreateTaskModalProps) {
  const addTask = useAppStore((s) => s.addTask);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [isExecutable, setIsExecutable] = useState(false);
  const [isHighContextCost, setIsHighContextCost] = useState(false);

  const resetForm = useCallback(() => {
    setTitle("");
    setDescription("");
    setDeadline("");
    setIsExecutable(false);
    setIsHighContextCost(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    addTask({
      title: title.trim(),
      description: description.trim() || undefined,
      deadline: deadline || null,
      isExecutable,
      isHighContextCost: isExecutable && isHighContextCost,
    });

    resetForm();
    onClose();
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleOverlayClick}
    >
      <div className="w-full max-w-md mx-4 bg-bg-secondary rounded-xl border border-border-glow shadow-neon-cyan p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-mono font-bold text-lg text-neon-cyan tracking-wider">
            + 新建任务
          </h2>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary transition-colors text-xl leading-none"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-mono text-xs text-text-muted mb-1.5 tracking-wider uppercase">
              标题 <span className="text-neon-red">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="输入任务名称..."
              autoFocus
              className="w-full bg-bg-primary border border-border-glow rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted/40 focus:outline-none focus:border-neon-cyan focus:shadow-neon-cyan transition-all"
            />
          </div>

          <div>
            <label className="block font-mono text-xs text-text-muted mb-1.5 tracking-wider uppercase">
              描述
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="任务描述（可选）..."
              rows={3}
              className="w-full bg-bg-primary border border-border-glow rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted/40 focus:outline-none focus:border-neon-cyan focus:shadow-neon-cyan transition-all resize-none"
            />
          </div>

          <div>
            <label className="block font-mono text-xs text-text-muted mb-1.5 tracking-wider uppercase">
              截止时间
            </label>
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full bg-bg-primary border border-border-glow rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-neon-cyan focus:shadow-neon-cyan transition-all [color-scheme:dark]"
            />
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={isExecutable}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setIsExecutable(checked);
                  if (!checked) setIsHighContextCost(false);
                }}
                className="w-4 h-4 rounded border-border-glow bg-bg-primary text-neon-cyan focus:ring-neon-cyan/30 accent-[#00f0ff]"
              />
              <span className="font-mono text-xs text-text-muted group-hover:text-text-primary transition-colors tracking-wider">
                可执行
              </span>
            </label>

            <label
              className={`flex items-center gap-2 ${isExecutable ? "cursor-pointer group" : "cursor-not-allowed opacity-40"}`}
            >
              <input
                type="checkbox"
                checked={isHighContextCost}
                onChange={(e) =>
                  isExecutable && setIsHighContextCost(e.target.checked)
                }
                disabled={!isExecutable}
                className="w-4 h-4 rounded border-border-glow bg-bg-primary text-neon-yellow focus:ring-neon-yellow/30 accent-[#ffd600] disabled:accent-[#6b7b8d]"
              />
              <span
                className={`font-mono text-xs tracking-wider ${isExecutable ? "text-text-muted group-hover:text-text-primary transition-colors" : "text-text-muted/50"}`}
              >
                高切换开销
              </span>
            </label>
          </div>

          {isExecutable && isHighContextCost && (
            <p className="font-mono text-[10px] text-neon-yellow/70 leading-relaxed">
              ⚠ 高切换开销任务在时间片轮转模式下切换时会额外提示确认
            </p>
          )}

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
              disabled={!title.trim()}
              className="flex-1 px-4 py-2 rounded-lg border border-neon-cyan/50 bg-neon-cyan/10 font-mono text-xs text-neon-cyan hover:bg-neon-cyan/20 hover:shadow-neon-cyan transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-neon-cyan/10 disabled:hover:shadow-none"
            >
              创建任务
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
