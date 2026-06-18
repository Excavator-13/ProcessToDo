export type TaskState = "New" | "Ready" | "Blocked" | "Running" | "Exit";

export type Priority = 1 | 2 | 3;

export type RunningMode = "free" | "timeSlicing";

export interface Task {
  id: string;
  title: string;
  description: string;
  state: TaskState;
  isExecutable: boolean;
  priority: Priority;
  isEmergency: boolean;
  deadline: string | null;
  isHighContextCost: boolean;
  eventId: string | null;
  lastRunningAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AppEvent {
  id: string;
  name: string;
  isSystemGenerated: boolean;
  isResolved: boolean;
  createdAt: string;
}

export interface AppSettings {
  runningMode: RunningMode;
  readyQueueLimit: number;
  timeSliceDuration: number;
  currentRunningTaskId: string | null;
  activeEmergencyTaskId: string | null;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  isExecutable?: boolean;
  priority?: Priority;
  isHighContextCost?: boolean;
  deadline?: string | null;
}

export interface AppStore {
  tasks: Task[];
  events: AppEvent[];
  settings: AppSettings;

  addTask: (data: CreateTaskInput) => void;
  updateTask: (id: string, data: Partial<Task>) => void;
  deleteTask: (id: string) => void;

  promoteTask: (id: string) => void;
  startScheduler: () => void;
  stopTask: (id: string) => void;
  completeTask: (id: string) => void;
  blockTask: (id: string, eventName: string) => void;

  resolveEvent: (eventId: string) => void;

  activateEmergency: (taskId: string) => void;
  resolveEmergency: (taskId: string) => void;

  switchTask: (fromId: string, toId: string) => void;

  updateSettings: (data: Partial<AppSettings>) => void;

  checkStarvation: () => void;
}
