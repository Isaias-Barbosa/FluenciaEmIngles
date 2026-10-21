"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import QuestionManager from "./question-manager";
import Feedbacks from "./feedbacks";
import QuestionReserve from "./question-reserve";
import QuestionReview from "./question-review";
import type { CefrLevel, ReviewQuestion } from "@/lib/cefr/types";
import type { Json } from "@/lib/supabase/database.types";

type AdminLevel = {
  id: string;
  code: string;
  title: string;
  questionCount: number;
  publishedQuestionCount: number;
  videoCount: number;
  publishedVideoCount: number;
};
type AdminVideo = {
  id: string;
  levelId: string;
  title: string;
  durationSeconds: number;
  url: string;
  published: boolean;
  createdAt: string;
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
  type: "multiple_choice" | "fill_blank" | "listening" | "word_order";
  difficulty: "easy" | "intermediate" | "hard";
  prompt: string;
  readingPassage?: string | null;
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
  email: string;
  levelId: string | null;
  level: string;
  learningGoal: string;
  dailyGoalMinutes: number;
  onboardingComplete: boolean;
  active: boolean;
  disabled: boolean;
  createdAt: string;
};
type AdminData = {
  stats: {
    totalUsers: number;
    activeUsers: number;
    totalQuestions: number;
    publishedQuestions: number;
    totalVideos: number;
    publishedVideos: number;
  };
  levels: AdminLevel[];
  users: AdminUser[];
  lessons: AdminLesson[];
  questions: AdminQuestion[];
  videos: AdminVideo[];
};
type AdminView = "feedback" | "overview" | "questions" | "review" | "reserve" | "videos" | "users";
type QuestionType = AdminQuestion["type"];

const learningGoals = [
  "Conversar em viagens",
  "Crescer na carreira",
  "Entender filmes e séries",
  "Estudar ou morar fora",
  "Aprender por prazer",
];

const emptyData: AdminData = {
  stats: { totalUsers: 0, activeUsers: 0, totalQuestions: 0, publishedQuestions: 0, totalVideos: 0, publishedVideos: 0 },
  levels: [],
  users: [],
  lessons: [],
  questions: [],
  videos: [],
};

