// components/TypewriterText.tsx
"use client";

import { useState, useEffect } from "react";

export default function TypewriterText({ text }: { text: string }) {
  const [displayedText, setDisplayedText] = useState("");

  useEffect(() => {
    if (!text) {
      setDisplayedText("");
      return;
    }

    const storageKey = `typed_${text.substring(0, 30)}`; 
    const hasPlayed = sessionStorage.getItem(storageKey);

    // 如果之前已经完整打完过这段字，就直接显示，保持安静
    if (hasPlayed) {
      setDisplayedText(text);
      return;
    }

    let i = 0;
    setDisplayedText("");

    const interval = setInterval(() => {
      i++;
      setDisplayedText(text.slice(0, i));
      
      // 🌟 核心修复：只有当字真正打完的时候，才存入缓存！
      // 这样就完美避开了 React 严格模式的“双重渲染”陷阱
      if (i >= text.length) {
        clearInterval(interval);
        sessionStorage.setItem(storageKey, "true");
      }
    }, 20); // 20ms 的速度视觉上最丝滑

    // 组件卸载时清理定时器
    return () => {
      clearInterval(interval);
    };
  }, [text]);

  return <span>{displayedText}</span>;
}