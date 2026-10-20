"use client";

import { useRef, useState } from "react";
import { cefrLevels, type CefrLevel, type CefrAnalysis, type ReviewQuestion } from "@/lib/cefr/types";

type Props = {
  request: (body: unknown) => Promise<unknown>;
  availableLevels: string[];
  onSaveReserve: (question: ReviewQuestion, level: CefrLevel | "") => Promise<{ reserveId: string; reserveUpdatedAt: string }>;
  onUseQuestion: (question: ReviewQuestion, level: CefrLevel) => void;
};
const manualQuestion = (): ReviewQuestion => ({ id: "manual", prompt: "", choices: [], correctAnswer: "", source: "manual", sourceUrl: "", sourceLabel: "Questão manual", license: "", category: "", triviaDifficulty: "" });
export default function QuestionReview({ request, availableLevels, onUseQuestion, onSaveReserve }: Props) {
  const [question, setQuestion] = useState<ReviewQuestion>(manualQuestion);
  const [choicesText, setChoicesText] = useState("");
  const [queue, setQueue] = useState<ReviewQuestion[]>([]);
  const [provider, setProvider] = useState<"opentdb" | "trivia">("opentdb");
  const [amount, setAmount] = useState<1 | 5>(1);
  const [analysis, setAnalysis] = useState<CefrAnalysis | null>(null);
  const [reviewedLevel, setReviewedLevel] = useState<CefrLevel | "">("");
  const [busy, setBusy] = useState<"import" | "analyze" | "reserve" | null>(null);
  const busyRef = useRef(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const choices = choicesText.split("\n").map((line) => line.trim()).filter(Boolean);
  const index = queue.findIndex((item) => item.id === question.id);
  function clearResult() { setAnalysis(null); setReviewedLevel(""); setError(""); setNotice(""); }
  function selectQuestion(next: ReviewQuestion) {
    setQuestion({ ...next }); setChoicesText(next.choices.join("\n")); clearResult();
  }
  async function importQuestions() {
    if (busyRef.current) return;
    busyRef.current = true; setBusy("import"); setError(""); setNotice("");
    try {
      const result = await request({ action: "import", provider, amount, saveToReserve: true }) as { questions: ReviewQuestion[] };
      const merged = [...new Map([...queue, ...result.questions].map((item) => [item.id, item])).values()].slice(-30);
      setQueue(merged);
      // Preserve a question being edited; choose an imported item explicitly from the list.
      if (!question.prompt.trim()) selectQuestion(result.questions[0]);
      setNotice(`${result.questions.length} questão(ões) salva(s) na reserva para revisão. Escolha uma na fila e clique em Analisar questão.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Falha ao buscar questões."); }
    finally { busyRef.current = false; setBusy(null); }
  }
  async function analyze() {
    if (busyRef.current) return;
    if (choices.length > 6 || choices.some((choice) => choice.length > 250)) { setError("Use até 6 alternativas, com até 250 caracteres cada."); return; }
    busyRef.current = true; setBusy("analyze"); clearResult();
    try {
      const result = await request({ action: "analyze", prompt: question.prompt, choices }) as { analysis: CefrAnalysis };
      setAnalysis(result.analysis); setReviewedLevel(result.analysis.level ?? "");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Falha na análise."); }
    finally { busyRef.current = false; setBusy(null); }
  }
  async function saveReserve() {
    if (busyRef.current) return;
    busyRef.current = true; setBusy("reserve"); setError(""); setNotice("");
    try {
      const metadata = await onSaveReserve({ ...question, choices }, reviewedLevel);
      setQuestion((current) => ({ ...current, ...metadata }));
      setQueue((current) => current.map((item) => item.id === question.id ? { ...question, choices, ...metadata } : item));
      setNotice("Questão salva aguardando revisão. Abra Banco de reservas para completar a explicação e dica e disponibilizar.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível salvar a reserva."); }
    finally { busyRef.current = false; setBusy(null); }
  }
  const answer = question.correctAnswer.trim();
  const validChoices = choices.length === 0 || (choices.length >= 2 && choices.length <= 6 && new Set(choices.map((choice) => choice.toLowerCase())).size === choices.length && choices.includes(answer));
  const canUse = Boolean(analysis && reviewedLevel && availableLevels.includes(reviewedLevel) && answer && validChoices);
  return (
    <section className="admin-view question-review">
      <div className="admin-page-intro"><div><span className="section-kicker">CURADORIA DE CONTEÚDO</span><h2>Verifique a Questão</h2><p>Cole uma pergunta em inglês ou importe uma da biblioteca. Entenda a dificuldade de leitura antes de cadastrá-la.</p></div><span className="review-free">Sem créditos da OpenAI</span></div>
      {error && <div className="admin-message error" role="alert">{error}</div>}
      {notice && <div className="admin-message success" role="status">{notice}</div>}
      <div className="review-layout">
        <div className="review-column">
          <section className="admin-panel">
            <div className="admin-panel-heading"><div><span className="section-kicker">01 · ESCOLHA A ORIGEM</span><h2>Buscar questões</h2></div></div>
            <div className="admin-form review-form">
              <div className="review-import-controls"><label>Fonte<select value={provider} disabled={Boolean(busy)} onChange={(event) => setProvider(event.target.value as typeof provider)}><option value="opentdb">Open Trivia DB</option><option value="trivia">The Trivia API</option></select></label><label>Quantidade<select value={amount} disabled={Boolean(busy)} onChange={(event) => setAmount(Number(event.target.value) as 1 | 5)}><option value={1}>1 questão</option><option value={5}>5 questões</option></select></label></div>
              <p className="review-note">As importações são salvas automaticamente como “Aguardando revisão”. {provider === "opentdb" ? <>Conteúdo CC BY-SA 4.0. Aguarde pelo menos 5 segundos entre buscas.</> : <>Plano gratuito para uso não comercial · CC BY-NC 4.0. Para uso comercial, confira a licença com o fornecedor.</>}</p>
              <button type="button" className="button button-dark" disabled={Boolean(busy)} onClick={() => void importQuestions()}>{busy === "import" ? "Buscando…" : "Buscar questões"}<span>↓</span></button>
              {queue.length > 0 && <><label>Fila de revisão · {queue.length} questão(ões)<select disabled={Boolean(busy)} value={index < 0 ? "" : question.id} onChange={(event) => { const next = queue.find((item) => item.id === event.target.value); if (next) selectQuestion(next); }}><option value="" disabled>Escolha uma questão importada</option>{queue.map((item, i) => <option key={item.id} value={item.id}>{i + 1}. {item.prompt.slice(0, 90)}</option>)}</select></label><div className="review-navigation"><button type="button" disabled={Boolean(busy) || index <= 0} onClick={() => selectQuestion(queue[index - 1])}>← Anterior</button><span>{index >= 0 ? `${index + 1} de ${queue.length}` : "Questão manual"}</span><button type="button" disabled={Boolean(busy) || index >= queue.length - 1} onClick={() => selectQuestion(queue[index + 1])}>Próxima →</button></div></>}
            </div>
          </section>
          <section className="admin-panel">
            <div className="admin-panel-heading"><div><span className="section-kicker">02 · REVISE O TEXTO</span><h2>Questão em inglês</h2></div><button type="button" className="admin-text-button" disabled={Boolean(busy)} onClick={() => selectQuestion(manualQuestion())}>Nova questão manual</button></div>
            <form className="admin-form review-form" onSubmit={(event) => { event.preventDefault(); void analyze(); }}>
              <label htmlFor="review-prompt">Enunciado<textarea id="review-prompt" required maxLength={1500} rows={6} disabled={Boolean(busy)} value={question.prompt} placeholder="Ex.: What do you usually do after school?" onChange={(event) => { setQuestion({ ...question, prompt: event.target.value }); clearResult(); }} /></label>
              <label htmlFor="review-choices">Alternativas <span className="review-optional">· uma por linha, opcional</span><textarea id="review-choices" rows={4} maxLength={1506} disabled={Boolean(busy)} value={choicesText} placeholder={"I play football.\nI am twelve years old.\nMy name is Anna."} onChange={(event) => { setChoicesText(event.target.value); clearResult(); }} /></label>
              <label htmlFor="review-answer">Resposta correta <span className="review-optional">· necessária para cadastrar</span><input id="review-answer" maxLength={250} disabled={Boolean(busy)} value={question.correctAnswer} onChange={(event) => setQuestion({ ...question, correctAnswer: event.target.value })} /></label>
              {question.source !== "manual" && <div className="review-source"><a href={question.sourceUrl} target="_blank" rel="noreferrer">{question.sourceLabel} ↗</a><span>{question.license} · {question.category}</span><small>Dificuldade de trivia: {question.triviaDifficulty}. Esse valor não define o CEFR. A atribuição acompanhará o cadastro.</small></div>}
              <button className="button button-dark" disabled={Boolean(busy) || !question.prompt.trim()} type="submit">{busy === "analyze" ? "Analisando…" : "Analisar questão"}<span>↗</span></button>
            </form>
          </section>
        </div>
        <section className="admin-panel review-result" aria-live="polite" aria-busy={busy === "analyze"}>
          <div className="admin-panel-heading"><div><span className="section-kicker">03 · ENTENDA O NÍVEL</span><h2>Análise CEFR</h2></div><span className="review-estimate">Estimativa editorial</span></div>
          {analysis ? <div className="review-result-body">
            <div className="review-level-summary"><strong>{analysis.level ?? "?"}</strong><div><b>{analysis.level ? "Nível sugerido" : "Evidência insuficiente"}</b><p>Faixa aproximada: {analysis.range}<br />Confiança heurística {analysis.confidence}</p></div></div>
            <div className="review-bands" aria-label="Escala CEFR">{cefrLevels.map((level) => <span key={level} className={analysis.level === level ? "active" : ""} aria-current={analysis.level === level ? "step" : undefined}>{level}</span>)}</div>
            <p>{analysis.summary}</p>
            <div className="review-metrics"><div><b>{analysis.wordCount}</b><span>palavras no texto</span></div><div><b>{analysis.coverage}%</b><span>cobertura lexical*</span></div><div><b>{analysis.averageSentenceLength}</b><span>palavras por frase</span></div></div>
            <small className="review-note">*Cobertura da lista de vocabulário, sem possíveis nomes próprios. Não é uma medida de precisão da análise.</small>
            <h3>O que influenciou a sugestão</h3>
            <ul className="review-evidence">{analysis.evidence.map((item, i) => <li key={`${item.label}-${i}`}><span>{item.level}</span><div><b>{item.label}</b><p>{item.detail}</p></div></li>)}</ul>
            <details><summary>Vocabulário reconhecido e palavras para revisar</summary><div className="review-word-list">{analysis.vocabulary.map((item) => <span key={item.word}>{item.word} <b>{item.level}</b></span>)}</div><p>Fora da lista: {analysis.unknownWords.join(", ") || "nenhuma palavra"}.</p><p>Possíveis nomes próprios: {analysis.possibleNames.join(", ") || "nenhum"}.</p></details>
            <details><summary>Limites desta análise</summary><ul>{analysis.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></details>
            <div className="admin-form review-form review-handoff"><label htmlFor="review-level">Nível após sua revisão<select id="review-level" disabled={Boolean(busy)} value={reviewedLevel} onChange={(event) => setReviewedLevel(event.target.value as CefrLevel | "")}><option value="">Escolha o nível</option>{cefrLevels.map((level) => <option value={level} key={level} disabled={!availableLevels.includes(level)}>{level}{!availableLevels.includes(level) ? " · não cadastrado" : ""}</option>)}</select></label><p className="review-note">Revise o nível e o gabarito. O cadastro será aberto para você escolher a lição, completar a explicação e salvar como rascunho.</p>{!answer && <p className="review-note">Preencha a resposta correta para continuar.</p>}{!validChoices && <p className="review-note">Informe pelo menos 2 alternativas distintas e copie uma delas exatamente no gabarito, ou deixe as alternativas vazias para resposta digitada.</p>}<button type="button" className="button button-primary" disabled={Boolean(busy)} onClick={() => void saveReserve()}>{busy === "reserve" ? "Salvando…" : "Salvar na reserva para revisão"}<span>↓</span></button><button type="button" className="button button-dark" disabled={!canUse || Boolean(busy)} onClick={() => { if (canUse && reviewedLevel) onUseQuestion({ ...question, choices, correctAnswer: answer }, reviewedLevel); }}>Enviar para cadastro<span>→</span></button></div>
          </div> : <div className="review-empty"><span aria-hidden="true">Aa</span><h3>Qual inglês esta questão exige?</h3><p>A análise procura vocabulário, estruturas gramaticais e complexidade das frases para sugerir uma faixa entre A1 e C2.</p><p>Uma pergunta de conhecimentos gerais pode exigir inglês simples. A dificuldade de trivia não é usada como nível linguístico.</p><small>O resultado precisa de revisão humana e não equivale a uma classificação oficial.</small></div>}
        </section>
      </div>
      <p className="review-method">Análise local, sem chamada a IA generativa. Vocabulário: <a href="https://github.com/openlanguageprofiles/olp-en-cefrj" target="_blank" rel="noreferrer">CEFR-J / Tono Laboratory, TUFS e Octanove</a>. Referência: <a href="https://www.coe.int/en/web/common-european-framework-reference-languages/reference-level-descriptions" target="_blank" rel="noreferrer">CEFR · Conselho da Europa</a>. As regras gramaticais são heurísticas do aplicativo, sem validação oficial.</p>
    </section>
  );
}
