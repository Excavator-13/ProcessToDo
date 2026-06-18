import { useEffect, useCallback } from "react";
import { useAppStore } from "../store/useAppStore";
import type { RunningMode } from "../types";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export default function SettingsModal({ open, onClose }: SettingsModalProps) {
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  const handleModeChange = useCallback(
    (mode: RunningMode) => {
      updateSettings({ runningMode: mode });
    },
    [updateSettings],
  );

  const handleTimeSliceChange = useCallback(
    (value: number) => {
      const clamped = Math.min(120, Math.max(1, value));
      updateSettings({ timeSliceDuration: clamped });
    },
    [updateSettings],
  );

  const handleQueueLimitChange = useCallback(
    (value: number) => {
      const clamped = Math.min(20, Math.max(1, value));
      updateSettings({ readyQueueLimit: clamped });
    },
    [updateSettings],
  );

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
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
            ⚙ 系统设置
          </h2>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary transition-colors text-xl leading-none"
          >
            ✕
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block font-mono text-xs text-text-muted mb-2.5 tracking-wider uppercase">
              运行模式
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleModeChange("free")}
                className={`py-2.5 px-3 rounded-lg border font-mono text-xs transition-all ${
                  settings.runningMode === "free"
                    ? "border-neon-cyan/60 bg-neon-cyan/15 text-neon-cyan shadow-neon-cyan"
                    : "border-border-glow bg-bg-primary text-text-muted hover:border-neon-cyan/30 hover:text-text-primary"
                }`}
              >
                <div className="font-semibold mb-0.5">自由模式</div>
                <div className="text-[10px] opacity-60">任务持续运行</div>
              </button>
              <button
                onClick={() => handleModeChange("timeSlicing")}
                className={`py-2.5 px-3 rounded-lg border font-mono text-xs transition-all ${
                  settings.runningMode === "timeSlicing"
                    ? "border-neon-cyan/60 bg-neon-cyan/15 text-neon-cyan shadow-neon-cyan"
                    : "border-border-glow bg-bg-primary text-text-muted hover:border-neon-cyan/30 hover:text-text-primary"
                }`}
              >
                <div className="font-semibold mb-0.5">时间片轮转</div>
                <div className="text-[10px] opacity-60">按时间片轮流执行</div>
              </button>
            </div>
          </div>

          <div
            className={`transition-all duration-200 ${
              settings.runningMode === "timeSlicing"
                ? "opacity-100"
                : "opacity-30 pointer-events-none"
            }`}
          >
            <label className="block font-mono text-xs text-text-muted mb-1.5 tracking-wider uppercase">
              时间片时长（分钟）
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={settings.timeSliceDuration}
                onChange={(e) =>
                  handleTimeSliceChange(parseInt(e.target.value) || 1)
                }
                min={1}
                max={120}
                step={5}
                className="w-24 bg-bg-primary border border-border-glow rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-neon-cyan focus:shadow-neon-cyan transition-all"
              />
              <span className="font-mono text-xs text-text-muted">min</span>
            </div>
            <p className="font-mono text-[10px] text-text-muted/50 mt-1.5">
              时间片到期后将提示切换任务
            </p>
          </div>

          <div>
            <label className="block font-mono text-xs text-text-muted mb-1.5 tracking-wider uppercase">
              Ready 队列上限
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={settings.readyQueueLimit}
                onChange={(e) =>
                  handleQueueLimitChange(parseInt(e.target.value) || 1)
                }
                min={1}
                max={20}
                step={1}
                className="w-24 bg-bg-primary border border-border-glow rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-neon-cyan focus:shadow-neon-cyan transition-all"
              />
              <span className="font-mono text-xs text-text-muted">tasks</span>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border border-neon-cyan/50 bg-neon-cyan/10 font-mono text-xs text-neon-cyan hover:bg-neon-cyan/20 hover:shadow-neon-cyan transition-all"
            >
              完成
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
