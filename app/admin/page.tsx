"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Json } from "@/lib/supabase/database.types";

type AdminLevel = {
  id: string;
  code: string;
  title: string;
  questionCount: number;
  publishedQuestionCount: number;
};
type AdminLesson = {
  id: string;
  levelId: string;
  title: string;
  category: string;
  published: boolean;
};
type AdminQuestion = {
  id: string;
  lessonId: string;
  levelId?: string;
  type: "multiple_choice" | "fill_blank" | "listening";
  difficulty: "easy" | "intermediate" | "hard";
  prompt: string;
  choices: Json;
  audioPath: string | null;
  acceptedAnswers: string[];
  explanation: string;
  published: boolean;
  createdAt: string;
};
type AdminUser = {
  id: string;
  name: string;
  level: string;
  onboardingComplete: boolean;
  active: boolean;
  createdAt: string;
};
type AdminData = {
  stats: {
    totalUsers: number;
    activeUsers: number;
    totalQuestions: number;
    publishedQuestions: number;
  };
  levels: AdminLevel[];
  users: AdminUser[];
  lessons: AdminLesson[];
  questions: AdminQuestion[];
};
type AdminView = "overview" | "questions" | "users";
type QuestionType = AdminQuestion["type"];

const typeLabels: Record<QuestionType, string> = {
  multiple_choice: "Múltipla escolha",
  fill_blank: "Resposta digitada",
  listening: "Com áudio",
};
const difficultyLabels: Record<AdminQuestion["difficulty"], string> = {
  easy: "Fácil",
  intermediate: "Intermediária",
  hard: "Difícil",
};

const emptyData: AdminData = {
  stats: { totalUsers: 0, activeUsers: 0, totalQuestions: 0, publishedQuestions: 0 },
  levels: [],
  users: [],
  lessons: [],
  questions: [],
};