export default function AdminDashboard() {
  const [data, setData] = useState<AdminData>(emptyData);
  const [view, setView] = useState<AdminView>("overview");
  const [selectedLevelId, setSelectedLevelId] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [lessonFormOpen, setLessonFormOpen] = useState(false);
  const [questionType, setQuestionType] = useState<QuestionType>("multiple_choice");
  const [createPanelOpen,setCreatePanelOpen]=useState(false);
  const publicationPending=useRef(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userLevelId, setUserLevelId] = useState("");
  const [userLearningGoal, setUserLearningGoal] = useState(learningGoals[0]);
  const [userDailyGoalMinutes, setUserDailyGoalMinutes] = useState(20);

  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonDescription, setLessonDescription] = useState("");
  const [lessonCategory, setLessonCategory] = useState("Vocabulário");
  const [lessonDuration, setLessonDuration] = useState(15);
  const [videoUrl, setVideoUrl] = useState("");
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
  const levelVideos = useMemo(
    () => data.videos.filter((video) => video.levelId === selectedLevel?.id),
    [data.videos, selectedLevel?.id],
  );

  const adminRequest = useCallback(async (method: "GET" | "POST", body?: unknown, endpoint: string = "/api/admin") => {
    if (!supabase) throw new Error("O Supabase não está configurado.");
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw new Error(sessionError.message);
    const token = sessionData.session?.access_token;
    if (!token) throw new Error("Entre na sua conta para acessar o painel.");
    const response = await fetch(endpoint, {
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
    setLoadFailed(false);
    setError("");
    try {
      const result = (await adminRequest("GET")) as AdminData;
      setData(result);
      setSelectedLevelId((current) => current || result.levels[0]?.id || "");
      setQuestionLessonId((current) => current || result.lessons[0]?.id || "");
    } catch (loadError) {
      setLoadFailed(true);
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

  const reviewRequest = useCallback((body: unknown) => adminRequest("POST", body, "/api/admin/question-review"), [adminRequest]);

  const feedbackRequest = useCallback((page:number) => adminRequest("GET", undefined, `/api/admin/feedback?page=${page}`), [adminRequest]);
  const generateNotes = useCallback((question:unknown)=>adminRequest("POST",{question},"/api/admin/question-notes"),[adminRequest]);
  const reserveRequest = useCallback((method: "GET" | "POST", body?: unknown, query = "") => adminRequest(method, body, `/api/admin/question-reserve${query ? `?${query}` : ""}`), [adminRequest]);
  const saveReviewedReserve = useCallback(async (question: ReviewQuestion, level: CefrLevel | "") => {
    const result = await reserveRequest("POST", { action: "save", ...(question.reserveId ? { id: question.reserveId, updatedAt: question.reserveUpdatedAt, status: "pending", preserveTeachingNotes: true } : {}),
      question: { ...question, level, explanation: "", hint: "" } }) as { question: { id: string; updated_at: string } };
    return { reserveId: result.question.id, reserveUpdatedAt: result.question.updated_at };
  }, [reserveRequest]);

  function useReviewedQuestion(question: ReviewQuestion, level: CefrLevel) {
    setCreatePanelOpen(true);
    const target = data.levels.find((item) => item.code === level);
    if (!target) { setError("Esse nível ainda não está cadastrado."); return; }
    const attribution = question.source === "manual" ? "" : `\n\nFonte: ${question.sourceLabel} · ${question.sourceUrl} · ${question.license} (texto sujeito a edição).`;
    const prompt = question.prompt + attribution;
    if (prompt.length > 2000) { setError("Reduza o enunciado para manter a atribuição da fonte."); return; }
    setSelectedLevelId(target.id);
    setQuestionLessonId(data.lessons.find((lesson) => lesson.levelId === target.id)?.id ?? "");
    setQuestionType(question.choices.length ? "multiple_choice" : "fill_blank");
    setQuestionPrompt(prompt);
    setQuestionChoices(question.choices.join("\n"));
    setQuestionAnswers(question.correctAnswer);
    setQuestionExplanation(""); setQuestionAudioPath("");
    setView("questions"); setError("");
    setNotice(`Questão preparada em ${level}. Confira a lição e acrescente uma explicação antes de salvar o rascunho.`);
  }

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

  async function createVideo(event: FormEvent<HTMLFormElement>) {
    const success = await submitAdminAction(event, "createVideo", {
      video: { levelId: selectedLevel?.id, url: videoUrl },
    });
    if (success) setVideoUrl("");
  }

  function updateQuestionPublication(ids:string[],published:boolean) {
    const selected=new Set(ids);
    setData(current=>{
      const changed=current.questions.filter(question=>selected.has(question.id)&&question.published!==published);
      const direction=published?1:-1;
      return {...current,questions:current.questions.map(question=>selected.has(question.id)?{...question,published}:question),
        stats:{...current.stats,publishedQuestions:current.stats.publishedQuestions+direction*changed.length},
        levels:current.levels.map(level=>({...level,publishedQuestionCount:level.publishedQuestionCount+direction*changed.filter(question=>question.levelId===level.id).length}))};
    });
  }
  async function publishMany(ids:string[],published:boolean) {
    if(publicationPending.current)return false;
    publicationPending.current=true;setSaving(true);setError("");setNotice("");
    try{
      const result=await adminRequest("POST",{action:"setQuestionsPublished",ids,published}) as {message:string};
      updateQuestionPublication(ids,published);setNotice(result.message);return true;
    }catch(error){setError(error instanceof Error?error.message:"Não foi possível atualizar o lote.");return false;}
    finally{publicationPending.current=false;setSaving(false);}
  }
  async function setPublished(action: "setLessonPublished" | "setQuestionPublished" | "setVideoPublished", id: string, published: boolean) {
    if(publicationPending.current)return false;
    publicationPending.current=true;setSaving(true);setError("");setNotice("");
    try {
      const result = (await adminRequest("POST", {
        action,
        [action === "setLessonPublished" ? "lesson" : action === "setQuestionPublished" ? "question" : "video"]: { id, published },
      })) as { message?: string };
      setNotice(result.message ?? "Status de publicação atualizado.");
      if(action==="setQuestionPublished")updateQuestionPublication([id],published);
      else if(action==="setLessonPublished")setData(current=>({...current,lessons:current.lessons.map(lesson=>lesson.id===id?{...lesson,published}:lesson)}));
      else await loadAdminData();
      return true;
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : "Não foi possível atualizar a publicação.");return false;
    } finally { publicationPending.current=false;setSaving(false); }
  }

  async function deleteVideo(video: AdminVideo) {
    if (!window.confirm(`Remover “${video.title}” permanentemente?`)) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const result = (await adminRequest("POST", { action: "deleteVideo", video: { id: video.id } })) as { message?: string };
      setNotice(result.message ?? "Vídeo removido.");
      await loadAdminData();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Não foi possível remover o vídeo.");
    } finally {
      setSaving(false);
    }
  }

  function startEditingUser(user: AdminUser) {
    setEditingUser(user);
    setUserName(user.name);
    setUserEmail(user.email);
    setUserLevelId(user.levelId ?? "");
    setUserLearningGoal(user.learningGoal);
    setUserDailyGoalMinutes(user.dailyGoalMinutes);
  }

  async function saveUser(event: FormEvent<HTMLFormElement>) {
    if (!editingUser) return;
    const success = await submitAdminAction(event, "updateUser", {
      user: {
        id: editingUser.id,
        name: userName,
        email: userEmail,
        levelId: userLevelId,
        learningGoal: userLearningGoal,
        dailyGoalMinutes: userDailyGoalMinutes,
      },
    });
    if (success) setEditingUser(null);
  }

  async function performUserAction(action: "setUserDisabled" | "resetUserProgress", user: AdminUser) {
    const confirmation = action === "resetUserProgress"
      ? `Isso apagará todas as tentativas de ${user.name} e exigirá que refaça a prova de proficiência. Continuar?`
      : `${user.disabled ? "Reativar" : "Desativar"} a conta de ${user.name}? ${user.disabled ? "O usuário poderá entrar novamente." : "O login será bloqueado, sem apagar a conta ou os dados."}`;
    if (!window.confirm(confirmation)) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const result = (await adminRequest("POST", {
        action,
        user: action === "resetUserProgress"
          ? { id: user.id }
          : { id: user.id, disabled: !user.disabled },
      })) as { message?: string };
      setNotice(result.message ?? "Ação concluída.");
      await loadAdminData();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Não foi possível atualizar o usuário.");
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
            ["review", "◎", "Verifique a Questão"],
            ["feedback", "✉", "Feedbacks"],
            ["reserve", "▣", "Banco de reservas"],
            ["videos", "▶", "Vídeos"],
            ["users", "♙", "Usuários"],
          ] as [AdminView, string, string][]).map(([id, icon, label]) => (
            <button key={id} title={label} aria-label={label} className={`admin-nav-item ${view === id ? "active" : ""}`} onClick={() => {setView(id);setNotice("");setError("");}}>
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
          <div><span className="section-kicker">FLUÊNCIA · ADMIN</span><h1>{view === "feedback" ? "Feedbacks" : view === "overview" ? "Dashboard" : view === "questions" ? "Questões" : view === "review" ? "Verifique a Questão" : view === "reserve" ? "Banco de reservas" : view === "videos" ? "Vídeos" : "Usuários"}</h1></div>
          <button className="admin-refresh" onClick={() => void loadAdminData()} disabled={loading}>↻ <span>Atualizar dados</span></button>
        </header>
        <div className="admin-content">
          {notice && <div className="admin-message success" role="status">{notice}<button onClick={() => setNotice("")} aria-label="Fechar aviso">×</button></div>}
          {loading && data.levels.length === 0 ? <div className="admin-loading"><span className="live-dot" /> Carregando dados administrativos...</div> : loadFailed ? <div className="admin-access-error" role="alert"><span>!</span><h2>Painel indisponível</h2><p>{error}</p><button className="button button-dark" onClick={() => void loadAdminData()}>Tentar novamente <span>↻</span></button></div> : <>
            {error && <div className="admin-message error" role="alert">{error}<button onClick={() => setError("")} aria-label="Fechar aviso">×</button></div>}
            {view === "overview" && <section className="admin-view">
              <div className="admin-welcome"><div><span className="section-kicker">VISÃO GERAL DA PLATAFORMA</span><h2>Uma visão clara do aprendizado.</h2><p>Indicadores e atividade dos últimos 30 dias.</p></div><span className="admin-welcome-spark">✦</span></div>
              <div className="admin-stat-grid">
                <article className="admin-stat-card"><span className="admin-stat-icon mint">♙</span><span className="admin-stat-label">USUÁRIOS CADASTRADOS</span><strong>{data.stats.totalUsers}</strong><small>contas na plataforma</small></article>
                <article className="admin-stat-card"><span className="admin-stat-icon violet">◉</span><span className="admin-stat-label">USUÁRIOS ATIVOS</span><strong>{data.stats.activeUsers}</strong><small>com atividade nos últimos 30 dias</small></article>
                <article className="admin-stat-card"><span className="admin-stat-icon pink">✎</span><span className="admin-stat-label">QUESTÕES CRIADAS</span><strong>{data.stats.totalQuestions}</strong><small>em todos os níveis de inglês</small></article>
                <article className="admin-stat-card"><span className="admin-stat-icon gold">✓</span><span className="admin-stat-label">QUESTÕES PUBLICADAS</span><strong>{data.stats.publishedQuestions}</strong><small>disponíveis para estudantes</small></article>
                <article className="admin-stat-card"><span className="admin-stat-icon violet">▶</span><span className="admin-stat-label">VÍDEOS CADASTRADOS</span><strong>{data.stats.totalVideos}</strong><small>{data.stats.publishedVideos} disponíveis para estudantes</small></article>
              </div>
              <section className="admin-panel">
                <div className="admin-panel-heading"><div><span className="section-kicker">CONTEÚDO</span><h2>Questões por nível</h2></div><button className="admin-text-button" onClick={() => setView("questions")}>Gerenciar questões ↗</button></div>
                <div className="admin-level-grid">{data.levels.map((level) => <article key={level.id} className="admin-level-card"><div><span className="admin-level-code">{level.code}</span><span className="admin-level-title">{level.title}</span></div><strong>{level.questionCount}</strong><small>{level.publishedQuestionCount} publicadas</small><div className="admin-mini-track"><span style={{ width: `${level.questionCount ? (level.publishedQuestionCount / level.questionCount) * 100 : 0}%` }} /></div></article>)}</div>
              </section>
              <section className="admin-panel">
                <div className="admin-panel-heading"><div><span className="section-kicker">BIBLIOTECA DE VÍDEOS</span><h2>Vídeos por nível</h2></div><button className="admin-text-button" onClick={() => setView("videos")}>Gerenciar vídeos ↗</button></div>
                <div className="admin-level-grid">{data.levels.map((level) => <article key={level.id} className="admin-level-card"><div><span className="admin-level-code">{level.code}</span><span className="admin-level-title">{level.title}</span></div><strong>{level.videoCount}</strong><small>{level.publishedVideoCount} publicados</small><div className="admin-mini-track"><span style={{ width: `${level.videoCount ? (level.publishedVideoCount / level.videoCount) * 100 : 0}%` }} /></div></article>)}</div>
              </section>
              <section className="admin-panel">
                <div className="admin-panel-heading"><div><span className="section-kicker">ESTUDANTES</span><h2>Cadastros recentes</h2></div><button className="admin-text-button" onClick={() => setView("users")}>Ver usuários ↗</button></div>
                <UserTable users={data.users.slice(0, 5)} />
              </section>
            </section>}

            <div hidden={view !== "review"}><QuestionReview request={reviewRequest} availableLevels={data.levels.map((level) => level.code)} onUseQuestion={useReviewedQuestion} onSaveReserve={saveReviewedReserve} /></div>

            <div hidden={view !== "feedback"}><Feedbacks active={view === "feedback"} request={feedbackRequest} /></div>
            <div hidden={view !== "reserve"}><QuestionReserve generate={generateNotes} active={view === "reserve"} request={reserveRequest} onImport={() => setView("review")} /></div>

            {view === "questions" && <section className="admin-view">
              <div className="admin-page-intro"><div><span className="section-kicker">BIBLIOTECA DE CONTEÚDO</span><h2>Encontre, revise e publique.</h2><p>Filtre por nível e lição, confira os detalhes e publique até 50 questões de uma vez.</p></div><div className="question-level-actions"><button className="button button-primary" type="button" onClick={()=>setCreatePanelOpen(value=>!value)}>{createPanelOpen?"Fechar criação":"+ Adicionar conteúdo"}</button><label className="admin-level-select-label">NÍVEL<select value={selectedLevel?.id ?? ""} onChange={(event) => setSelectedLevelId(event.target.value)}>{data.levels.map((level) => <option key={level.id} value={level.id}>{level.code} · {level.title}</option>)}</select></label></div></div>
              <div className={`admin-question-layout ${createPanelOpen?"":"admin-question-layout-compact"}`}>
                <QuestionManager key={selectedLevel?.id} questions={levelQuestions} lessons={levelLessons} saving={saving} onPublish={(id,published)=>setPublished("setQuestionPublished",id,published)} onPublishLesson={(id,published)=>setPublished("setLessonPublished",id,published)} onPublishMany={publishMany}/>
                <div className="admin-create-column" hidden={!createPanelOpen}>
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

            {view === "videos" && <section className="admin-view">
              <div className="admin-page-intro">
                <div><span className="section-kicker">BIBLIOTECA DE VÍDEOS</span><h2>Vídeos curtos por nível.</h2><p>Cole um link público do VoiceTube. O título e a duração de 1 a 20 minutos são verificados automaticamente; novos vídeos entram como rascunho.</p></div>
                <label className="admin-level-select-label">NÍVEL<select value={selectedLevel?.id ?? ""} onChange={(event) => setSelectedLevelId(event.target.value)}>{data.levels.map((level) => <option key={level.id} value={level.id}>{level.code} · {level.title}</option>)}</select></label>
              </div>
              <div className="admin-video-layout">
                <section className="admin-panel">
                  <div className="admin-panel-heading"><div><span className="section-kicker">{selectedLevel?.code ?? "—"} · {selectedLevel?.title ?? ""}</span><h2>Vídeos cadastrados</h2></div><span className="admin-count-badge">{levelVideos.length}</span></div>
                  {levelVideos.length ? <div className="admin-video-list">{levelVideos.map((video) => (
                    <article className="admin-video-row" key={video.id}>
                      <div className="admin-video-details">
                        <strong>{video.title}</strong>
                        <small>{Math.floor(video.durationSeconds / 60)}:{String(video.durationSeconds % 60).padStart(2, "0")} · <a href={video.url} target="_blank" rel="noreferrer">Abrir no VoiceTube ↗</a></small>
                      </div>
                      <div className="admin-video-actions">
                        <button className={`admin-status-button ${video.published ? "published" : ""}`} disabled={saving} onClick={() => void setPublished("setVideoPublished", video.id, !video.published)}>{video.published ? "Publicado" : "Rascunho"}</button>
                        <button className="admin-action-button reset" disabled={saving} onClick={() => void deleteVideo(video)} aria-label={`Remover ${video.title}`}>Remover</button>
                      </div>
                    </article>
                  ))}</div> : <div className="admin-empty">Ainda não há vídeos para este nível. Adicione um link para começar.</div>}
                </section>
                <section className="admin-panel admin-create-panel">
                  <div className="admin-panel-heading"><div><span className="section-kicker">NOVO VÍDEO</span><h2>Adicionar por URL</h2></div></div>
                  {selectedLevel ? <form onSubmit={createVideo} className="admin-form">
                    <label htmlFor="video-url">Link público do VoiceTube</label>
                    <input id="video-url" type="url" value={videoUrl} onChange={(event) => setVideoUrl(event.target.value)} required placeholder="https://www.voicetube.com/videos/198652" />
                    <p className="admin-form-note">O título e o tempo são preenchidos a partir da página original. Só aceitamos vídeos de 1 a 20 minutos; você poderá revisar e publicar depois.</p>
                    <button className="button button-primary" type="submit" disabled={saving || !videoUrl.trim()}>{saving ? "Verificando e salvando..." : "Adicionar vídeo"} <span>↗</span></button>
                  </form> : <p className="admin-empty">Os níveis de inglês não foram carregados.</p>}
                </section>
              </div>
            </section>}

            {view === "users" && <section className="admin-view">
              <div className="admin-page-intro"><div><span className="section-kicker">BASE DE ESTUDANTES</span><h2>Usuários e níveis atuais.</h2><p>Atividade marcada quando houve ao menos uma tentativa de questão nos últimos 30 dias.</p></div><span className="admin-total-count">{data.users.length} contas</span></div>
              <section className="admin-panel">
                <UserTable
                  users={data.users}
                  showAll
                  saving={saving}
                  onEdit={startEditingUser}
                  onToggleDisabled={(user) => void performUserAction("setUserDisabled", user)}
                  onResetProgress={(user) => void performUserAction("resetUserProgress", user)}
                />
              </section>
              {editingUser && <div className="admin-modal-backdrop" role="presentation" onMouseDown={(event) => {
                if (event.target === event.currentTarget && !saving) setEditingUser(null);
              }}>
                <section className="admin-user-editor" role="dialog" aria-modal="true" aria-labelledby="admin-user-editor-title">
                  <div className="admin-panel-heading"><div><span className="section-kicker">EDITAR CONTA</span><h2 id="admin-user-editor-title">{editingUser.name}</h2></div><button className="admin-icon-button" type="button" onClick={() => setEditingUser(null)} disabled={saving} aria-label="Fechar edição">×</button></div>
                  {error && <div className="admin-message error" role="alert">{error}</div>}
                  <form onSubmit={saveUser} className="admin-form">
                    <label htmlFor="admin-user-name">Nome</label><input id="admin-user-name" value={userName} onChange={(event) => setUserName(event.target.value)} required maxLength={80} />
                    <label htmlFor="admin-user-email">E-mail</label><input id="admin-user-email" type="email" value={userEmail} onChange={(event) => setUserEmail(event.target.value)} required maxLength={254} />
                    <label htmlFor="admin-user-level">Nível atual</label><select id="admin-user-level" value={userLevelId} onChange={(event) => setUserLevelId(event.target.value)}><option value="">Sem nível — exigir prova</option>{data.levels.map((level) => <option key={level.id} value={level.id}>{level.code} · {level.title}</option>)}</select>
                    <p className="admin-form-note">Definir um nível marca o nivelamento como concluído. Escolha “Sem nível” para exigir a prova de proficiência.</p>
                    <label htmlFor="admin-user-goal">Objetivo de estudo</label><select id="admin-user-goal" value={userLearningGoal} onChange={(event) => setUserLearningGoal(event.target.value)}>{learningGoals.map((goal) => <option key={goal} value={goal}>{goal}</option>)}</select>
                    <label htmlFor="admin-user-daily-goal">Meta diária</label><select id="admin-user-daily-goal" value={userDailyGoalMinutes} onChange={(event) => setUserDailyGoalMinutes(Number(event.target.value))}><option value={10}>10 minutos</option><option value={20}>20 minutos</option><option value={30}>30 minutos</option><option value={45}>45 minutos</option></select>
                    <div className="admin-user-editor-actions"><button className="admin-action-button" type="button" onClick={() => setEditingUser(null)} disabled={saving}>Cancelar</button><button className="button button-primary" type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar alterações"}</button></div>
                  </form>
                </section>
              </div>}
            </section>}
          </>}
        </div>
      </section>
    </main>
  );
}

function UserTable({
  users,
  showAll = false,
  saving = false,
  onEdit,
  onToggleDisabled,
  onResetProgress,
}: {
  users: AdminUser[];
  showAll?: boolean;
  saving?: boolean;
  onEdit?: (user: AdminUser) => void;
  onToggleDisabled?: (user: AdminUser) => void;
  onResetProgress?: (user: AdminUser) => void;
}) {
  if (!users.length) return <div className="admin-empty">Nenhum estudante cadastrado.</div>;
  return (
    <div className={`admin-table-wrap ${showAll ? "full-table" : ""}`}>
      <table className="admin-table">
        <thead><tr><th>ESTUDANTE</th><th>NÍVEL</th><th>CADASTRO</th><th>STATUS</th>{showAll && <th>AÇÕES</th>}</tr></thead>
        <tbody>{users.map((user) => <tr key={user.id}>
          <td><span className="admin-user-avatar">{user.name.charAt(0).toUpperCase()}</span><span className="admin-user-details"><span className="admin-user-name">{user.name}</span><small>{user.email || "E-mail indisponível"}</small></span></td>
          <td><span className={`admin-user-level ${user.level === "—" ? "no-level" : ""}`}>{user.level}</span></td>
          <td>{new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(user.createdAt))}</td>
          <td><span className={`admin-user-status ${user.disabled ? "disabled" : user.active ? "active" : ""}`}><i />{user.disabled ? "Desativado" : user.active ? "Ativo" : user.onboardingComplete ? "Sem atividade recente" : "Cadastro incompleto"}</span></td>
          {showAll && <td><div className="admin-user-actions">
            <button className="admin-action-button" type="button" disabled={saving} onClick={() => onEdit?.(user)}>Editar</button>
            <button className={`admin-action-button ${user.disabled ? "reactivate" : "deactivate"}`} type="button" disabled={saving} onClick={() => onToggleDisabled?.(user)}>{user.disabled ? "Reativar" : "Desativar"}</button>
            <button className="admin-action-button reset" type="button" disabled={saving} onClick={() => onResetProgress?.(user)}>Zerar progresso</button>
          </div></td>}
        </tr>)}</tbody>
      </table>
    </div>
  );
}
