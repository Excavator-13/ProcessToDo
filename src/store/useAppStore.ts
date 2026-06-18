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

      blockTask: (id: string, eventName: string) => {
        const { tasks } = get();
        const task = tasks.find((t) => t.id === id);
        if (!task) throw new Error("Task not found");
        if (task.state !== "Running" && task.state !== "Ready")
          throw new Error("Only Running or Ready tasks can be blocked");
        if (!eventName.trim()) throw new Error("Event name is required");
        const now = new Date().toISOString();
        const newEvent: AppEvent = {
          id: crypto.randomUUID(),
          name: eventName.trim(),
          isSystemGenerated: false,
          isResolved: false,
          createdAt: now,
        };
        const isRunning = task.state === "Running";
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id
              ? {
                  ...t,
                  state: "Blocked" as TaskState,
                  eventId: newEvent.id,
                  updatedAt: now,
                }
              : t,
          ),
          events: [...state.events, newEvent],
          settings: isRunning
            ? { ...state.settings, currentRunningTaskId: null }
            : state.settings,
        }));
      },

      resolveEvent: (eventId: string) => {
        const { tasks, events, settings } = get();
        const event = events.find((e) => e.id === eventId);
        if (!event) throw new Error("Event not found");
        if (event.isResolved) throw new Error("Event is already resolved");
        const blockedTasks = tasks.filter(
          (t) => t.eventId === eventId && t.state === "Blocked",
        );
        const currentReadyCount = tasks.filter(
          (t) => t.state === "Ready",
        ).length;
        const availableSlots = settings.readyQueueLimit - currentReadyCount;
        if (blockedTasks.length > availableSlots)
          throw new Error(
            `Ready queue capacity insufficient: can only restore ${availableSlots} of ${blockedTasks.length} tasks`,
          );
        const now = new Date().toISOString();
        const blockedTaskIds = new Set(blockedTasks.map((t) => t.id));
        set((state) => ({
          events: state.events.map((e) =>
            e.id === eventId ? { ...e, isResolved: true } : e,
          ),
          tasks: state.tasks.map((t) =>
            blockedTaskIds.has(t.id)
              ? {
                  ...t,
                  state: "Ready" as TaskState,
                  eventId: null,
                  updatedAt: now,
                }
              : t,
          ),
        }));
      },

      activateEmergency: (taskId: string) => {
        const { tasks, events, settings } = get();
        const task = tasks.find((t) => t.id === taskId);
        if (!task) throw new Error("Task not found");
        if (!task.isExecutable)
          throw new Error("Only executable tasks can be emergency");
        if (task.state !== "New" && task.state !== "Ready")
          throw new Error(
            "Only New or Ready tasks can be activated as emergency",
          );
        if (tasks.some((t) => t.isEmergency && t.id !== taskId))
          throw new Error("An emergency task already exists");

        const now = new Date().toISOString();
        const emergencyEvent: AppEvent = {
          id: crypto.randomUUID(),
          name: "emergency",
          isSystemGenerated: true,
          isResolved: false,
          createdAt: now,
        };

        let updatedTasks = tasks.map((t) => {
          if (t.id === taskId) {
            return {
              ...t,
              isEmergency: true,
              state: "Running" as TaskState,
              lastRunningAt: now,
              updatedAt: now,
            };
          }
          if (
            settings.currentRunningTaskId &&
            t.id === settings.currentRunningTaskId
          ) {
            return {
              ...t,
              state: "Ready" as TaskState,
              updatedAt: now,
            };
          }
          if (t.state === "Ready" && t.id !== taskId) {
            return {
              ...t,
              state: "Blocked" as TaskState,
              eventId: emergencyEvent.id,
              updatedAt: now,
            };
          }
          return t;
        });

        set({
          tasks: updatedTasks,
          events: [...events, emergencyEvent],
          settings: {
            ...settings,
            currentRunningTaskId: taskId,
            activeEmergencyTaskId: taskId,
          },
        });
      },

      resolveEmergency: (taskId: string) => {
        const { tasks, events, settings } = get();
        const task = tasks.find((t) => t.id === taskId);
        if (!task) throw new Error("Task not found");
        if (!task.isEmergency) throw new Error("Task is not an emergency task");
        if (task.state !== "Running")
          throw new Error("Emergency task is not running");

        const now = new Date().toISOString();
        const emergencyEvent = events.find(
          (e) => e.name === "emergency" && e.isSystemGenerated && !e.isResolved,
        );

        let updatedEvents = events;
        let updatedTasks = tasks.map((t) => {
          if (t.id === taskId) {
            return {
              ...t,
              state: "Exit" as TaskState,
              isEmergency: false,
              updatedAt: now,
            };
          }
          return t;
        });

        if (emergencyEvent) {
          updatedEvents = events.map((e) =>
            e.id === emergencyEvent.id ? { ...e, isResolved: true } : e,
          );

          const blockedByEmergency = updatedTasks.filter(
            (t) => t.eventId === emergencyEvent.id && t.state === "Blocked",
          );
          const currentReadyCount = updatedTasks.filter(
            (t) => t.state === "Ready",
          ).length;
          const availableSlots = settings.readyQueueLimit - currentReadyCount;

          if (blockedByEmergency.length > availableSlots) {
            const restored = blockedByEmergency
              .sort((a, b) => a.priority - b.priority)
              .slice(0, availableSlots);
            const restoredIds = new Set(restored.map((t) => t.id));

            updatedTasks = updatedTasks.map((t) => {
              if (restoredIds.has(t.id)) {
                return {
                  ...t,
                  state: "Ready" as TaskState,
                  eventId: null,
                  updatedAt: now,
                };
              }
              return t;
            });
          } else {
            const restoredIds = new Set(blockedByEmergency.map((t) => t.id));
            updatedTasks = updatedTasks.map((t) => {
              if (restoredIds.has(t.id)) {
                return {
                  ...t,
                  state: "Ready" as TaskState,
                  eventId: null,
                  updatedAt: now,
                };
              }
              return t;
            });
          }
        }

        set({
          tasks: updatedTasks,
          events: updatedEvents,
          settings: {
            ...settings,
            currentRunningTaskId: null,
            activeEmergencyTaskId: null,
          },
        });
      },

      switchTask: (fromId: string, toId: string) => {
        const { tasks, settings } = get();
        const fromTask = tasks.find((t) => t.id === fromId);
        const toTask = tasks.find((t) => t.id === toId);
        if (!fromTask) throw new Error("Source task not found");
        if (!toTask) throw new Error("Target task not found");
        if (fromTask.state !== "Running")
          throw new Error("Source task is not running");
        if (toTask.state !== "Ready")
          throw new Error("Target task is not ready");
        if (settings.currentRunningTaskId !== fromId)
          throw new Error("Source task is not the current running task");
        const now = new Date().toISOString();
        set((state) => ({
          tasks: state.tasks.map((t) => {
            if (t.id === fromId) {
              return { ...t, state: "Ready" as TaskState, updatedAt: now };
            }
            if (t.id === toId) {
              return {
                ...t,
                state: "Running" as TaskState,
                lastRunningAt: now,
                updatedAt: now,
              };
            }
            return t;
          }),
          settings: { ...state.settings, currentRunningTaskId: toId },
        }));
      },

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
