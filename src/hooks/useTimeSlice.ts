import { useState, useRef, useEffect, useCallback } from "react";
import { useAppStore } from "../store/useAppStore";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export { formatTime };

export function useTimeSlice() {
  const runningMode = useAppStore((s) => s.settings.runningMode);
  const timeSliceDuration = useAppStore((s) => s.settings.timeSliceDuration);
  const currentRunningTaskId = useAppStore(
    (s) => s.settings.currentRunningTaskId,
  );
  const activeEmergencyTaskId = useAppStore(
    (s) => s.settings.activeEmergencyTaskId,
  );

  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isExpired, setIsExpired] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevRunningTaskIdRef = useRef<string | null>(currentRunningTaskId);

  const clearTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    queueMicrotask(() => {
      setIsRunning(false);
    });
  }, []);

  const start = useCallback(() => {
    clearTimer();
    const totalSeconds = timeSliceDuration * 60;
    setRemainingSeconds(totalSeconds);
    setIsExpired(false);
    setIsRunning(true);

    intervalRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          if (intervalRef.current !== null) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          setIsRunning(false);
          setIsExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [timeSliceDuration, clearTimer]);

  const pause = useCallback(() => {
    clearTimer();
  }, [clearTimer]);

  const reset = useCallback(() => {
    clearTimer();
    setRemainingSeconds(timeSliceDuration * 60);
    setIsExpired(false);
  }, [timeSliceDuration, clearTimer]);

  useEffect(() => {
    const prevId = prevRunningTaskIdRef.current;
    prevRunningTaskIdRef.current = currentRunningTaskId;

    if (runningMode !== "timeSlicing") return;
    if (activeEmergencyTaskId !== null) {
      clearTimer();
      queueMicrotask(() => {
        setRemainingSeconds(0);
        setIsExpired(false);
      });
      return;
    }

    if (currentRunningTaskId && currentRunningTaskId !== prevId) {
      start();
    } else if (!currentRunningTaskId && prevId) {
      clearTimer();
      queueMicrotask(() => {
        setRemainingSeconds(0);
        setIsExpired(false);
      });
    }
  }, [
    currentRunningTaskId,
    runningMode,
    activeEmergencyTaskId,
    start,
    clearTimer,
  ]);

  useEffect(() => {
    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  if (runningMode !== "timeSlicing") {
    return {
      remainingSeconds: 0,
      isRunning: false,
      isExpired: false,
      start,
      pause,
      reset,
      formatTime,
    };
  }

  return {
    remainingSeconds,
    isRunning,
    isExpired,
    start,
    pause,
    reset,
    formatTime,
  };
}
