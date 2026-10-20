"use client";

import { useEffect, useRef, useState } from "react";
import { FeedbackAudio, type AnswerResult } from "@/lib/learning/feedback-audio";

const preferenceKey = "fluencia-answer-sounds";

export function useAnswerSounds(lessonId: string | null) {
  const [enabled, setEnabled] = useState(true);
  const enabledRef = useRef(true);
  const audio = useRef<FeedbackAudio | null>(null);

  useEffect(() => {
    function syncPreference() {
      try {
        enabledRef.current = localStorage.getItem(preferenceKey) !== "off";
        setEnabled(enabledRef.current);
        if (!enabledRef.current) audio.current?.stop();
      } catch { /* Private browsing can block storage. */ }
    }
    syncPreference();
    window.addEventListener("storage", syncPreference);
    window.addEventListener("fluencia-answer-sounds-change", syncPreference);
    return () => {
      window.removeEventListener("storage", syncPreference);
      window.removeEventListener("fluencia-answer-sounds-change", syncPreference);
    };
  }, []);

  useEffect(() => () => {
    audio.current?.dispose();
    audio.current = null;
  }, [lessonId]);

  function changeEnabled(value: boolean) {
    enabledRef.current = value;
    setEnabled(value);
    if (!value) audio.current?.stop();
    try { localStorage.setItem(preferenceKey, value ? "on" : "off"); window.dispatchEvent(new Event("fluencia-answer-sounds-change")); } catch { /* Keep the session preference. */ }
  }

  function prepare() {
    if (!enabledRef.current) return;
    audio.current ??= new FeedbackAudio();
    audio.current.prepare();
  }

  return {
    enabled,
    prepare,
    play: (result: AnswerResult) => { if (enabledRef.current) audio.current?.play(result); },
    mute: () => changeEnabled(false),
    toggle: () => {
      changeEnabled(!enabledRef.current);
      if (enabledRef.current) prepare();
    },
  };
}
