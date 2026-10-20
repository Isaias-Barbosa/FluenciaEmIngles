"use client";

import { useEffect } from "react";

/** Progressive enhancement: the static poster and all links work without JS. */
export default function HomeEnhancements() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".home-landing");
    const hero = root?.querySelector<HTMLElement>(".hero");
    const video = hero?.querySelector<HTMLVideoElement>("[data-hero-video]");
    const toggle = hero?.querySelector<HTMLButtonElement>("[data-video-toggle]");
    if (!hero || !video || !toggle) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const connection = (navigator as Navigator & { connection?: EventTarget & { saveData?: boolean } }).connection;
    let wantsPlayback = !motion.matches && !connection?.saveData;
    let visible = hero.getBoundingClientRect().bottom > 0 && hero.getBoundingClientRect().top < window.innerHeight;
    let disposed = false;
    let version = 0;
    video.muted = true;
    toggle.hidden = false;
    const shouldPlay = () => wantsPlayback && visible && !document.hidden;
    const setLabel = (playing: boolean) => { toggle.textContent = playing ? "Pausar vídeo" : "Reproduzir vídeo"; };
    const update = async () => {
      const ticket = ++version;
      if (!shouldPlay()) { video.pause(); setLabel(false); return; }
      if (!video.getAttribute("src")) video.src = video.dataset.src!;
      try {
        await video.play();
        if (disposed) return;
        if (ticket !== version) { if (!shouldPlay()) video.pause(); return; }
        if (!shouldPlay()) { video.pause(); setLabel(false); return; }
        setLabel(true);
      } catch {
        if (!disposed && ticket === version) { wantsPlayback = false; setLabel(false); }
      }
    };
    const onToggle = () => { wantsPlayback = !wantsPlayback; void update(); };
    const onPreference = () => { if (motion.matches || connection?.saveData) wantsPlayback = false; void update(); };
    const onError = () => { wantsPlayback = false; video.pause(); setLabel(false); };
    const onVisibility = () => { void update(); };
    toggle.addEventListener("click", onToggle);
    video.addEventListener("error", onError);
    motion.addEventListener("change", onPreference);
    connection?.addEventListener("change", onPreference);
    document.addEventListener("visibilitychange", onVisibility);
    const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting; void update();
    });
    observer?.observe(hero);
    void update();
    return () => {
      disposed = true; version++; video.pause();
      observer?.disconnect();
      toggle.removeEventListener("click", onToggle);
      video.removeEventListener("error", onError);
      motion.removeEventListener("change", onPreference);
      connection?.removeEventListener("change", onPreference);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);
  return null;
}
