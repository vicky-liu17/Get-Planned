// components/TaskBlock.tsx
"use client";

import { useState } from "react"; 
import { 
  Clock, MapPin, Repeat, Check, Hourglass,
  // 🌟 42个精选业务图标
  BookOpen, PenTool, Briefcase, Monitor, GraduationCap, Calculator, FileText, 
  Presentation, Code, Dumbbell, Heart, Activity, Pill, Apple, Droplet, 
  Coffee, Utensils, Bed, ShoppingCart, Home, Sun, Moon, Bath, Shirt, 
  Wrench, Users, Phone, Mail, MessageCircle, Video, Plane, Car, Bus, 
  Map, Music, Tv, Gamepad2, Camera, Ticket, Palette, Star, Circle
} from "lucide-react"; 
import { Task } from "@/types";
import { getCategoryClass } from "@/utils/taskUtils";
import { EditField } from "@/hooks/useInlineEdit";
import { formatDuration } from "@/utils/dateUtils";

// 🌟 图标映射字典
const ICON_MAP: Record<string, React.ElementType> = {
  BookOpen, PenTool, Briefcase, Monitor, GraduationCap, Calculator, FileText, 
  Presentation, Code, Dumbbell, Heart, Activity, Pill, Apple, Droplet, 
  Coffee, Utensils, Bed, ShoppingCart, Home, Sun, Moon, Bath, Shirt, 
  Wrench, Users, Phone, Mail, MessageCircle, Video, Plane, Car, Bus, 
  Map, Music, Tv, Gamepad2, Camera, Ticket, Palette, Star, Circle
};

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

// 🌟 播放本地 MP3 音效
const playSuccessSound = () => {
  try {
    const audio = new Audio("/sounds/success.mp3");
    audio.volume = 0.6; // 音量控制在 60%，清脆不刺耳
    audio.play().catch(e => console.log("Audio play failed (maybe browser auto-play policy):", e));
  } catch (e) {
    console.log("Audio not supported.", e);
  }
};

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
  const [showBurst, setShowBurst] = useState(false); 

  // 🌟 解析 AI 给的图标，默认使用 Circle
  const TaskIcon = ICON_MAP[task.icon || "Circle"] || Circle;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") onSaveEdit(task.id);
    if (e.key === "Escape") onCancelEdit();
  };

  const handleToggleCheck = (e: React.MouseEvent) => {
    e.stopPropagation(); 
    
    if (!isCompleted) {
      setShowBurst(true);
      playSuccessSound(); // 🌟 触发 MP3 音效
      setTimeout(() => setShowBurst(false), 1000); 
    }

    onToggleComplete(task.id, targetDate);
  };

  const calculateMinHeight = () => {
    if (!task.duration) return "auto";
    const baseHeight = 65;
    const dynamicHeight = Math.min(Math.max(baseHeight + (task.duration - 30) * 0.4, baseHeight), 140);
    return `${dynamicHeight}px`;
  };

  return (
    <div
      key={`${task.id}-${targetDate}`}
      // 🌟 核心：如果有 isNew 标记，就挂载 is-new 类名来触发 CSS 里的飞入动效
      className={`task-block ${getCategoryClass(task.category)} ${isCompleted ? "is-completed" : ""} ${task.isNew ? "is-new" : ""}`}
      style={{
        cursor: isDragging ? "grabbing" : "grab",
        userSelect: "none",
        touchAction: "none",
        opacity: isDragging ? 0.3 : 1,
        minHeight: calculateMinHeight(),
      }}
      onPointerDown={(e) => onPointerDown(e, task.id, targetDate)}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div className="task-header">
        
        {/* 🌟 动态语义图标 */}
        <div className="task-icon-wrapper">
          <TaskIcon size={14} strokeWidth={2.5} />
        </div>

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
                <Repeat size={11} strokeWidth={3} className="repeat-icon" />
              )}
            </div>
          )}
        </div>

        <div 
          className={`task-done-btn ${isCompleted ? "is-active" : ""}`}
          onClick={handleToggleCheck}
          onPointerDown={(e) => e.stopPropagation()} 
        >
          <div className="done-circle">
            <Check size={12} strokeWidth={4} className="check-mark" />
          </div>
          
          {showBurst && (
            <div className="achievement-burst">
              {[...Array(6)].map((_, i) => (
                <span key={i} className={`particle p${i + 1}`} />
              ))}
            </div>
          )}
        </div>
      </div>

      {(task.exactTime || task.duration || task.location || isEditing) && (
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

          {(task.duration || (isEditing && editingField === "duration")) && (
            <span className="task-meta-item">
              <Hourglass size={11} strokeWidth={2.5} />
              {isEditing && editingField === "duration" ? (
                <input
                  autoFocus
                  className="inline-edit-input location-edit"
                  style={{ width: '45px' }}
                  value={editValue}
                  placeholder="e.g. 2h"
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
                    onDoubleClick(task, "duration");
                  }}
                  title={task.isEstimatedDuration ? "AI Estimated (Double click to lock)" : "Duration"}
                >
                  {formatDuration(task.duration, task.isEstimatedDuration)}
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