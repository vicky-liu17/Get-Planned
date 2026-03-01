// hooks/useTasks.ts
import { useState, useCallback, useEffect } from "react";
import { Task } from "@/types";
import { getCurrentTimeBucket, getNextDayString } from "@/utils/dateUtils";

export function useTasks(userEmail: string | null) {
  const [tasks, setTasks] = useState<Task[]>([]);

  // ── 1. 当用户切换时，从本地加载对应的 JSON 数据 ──────────────────────────────
  useEffect(() => {
    if (!userEmail) {
      setTasks([]);
      return;
    }
    const storageKey = `getplanned_tasks_${userEmail}`;
    const savedData = localStorage.getItem(storageKey);
    if (savedData) {
      setTasks(JSON.parse(savedData));
    } else {
      setTasks([]); // 新用户，空数据
    }
  }, [userEmail]);

  // ── 2. 核心保存函数：每次修改都在本地存一份最新的 JSON ────────────────────────
  const saveTasks = useCallback((newTasks: Task[]) => {
    setTasks(newTasks);
    if (userEmail) {
      localStorage.setItem(`getplanned_tasks_${userEmail}`, JSON.stringify(newTasks));
    }
  }, [userEmail]);

  // ── 3. AI 操作逻辑 (全部改为调用 saveTasks) ─────────────────────────────────
  const applyAIResult = useCallback((aiResult: any, todayStr: string) => {
    if (!aiResult) return { error: null };
    if (!userEmail) return { error: "Please log in first!" }; 

    if (aiResult.action === "ERROR") {
      return { error: aiResult.errorMessage || "Sorry, I couldn't understand that." };
    }

    if (aiResult.action === "CREATE" && aiResult.taskDetails) {
      const details = aiResult.taskDetails;
      const finalTimeBucket = details.timeBucket && details.timeBucket !== "any" ? details.timeBucket : getCurrentTimeBucket();
      
      const newTask: Task = {
        id: Math.random().toString(36).substring(7), // 本地生成随机 ID
        taskName: details.taskName,
        suggestedDate: details.suggestedDate || todayStr,
        endDate: details.endDate || "",
        timeBucket: finalTimeBucket,
        category: details.category || "other",
        exactTime: details.exactTime || "",
        location: details.location || "",
        recurrence: details.recurrence || "none",
        deletedDates: details.deletedDates || [],
        completedDates: []
      };
      
      saveTasks([...tasks, newTask]);
    }

    else if (aiResult.action === "UPDATE" && aiResult.targetTaskId) {
      const updated = tasks.map(t => t.id === aiResult.targetTaskId ? { ...t, ...aiResult.taskDetails } : t);
      saveTasks(updated);
    }

    else if (aiResult.action === "DELETE" && aiResult.targetTaskId) {
      const filtered = tasks.filter(t => t.id !== aiResult.targetTaskId);
      saveTasks(filtered);
    }

    return { error: null };
  }, [tasks, userEmail, saveTasks]);

  // ── 4. 其他所有拖拽、修改操作 (全部改为 saveTasks) ───────────────────────────
  const updateTask = useCallback((taskId: string, field: string, value: string) => {
    saveTasks(tasks.map(t => t.id === taskId ? { ...t, [field]: value } : t));
  }, [tasks, saveTasks]);

  const moveTask = useCallback((taskId: string, targetDate: string, targetBucket: string, remapTimeFn: (time: string, bucket: string) => string) => {
    saveTasks(tasks.map(t => {
      if (t.id !== taskId) return t;
      const bucketChanged = t.timeBucket !== targetBucket;
      let newExactTime = t.exactTime || "";
      if (bucketChanged && newExactTime) newExactTime = remapTimeFn(newExactTime, targetBucket);
      return { ...t, suggestedDate: targetDate, timeBucket: targetBucket, exactTime: newExactTime };
    }));
  }, [tasks, saveTasks]);

  const toggleComplete = useCallback((taskId: string, dateStr: string) => {
    saveTasks(tasks.map(t => {
      if (t.id !== taskId) return t;
      const completedDates = t.completedDates || [];
      const isDone = completedDates.includes(dateStr);
      return { ...t, completedDates: isDone ? completedDates.filter(d => d !== dateStr) : [...completedDates, dateStr] };
    }));
  }, [tasks, saveTasks]);

  const deleteTaskInstance = useCallback((taskId: string, sourceDate: string) => {
    saveTasks(tasks.map(t => {
      if (t.id !== taskId) return t;
      if (t.recurrence && t.recurrence !== "none") {
        return { ...t, deletedDates: [...(t.deletedDates || []), sourceDate] };
      }
      return t;
    }).filter(t => t.id !== taskId || (t.recurrence && t.recurrence !== "none")));
  }, [tasks, saveTasks]);

  const deleteAllInstances = useCallback((taskId: string) => {
    saveTasks(tasks.filter(t => t.id !== taskId));
  }, [tasks, saveTasks]);

  const duplicateToNextDay = useCallback((taskId: string, sourceDate: string) => {
    const originalTask = tasks.find(t => t.id === taskId);
    if (!originalTask) return;
    const duplicatedTask: Task = {
      ...originalTask,
      id: Math.random().toString(36).substring(7),
      suggestedDate: getNextDayString(sourceDate),
      endDate: "",
      recurrence: "none",
      deletedDates: [],
    };
    saveTasks([...tasks, duplicatedTask]);
  }, [tasks, saveTasks]);

  return { tasks, applyAIResult, updateTask, moveTask, deleteTaskInstance, deleteAllInstances, duplicateToNextDay, toggleComplete };
}