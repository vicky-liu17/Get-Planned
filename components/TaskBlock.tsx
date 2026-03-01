// components/TaskBlock.tsx
"use client";

import { useState } from "react"; // 👈 新增引入 useState
import { Clock, MapPin, Repeat, Check } from "lucide-react";
import { Task } from "@/types";
import { getCategoryClass } from "@/utils/taskUtils";
import { EditField } from "@/hooks/useInlineEdit";

interface TaskBlockProps {
  task: Task;
  targetDate: string;
  isDragging: boolean;
  editingTaskId: string | null;
  editingField: EditField | null;
  editValue: string;
  editTime: { h: string; m: string };
  hourInputRef: React.RefObject<HTMLInputElement | null>;
  minuteInputRef: React.RefObject<HTMLInputElement | null>;
  
  onSetEditValue: (v: string) => void;
  onSetEditTime: (t: { h: string; m: string }) => void;
  onDoubleClick: (task: Task, field: EditField) => void;
  onSaveEdit: (taskId: string) => void;
  onCancelEdit: () => void;
  onPointerDown: (e: React.PointerEvent, taskId: string, sourceDate: string) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onToggleComplete: (taskId: string, date: string) => void;
}

export default function TaskBlock({
  task,
  targetDate,
  isDragging,
  editingTaskId,
  editingField,
  editValue,
  editTime,
  hourInputRef,
  minuteInputRef,
  onSetEditValue,
  onSetEditTime,
  onDoubleClick,
  onSaveEdit,
  onCancelEdit,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onToggleComplete,
}: TaskBlockProps) {
  const isEditing = editingTaskId === task.id;
  const isCompleted = task.completedDates?.includes(targetDate);
  
  // 👈 新增：专门用于控制喷发动画的局部状态
  const [showBurst, setShowBurst] = useState(false); 

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") onSaveEdit(task.id);
    if (e.key === "Escape") onCancelEdit();
  };

  const handleToggleCheck = (e: React.MouseEvent) => {
    e.stopPropagation(); // 关键：阻止冒泡，避免触发编辑模式
    
    // 👈 新增核心逻辑：只有在“点击且即将完成”的那一刻才触发动画
    if (!isCompleted) {
      setShowBurst(true);
      // 动画播放完后重置状态（假设 CSS 动画大约需要 1 秒，可根据你的 CSS 时长微调）
      setTimeout(() => setShowBurst(false), 1000); 
    }

    onToggleComplete(task.id, targetDate);
  };

  return (
    <div
      key={`${task.id}-${targetDate}`}
      className={`task-block ${getCategoryClass(task.category)} ${isCompleted ? "is-completed" : ""}`}
      style={{
        cursor: isDragging ? "grabbing" : "grab",
        userSelect: "none",
        touchAction: "none",
        opacity: isDragging ? 0.3 : 1,
      }}
      onPointerDown={(e) => onPointerDown(e, task.id, targetDate)}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {/* Header Row: Dot + Title + Done Button */}
      <div className="task-header">
        {/* 左侧：纯分类标识点（不可点击） */}
        <div className="task-dot" />

        {/* 中间：标题内容 */}
        <div className="task-title-area">
          {isEditing && editingField === "taskName" ? (
            <input
              autoFocus
              className="inline-edit-input title-edit"
              value={editValue}
              onChange={(e) => onSetEditValue(e.target.value)}
              onBlur={() => onSaveEdit(task.id)}
              onKeyDown={handleKeyDown}
            />
          ) : (
            <div className={`task-title ${isCompleted ? "completed-text" : ""}`}>
              <span
                style={{ cursor: isCompleted ? "default" : "text" }}
                onDoubleClick={(e) => {
                  if (isCompleted) return;
                  e.stopPropagation();
                  onDoubleClick(task, "taskName");
                }}
              >
                {task.taskName}
              </span>
              {task.recurrence && task.recurrence !== "none" && (
                <Repeat
                  size={11}
                  strokeWidth={3}
                  className="repeat-icon"
                />
              )}
            </div>
          )}
        </div>

        {/* 右侧：交互式完成按钮 */}
        <div 
          className={`task-done-btn ${isCompleted ? "is-active" : ""}`}
          onClick={handleToggleCheck}
          onPointerDown={(e) => e.stopPropagation()} // 防止触发卡片拖拽
        >
          <div className="done-circle">
            <Check size={12} strokeWidth={4} className="check-mark" />
          </div>
          
          {/* 👈 修改点：不再依赖 isCompleted，而是依赖我们手动控制的 showBurst */}
          {showBurst && (
            <div className="achievement-burst">
              {[...Array(6)].map((_, i) => (
                <span key={i} className={`particle p${i + 1}`} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Meta Row: Time & Location */}
      {(task.exactTime || task.location || isEditing) && (
        <div className={`task-meta ${isCompleted ? "completed-meta" : ""}`}>
          {(task.exactTime || (isEditing && editingField === "exactTime")) && (
            <span className="task-meta-item">
              <Clock size={11} strokeWidth={2.5} />
              {isEditing && editingField === "exactTime" ? (
                <div
                  className="time-edit-wrapper"
                  onBlur={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node))
                      onSaveEdit(task.id);
                  }}
                >
                  <input
                    ref={hourInputRef}
                    className="time-split-input"
                    value={editTime.h}
                    placeholder="00"
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 2);
                      onSetEditTime({ ...editTime, h: val });
                      if (val.length === 2) minuteInputRef.current?.focus();
                    }}
                    onKeyDown={handleKeyDown}
                  />
                  <span className="time-colon">:</span>
                  <input
                    ref={minuteInputRef}
                    className="time-split-input"
                    value={editTime.m}
                    placeholder="00"
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 2);
                      onSetEditTime({ ...editTime, m: val });
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Backspace" && editTime.m === "")
                        hourInputRef.current?.focus();
                      handleKeyDown(e);
                    }}
                  />
                </div>
              ) : (
                <span
                  style={{ cursor: isCompleted ? "default" : "text" }}
                  onDoubleClick={(e) => {
                    if (isCompleted) return;
                    e.stopPropagation();
                    onDoubleClick(task, "exactTime");
                  }}
                >
                  {task.exactTime}
                </span>
              )}
            </span>
          )}

          {(task.location || (isEditing && editingField === "location")) && (
            <span className="task-meta-item">
              <MapPin size={11} strokeWidth={2.5} />
              {isEditing && editingField === "location" ? (
                <input
                  autoFocus
                  className="inline-edit-input location-edit"
                  value={editValue}
                  placeholder="Location..."
                  onChange={(e) => onSetEditValue(e.target.value)}
                  onBlur={() => onSaveEdit(task.id)}
                  onKeyDown={handleKeyDown}
                />
              ) : (
                <span
                  style={{ cursor: isCompleted ? "default" : "text" }}
                  onDoubleClick={(e) => {
                    if (isCompleted) return;
                    e.stopPropagation();
                    onDoubleClick(task, "location");
                  }}
                >
                  {task.location}
                </span>
              )}
            </span>
          )}
        </div>
      )}
    </div>
  );
}