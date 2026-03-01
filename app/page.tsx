// app/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { getLocalDateString } from "@/utils/dateUtils";
import { LEGEND } from "@/utils/taskUtils";
import { useTasks } from "@/hooks/useTasks";
import { useInlineEdit } from "@/hooks/useInlineEdit";
import { useDragDrop } from "@/hooks/useDragDrop";
import InputBar from "@/components/InputBar";
import CalendarBoard from "@/components/CalendarBoard";
import ActionDesk from "@/components/ActionDesk";
import AuthModal from "@/components/AuthModal";

export default function Home() {
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [inputError, setInputError] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [todayStr, setTodayStr] = useState(getLocalDateString(new Date()));

  // ── 本地 Auth State ────────────────────────────────────────
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // 初始加载：检查本地是否已经有登录过的记录
  useEffect(() => {
    const savedUser = localStorage.getItem("getplanned_current_user");
    if (savedUser) setUserEmail(savedUser);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("getplanned_current_user");
    setUserEmail(null);
  };
  // ─────────────────────────────────────────────────────────────────────────────

  // ── Core state (传入 userEmail) ──────────────────────────────────────────────
  const {
    tasks,
    applyAIResult,
    updateTask,
    moveTask,
    deleteTaskInstance,
    deleteAllInstances,
    duplicateToNextDay,
    toggleComplete, 
  } = useTasks(userEmail);

  // ── Inline editing ───────────────────────────────────────────────────────────
  const {
    editingTaskId, editingField, editValue, editTime, hourInputRef, minuteInputRef,
    setEditValue, setEditTime, startEdit, commitEdit, cancelEdit,
  } = useInlineEdit((taskId, field, value) => updateTask(taskId, field, value));

  // ── Drag & Drop ──────────────────────────────────────────────────────────────
  const { draggingTaskId, dropTarget, hoveringActionZone, handlePointerDown, handlePointerMove, handlePointerUp } =
    useDragDrop(editingTaskId, {
      onMove: moveTask, onDeleteInstance: deleteTaskInstance, onDeleteAll: deleteAllInstances, onDuplicate: duplicateToNextDay,
    });

  // ── Midnight refresh ─────────────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      const realNow = getLocalDateString(new Date());
      if (realNow !== todayStr) setTodayStr(realNow);
    }, 60000);
    return () => clearInterval(interval);
  }, [todayStr]);

  // ── AI submission ─────────────────────────────────────────────────────────────
  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || loading) return;

    if (!userEmail) {
      setIsAuthModalOpen(true);
      return;
    }

    setLoading(true);
    const originalInput = inputValue;

    try {
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

      const res = await fetch("/api/scaffold", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: inputValue, currentDate: todayStr, currentTime, tasks }),
      });

      const data = await res.json();
      const aiResult = data.steps || data;
      const { error } = applyAIResult(aiResult, todayStr); 

      if (error) {
        setInputError(true); setErrorMsg(error); setInputValue("");
        setTimeout(() => { setInputError(false); setErrorMsg(""); setInputValue(originalInput); }, 3000);
        return;
      }
      setInputValue("");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="main-container">
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={(email) => {
          setIsAuthModalOpen(false);
          if (email) setUserEmail(email);
        }} 
      />

      <div className="title-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>GetPlanned</h1>
        {userEmail ? (
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', color: '#666' }}>{userEmail}</span>
            <button onClick={handleLogout} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #e0e0e0', background: '#fff', cursor: 'pointer', fontSize: '12px' }}>
              Sign Out
            </button>
          </div>
        ) : (
          <button onClick={() => setIsAuthModalOpen(true)} style={{ padding: '6px 14px', borderRadius: '8px', background: '#171717', color: '#fff', cursor: 'pointer', border: 'none', fontWeight: 500 }}>
            Log In / Sign Up
          </button>
        )}
      </div>

      <InputBar value={inputValue} loading={loading} hasError={inputError} errorMsg={errorMsg} onChange={setInputValue} onSubmit={handleSubmit} />

      <div className="legend">
        {LEGEND.map((l) => (
          <div key={l.key} className="legend-item">
            <span className="legend-dot" style={{ background: l.color, boxShadow: `0 0 6px ${l.color}` }} />
            {l.label}
          </div>
        ))}
      </div>

      <CalendarBoard
        tasks={tasks} todayStr={todayStr} draggingTaskId={draggingTaskId} dropTarget={dropTarget}
        editingTaskId={editingTaskId} editingField={editingField} editValue={editValue} editTime={editTime}
        hourInputRef={hourInputRef} minuteInputRef={minuteInputRef} onSetEditValue={setEditValue} onSetEditTime={setEditTime}
        onDoubleClick={startEdit} onSaveEdit={commitEdit} onCancelEdit={cancelEdit}
        onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onToggleComplete={toggleComplete}
      />

      <ActionDesk draggingTaskId={draggingTaskId} tasks={tasks} hoveringActionZone={hoveringActionZone} />
    </main>
  );
}