export default function AdminPage() {
  const [data, setData] = useState<AdminData>(emptyData);
  const [view, setView] = useState<AdminView>("overview");
  const [selectedLevelId, setSelectedLevelId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [lessonFormOpen, setLessonFormOpen] = useState(false);
  const [questionType, setQuestionType] = useState<QuestionType>("multiple_choice");

  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonDescription, setLessonDescription] = useState("");
  const [lessonCategory, setLessonCategory] = useState("Vocabulário");
  const [lessonDuration, setLessonDuration] = useState(15);
  const [questionLessonId, setQuestionLessonId] = useState("");
  const [questionPrompt, setQuestionPrompt] = useState("");
  const [questionChoices, setQuestionChoices] = useState("");
  const [questionAnswers, setQuestionAnswers] = useState("");
  const [questionExplanation, setQuestionExplanation] = useState("");
  const [questionAudioPath, setQuestionAudioPath] = useState("");

  const selectedLevel = data.levels.find((level) => level.id === selectedLevelId) ?? data.levels[0];
  const levelLessons = useMemo(
    () => data.lessons.filter((lesson) => lesson.levelId === selectedLevel?.id),
    [data.lessons, selectedLevel?.id],
  );
  const levelQuestions = useMemo(
    () => data.questions.filter((question) => question.levelId === selectedLevel?.id),
    [data.questions, selectedLevel?.id],
  );

  const adminRequest = useCallback(async (method: "GET" | "POST", body?: unknown) => {
    if (!supabase) throw new Error("O Supabase não está configurado.");
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw new Error(sessionError.message);
    const token = sessionData.session?.access_token;
    if (!token) throw new Error("Entre na sua conta para acessar o painel.");
    const response = await fetch("/api/admin", {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const result: unknown = await response.json();
    if (!response.ok) {
      const message =
        typeof result === "object" && result !== null && "error" in result && typeof result.error === "string"
          ? result.error
          : "A solicitação administrativa falhou.";
      throw new Error(message);
    }
    return result;
  }, []);

  const loadAdminData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = (await adminRequest("GET")) as AdminData;
      setData(result);
      setSelectedLevelId((current) => current || result.levels[0]?.id || "");
      setQuestionLessonId((current) => current || result.lessons[0]?.id || "");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar o painel.");
    } finally {
      setLoading(false);
    }
  }, [adminRequest]);

  useEffect(() => {
    void loadAdminData();
  }, [loadAdminData]);

  useEffect(() => {
    if (!levelLessons.some((lesson) => lesson.id === questionLessonId)) {
      setQuestionLessonId(levelLessons[0]?.id ?? "");
    }
  }, [levelLessons, questionLessonId]);

  async function submitAdminAction(event: FormEvent<HTMLFormElement>, action: string, payload: Record<string, unknown>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const result = (await adminRequest("POST", { action, ...payload })) as { message?: string };
      setNotice(result.message ?? "Alterações salvas.");
      await loadAdminData();
      return true;
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Não foi possível salvar.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function createLesson(event: FormEvent<HTMLFormElement>) {
    const success = await submitAdminAction(event, "createLesson", {
      lesson: {
        levelId: selectedLevel?.id,
        title: lessonTitle,
        description: lessonDescription,
        category: lessonCategory,
        duration: lessonDuration,
      },
    });
    if (success) {
      setLessonTitle("");
      setLessonDescription("");
      setLessonFormOpen(false);
    }
  }

  async function createQuestion(event: FormEvent<HTMLFormElement>) {
    const choices = questionType === "multiple_choice"
      ? questionChoices.split("\n").map((choice) => choice.trim()).filter(Boolean)
      : [];
    const success = await submitAdminAction(event, "createQuestion", {
      question: {
        lessonId: questionLessonId,
        type: questionType,
        prompt: questionPrompt,
        choices,
        acceptedAnswers: questionAnswers.split("\n").map((answer) => answer.trim()).filter(Boolean),
        explanation: questionExplanation,
        audioPath: questionAudioPath,
      },
    });
    if (success) {
      setQuestionPrompt("");
      setQuestionChoices("");
      setQuestionAnswers("");
      setQuestionExplanation("");
      setQuestionAudioPath("");
    }
  }

  async function setPublished(action: "setLessonPublished" | "setQuestionPublished", id: string, published: boolean) {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const result = (await adminRequest("POST", {
        action,
        [action === "setLessonPublished" ? "lesson" : "question"]: { id, published },
      })) as { message?: string };
      setNotice(result.message ?? "Status de publicação atualizado.");
      await loadAdminData();
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : "Não foi possível atualizar a publicação.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <a className="brand admin-brand" href="/"><span className="brand-mark">f.</span> fluência<span className="brand-dot">.</span></a>
        <div className="admin-sidebar-label">ADMINISTRAÇÃO</div>
        <nav className="admin-nav" aria-label="Menu administrativo">
          {([
            ["overview", "▦", "Dashboard"],
            ["questions", "✎", "Questões"],
            ["users", "♙", "Usuários"],
          ] as [AdminView, string, string][]).map(([id, icon, label]) => (
            <button key={id} className={`admin-nav-item ${view === id ? "active" : ""}`} onClick={() => setView(id)}>
              <span>{icon}</span>{label}{view === id && <i />}
            </button>
          ))}
        </nav>
        <div className="admin-sidebar-spacer" />
        <a className="admin-back-link" href="/">← Voltar para o app</a>
        <div className="admin-access-note"><span className="live-dot" /> Área restrita</div>
      </aside>

      <section className="admin-main">
        <header className="admin-topbar">
          <div><span className="section-kicker">FLUÊNCIA · ADMIN</span><h1>{view === "overview" ? "Dashboard" : view === "questions" ? "Questões" : "Usuários"}</h1></div>
          <button className="admin-refresh" onClick={() => void loadAdminData()} disabled={loading}>↻ <span>Atualizar dados</span></button>
        </header>
        <div className="admin-content">
          {notice && <div className="admin-message success" role="status">{notice}<button onClick={() => setNotice("")} aria-label="Fechar aviso">×</button></div>}
          {loading ? <div className="admin-loading"><span className="live-dot" /> Carregando dados administrativos...</div> : error ? <div className="admin-access-error" role="alert"><span>!</span><h2>Painel indisponível</h2><p>{error}</p><button className="button button-dark" onClick={() => void loadAdminData()}>Tentar novamente <span>↻</span></button></div> : <>
            {view === "overview" && <section className="admin-view">
              <div className="admin-welcome"><div><span className="section-kicker">VISÃO GERAL DA PLATAFORMA</span><h2>Uma visão clara do aprendizado.</h2><p>Indicadores e atividade dos últimos 30 dias.</p></div><span className="admin-welcome-spark">✦</span></div>
              <div className="admin-stat-grid">
                <article className="admin-stat-card"><span className="admin-stat-icon mint">♙</span><span className="admin-stat-label">USUÁRIOS CADASTRADOS</span><strong>{data.stats.totalUsers}</strong><small>contas na plataforma</small></article>
                <article className="admin-stat-card"><span className="admin-stat-icon violet">◉</span><span className="admin-stat-label">USUÁRIOS ATIVOS</span><strong>{data.stats.activeUsers}</strong><small>com atividade nos últimos 30 dias</small></article>
                <article className="admin-stat-card"><span className="admin-stat-icon pink">✎</span><span className="admin-stat-label">QUESTÕES CRIADAS</span><strong>{data.stats.totalQuestions}</strong><small>em todos os níveis de inglês</small></article>
                <article className="admin-stat-card"><span className="admin-stat-icon gold">✓</span><span className="admin-stat-label">QUESTÕES PUBLICADAS</span><strong>{data.stats.publishedQuestions}</strong><small>disponíveis para estudantes</small></article>
              </div>
              <section className="admin-panel">
                <div className="admin-panel-heading"><div><span className="section-kicker">CONTEÚDO</span><h2>Questões por nível</h2></div><button className="admin-text-button" onClick={() => setView("questions")}>Gerenciar questões ↗</button></div>
                <div className="admin-level-grid">{data.levels.map((level) => <article key={level.id} className="admin-level-card"><div><span className="admin-level-code">{level.code}</span><span className="admin-level-title">{level.title}</span></div><strong>{level.questionCount}</strong><small>{level.publishedQuestionCount} publicadas</small><div className="admin-mini-track"><span style={{ width: `${level.questionCount ? (level.publishedQuestionCount / level.questionCount) * 100 : 0}%` }} /></div></article>)}</div>
              </section>
              <section className="admin-panel">
                <div className="admin-panel-heading"><div><span className="section-kicker">ESTUDANTES</span><h2>Cadastros recentes</h2></div><button className="admin-text-button" onClick={() => setView("users")}>Ver usuários ↗</button></div>
                <UserTable users={data.users.slice(0, 5)} />
              </section>
            </section>}

            {view === "questions" && <section className="admin-view">
              <div className="admin-page-intro"><div><span className="section-kicker">BIBLIOTECA DE CONTEÚDO</span><h2>Crie questões para cada nível.</h2><p>Novas lições e questões começam como rascunho. Revise e publique quando estiverem prontas.</p></div><label className="admin-level-select-label">NÍVEL<select value={selectedLevel?.id ?? ""} onChange={(event) => setSelectedLevelId(event.target.value)}>{data.levels.map((level) => <option key={level.id} value={level.id}>{level.code} · {level.title}</option>)}</select></label></div>
              <div className="admin-question-layout">
                <section className="admin-panel admin-question-list">
                  <div className="admin-panel-heading"><div><span className="section-kicker">{selectedLevel?.code ?? "—"} · {selectedLevel?.title ?? ""}</span><h2>Questões cadastradas</h2></div><span className="admin-count-badge">{levelQuestions.length}</span></div>
                  {levelLessons.length > 0 && <div className="admin-lesson-publish-list">{levelLessons.map((lesson) => <div className="admin-lesson-row" key={lesson.id}><div><strong>{lesson.title}</strong><small>{lesson.category} · {data.questions.filter((question) => question.lessonId === lesson.id).length} questões</small></div><button className={`admin-status-button ${lesson.published ? "published" : ""}`} disabled={saving} onClick={() => void setPublished("setLessonPublished", lesson.id, !lesson.published)}>{lesson.published ? "Publicada" : "Rascunho"}</button></div>)}</div>}
                  <div className="admin-question-rows">{levelQuestions.map((question) => {
                    const lesson = data.lessons.find((item) => item.id === question.lessonId);
                    return <article className="admin-question-row" key={question.id}><div className="admin-question-row-top"><div className="admin-question-badges"><span className="admin-type-badge">{typeLabels[question.type]}</span><span className={`admin-difficulty-badge difficulty-${question.difficulty}`}>{difficultyLabels[question.difficulty]}</span></div><button className={`admin-status-button ${question.published ? "published" : ""}`} disabled={saving || !lesson?.published} title={!lesson?.published ? "Publique a lição primeiro" : ""} onClick={() => void setPublished("setQuestionPublished", question.id, !question.published)}>{question.published ? "Publicada" : "Rascunho"}</button></div><p>{question.prompt}</p><small>{lesson?.title ?? "Lição"} · {new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(question.createdAt))}</small></article>;
                  })}{!levelQuestions.length && <div className="admin-empty">Ainda não há questões neste nível. Você pode criar a primeira ao lado.</div>}</div>
                </section>
                <div className="admin-create-column">
                  <section className="admin-panel admin-create-panel">
                    <div className="admin-panel-heading"><div><span className="section-kicker">NOVA QUESTÃO</span><h2>Adicionar conteúdo</h2></div></div>
                    {levelLessons.length > 0 ? <form onSubmit={createQuestion} className="admin-form">
                      <label htmlFor="question-lesson">Lição</label><select id="question-lesson" value={questionLessonId} onChange={(event) => setQuestionLessonId(event.target.value)} required>{levelLessons.map((lesson) => <option value={lesson.id} key={lesson.id}>{lesson.title}{lesson.published ? "" : " (rascunho)"}</option>)}</select>
                      <label htmlFor="question-type">Tipo de questão</label><select id="question-type" value={questionType} onChange={(event) => setQuestionType(event.target.value as QuestionType)}><option value="multiple_choice">Múltipla escolha</option><option value="fill_blank">Resposta digitada</option><option value="listening">Com áudio</option></select>
                      <label htmlFor="question-prompt">Enunciado</label><textarea id="question-prompt" value={questionPrompt} onChange={(event) => setQuestionPrompt(event.target.value)} maxLength={2000} rows={3} required placeholder="Escreva a pergunta ou frase para completar..." />
                      {questionType === "multiple_choice" && <><label htmlFor="question-choices">Alternativas <small>(uma por linha)</small></label><textarea id="question-choices" value={questionChoices} onChange={(event) => setQuestionChoices(event.target.value)} rows={4} required placeholder={"Good morning\nGood evening\nGood night"} /></>}
                      {questionType === "listening" && <><label htmlFor="question-audio">Caminho do áudio</label><input id="question-audio" value={questionAudioPath} onChange={(event) => setQuestionAudioPath(event.target.value)} required placeholder="ex.: listening/hello.wav" /></>}
                      <label htmlFor="question-answers">Resposta(s) correta(s) <small>(uma por linha)</small></label><textarea id="question-answers" value={questionAnswers} onChange={(event) => setQuestionAnswers(event.target.value)} rows={2} required placeholder={questionType === "multiple_choice" ? "Good morning" : "Digite a resposta correta"} />
                      <label htmlFor="question-explanation">Explicação <small>(opcional)</small></label><textarea id="question-explanation" value={questionExplanation} onChange={(event) => setQuestionExplanation(event.target.value)} rows={2} placeholder="Uma breve explicação para o estudante" />
                      <p className="admin-form-note">A questão é salva como rascunho. Publique-a depois de revisar.</p>
                      <button className="button button-primary" type="submit" disabled={saving || !questionLessonId}>{saving ? "Salvando..." : "Criar questão"} <span>↗</span></button>
                    </form> : <p className="admin-empty">Não há lições para este nível ainda. Crie uma lição para começar.</p>}
                  </section>
                  <section className="admin-panel admin-create-panel">
                    <div className="admin-panel-heading"><div><span className="section-kicker">ORGANIZAÇÃO</span><h2>Nova lição</h2></div><button className="admin-icon-button" onClick={() => setLessonFormOpen((open) => !open)} aria-label={lessonFormOpen ? "Fechar formulário" : "Abrir formulário"}>{lessonFormOpen ? "−" : "+"}</button></div>
                    {lessonFormOpen && <form onSubmit={createLesson} className="admin-form">
                      <label htmlFor="lesson-title">Título</label><input id="lesson-title" value={lessonTitle} onChange={(event) => setLessonTitle(event.target.value)} required maxLength={100} />
                      <label htmlFor="lesson-description">Descrição</label><textarea id="lesson-description" value={lessonDescription} onChange={(event) => setLessonDescription(event.target.value)} required rows={2} maxLength={300} />
                      <label htmlFor="lesson-category">Categoria</label><input id="lesson-category" value={lessonCategory} onChange={(event) => setLessonCategory(event.target.value)} required maxLength={40} />
                      <label htmlFor="lesson-duration">Duração estimada (minutos)</label><input id="lesson-duration" type="number" min={1} max={240} value={lessonDuration} onChange={(event) => setLessonDuration(Number(event.target.value))} required />
                      <p className="admin-form-note">Lições novas são criadas como rascunho.</p>
                      <button className="button button-dark" type="submit" disabled={saving}>{saving ? "Salvando..." : "Criar lição"} <span>↗</span></button>
                    </form>}
                  </section>
                </div>
              </div>
            </section>}

            {view === "users" && <section className="admin-view">
              <div className="admin-page-intro"><div><span className="section-kicker">BASE DE ESTUDANTES</span><h2>Usuários e níveis atuais.</h2><p>Atividade marcada quando houve ao menos uma tentativa de questão nos últimos 30 dias.</p></div><span className="admin-total-count">{data.users.length} contas</span></div>
              <section className="admin-panel"><UserTable users={data.users} showAll /></section>
            </section>}
          </>}
        </div>
      </section>
    </main>
  );
}

function UserTable({ users, showAll = false }: { users: AdminUser[]; showAll?: boolean }) {
  if (!users.length) return <div className="admin-empty">Nenhum estudante cadastrado.</div>;
  return (
    <div className={`admin-table-wrap ${showAll ? "full-table" : ""}`}>
      <table className="admin-table">
        <thead><tr><th>ESTUDANTE</th><th>NÍVEL</th><th>CADASTRO</th><th>STATUS</th></tr></thead>
        <tbody>{users.map((user) => <tr key={user.id}>
          <td><span className="admin-user-avatar">{user.name.charAt(0).toUpperCase()}</span><span className="admin-user-name">{user.name}</span></td>
          <td><span className={`admin-user-level ${user.level === "—" ? "no-level" : ""}`}>{user.level}</span></td>
          <td>{new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(user.createdAt))}</td>
          <td><span className={`admin-user-status ${user.active ? "active" : ""}`}><i />{user.active ? "Ativo" : user.onboardingComplete ? "Sem atividade recente" : "Cadastro incompleto"}</span></td>
        </tr>)}</tbody>
      </table>
    </div>
  );
}
