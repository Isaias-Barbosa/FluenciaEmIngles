"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ReserveRow } from "@/lib/supabase/database.types";
import { reserveStatusLabels, type ReserveStatus } from "@/lib/learning/reserve";

type ReserveData = {
  questions: ReserveRow[]; total: number; page: number; pageSize: number;
  levels: { id: string; code: string; title: string }[];
  counts: { level_code: string; pending: number; available: number; archived: number }[];
};
type Props = { generate:(question:unknown)=>Promise<unknown>; active: boolean; request: (method: "GET" | "POST", body?: unknown, query?: string) => Promise<unknown>; onImport: () => void };
export default function QuestionReserve({ active, request, onImport, generate }: Props) {
  const [data, setData] = useState<ReserveData | null>(null);
  const [level, setLevel] = useState(""); const [status, setStatus] = useState(""); const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false); const [saving, setSaving] = useState(false); const [error, setError] = useState(""); const [notice, setNotice] = useState("");
  const [generating,setGenerating]=useState(false);
  const generationPending=useRef(false),generationSequence=useRef(0);
  const [editing, setEditing] = useState<ReserveRow | null>(null);
  const [editLevel, setEditLevel] = useState(""); const [options, setOptions] = useState("");
  const editorRef = useRef<HTMLElement | null>(null);
  useEffect(() => { if (editing) editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }, [editing?.id]);
  const sequence = useRef(0); const pending = useRef(false);
  const load = useCallback(async () => {
    const turn = ++sequence.current; setLoading(true); setError("");
    try { const result = await request("GET", undefined, new URLSearchParams({ level, status, page: String(page) }).toString()) as ReserveData; if (turn === sequence.current) setData(result); }
    catch (cause) { if (turn === sequence.current) setError(cause instanceof Error ? cause.message : "Falha ao carregar a reserva."); }
    finally { if (turn === sequence.current) setLoading(false); }
  }, [request, level, status, page]);
  useEffect(() => { if (active) void load(); return () => { sequence.current++; }; }, [active, load]);
  useEffect(()=>{if(!active){generationSequence.current++;}return ()=>{generationSequence.current++;};},[active]);
  function open(row: ReserveRow) {
    generationSequence.current++;setEditing({ ...row }); setOptions(Array.isArray(row.choices) ? row.choices.join("\n") : "");
    setEditLevel(data?.levels.find((item) => item.id === row.level_id)?.code ?? ""); setError(""); setNotice("");
  }
  async function generateFields() {
    if(!editing||generationPending.current||saving)return;
    const turn=++generationSequence.current,id=editing.id;
    generationPending.current=true;setGenerating(true);setError("");setNotice("");
    try{
      const result=await generate({level:editLevel,prompt:editing.prompt,choices:options.split("\n").map(value=>value.trim()).filter(Boolean),correctAnswer:editing.correct_answer}) as {notes:{explanation:string;hint:string;provider?:string}};
      if(turn!==generationSequence.current)return;
      if(typeof result.notes?.explanation!=="string"||typeof result.notes?.hint!=="string")throw new Error("A geração não retornou campos válidos.");
      setEditing(current=>current?.id===id?{...current,explanation:result.notes.explanation,hint:result.notes.hint}:current);
      setNotice(`Campos gerados${result.notes.provider?` com ${result.notes.provider}`:""}. Revise a explicação e a dica antes de salvar; nada foi publicado.`);
    }catch(error){if(turn===generationSequence.current)setError(error instanceof Error?error.message:"Não foi possível gerar. Seus campos foram mantidos.");}
    finally{generationPending.current=false;setGenerating(false);}
  }
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (!editing || pending.current || generationPending.current) return;
    pending.current = true; setSaving(true); setError(""); setNotice("");
    try {
      const result = await request("POST", { action: "save", id: editing.id, updatedAt: editing.updated_at, status: editing.status,
        question: { level: editLevel, prompt: editing.prompt, choices: options.split("\n").map((v) => v.trim()).filter(Boolean),
          correctAnswer: editing.correct_answer, explanation: editing.explanation, hint: editing.hint, source: editing.source, category: editing.category } }) as { message: string };
      setNotice(result.message); setEditing(null); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível salvar."); }
    finally { pending.current = false; setSaving(false); }
  }
  return <section className="admin-view question-review reserve-page">
    <div className="admin-page-intro"><div><span className="section-kicker">CURADORIA · SUBSTITUIÇÃO DE ÁUDIO</span><h2>Banco de reservas</h2><p>Revise as importações e disponibilize perguntas de texto para os estudantes do mesmo nível.</p></div><button className="button button-dark" onClick={onImport}>Importar questões <span>↗</span></button></div>
    {error && !editing && <p className="admin-message error" role="alert">{error}</p>}{notice && !editing && <p className="admin-message success" role="status">{notice}</p>}
    <div className="reserve-counts">{data?.counts.map((row) => <article key={row.level_code} className="admin-panel"><strong>{row.level_code}</strong><b>{row.available}</b><span>disponíveis</span><small>{row.pending} em revisão · {row.archived} arquivadas</small></article>)}</div>
    <section className="admin-panel">
      <div className="reserve-toolbar admin-form review-form"><label>Nível<select value={level} onChange={(event) => { setLevel(event.target.value); setPage(0); }}><option value="">Todos os níveis</option>{data?.levels.map((item) => <option key={item.id}>{item.code}</option>)}</select></label><label>Estado<select value={status} onChange={(event) => { setStatus(event.target.value); setPage(0); }}><option value="">Todos os estados</option>{Object.entries(reserveStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><button type="button" className="admin-refresh" disabled={loading || saving} onClick={() => void load()}>↻ Atualizar reserva</button></div>
      <p className="review-note">Somente questões disponíveis são sorteadas. A reserva é compartilhada entre estudantes; cada pessoa recebe perguntas que ainda não usou. Questões já atribuídas mantêm a cópia e o gabarito originais.</p>
      {loading && <p role="status">Carregando reserva…</p>}
      <div className="reserve-list">{data?.questions.map((row) => <article key={row.id}><div className="reserve-row-meta"><span className="admin-level-code">{data.levels.find((item) => item.id === row.level_id)?.code ?? "Sem nível"}</span><span className={`reserve-status reserve-${row.status}`}>{reserveStatusLabels[row.status]}</span></div><h3 lang="en">{row.prompt}</h3><div className="reserve-row-footer"><small>{row.source_title} · {row.source_license}</small><button type="button" className="admin-text-button" disabled={saving || generating} onClick={() => open(row)}>Revisar / editar →</button></div></article>)}</div>
      {!loading && data && !data.questions.length && <p className="admin-empty">Nenhuma questão neste filtro. Importe perguntas em “Verifique a Questão” para começar.</p>}
      {data && <div className="review-navigation"><button disabled={loading || page === 0} onClick={() => setPage((value) => value - 1)}>← Anterior</button><span>Página {page + 1} · {data.total} questão(ões)</span><button disabled={loading || (page + 1) * data.pageSize >= data.total} onClick={() => setPage((value) => value + 1)}>Próxima →</button></div>}
    </section>
    {editing && <section ref={editorRef} className="admin-panel reserve-editor" aria-labelledby="reserve-edit-title"><div className="admin-panel-heading"><div><span className="section-kicker">REVISÃO HUMANA</span><h2 id="reserve-edit-title">Preparar para os estudantes</h2></div><button className="admin-text-button" disabled={saving || generating} onClick={() => {generationSequence.current++;setEditing(null);}}>Fechar edição ×</button></div>
      {error && <p className="admin-message error" role="alert">{error}</p>}
      {notice && <p className="admin-message success" role="status">{notice}</p>}
      <form className="admin-form review-form" onSubmit={(event) => void save(event)}>
        <div className="review-import-controls"><label>Nível revisado<select value={editLevel} disabled={saving || generating} onChange={(event) => setEditLevel(event.target.value)}><option value="">Sem nível definido</option>{data?.levels.map((item) => <option key={item.id}>{item.code}</option>)}</select></label><label>Estado<select value={editing.status} disabled={saving || generating} onChange={(event) => setEditing({ ...editing, status: event.target.value as ReserveStatus })}>{Object.entries(reserveStatusLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label></div>
        <label>Enunciado em inglês<textarea required minLength={10} maxLength={1200} rows={4} value={editing.prompt} disabled={saving || generating} onChange={(event) => setEditing({ ...editing, prompt: event.target.value })} /></label>
        <label>Alternativas · uma por linha<textarea rows={4} value={options} maxLength={1506} disabled={saving || generating} onChange={(event) => setOptions(event.target.value)} /></label>
        <label>Resposta correta · copie exatamente uma alternativa<input value={editing.correct_answer} maxLength={250} disabled={saving || generating} onChange={(event) => setEditing({ ...editing, correct_answer: event.target.value })} /></label>
        <div className="reserve-generate-panel"><div><span className="section-kicker">ASSISTENTE DE REVISÃO</span><strong>Prepare a explicação e a dica em um clique.</strong><p>A IA usa enunciado, alternativas, gabarito e nível. Ao gerar novamente, os dois campos abaixo serão substituídos. Revise antes de salvar. Alterna entre os provedores gratuitos configurados, respeitando suas pausas e limites.</p></div><button className="button button-primary" type="button" disabled={saving || generating} onClick={()=>void generateFields()}>{generating?"Gerando campos…":"✦ Gerar campos"}</button></div>
        <label>Explicação para o estudante<textarea rows={3} value={editing.explanation} maxLength={1500} disabled={saving || generating} onChange={(event) => setEditing({ ...editing, explanation: event.target.value })} /></label>
        <label>Dica · ajude sem revelar a resposta<textarea rows={2} value={editing.hint} maxLength={500} disabled={saving || generating} onChange={(event) => setEditing({ ...editing, hint: event.target.value })} /></label>
        <p className="review-source"><a href={editing.source_url} target="_blank" rel="noreferrer">{editing.source_title} ↗</a><span>{editing.source_license} · atribuição preservada, inclusive em edições.</span></p>
        <p className="review-note">Para marcar “Disponível”, confirme o nível, as 4 alternativas e o gabarito, e preencha explicação e dica. Arquivar interrompe novas atribuições.</p>
        <button className="button button-dark" disabled={saving || generating}>{saving ? "Salvando…" : "Salvar revisão"}<span>✓</span></button>
      </form>
    </section>}
  </section>;
}
