// components/InputBar.tsx
"use client";

import { Send } from "lucide-react";

interface InputBarProps {
  value: string;
  loading: boolean;
  hasError: boolean;
  errorMsg: string;
  onChange: (v: string) => void;
  onSubmit: (e?: React.FormEvent) => void;
}

export default function InputBar({
  value,
  loading,
  hasError,
  errorMsg,
  onChange,
  onSubmit,
}: InputBarProps) {
  const hasText = value.trim().length > 0;

  return (
    <form
      onSubmit={onSubmit}
      className={`input-wrapper ${hasError ? "input-error" : ""}`}
    >
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={
          hasError
            ? errorMsg
            : "Add, move, or delete tasks... e.g., 'Reschedule reading to 8pm"
        }
        className="main-input"
        autoFocus
      />
      <button
        type="submit"
        disabled={loading || !hasText}
        className={`submit-btn ${hasText && !loading ? "active" : ""}`}
      >
        {loading ? <div className="spinner" /> : <Send size={16} strokeWidth={2.2} />}
      </button>
    </form>
  );
}