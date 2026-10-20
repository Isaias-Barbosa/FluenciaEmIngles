"use client";
import { useEffect, useState } from "react";
import { readQuizStats, type QuizStats } from "@/lib/quiz/vocabulary";
import { quizHistoryEvent, quizHistoryKey } from "@/lib/quiz/progress";

export function useQuizHistory(userId: string) {
  const [snapshot, setSnapshot] = useState<{ userId: string; stats: QuizStats; ready: boolean; unavailable: boolean }>({ userId, stats: {}, ready: false, unavailable: false });
  useEffect(() => {
    const key = quizHistoryKey(userId);
    function refresh() {
      try { setSnapshot({ userId, stats: readQuizStats(localStorage.getItem(key)), ready: true, unavailable: false }); }
      catch { setSnapshot({ userId, stats: {}, ready: true, unavailable: true }); }
    }
    function onStorage(event: StorageEvent) { if (event.key === key || event.key === null) refresh(); }
    refresh();
    window.addEventListener(quizHistoryEvent, refresh);
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener(quizHistoryEvent, refresh);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", refresh);
    };
  }, [userId]);
  // Never expose a previous account's snapshot while the new effect is pending.
  return snapshot.userId === userId ? snapshot : { userId, stats: {}, ready: false, unavailable: false };
}
