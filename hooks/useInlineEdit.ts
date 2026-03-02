// hooks/useInlineEdit.ts
import { useState, useRef } from "react";
import { Task } from "@/types";
import { parseDurationToMins } from "@/utils/dateUtils";

// 🌟 核心修复点1：必须在这里把 "duration" 加进去！
export type EditField = "taskName" | "exactTime" | "location" | "duration";

// 🌟 核心修复点2：onSave 的参数改为接收 updates 对象
export function useInlineEdit(onSave: (taskId: string, updates: Partial<Task>) => void) {
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<EditField | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editTime, setEditTime] = useState({ h: "", m: "" });

  const hourInputRef = useRef<HTMLInputElement | null>(null);
  const minuteInputRef = useRef<HTMLInputElement | null>(null);

  const startEdit = (task: Task, field: EditField) => {
    setEditingTaskId(task.id);
    setEditingField(field);
    if (field === "exactTime") {
      const [h = "", m = ""] = (task.exactTime || "").split(":");
      setEditTime({ h, m });
      setTimeout(() => hourInputRef.current?.focus(), 10);
    } else if (field === "duration") {
      // 时长编辑：如果有值就转成文本，没有就是空
      setEditValue(task.duration ? `${task.duration}m` : "");
    } else {
      setEditValue(task[field] || "");
    }
  };

  const commitEdit = (taskId: string) => {
    if (!editingField) return;
    
    if (editingField === "exactTime") {
      let finalValue = "";
      if (editTime.h !== "" || editTime.m !== "") {
        const finalH = editTime.h.padStart(2, "0");
        const finalM = editTime.m.padStart(2, "0");
        finalValue = `${finalH}:${finalM}`;
        if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(finalValue)) {
          cancelEdit(); return;
        }
      }
      onSave(taskId, { exactTime: finalValue });
    } else if (editingField === "duration") {
      // 解析用户输入的时长，并把“猜测”标记设为 false
      const mins = parseDurationToMins(editValue);
      if (mins > 0) {
        onSave(taskId, { duration: mins, isEstimatedDuration: false });
      } else {
        onSave(taskId, { duration: undefined, isEstimatedDuration: false });
      }
    } else {
      onSave(taskId, { [editingField]: editValue.trim() });
    }
    cancelEdit();
  };

  const cancelEdit = () => {
    setEditingTaskId(null);
    setEditingField(null);
  };

  return {
    editingTaskId,
    editingField,
    editValue,
    editTime,
    hourInputRef,
    minuteInputRef,
    setEditValue,
    setEditTime,
    startEdit,
    commitEdit,
    cancelEdit,
  };
}