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
      // 🌟 核心修复：存入本地前剔除 isNew，防止用户刷新页面后所有卡片再次乱飞
      const tasksToSave = newTasks.map(({ isNew, ...rest }) => rest);
      localStorage.setItem(`getplanned_tasks_${userEmail}`, JSON.stringify(tasksToSave));
    }
  }, [userEmail]);

  // ── 3. AI 操作逻辑 (改造为支持多任务批处理 & 时长预估 & 图标识别) ────────────────
  const applyAIResult = useCallback((aiResult: any, todayStr: string) => {
    if (!aiResult) return { error: null };
    if (!userEmail) return { error: "Please log in first!" }; 

    // 1. 错误拦截
    if (aiResult.action === "ERROR" || (aiResult.operations && aiResult.operations[0]?.action === "ERROR")) {
      const errMsg = aiResult.errorMessage || aiResult.operations?.[0]?.errorMessage || "Sorry, I couldn't process that.";
      return { error: errMsg, reasoning: null };
    }

    // 2. 拷贝当前任务列表，用于在内存中进行批处理
    let currentTasks = [...tasks];
    
    // 3. 兼容处理：提取 operations 数组
    const operations = aiResult.operations || (aiResult.action ? [aiResult] : []);

    // 4. 遍历并执行每一个操作
    operations.forEach((op: any) => {
      if (op.action === "CREATE" && op.taskDetails) {
        const details = op.taskDetails;
        const finalTimeBucket = details.timeBucket && details.timeBucket !== "any" 
          ? details.timeBucket 
          : getCurrentTimeBucket();
        
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
          completedDates: [],
          duration: details.duration || 30, 
          isEstimatedDuration: details.isEstimatedDuration ?? true,
          icon: details.icon || "Circle", // 接收 AI 给的图标
          isNew: true // 🌟 核心修复：给刚刚生成的任务打上 isNew 标记，触发卡片飞入动画
        };
        
        currentTasks.push(newTask);
      }

      else if (op.action === "UPDATE" && op.targetTaskId) {
        currentTasks = currentTasks.map(t => 
          t.id === op.targetTaskId ? { ...t, ...op.taskDetails } : t
        );
      }

      else if (op.action === "DELETE" && op.targetTaskId) {
        currentTasks = currentTasks.filter(t => t.id !== op.targetTaskId);
      }
    });

    // 5. 批处理完成后，一次性保存到本地状态和 LocalStorage
    saveTasks(currentTasks);

    // 6. 将 AI 的安排理由 (reasoning) 传回给组件
    return { error: null, reasoning: aiResult.reasoning };
  }, [tasks, userEmail, saveTasks]);

  // ── 4. 其他所有拖拽、修改操作 ───────────────────────────
  
  const updateTask = useCallback((taskId: string, updates: Partial<Task>) => {
    saveTasks(tasks.map(t => t.id === taskId ? { ...t, ...updates } : t));
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