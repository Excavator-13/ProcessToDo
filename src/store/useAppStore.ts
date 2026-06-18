import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  AppStore,
  AppSettings,
  AppEvent,
  Task,
  CreateTaskInput,
} from "../types";

const defaultSettings: AppSettings = {
  runningMode: "free",
  readyQueueLimit: 9,
  timeSliceDuration: 25,
  currentRunningTaskId: null,
  activeEmergencyTaskId: null,
};

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      tasks: [] as Task[],
      events: [] as AppEvent[],
      settings: defaultSettings,

      addTask: (data: CreateTaskInput) => {
        const now = new Date().toISOString();
        const newTask: Task = {
          id: crypto.randomUUID(),
          title: data.title,
          description: data.description ?? "",
          state: "New",
          isExecutable: data.isExecutable ?? false,
          priority: data.priority ?? 3,
          isEmergency: false,
          deadline: data.deadline ?? null,
          isHighContextCost: data.isHighContextCost ?? false,
          eventId: null,
          lastRunningAt: null,
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({ tasks: [...state.tasks, newTask] }));
      },
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
