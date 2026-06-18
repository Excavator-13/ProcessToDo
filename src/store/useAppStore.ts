import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  AppStore,
  AppSettings,
  AppEvent,
  Task,
  CreateTaskInput,
  TaskState,
  Priority,
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
        if (!task) throw new Error("任务不存在");
        if (task.state !== "New")
          throw new Error("仅 New 状态的任务可提入就绪");
        if (!task.isExecutable) throw new Error("不可执行的任务无法提入就绪");
        const readyCount = tasks.filter((t) => t.state === "Ready").length;
        if (readyCount >= settings.readyQueueLimit)
          throw new Error("Ready 队列已满");
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
        get().checkStarvation();
        const { tasks, settings } = get();
        if (settings.currentRunningTaskId !== null)
          throw new Error("已有任务在运行");
        const readyTasks = tasks
          .filter((t) => t.state === "Ready")
          .sort((a, b) => {
            if (a.priority !== b.priority) return a.priority - b.priority;
            return (
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            );
          });
        if (readyTasks.length === 0) throw new Error("Ready 队列为空");
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
        if (!task) throw new Error("任务不存在");
        if (task.state !== "Running") throw new Error("当前无运行中的任务");
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
        if (!task) throw new Error("任务不存在");
        if (task.state !== "Running") throw new Error("当前无运行中的任务");
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
        if (!task) throw new Error("任务不存在");
        if (task.state !== "Running" && task.state !== "Ready")
          throw new Error("仅 Running/Ready 状态的任务可阻塞");
        if (!eventName.trim()) throw new Error("请输入阻塞原因");
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
        if (!event) throw new Error("事件不存在");
        if (event.isResolved) throw new Error("事件已解决");
        const blockedTasks = tasks.filter(
          (t) => t.eventId === eventId && t.state === "Blocked",
        );
        const currentReadyCount = tasks.filter(
          (t) => t.state === "Ready",
        ).length;
        const availableSlots = settings.readyQueueLimit - currentReadyCount;
        if (blockedTasks.length > availableSlots)
          throw new Error("Ready 队列容量不足，无法恢复所有阻塞任务");
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
        if (!task) throw new Error("任务不存在");
        if (!task.isExecutable) throw new Error("不可执行的任务无法设为紧急");
        if (task.state !== "New" && task.state !== "Ready")
          throw new Error("仅 New/Ready 状态的任务可设为紧急");
        if (tasks.some((t) => t.isEmergency && t.id !== taskId))
          throw new Error("已存在紧急任务");

        const now = new Date().toISOString();
        const emergencyEvent: AppEvent = {
          id: crypto.randomUUID(),
          name: "emergency",
          isSystemGenerated: true,
          isResolved: false,
          createdAt: now,
        };

        // eslint-disable-next-line prefer-const
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
        if (!task) throw new Error("任务不存在");
        if (!task.isEmergency) throw new Error("该任务不是紧急任务");
        if (task.state !== "Running") throw new Error("紧急任务未在运行");

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
        if (!fromTask) throw new Error("源任务不存在");
        if (!toTask) throw new Error("目标任务不存在");
        if (fromTask.state !== "Running") throw new Error("源任务未在运行");
        if (toTask.state !== "Ready") throw new Error("目标任务未就绪");
        if (settings.currentRunningTaskId !== fromId)
          throw new Error("源任务不是当前运行任务");
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

      checkStarvation: () => {
        const { tasks } = get();
        const now = Date.now();
        const ONE_DAY = 24 * 60 * 60 * 1000;
        const THREE_DAYS = 3 * ONE_DAY;

        const updates = new Map<string, number>();

        tasks
          .filter((t) => t.state === "Ready")
          .forEach((t) => {
            if (t.priority <= 1) return;

            let shouldPromote = false;

            if (t.deadline) {
              const deadlineTime = new Date(t.deadline).getTime();
              if (deadlineTime - now < ONE_DAY && deadlineTime > now) {
                shouldPromote = true;
              }
            }

            if (!shouldPromote) {
              const referenceTime = t.lastRunningAt
                ? new Date(t.lastRunningAt).getTime()
                : new Date(t.createdAt).getTime();
              if (now - referenceTime > THREE_DAYS) {
                shouldPromote = true;
              }
            }

            if (shouldPromote) {
              updates.set(t.id, (t.priority - 1) as Priority);
            }
          });

        if (updates.size === 0) return;

        const nowISO = new Date().toISOString();
        set((state) => ({
          tasks: state.tasks.map((t) => {
            const newPriority = updates.get(t.id);
            if (newPriority !== undefined) {
              return {
                ...t,
                priority: newPriority as Priority,
                updatedAt: nowISO,
              };
            }
            return t;
          }),
        }));
      },
    }),
    {
      name: "process-todo-storage",
      version: 1,
    },
  ),
);
