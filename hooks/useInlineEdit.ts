// hooks/useInlineEdit.ts
import { useState, useRef } from "react";
import { Task } from "@/types";

export type EditField = "taskName" | "exactTime" | "location";

export function useInlineEdit(onSave: (taskId: string, field: EditField, value: string) => void) {
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<EditField | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editTime, setEditTime] = useState({ h: "", m: "" });

  // 👇 关键修改：显式告诉 TypeScript，这个 Ref 允许为 null
  const hourInputRef = useRef<HTMLInputElement | null>(null);
  const minuteInputRef = useRef<HTMLInputElement | null>(null);

  const startEdit = (task: Task, field: EditField) => {
    setEditingTaskId(task.id);
    setEditingField(field);
    if (field === "exactTime") {
      const [h = "", m = ""] = (task.exactTime || "").split(":");
      setEditTime({ h, m });
      setTimeout(() => hourInputRef.current?.focus(), 10);
    } else {
      setEditValue(task[field] || "");
    }
  };

  const commitEdit = (taskId: string) => {
    if (!editingField) return;
    let finalValue = "";
    if (editingField === "exactTime") {
      if (editTime.h === "" && editTime.m === "") {
        finalValue = "";
      } else {
        const finalH = editTime.h.padStart(2, "0");
        const finalM = editTime.m.padStart(2, "0");
        finalValue = `${finalH}:${finalM}`;
        if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(finalValue)) {
          cancelEdit();
          return;
        }
      }
    } else {
      finalValue = editValue.trim();
    }
    onSave(taskId, editingField, finalValue);
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