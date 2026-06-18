import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  AppStore,
  AppSettings,
  AppEvent,
  Task,
  CreateTaskInput,
  TaskState,
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
    (set, get) => ({
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

      updateTask: (id: string, data: Partial<Task>) => {
        const now = new Date().toISOString();
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id ? { ...t, ...data, updatedAt: now } : t,
          ),
        }));
      },

      deleteTask: (id: string) => {
        set((state) => ({
          tasks: state.tasks.filter((t) => t.id !== id),
        }));
      },

      promoteTask: (id: string) => {
        const { tasks, settings } = get();
        const task = tasks.find((t) => t.id === id);
        if (!task) throw new Error("Task not found");
        if (task.state !== "New") throw new Error("Task is not in New state");
        if (!task.isExecutable) throw new Error("Task is not executable");
        const readyCount = tasks.filter((t) => t.state === "Ready").length;
        if (readyCount >= settings.readyQueueLimit)
          throw new Error("Ready queue is full");
        const now = new Date().toISOString();
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id
              ? { ...t, state: "Ready" as TaskState, updatedAt: now }
              : t,
          ),
        }));
      },

      startScheduler: () => {
        const { tasks, settings } = get();
        if (settings.currentRunningTaskId !== null)
          throw new Error("A task is already running");
        const readyTasks = tasks
          .filter((t) => t.state === "Ready")
          .sort((a, b) => {
            if (a.priority !== b.priority) return a.priority - b.priority;
            return (
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            );
          });
        if (readyTasks.length === 0) throw new Error("No tasks in Ready queue");
        const nextTask = readyTasks[0];
        const now = new Date().toISOString();
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === nextTask.id
              ? {
                  ...t,
                  state: "Running" as TaskState,
                  lastRunningAt: now,
                  updatedAt: now,
                }
              : t,
          ),
          settings: {
            ...state.settings,
            currentRunningTaskId: nextTask.id,
          },
        }));
      },

      stopTask: (id: string) => {
        const { tasks } = get();
        const task = tasks.find((t) => t.id === id);
        if (!task) throw new Error("Task not found");
        if (task.state !== "Running")
          throw new Error("Task is not in Running state");
        const now = new Date().toISOString();
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id
              ? { ...t, state: "Ready" as TaskState, updatedAt: now }
              : t,
          ),
          settings: {
            ...state.settings,
            currentRunningTaskId: null,
          },
        }));
      },

      completeTask: (id: string) => {
        const { tasks } = get();
        const task = tasks.find((t) => t.id === id);
        if (!task) throw new Error("Task not found");
        if (task.state !== "Running")
          throw new Error("Task is not in Running state");
        const now = new Date().toISOString();
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id
              ? { ...t, state: "Exit" as TaskState, updatedAt: now }
              : t,
          ),
          settings: {
            ...state.settings,
            currentRunningTaskId: null,
          },
        }));
      },

      blockTask: () => {},

      resolveEvent: () => {},

      activateEmergency: () => {},
      resolveEmergency: () => {},

      updateSettings: (data: Partial<AppSettings>) => {
        set((state) => ({
          settings: { ...state.settings, ...data },
        }));
      },

      checkStarvation: () => {},
    }),
    {
      name: "process-todo-storage",
      version: 1,
    },
  ),
);
