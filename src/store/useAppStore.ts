import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AppStore, AppSettings, AppEvent, Task } from "../types";

const defaultSettings: AppSettings = {
  runningMode: "free",
  readyQueueLimit: 9,
  timeSliceDuration: 25,
  currentRunningTaskId: null,
  activeEmergencyTaskId: null,
};

export const useAppStore = create<AppStore>()(
  persist(
    (_set, _get) => ({
      tasks: [] as Task[],
      events: [] as AppEvent[],
      settings: defaultSettings,

      addTask: () => {},
      updateTask: () => {},
      deleteTask: () => {},

      promoteTask: () => {},
      startScheduler: () => {},
      stopTask: () => {},
      completeTask: () => {},
      blockTask: () => {},

      resolveEvent: () => {},

      activateEmergency: () => {},
      resolveEmergency: () => {},

      updateSettings: () => {},

      checkStarvation: () => {},
    }),
    {
      name: "process-todo-storage",
      version: 1,
    },
  ),
);
