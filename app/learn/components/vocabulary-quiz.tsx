"use client";
import { useEffect, useReducer, useRef, useState } from "react";
import { cefrLevels, type CefrLevel } from "@/lib/cefr/types";
import { drawVocabularyRound, initialQuizState, quizDrawHistoryKey, quizReducer, readQuizDrawHistory, readQuizStats, vocabulary, type QuizDrawHistory, type QuizStats } from "@/lib/quiz/vocabulary";
import { quizHistoryEvent, quizHistoryKey } from "@/lib/quiz/progress";
import { useAnswerSounds } from "./use-answer-sounds";

export default function VocabularyQuiz({ userId, initialLevel }: { userId: string; initialLevel: CefrLevel }) {
  const [level, setLevel] = useState(initialLevel);
  const [state, dispatch] = useReducer(quizReducer, initialQuizState);
  const [stats, setStats] = useState<QuizStats>({}); const [storageWarning, setStorageWarning] = useState(false);
  const completed = useRef(false); const focusTarget = useRef<HTMLHeadingElement | null>(null);
  const drawHistory = useRef<{ userId: string; history: QuizDrawHistory; unsaved: boolean }>({ userId, history: {}, unsaved: false });
  const sounds = useAnswerSounds("vocabulary-quiz");
  const storageKey = quizHistoryKey(userId);
  const score = state.answers.filter((answer) => answer.correct).length;
  const question = state.round[state.index]; const currentStats = stats[level];
  useEffect(() => {
    try { setStats(readQuizStats(localStorage.getItem(storageKey))); } catch { setStorageWarning(true); }
  }, [storageKey]);
  useEffect(() => {
    if (state.phase !== "finished" || completed.current) return;
    completed.current = true;
    let previous = stats;
    try { previous = readQuizStats(localStorage.getItem(storageKey)); } catch { setStorageWarning(true); }
    const next: QuizStats = { ...previous, [level]: { rounds: (previous[level]?.rounds ?? 0) + 1, best: Math.max(previous[level]?.best ?? 0, score), last: score } };
    setStats(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); window.dispatchEvent(new Event(quizHistoryEvent)); } catch { setStorageWarning(true); }
  }, [state.phase, level, score, stats, storageKey]);
  useEffect(() => { if (state.phase !== "idle") focusTarget.current?.focus(); }, [state.index, state.phase]);
  function start() {
    completed.current = false; sounds.prepare();
    if (drawHistory.current.userId !== userId) drawHistory.current = { userId, history: {}, unsaved: false };
    let history = drawHistory.current.history;
    if (!drawHistory.current.unsaved) {
      try { history = readQuizDrawHistory(localStorage.getItem(quizDrawHistoryKey(userId))); } catch { setStorageWarning(true); }
    }
    const draw = drawVocabularyRound(level, history[level]);
    const next = { ...history, [level]: draw.seenIds };
    drawHistory.current.history = next;
    try { localStorage.setItem(quizDrawHistoryKey(userId), JSON.stringify(next)); drawHistory.current.unsaved = false; }
    catch { drawHistory.current.unsaved = true; setStorageWarning(true); }
    dispatch({ type: "start", round: draw.round });
  }
  function check() {
    if (state.phase !== "playing" || state.checked || !state.selected) return;
    sounds.prepare(); sounds.play(state.selected === question.meaning ? "correct" : "incorrect"); dispatch({ type: "check" });
  }
  return <section className="vocabulary-quiz">
    <div className="quiz-page-heading"><div><span className="eyebrow"><span className="live-dot" /> PRÁTICA DE VOCABULÁRIO</span><h1>Quiz de Inglês<span>.</span></h1><p>Uma palavra, um contexto e uma nova descoberta a cada pergunta.</p></div><button type="button" className="practice-sound-toggle" aria-pressed={sounds.enabled} onClick={sounds.toggle}>{sounds.enabled ? "♪ Sons ligados" : "♪ Sons desligados"}</button></div>
    <div className="quiz-summary"><div><small>NÍVEL ESCOLHIDO</small><strong>{level}</strong></div><div><small>MELHOR RODADA</small><strong>{currentStats ? `${currentStats.best}/10` : "—"}</strong></div><div><small>RODADAS CONCLUÍDAS</small><strong>{currentStats?.rounds ?? 0}</strong></div></div>
    {storageWarning && <p className="audio-session-notice" role="status">Seu navegador não permitiu salvar o histórico. Você pode continuar jogando nesta sessão, mas os resultados e a sequência de questões podem não ser recuperados depois.</p>}
    {state.phase === "idle" ? <div className="quiz-card quiz-intro"><span className="quiz-art" aria-hidden="true">Aa<span>✦</span></span><span className="section-kicker">10 PERGUNTAS POR RODADA</span><h2>Qual é o significado?</h2><p>Leia a frase em inglês e escolha o significado da palavra destacada. Confira a tradução, aprenda com os erros e tente uma nova rodada. As questões ainda não sorteadas têm prioridade até completar o banco do nível.</p><label htmlFor="quiz-level">Escolha seu nível<select id="quiz-level" value={level} onChange={(event) => setLevel(event.target.value as CefrLevel)}>{cefrLevels.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><small>{vocabulary.filter((item) => item.level === level).length} palavras e expressões disponíveis neste nível.</small><button className="button button-primary" onClick={start}>Começar quiz <span>→</span></button></div>
      : state.phase === "playing" ? <div className="quiz-card">
        <div className="quiz-round-heading"><span>Questão {state.index + 1} de {state.round.length}</span><strong>{score} acerto{score !== 1 ? "s" : ""}</strong></div>
        <div className="quiz-track" role="progressbar" aria-label="Questões respondidas" aria-valuemin={0} aria-valuemax={state.round.length} aria-valuenow={state.answers.length}><span style={{ width: `${state.answers.length / state.round.length * 100}%` }} /></div>
        <h2 ref={focusTarget} tabIndex={-1}>No contexto, o que significa <span lang="en">“{question.word}”</span>?</h2>
        <blockquote lang="en">{question.example}</blockquote>
        <div className="answer-options quiz-options" role="group" aria-label="Alternativas">{question.options.map((option, i) => <button key={option} type="button" className={`answer-option ${state.selected === option ? "answer-selected" : ""} ${state.checked && option === question.meaning ? "quiz-correct" : state.checked && state.selected === option ? "answer-incorrect" : ""}`} disabled={state.checked} aria-pressed={state.selected === option} onClick={() => { sounds.prepare(); dispatch({ type: "select", value: option }); }}><span>{String.fromCharCode(65 + i)}</span>{option}{state.checked && option === question.meaning && <i>✓</i>}</button>)}</div>
        {state.checked && <div className={`quiz-feedback ${state.selected === question.meaning ? "quiz-feedback-correct" : "quiz-feedback-incorrect"}`} role="status"><strong>{state.selected === question.meaning ? "✓ Você acertou!" : "✕ Vamos aprender esta palavra."}</strong><p><b lang="en">{question.word}</b> significa <b>{question.meaning}</b> neste contexto.</p><p>Tradução: {question.translation}</p></div>}
        {!state.checked ? <button className="button button-primary" disabled={!state.selected} onClick={check}>Conferir resposta <span>→</span></button> : <button className="button button-primary" onClick={() => dispatch({ type: "next" })}>{state.index + 1 === state.round.length ? "Ver resultado" : "Próxima palavra"}<span>→</span></button>}
        <button className="quiz-exit" type="button" onClick={() => dispatch({ type: "reset" })}>Encerrar rodada sem salvar resultado</button>
      </div> : <div className="quiz-card quiz-results"><span className="section-kicker">RODADA CONCLUÍDA</span><h2 ref={focusTarget} tabIndex={-1}>{score >= 7 ? "Bom trabalho!" : "Cada tentativa ensina."}</h2><strong className="quiz-final-score">{score}<small> / {state.round.length}</small></strong><p>Você praticou {state.round.length} palavras e expressões no nível {level}.</p><div className="quiz-result-actions"><button className="button button-primary" onClick={start}>Jogar novamente <span>↻</span></button><button className="button button-dark" onClick={() => dispatch({ type: "reset" })}>Escolher outro nível</button></div><details open={score < 10}><summary>Revisar respostas da rodada</summary><ul>{state.round.map((item) => { const answer = state.answers.find((row) => row.id === item.id); return <li key={item.id}><strong><span aria-hidden="true">{answer?.correct ? "✓" : "✕"}</span> <span lang="en">{item.word}</span> — {item.meaning}</strong>{!answer?.correct && <p>Sua resposta: {answer?.selected}</p>}<p lang="en">{item.example}</p><small>{item.translation}</small></li>; })}</ul></details></div>}
    <p className="quiz-footnote">Prática livre de vocabulário com níveis pedagógicos aproximados. Os resultados deste quiz ficam neste navegador, separados das missões e das provas de nivelamento.</p>
  </section>;
}
