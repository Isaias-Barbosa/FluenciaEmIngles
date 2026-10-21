"use client";
import { FormEvent, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { validateFeedback } from "@/lib/learning/student-feedback";
export default function FeedbackForm({ userId }: {userId:string}) {
  const [message,setMessage] = useState("");
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  const [success,setSuccess] = useState(false);
  const pending = useRef(false);
  const attempt = useRef<{message:string;id:string}|null>(null);
  async function submit(event:FormEvent) {
    event.preventDefault();
    if (pending.current) return;
    setError(""); setSuccess(false);
    let text;
    try { text = validateFeedback(message); } catch (error) { setError((error as Error).message); return; }
    pending.current = true; setBusy(true);
    try {
      if (!supabase) throw Error();
      const {data:auth,error:authError} = await supabase.auth.getUser();
      if (authError || auth.user?.id !== userId) throw Error();
      if (attempt.current?.message !== text) attempt.current = {message:text,id:crypto.randomUUID()};
      const {error} = await supabase.rpc("submit_student_feedback",{p_message:text,p_request_id:attempt.current.id});
      if (error) throw error;
      attempt.current = null; setMessage(""); setSuccess(true);
    } catch { setError("Não foi possível enviar seu feedback. Seu texto foi mantido; tente novamente."); }
    finally { pending.current = false; setBusy(false); }
  }
  return <section className="journey-panel feedback-panel"><span className="section-kicker">SUA OPINIÃO CONTA</span><h2>Como podemos melhorar?</h2><p>Encontrou um problema ou tem uma sugestão? Envie seu feedback para a equipe.</p><form onSubmit={submit}><label htmlFor="student-feedback">Seu feedback</label><textarea id="student-feedback" value={message} onChange={event=>{setMessage(event.target.value);setSuccess(false);}} minLength={10} maxLength={3000} required disabled={busy} placeholder="Conte o que aconteceu ou compartilhe sua ideia…" aria-describedby="feedback-note"/><small id="feedback-note">{message.length}/3000 caracteres · Seu nome e e-mail acompanham a mensagem para o administrador.</small>{error && <p role="alert" className="form-message form-error">{error}</p>}{success && <p role="status" className="form-message form-success">Feedback enviado! Obrigado por ajudar a melhorar o Fluência.</p>}<button className="button button-primary" type="submit" disabled={busy}>{busy ? "Enviando…" : "Enviar feedback"} <span>↗</span></button></form></section>;
}
