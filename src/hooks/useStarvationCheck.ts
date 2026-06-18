import { useEffect, useRef } from "react";
import { useAppStore } from "../store/useAppStore";

export function useStarvationCheck(): void {
  const checkStarvation = useAppStore((s) => s.checkStarvation);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    checkStarvation();

    intervalRef.current = setInterval(
      () => {
        checkStarvation();
      },
      5 * 60 * 1000,
    );

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
    };
  }, [checkStarvation]);
}
