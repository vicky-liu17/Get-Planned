// hooks/useDragDrop.ts
import { useRef, useState, useCallback } from "react";
import { DragState } from "@/types";
import { remapTimeForBucket } from "@/utils/dateUtils";

type ActionZone = "trash" | "trash-all" | "duplicate" | null;

interface DragDropCallbacks {
  onMove: (taskId: string, targetDate: string, targetBucket: string, remapFn: typeof remapTimeForBucket) => void;
  onDeleteInstance: (taskId: string, sourceDate: string) => void;
  onDeleteAll: (taskId: string) => void;
  onDuplicate: (taskId: string, sourceDate: string) => void;
}

const createGhost = (sourceEl: HTMLElement): HTMLElement => {
  const ghost = sourceEl.cloneNode(true) as HTMLElement;
  ghost.style.cssText = `
    position: fixed; pointer-events: none; z-index: 9999; opacity: 0.88;
    transform: scale(1.05) rotate(-1.5deg);
    box-shadow: 0 20px 60px rgba(0,0,0,0.6), 0 0 30px rgba(124,92,252,0.35);
    border-radius: 8px; width: ${sourceEl.offsetWidth}px;
    filter: brightness(1.15); will-change: transform;
  `;
  document.body.appendChild(ghost);
  return ghost;
};

const getDropZoneFromPoint = (x: number, y: number) => {
  const el = document.elementFromPoint(x, y);
  const zone = (el as HTMLElement)?.closest("[data-drop-zone]") as HTMLElement | null;
  return zone ? { date: zone.dataset.date || "", bucket: zone.dataset.bucket || "" } : null;
};

export function useDragDrop(editingTaskId: string | null, callbacks: DragDropCallbacks) {
  const dragRef = useRef<DragState | null>(null);
  const dragSourceElRef = useRef<HTMLElement | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialPointerRef = useRef<{ x: number; y: number } | null>(null);

  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ date: string; bucket: string } | null>(null);
  const [hoveringActionZone, setHoveringActionZone] = useState<ActionZone>(null);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, taskId: string, sourceDate: string) => {
      if (editingTaskId) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;

      const sourceEl = e.currentTarget as HTMLElement;
      initialPointerRef.current = { x: e.clientX, y: e.clientY };

      longPressTimerRef.current = setTimeout(() => {
        const rect = sourceEl.getBoundingClientRect();
        const ghost = createGhost(sourceEl);
        ghost.style.left = `${rect.left}px`;
        ghost.style.top = `${rect.top}px`;
        sourceEl.style.visibility = "hidden";
        dragSourceElRef.current = sourceEl;
        dragRef.current = {
          taskId,
          sourceDate,
          ghost,
          offsetX: e.clientX - rect.left,
          offsetY: e.clientY - rect.top,
        };
        setDraggingTaskId(taskId);
        sourceEl.setPointerCapture(e.pointerId);
      }, 350);
    },
    [editingTaskId]
  );

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (longPressTimerRef.current && dragRef.current === null) {
      if (initialPointerRef.current) {
        const distance = Math.hypot(
          e.clientX - initialPointerRef.current.x,
          e.clientY - initialPointerRef.current.y
        );
        if (distance > 8) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
          initialPointerRef.current = null;
        }
      }
      return;
    }
    if (!dragRef.current) return;

    const { ghost, offsetX, offsetY } = dragRef.current;
    if (ghost) {
      ghost.style.left = `${e.clientX - offsetX}px`;
      ghost.style.top = `${e.clientY - offsetY}px`;
    }

    const actionEl = document
      .elementFromPoint(e.clientX, e.clientY)
      ?.closest("[data-action-zone]");
    if (actionEl) {
      setHoveringActionZone((actionEl as HTMLElement).dataset.actionZone as ActionZone);
      setDropTarget(null);
    } else {
      setHoveringActionZone(null);
      setDropTarget(getDropZoneFromPoint(e.clientX, e.clientY));
    }
  }, []);

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      initialPointerRef.current = null;
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      if (!dragRef.current) return;

      const { taskId, sourceDate, ghost } = dragRef.current;
      if (dragSourceElRef.current) {
        dragSourceElRef.current.style.visibility = "";
        dragSourceElRef.current = null;
      }

      const actionEl = document
        .elementFromPoint(e.clientX, e.clientY)
        ?.closest("[data-action-zone]");

      const animateGhostOut = (scale: string, rotate: string) => {
        if (ghost) {
          ghost.style.transition = "opacity 0.2s, transform 0.2s";
          ghost.style.opacity = "0";
          ghost.style.transform = `scale(${scale}) rotate(${rotate})`;
          setTimeout(() => ghost.remove(), 200);
        }
      };

      if (actionEl) {
        const zoneType = (actionEl as HTMLElement).dataset.actionZone;
        if (zoneType === "trash") {
          animateGhostOut("0.5", "-10deg");
          callbacks.onDeleteInstance(taskId, sourceDate);
        } else if (zoneType === "trash-all") {
          animateGhostOut("0.5", "-10deg");
          callbacks.onDeleteAll(taskId);
        } else if (zoneType === "duplicate") {
          animateGhostOut("1.15", "0deg");
          callbacks.onDuplicate(taskId, sourceDate);
        }
      } else {
        if (ghost) {
          ghost.style.transition = "opacity 0.15s, transform 0.15s";
          ghost.style.opacity = "0";
          ghost.style.transform = "scale(0.9) rotate(0deg)";
          setTimeout(() => ghost.remove(), 150);
        }
        const zone = getDropZoneFromPoint(e.clientX, e.clientY);
        if (zone && zone.date && zone.bucket) {
          callbacks.onMove(taskId, zone.date, zone.bucket, remapTimeForBucket);
        }
      }

      dragRef.current = null;
      setDraggingTaskId(null);
      setDropTarget(null);
      setHoveringActionZone(null);
    },
    [callbacks]
  );

  return {
    draggingTaskId,
    dropTarget,
    hoveringActionZone,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
}