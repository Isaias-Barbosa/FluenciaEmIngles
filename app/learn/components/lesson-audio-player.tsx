"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";

const speeds = [0.75, 1, 1.25, 1.5];
function time(seconds: number) {
  const value = Number.isFinite(seconds) ? Math.floor(seconds) : 0;
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
}

export function LessonAudioPlayer({ questionId, fallbackUrl, onEnded }: {
  questionId: string; fallbackUrl: string | null; onEnded: () => void;
}) {
  const audio = useRef<HTMLAudioElement>(null);
  const request = useRef<AbortController | null>(null);
  const source = useRef<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [voice, setVoice] = useState("Voz de IA");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const player = audio.current;
    return () => {
      request.current?.abort();
      player?.pause();
      if (source.current?.startsWith("blob:")) URL.revokeObjectURL(source.current);
    };
  }, []);

  async function play(restart = false) {
    const player = audio.current;
    if (!player || loading) return;
    setNotice("");
    try {
      if (!source.current) {
        setLoading(true);
        request.current = new AbortController();
        try {
          const { data } = await supabase!.auth.getSession();
          if (!data.session) throw new Error("Sessão indisponível.");
          const response = await fetch("/api/lesson-audio", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` },
            body: JSON.stringify({ questionId }), signal: request.current.signal,
          });
          if (!response.ok) throw new Error("Voz de IA indisponível.");
          const blob = await response.blob();
          if (request.current.signal.aborted) return;
          source.current = URL.createObjectURL(blob);
          setVoice("Voz gerada por IA");
        } catch (error) {
          if (request.current.signal.aborted) return;
          if (!fallbackUrl) throw error;
          source.current = fallbackUrl;
          setVoice("Áudio original");
          setNotice("A voz de IA está indisponível. Você pode ouvir o áudio original.");
        }
        player.src = source.current;
      }
      if (restart || player.ended) player.currentTime = 0;
      player.playbackRate = speed;
      await player.play();
    } catch {
      setNotice("Não foi possível reproduzir. Tente novamente ou escolha estudar sem áudio.");
    } finally {
      setLoading(false);
    }
  }

  return <section className="lesson-audio-card" aria-label="Player do exercício de escuta">
    <div className="lesson-audio-heading"><strong>Ouça com atenção</strong><span>{voice}</span></div>
    <p>Toque para ouvir e escreva a frase em inglês. Repita quantas vezes precisar.</p>
    <audio ref={audio} preload="none" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
      onTimeUpdate={() => setPosition(audio.current?.currentTime ?? 0)}
      onLoadedMetadata={() => setDuration(audio.current?.duration ?? 0)}
      onEnded={() => { setPlaying(false); onEnded(); }}
      onError={() => setNotice("Não foi possível carregar o áudio. Tente novamente ou escolha estudar sem áudio.")} />
    <div className="lesson-audio-controls">
      <button type="button" className="audio-play" disabled={loading} aria-label={playing ? "Pausar áudio" : "Reproduzir áudio"}
        onClick={() => playing ? audio.current?.pause() : void play()}>{loading ? "Preparando…" : playing ? "Ⅱ Pausar" : "▶ Ouvir"}</button>
      <button type="button" disabled={loading} onClick={() => void play(true)} aria-label="Repetir áudio desde o início">↺ Repetir</button>
      <span className="audio-time" aria-live="off">{time(position)} / {time(duration)}</span>
    </div>
    <input className="audio-seek" type="range" min={0} max={Number.isFinite(duration) ? duration : 0} step={0.1}
      value={position} disabled={!duration} aria-label="Posição do áudio"
      onChange={(event) => { if (audio.current) { audio.current.currentTime = Number(event.target.value); setPosition(Number(event.target.value)); } }} />
    <div className="audio-speeds" role="group" aria-label="Velocidade de reprodução"><span>Velocidade</span>{speeds.map((value) =>
      <button key={value} type="button" aria-pressed={speed === value} onClick={() => { setSpeed(value); if (audio.current) audio.current.playbackRate = value; }}>{String(value).replace(".", ",")}×</button>)}</div>
    {notice && <p role="status">{notice}</p>}
  </section>;
}
