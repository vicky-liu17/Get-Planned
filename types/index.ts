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
}

export interface DragState {
  taskId: string;
  sourceDate: string; 
  ghost: HTMLElement | null;
  offsetX: number;
  offsetY: number;
}