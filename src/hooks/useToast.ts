import { useState, useCallback, useRef } from "react";

export interface ToastItem {
  id: number;
  message: string;
  type: "error" | "success" | "info";
}

let toastIdCounter = 0;

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const showToast = useCallback(
    (message: string, type: "error" | "success" | "info" = "info") => {
      const id = ++toastIdCounter;
      setToasts((prev) => [...prev, { id, message, type }]);
      const timer = setTimeout(() => removeToast(id), 3000);
      timersRef.current.set(id, timer);
    },
    [removeToast],
  );

  return { toasts, showToast, removeToast };
}
