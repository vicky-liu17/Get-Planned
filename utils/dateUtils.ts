// utils/dateUtils.ts
import { Task } from "../types";

export const getLocalDateString = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const getNextDayString = (dateStr: string) => {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  d.setDate(d.getDate() + 1);
  return getLocalDateString(d);
};

export const getCurrentTimeBucket = (): string => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "afternoon";
  return "evening";
};

export const remapTimeForBucket = (existingTime: string, newBucket: string): string => {
  if (!existingTime) return "";
  const [hStr, mStr] = existingTime.split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  let newH = h;
  if (newBucket === "morning"   && h >= 12) newH = Math.max(6,  h - 12);
  if (newBucket === "afternoon" && (h < 12 || h >= 18)) newH = h < 12 ? h + 12 : 13;
  if (newBucket === "evening"   && h < 18) newH = h + 12 > 23 ? 19 : h + 12;
  return `${String(newH).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

// 基于时间戳的精确判断，规避跨月和时区 Bug
export const isTaskOnDate = (task: Task, targetDateStr: string) => {
  if (task.deletedDates?.includes(targetDateStr)) return false; 

  const toTime = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d).getTime();
  };

  const targetTime = toTime(targetDateStr);
  const startTime = toTime(task.suggestedDate);

  if (targetTime < startTime) return false;

  if (task.endDate) {
    const endTime = toTime(task.endDate);
    if (targetTime > endTime) return false;
    if (!task.recurrence || task.recurrence === "none") return true;
  } else {
    if (!task.recurrence || task.recurrence === "none") {
      return targetTime === startTime;
    }
  }

  const targetDateObj = new Date(targetDateStr);
  switch (task.recurrence) {
    case "daily": return true;
    case "weekdays": {
      const day = targetDateObj.getDay();
      return day >= 1 && day <= 5;
    }
    case "weekends": {
      const day = targetDateObj.getDay();
      return day === 0 || day === 6;
    }
    case "weekly": {
      const startDateObj = new Date(task.suggestedDate);
      return targetDateObj.getDay() === startDateObj.getDay();
    }
    case "monthly": {
      const startDateObj = new Date(task.suggestedDate);
      return targetDateObj.getDate() === startDateObj.getDate();
    }
    default: return false;
  }
};