import type { ToastItem } from "../hooks/useToast";

interface ToastProps {
  toasts: ToastItem[];
  removeToast: (id: number) => void;
}

const typeStyles: Record<string, string> = {
  error: "border-neon-red/60 bg-neon-red/10 text-neon-red",
  success: "border-neon-green/60 bg-neon-green/10 text-neon-green",
  info: "border-neon-cyan/60 bg-neon-cyan/10 text-neon-cyan",
  warning: "border-neon-yellow/60 bg-neon-yellow/10 text-neon-yellow",
};

const typeIcons: Record<string, string> = {
  error: "✕",
  success: "✓",
  info: "ℹ",
  warning: "⚠",
};

export default function Toast({ toasts, removeToast }: ToastProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center gap-2 px-4 py-3 rounded-lg border font-mono text-xs animate-slide-in ${typeStyles[toast.type] ?? typeStyles.info}`}
        >
          <span className="text-sm">{typeIcons[toast.type]}</span>
          <span className="flex-1">{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            className="ml-2 opacity-60 hover:opacity-100 transition-opacity text-sm leading-none"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
