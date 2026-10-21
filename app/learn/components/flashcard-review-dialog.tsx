"use client";
import { useEffect, useRef } from "react";
export type StudyCard = {id:string;front:string;back:string;pronunciation:string};
export default function FlashcardReviewDialog({cards,onClose,onLearned,saving,error}:{cards:StudyCard[];onClose:()=>void;onLearned:(id:string)=>void;saving:boolean;error:string}) {
  const panel = useRef<HTMLElement>(null);
  useEffect(()=>{
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.focus();
    function key(event:KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab") return;
      const targets = Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled),[href],input,textarea,select,[tabindex="0"]') ?? []);
      const first = targets[0], last = targets.at(-1);
      if (!first) { event.preventDefault(); return; }
      if (!panel.current?.contains(document.activeElement)) { event.preventDefault(); (event.shiftKey ? last : first)?.focus(); }
      else if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) {event.preventDefault();last?.focus();}
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === panel.current)) {event.preventDefault();first.focus();}
    }
    document.addEventListener("keydown",key);
    return ()=>{document.removeEventListener("keydown",key);document.body.style.overflow=overflow;previous?.focus();};
  },[onClose]);
  return <div className="modal-backdrop review-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)onClose();}}><section ref={panel} tabIndex={-1} className="card-review-dialog journey-panel" role="dialog" aria-modal="true" aria-labelledby="review-title"><header><div><span className="section-kicker">PRATIQUE NO SEU RITMO</span><h2 id="review-title">Questões de revisão</h2><p>{cards.length} {cards.length===1?"card para revisar":"cards para revisar"}</p></div><button className="button button-dark" type="button" onClick={onClose} aria-label="Fechar revisão">×</button></header>{error && <p role="alert" className="form-message form-error">{error}</p>}{cards.length ? <div className="review-card-list">{cards.map(card=><article key={card.id}><h3>{card.front}</h3>{card.pronunciation && <small>{card.pronunciation}</small>}<span className="section-kicker">RESPOSTA CORRETA</span><p>{card.back}</p><p className="account-field-note">Dica: leia a expressão em voz alta e tente criar uma frase com ela antes de marcar como aprendida.</p><button className="button button-success" disabled={saving} onClick={()=>onLearned(card.id)}>{saving?"Salvando…":"Já aprendi"} ✓</button></article>)}</div>:<p className="empty-state">Nenhum card para revisar. Os cards que você marcar como “Para revisar” aparecerão aqui.</p>}</section></div>;
}
