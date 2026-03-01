// components/ActionDesk.tsx
"use client";

import { Trash2, Copy, CalendarX } from "lucide-react";
import { Task } from "@/types";

interface ActionDeskProps {
  draggingTaskId: string | null;
  tasks: Task[];
  hoveringActionZone: "trash" | "trash-all" | "duplicate" | null;
}

export default function ActionDesk({
  draggingTaskId,
  tasks,
  hoveringActionZone,
}: ActionDeskProps) {
  const draggedTask = tasks.find((t) => t.id === draggingTaskId);
  const isDraggingRecurring =
    draggedTask?.recurrence && draggedTask.recurrence !== "none";

  return (
    <div
      className={`action-desk-wrapper ${draggingTaskId !== null ? "visible" : ""}`}
    >
      <div
        className={`action-drop-area trash-area ${hoveringActionZone === "trash" ? "active" : ""}`}
        data-action-zone="trash"
      >
        <Trash2 size={24} strokeWidth={2} />
        <span>{isDraggingRecurring ? "Delete This" : "Delete"}</span>
      </div>

      {isDraggingRecurring && (
        <div
          className={`action-drop-area trash-all-area ${hoveringActionZone === "trash-all" ? "active" : ""}`}
          data-action-zone="trash-all"
        >
          <CalendarX size={24} strokeWidth={2} />
          <span>Delete All</span>
        </div>
      )}

      <div
        className={`action-drop-area duplicate-area ${hoveringActionZone === "duplicate" ? "active" : ""}`}
        data-action-zone="duplicate"
      >
        <Copy size={24} strokeWidth={2} />
        <span>Duplicate to Next Day</span>
      </div>
    </div>
  );
}