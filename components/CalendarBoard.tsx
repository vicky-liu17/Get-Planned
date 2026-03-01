// components/CalendarBoard.tsx
"use client";

import { useRef, useEffect, useState, useMemo } from "react";
import { ArrowLeft, ArrowRight, Sunrise, Sun, Moon } from "lucide-react";
import { Task } from "@/types";
import { getLocalDateString, isTaskOnDate } from "@/utils/dateUtils";
import TaskBlock from "./TaskBlock";
import { EditField } from "@/hooks/useInlineEdit";

interface CalendarBoardProps {
  tasks: Task[];
  todayStr: string;
  draggingTaskId: string | null;
  dropTarget: { date: string; bucket: string } | null;
  
  // Edit props
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
  
  // Drag props
  onPointerDown: (e: React.PointerEvent, taskId: string, sourceDate: string) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;

  // 👇 新增：点击完成的回调
  onToggleComplete: (taskId: string, date: string) => void;
}

export default function CalendarBoard({
  tasks,
  todayStr,
  draggingTaskId,
  dropTarget,
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
  onToggleComplete, // 👈 接收新 Props
}: CalendarBoardProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const todayColumnRef = useRef<HTMLDivElement>(null);
  const endColumnRef = useRef<HTMLDivElement>(null);
  const [futureDaysBuffer, setFutureDaysBuffer] = useState(7);
  const [offScreenDirection, setOffScreenDirection] = useState<"left" | "right" | null>(null);

  const timelineDays = useMemo(() => {
    const [y, m, d] = todayStr.split("-").map(Number);
    const today = new Date(y, m - 1, d);
    today.setHours(0, 0, 0, 0);

    let minDate = new Date(today);
    minDate.setDate(minDate.getDate() - 1);
    let maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + futureDaysBuffer);

    tasks.forEach((t) => {
      if (/^\d{4}-\d{2}-\d{2}$/.test(t.suggestedDate)) {
        const taskDate = new Date(t.suggestedDate);
        taskDate.setHours(0, 0, 0, 0);
        if (taskDate > maxDate) maxDate = new Date(taskDate);
      }
    });

    const days = [];
    let current = new Date(minDate);
    const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

    while (current <= maxDate) {
      const dateKey = getLocalDateString(current);
      const dayIndex = current.getDay();
      const isWeekend = dayIndex === 0 || dayIndex === 6;
      const diffDays = Math.round((current.getTime() - today.getTime()) / 86400000);
      let label =
        diffDays === 0
          ? "Today"
          : diffDays === 1
          ? "Tomorrow"
          : diffDays === -1
          ? "Yesterday"
          : `${monthNames[current.getMonth()]} ${current.getDate()}`;
      days.push({ label, dateKey, isToday: diffDays === 0, weekday: daysOfWeek[dayIndex], isWeekend });
      current.setDate(current.getDate() + 1);
    }
    return days;
  }, [tasks, futureDaysBuffer, todayStr]);

  // Infinite scroll
  useEffect(() => {
    if (!endColumnRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setFutureDaysBuffer((prev) => prev + 7);
      },
      { threshold: 0.1 }
    );
    observer.observe(endColumnRef.current);
    return () => observer.disconnect();
  }, [timelineDays]);

  // Today off-screen indicator
  useEffect(() => {
    if (!todayColumnRef.current || !scrollContainerRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setOffScreenDirection(null);
        else
          setOffScreenDirection(
            entry.boundingClientRect.left < (entry.rootBounds?.left ?? 0) ? "left" : "right"
          );
      },
      { root: scrollContainerRef.current, threshold: 0.05 }
    );
    observer.observe(todayColumnRef.current);
    return () => observer.disconnect();
  }, [timelineDays]);

  const scrollToToday = () =>
    todayColumnRef.current?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });

  const renderCellTasks = (targetDate: string, targetBucket: string) => {
    let cellTasks = tasks.filter(
      (t) =>
        isTaskOnDate(t, targetDate) &&
        (t.timeBucket === targetBucket || (targetBucket === "afternoon" && t.timeBucket === "any"))
    );

    cellTasks.sort((a, b) => {
      // 已完成的任务稍微排在后面一点，让未完成的任务优先
      const aDone = a.completedDates?.includes(targetDate) ? 1 : 0;
      const bDone = b.completedDates?.includes(targetDate) ? 1 : 0;
      if (aDone !== bDone) return aDone - bDone;

      if (a.exactTime && b.exactTime) return a.exactTime.localeCompare(b.exactTime);
      if (a.exactTime) return -1;
      if (b.exactTime) return 1;
      return 0;
    });

    return cellTasks.map((task) => (
      <TaskBlock
        key={`${task.id}-${targetDate}`}
        task={task}
        targetDate={targetDate}
        isDragging={draggingTaskId === task.id}
        editingTaskId={editingTaskId}
        editingField={editingField}
        editValue={editValue}
        editTime={editTime}
        hourInputRef={hourInputRef}
        minuteInputRef={minuteInputRef}
        onSetEditValue={onSetEditValue}
        onSetEditTime={onSetEditTime}
        onDoubleClick={onDoubleClick}
        onSaveEdit={onSaveEdit}
        onCancelEdit={onCancelEdit}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onToggleComplete={onToggleComplete} // 👈 传递给 TaskBlock
      />
    ));
  };

  return (
    <div className="calendar-section">
      <div className="calendar-wrapper" ref={scrollContainerRef}>
        <div className="calendar-board">
          {timelineDays.map((day) => (
            <div
              key={day.dateKey}
              ref={day.isToday ? todayColumnRef : null}
              className={`day-column ${day.isWeekend ? "weekend-column" : ""} ${day.isToday ? "today-column" : ""}`}
            >
              <div className="day-header">
                <span className={`day-label ${day.isToday ? "is-today" : ""}`}>
                  {day.label}
                  <span className="weekday-label">{day.weekday}</span>
                </span>
              </div>

              {(["morning", "afternoon", "evening"] as const).map((bucket) => {
                const isActive =
                  dropTarget?.date === day.dateKey &&
                  dropTarget?.bucket === bucket &&
                  draggingTaskId !== null;
                const Icon =
                  bucket === "morning" ? Sunrise : bucket === "afternoon" ? Sun : Moon;

                return (
                  <div
                    key={bucket}
                    className="time-group"
                    data-drop-zone
                    data-date={day.dateKey}
                    data-bucket={bucket}
                    style={
                      isActive
                        ? {
                            background: "rgba(124, 92, 252, 0.08)",
                            borderRadius: "10px",
                            outline: "1.5px dashed rgba(124, 92, 252, 0.5)",
                            transition: "background 0.15s",
                          }
                        : { transition: "background 0.15s" }
                    }
                  >
                    <div className="time-label">
                      <Icon size={14} strokeWidth={2.5} />
                      {bucket.charAt(0).toUpperCase() + bucket.slice(1)}
                    </div>
                    <div className="task-list">{renderCellTasks(day.dateKey, bucket)}</div>
                  </div>
                );
              })}
            </div>
          ))}
          <div
            ref={endColumnRef}
            style={{ width: "10px", flexShrink: 0, opacity: 0, pointerEvents: "none" }}
          />
        </div>
      </div>

      {offScreenDirection === "left" && (
        <button className="minimal-back-btn left" onClick={scrollToToday}>
          <ArrowLeft size={13} strokeWidth={2.5} /> Today
        </button>
      )}
      {offScreenDirection === "right" && (
        <button className="minimal-back-btn right" onClick={scrollToToday}>
          Today <ArrowRight size={13} strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}