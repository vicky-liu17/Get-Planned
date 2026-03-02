// types/index.ts
export interface Task {
  id: string;
  taskName: string;
  suggestedDate: string;
  endDate?: string; 
  timeBucket: string;
  category: string;
  exactTime?: string;
  location?: string;
  recurrence?: "none" | "daily" | "weekdays" | "weekends" | "weekly" | "monthly";
  deletedDates?: string[]; 
  completedDates?: string[];
  duration?: number; // 🌟 新增：时长（以分钟为单位）
  isEstimatedDuration?: boolean; // 🌟 新增：标记是否为 AI 猜测的时长
  icon?: string;
  isNew?: boolean;
}

export interface DragState {
  taskId: string;
  sourceDate: string; 
  ghost: HTMLElement | null;
  offsetX: number;
  offsetY: number;
}