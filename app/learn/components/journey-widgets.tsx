"use client";
import type { ReactNode } from "react";
import { cefrLevels } from "@/lib/cefr/types";
import { summarizeQuizHistory, quizRoundSize } from "@/lib/quiz/progress";
import type { QuizStats } from "@/lib/quiz/vocabulary";
const number = (value: number) => new Intl.NumberFormat("pt-BR").format(value);

export function JourneyMetric({ icon, label, value, note, tone = "mint" }: { icon: string; label: string; value: ReactNode; note: string; tone?: "mint" | "violet" | "gold" | "pink" }) {
  return <article className={`journey-metric journey-${tone}`}><span className="journey-metric-icon" aria-hidden="true">{icon}</span><span className="journey-metric-label">{label}</span><strong>{value}</strong><small>{note}</small></article>;
}
export function QuizHistoryPanel({ stats, ready, unavailable, onPractice }: { stats: QuizStats; ready: boolean; unavailable: boolean; onPractice: () => void }) {
  const summary = summarizeQuizHistory(stats);
  const available = ready && !unavailable;
  return <section className="journey-panel quiz-history-panel" aria-labelledby="quiz-history-heading">
    <div className="journey-section-heading"><div><span className="section-kicker">VOCABULÁRIO EM AÇÃO</span><h2 id="quiz-history-heading">Seu desempenho no Quiz</h2><p>Uma rodada concluída, dez perguntas praticadas.</p></div><button className="journey-text-button" onClick={onPractice}>Ir para o Quiz <span aria-hidden="true">↗</span></button></div>
    {!ready ? <p className="journey-history-note" role="status">Carregando seu histórico do Quiz…</p> : unavailable ? <p className="journey-history-note" role="status">O histórico do Quiz está indisponível porque este navegador bloqueou o armazenamento local.</p> : <>
      <div className="quiz-history-highlights"><span><b>{summary.practicedLevels}</b> {summary.practicedLevels === 1 ? "nível praticado" : "níveis praticados"}</span><span>Melhor rodada <b>{summary.best === null ? "—" : `${summary.best}/${quizRoundSize}`}</b></span></div>
      <div className="quiz-history-grid">{cefrLevels.map((level) => { const row = stats[level]; const played = Boolean(row && row.rounds > 0); return <article className={`quiz-history-level ${played ? "quiz-history-played" : ""}`} key={level} aria-label={`Quiz ${level}`}><div className="quiz-history-level-top"><strong>{level}</strong><span>{played ? "Praticado" : "Para começar"}</span></div><b className="quiz-history-rounds">{number(row?.rounds ?? 0)} <small>{row?.rounds === 1 ? "quiz concluído" : "quizzes concluídos"}</small></b><p>{number((row?.rounds ?? 0) * quizRoundSize)} perguntas praticadas</p><dl><div><dt>Melhor</dt><dd>{played ? `${row!.best}/${quizRoundSize}` : "—"}</dd></div><div><dt>Último</dt><dd>{played ? `${row!.last}/${quizRoundSize}` : "—"}</dd></div></dl></article>; })}</div>
    </>}
    {available && summary.rounds === 0 && <div className="journey-empty-state"><span aria-hidden="true">Aa</span><div><strong>Seu primeiro quiz pode ser hoje.</strong><p>Conclua uma rodada para começar a acompanhar seus resultados aqui.</p></div><button className="button button-primary" onClick={onPractice}>Começar quiz <span>→</span></button></div>}
    <p className="journey-history-note">Histórico deste navegador, separado por conta. Cada rodada tem {quizRoundSize} perguntas; uma palavra pode ser praticada mais de uma vez. Rodadas incompletas não entram nos totais.</p>
  </section>;
}
