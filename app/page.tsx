// app/page.tsx
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { getLocalDateString } from "@/utils/dateUtils";
import { LEGEND } from "@/utils/taskUtils";
import { useTasks } from "@/hooks/useTasks";
import { useInlineEdit } from "@/hooks/useInlineEdit";
import { useDragDrop } from "@/hooks/useDragDrop";
import InputBar from "@/components/InputBar";
import CalendarBoard from "@/components/CalendarBoard";
import ActionDesk from "@/components/ActionDesk";
import AuthModal from "@/components/AuthModal";
import TypewriterText from "@/components/TypewriterText";

export default function Home() {
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [inputError, setInputError] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [todayStr, setTodayStr] = useState(getLocalDateString(new Date()));

  // ── 新增：AI 思考与理由状态 ────────────────────────────────────────
  const [aiReasoning, setAiReasoning] = useState<string>("");
  const [thinkingIndex, setThinkingIndex] = useState(0);

  const thinkingPhrases = useMemo(() => [
    "Thinking about your schedule...",
    "Analyzing task priorities...",
    "Balancing your workload...",
    "Drafting the perfect plan..."
  ], []);

  // 循环播放思考文案
  useEffect(() => {
    if (loading) {
      const timer = setInterval(() => {
        setThinkingIndex((prev) => (prev + 1) % thinkingPhrases.length);
      }, 1500);
      return () => clearInterval(timer);
    } else {
      setThinkingIndex(0);
    }
  }, [loading, thinkingPhrases]);
  // ─────────────────────────────────────────────────────────────────────────────

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
  } = useInlineEdit((taskId, updates) => updateTask(taskId, updates));

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
    setAiReasoning(""); // 提交前清空旧的理由
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
      
      // 注意：从 applyAIResult 解构出 reasoning
      const { error, reasoning } = applyAIResult(aiResult, todayStr); 

      if (error) {
        setInputError(true); setErrorMsg(error); setInputValue("");
        setTimeout(() => { setInputError(false); setErrorMsg(""); setInputValue(originalInput); }, 3000);
        return;
      }
      
      setInputValue("");
      if (reasoning) setAiReasoning(reasoning); // 成功后设置 AI 理由

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

      {/* 🌟 动态加载状态与 AI 理由展示区域 */}
      <div style={{ minHeight: '30px', marginBottom: '16px', textAlign: 'center', transition: 'all 0.3s' }}>
        {loading ? (
          <div style={{ color: '#FF835C', fontSize: '14px', fontWeight: 500, animation: 'pulse-dot 1.5s infinite' }}>
            {thinkingPhrases[thinkingIndex]}
          </div>
        ) : aiReasoning ? (
          <div style={{
            background: 'var(--today-bg)', border: '1px solid var(--today-border)',
            color: 'var(--text-secondary)', padding: '10px 16px', borderRadius: '12px',
            fontSize: '13px', display: 'inline-block', maxWidth: '80%', lineHeight: '1.5',
            boxShadow: 'var(--shadow-sm)', textAlign: 'left'
          }}>
            <span style={{fontWeight: 600, color: 'var(--today-accent)', marginRight: '6px'}}>✨ AI:</span>
            <TypewriterText text={aiReasoning} />
            <span 
              onClick={() => setAiReasoning("")} 
              style={{cursor: 'pointer', marginLeft: '12px', color: '#999', fontWeight: 'bold'}}
              title="Dismiss"
            >
              ✕
            </span>
          </div>
        ) : null}
      </div>

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