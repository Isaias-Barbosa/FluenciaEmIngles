"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import type { Database, Json } from "@/lib/supabase/database.types";

type LevelId = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
type PageId = "home" | "lessons" | "cards" | "progress" | "profile";
type AuthMode = "signup" | "signin";
type QuestionType = "multiple_choice" | "fill_blank" | "listening";
type LessonQuestion = {
  id: string;
  type: QuestionType;
  prompt: string;
  options: string[];
  audioUrl: string | null;
};
type Lesson = {
  id: string;
  level: LevelId;
  title: string;
  category: string;
  duration: number;
  description: string;
  sortOrder: number;
  questions: LessonQuestion[];
};
type Flashcard = {
  front: string;
  back: string;
  pronunciation: string;
};
type Profile = {
  userId: string;
  name: string;
  email: string;
  level: LevelId;
  levelTitle: string;
  currentLevelId: string;
  goal: string;
  dailyMinutes: number;
  onboardingComplete: boolean;
  completedLessons: string[];
  completedQuestionIds: string[];
};
type PublishedQuestionRow =
  Database["public"]["Views"]["published_lesson_questions"]["Row"];

const levels: { id: LevelId; name: string; subtitle: string }[] = [
  { id: "A1", name: "Beginner", subtitle: "Primeiros passos" },
  { id: "A2", name: "Elementary", subtitle: "Comunicação básica" },
  { id: "B1", name: "Intermediate", subtitle: "Independência" },
  { id: "B2", name: "Upper intermediate", subtitle: "Fluência em expansão" },
  { id: "C1", name: "Advanced", subtitle: "Uso avançado" },
  { id: "C2", name: "Proficient", subtitle: "Domínio completo" },
];

const goals = [
  "Conversar em viagens",
  "Crescer na carreira",
  "Entender filmes e séries",
  "Estudar ou morar fora",
  "Aprender por prazer",
];

const placementQuestions: {
  level: LevelId;
  prompt: string;
  options: string[];
}[] = [
  { level: "A1", prompt: "Choose the correct greeting for the morning.", options: ["Good morning", "Good night", "Good evening", "Goodbye"] },
  { level: "A1", prompt: "Complete: She ___ a student.", options: ["am", "is", "are", "be"] },
  { level: "A1", prompt: "What is the plural of “child”?", options: ["childs", "childes", "children", "childrens"] },
  { level: "A2", prompt: "Complete: We ___ to the cinema last night.", options: ["go", "went", "gone", "going"] },
  { level: "A2", prompt: "Choose the natural sentence.", options: ["I have 20 years.", "I am 20 years old.", "I have 20 old.", "I am with 20 years."] },
  { level: "A2", prompt: "Complete: There isn’t ___ milk in the fridge.", options: ["some", "many", "any", "few"] },
  { level: "B1", prompt: "Complete: If I ___ more time, I would learn another language.", options: ["have", "had", "will have", "would have"] },
  { level: "B1", prompt: "Choose the correct reported speech: “I’m tired,” she said.", options: ["She said she is tired.", "She said I was tired.", "She said she was tired.", "She told that tired."] },
  { level: "B1", prompt: "Complete: I’ve lived here ___ 2021.", options: ["for", "since", "during", "from"] },
  { level: "B2", prompt: "Complete: By the time we arrived, the meeting ___.", options: ["started", "has started", "had started", "was starting"] },
  { level: "B2", prompt: "Choose the best meaning of “to bring about a change.”", options: ["To prevent a change", "To cause a change", "To explain a change", "To delay a change"] },
  { level: "B2", prompt: "Complete: The proposal, ___ was submitted yesterday, needs revision.", options: ["that", "who", "which", "whose"] },
  { level: "C1", prompt: "Complete: Rarely ___ such a compelling argument.", options: ["I have heard", "have I heard", "I heard", "heard I"] },
  { level: "C1", prompt: "Choose the closest meaning of “the evidence is tenuous.”", options: ["The evidence is conclusive.", "The evidence is weak.", "The evidence is irrelevant.", "The evidence is extensive."] },
  { level: "C1", prompt: "Complete: Had they informed us earlier, we ___ the issue.", options: ["could resolve", "could have resolved", "will resolve", "had resolved"] },
  { level: "C2", prompt: "Choose the sentence with the most precise use of “disinterested.”", options: ["She was disinterested in the lecture and fell asleep.", "As a disinterested mediator, he had no stake in the outcome.", "The disinterested book was hard to finish.", "They disinterested the proposal."] },
  { level: "C2", prompt: "Complete: So nuanced ___ the account that it resisted easy interpretation.", options: ["the account was", "was the account", "did the account", "the account did"] },
  { level: "C2", prompt: "Which phrase means “to make a bad situation worse”?", options: ["To cut corners", "To take the plunge", "To add fuel to the fire", "To call it a day"] },
];

function choicesFromJson(value: Json): string[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    throw new Error("Uma questão publicada contém alternativas inválidas.");
  }
  return value;
}

function profileErrorMessage(error: { message: string; code?: string }) {
  if (error.code === "PGRST116") {
    return "Seu perfil ainda não foi criado no banco. Confira se as migrations do Supabase foram executadas.";
  }
  return error.message;
}

export default function Dashboard() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [page, setPage] = useState<PageId>("home");
  const [ready, setReady] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("signup");
  const [nameInput, setNameInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<LevelId>("A1");
  const [goal, setGoal] = useState(goals[0]);
  const [dailyMinutes, setDailyMinutes] = useState(20);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [answerResult, setAnswerResult] = useState<"correct" | "incorrect" | null>(null);
  const [answerFeedback, setAnswerFeedback] = useState("");
  const [answerHint, setAnswerHint] = useState("");
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [levelAdvanced, setLevelAdvanced] = useState(false);
  const [answerSaving, setAnswerSaving] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const [authError, setAuthError] = useState("");
  const [appError, setAppError] = useState("");
  const [cardIndex, setCardIndex] = useState(0);
  const [cardFlipped, setCardFlipped] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const configured = supabase !== null;

  const loadProfile = useCallback(async (activeSession: Session) => {
    if (!supabase) throw new Error("Supabase não está configurado.");
    setProfileLoading(true);
    setAppError("");
    try {
      const { data: profileRow, error: profileQueryError } = await supabase
        .from("profiles")
        .select("user_id, display_name, current_level_id, learning_goal, daily_goal_minutes, onboarding_completed")
        .eq("user_id", activeSession.user.id)
        .single();

      if (profileQueryError) throw new Error(profileErrorMessage(profileQueryError));
      if (!profileRow.current_level_id) {
        throw new Error("Seu perfil ainda não tem um nível de aprendizagem associado.");
      }

      const { data: levelRow, error: levelQueryError } = await supabase
        .from("language_levels")
        .select("id, code, title")
        .eq("id", profileRow.current_level_id)
        .single();

      if (levelQueryError) throw new Error(levelQueryError.message);
      const matchedLevel = levels.find((level) => level.id === levelRow.code);
      if (!matchedLevel) {
        throw new Error(`O nível ${levelRow.code} ainda não é compatível com a trilha atual.`);
      }

      const nextProfile: Profile = {
        userId: activeSession.user.id,
        name: profileRow.display_name || activeSession.user.email?.split("@")[0] || "Estudante",
        email: activeSession.user.email || "",
        level: matchedLevel.id,
        levelTitle: levelRow.title,
        currentLevelId: levelRow.id,
        goal: profileRow.learning_goal,
        dailyMinutes: profileRow.daily_goal_minutes,
        onboardingComplete: profileRow.onboarding_completed,
        completedLessons: [],
        completedQuestionIds: [],
      };
      setProfile(nextProfile);
      return nextProfile;
    } finally {
      setProfileLoading(false);
    }
  }, []);

  const loadStudyData = useCallback(async (activeProfile: Profile) => {
    if (!supabase) throw new Error("Supabase não está configurado.");

    const [questionsResult, cardsResult, attemptsResult] = await Promise.all([
      supabase
        .from("published_lesson_questions")
        .select("*")
        .order("lesson_sort_order")
        .order("question_sort_order"),
      supabase
        .from("vocabulary_cards")
        .select("front, back, pronunciation, sort_order")
        .eq("level_id", activeProfile.currentLevelId)
        .eq("is_published", true)
        .order("sort_order"),
      supabase
        .from("question_attempts")
        .select("question_id, is_correct")
        .eq("user_id", activeProfile.userId),
    ]);

    if (questionsResult.error) {
      throw new Error(`Não foi possível carregar as lições: ${questionsResult.error.message}`);
    }
    if (cardsResult.error) {
      throw new Error(`Não foi possível carregar os cards: ${cardsResult.error.message}`);
    }
    if (attemptsResult.error) {
      throw new Error(`Não foi possível carregar seu progresso: ${attemptsResult.error.message}`);
    }

    const groupedLessons = new Map<string, Lesson>();
    for (const row of questionsResult.data) {
      const matchedLevel = levels.find((level) => level.id === row.level_code);
      if (!matchedLevel) {
        throw new Error(`O nível ${row.level_code} de uma lição não é compatível com a trilha.`);
      }
      const question: LessonQuestion = {
        id: row.question_id,
        type: row.question_type,
        prompt: row.prompt,
        options: choicesFromJson(row.choices),
        audioUrl: row.audio_path
          ? row.audio_path.startsWith("public/")
            ? `/${row.audio_path.slice("public/".length)}`
            : supabase.storage.from("lesson-audio").getPublicUrl(row.audio_path).data.publicUrl
          : null,
      };
      const lesson = groupedLessons.get(row.lesson_id);
      if (lesson) {
        lesson.questions.push(question);
      } else {
        groupedLessons.set(row.lesson_id, {
          id: row.lesson_id,
          level: matchedLevel.id,
          title: row.lesson_title,
          category: row.lesson_category,
          duration: row.duration_minutes,
          description: row.lesson_description,
          sortOrder: row.lesson_sort_order,
          questions: [question],
        });
      }
    }

    const nextLessons = [...groupedLessons.values()];
    const correctQuestionIds = new Set(
      attemptsResult.data
        .filter((attempt) => attempt.is_correct)
        .map((attempt) => attempt.question_id),
    );
    const completedLessons = nextLessons
      .filter((lesson) => lesson.questions.every((question) => correctQuestionIds.has(question.id)))
      .map((lesson) => lesson.id);
    const nextCards = cardsResult.data.map((card) => ({
      front: card.front,
      back: card.back,
      pronunciation: card.pronunciation,
    }));

    setLessons(nextLessons);
    setCards(nextCards);
    setProfile((current) =>
      current?.userId === activeProfile.userId
        ? {
            ...current,
            completedLessons,
            completedQuestionIds: [...correctQuestionIds],
          }
        : current,
    );
  }, []);

  useEffect(() => {
    if (!supabase) {
      setReady(true);
      return;
    }

    let mounted = true;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      setAuthMessage("");
      setAuthError("");
      setAppError("");
      if (!nextSession) {
        setProfile(null);
        setLessons([]);
        setCards([]);
        setReady(true);
      }
    });

    void supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!mounted) return;
        if (error) {
          setAuthError(error.message);
          setReady(true);
          return;
        }
        setSession(data.session);
        setReady(true);
      })
      .catch((error: unknown) => {
        if (!mounted) return;
        setAuthError(error instanceof Error ? error.message : "Não foi possível verificar sua sessão.");
        setReady(true);
      });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session) return;
    let active = true;
    void loadProfile(session)
      .then((loadedProfile) => {
        if (active) return loadStudyData(loadedProfile);
      })
      .catch((error: unknown) => {
        if (active) {
          setAppError(error instanceof Error ? error.message : "Não foi possível carregar seus dados.");
        }
      });
    return () => {
      active = false;
    };
  }, [session?.user.id, loadProfile, loadStudyData]);

  const currentLessons = useMemo(
    () => lessons.filter((lesson) => lesson.level === profile?.level),
    [lessons, profile?.level],
  );
  const completedInLevel = currentLessons.filter((lesson) =>
    profile?.completedLessons.includes(lesson.id),
  ).length;
  const progressPercent = currentLessons.length
    ? Math.round((completedInLevel / currentLessons.length) * 100)
    : 0;
  const nextLesson = currentLessons.find(
    (lesson) => !profile?.completedLessons.includes(lesson.id),
  );
  const activeCard = cards.length ? cards[cardIndex % cards.length] : null;
  const activeQuestion = activeLesson?.questions[questionIndex] ?? null;
  const currentLevelIndex = levels.findIndex((level) => level.id === profile?.level);

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setAuthBusy(true);
    setAuthError("");
    setAuthMessage("");
    try {
      if (authMode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: emailInput.trim(),
          password: passwordInput,
          options: {
            data: { name: nameInput.trim() },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        if (!data.session) {
          setAuthMessage("Conta criada. Confira seu e-mail para confirmar o cadastro e depois entre na plataforma.");
        } else {
          setAuthMessage("Conta criada. Vamos preparar seu espaço de aprendizagem.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: emailInput.trim(),
          password: passwordInput,
        });
        if (error) throw error;
      }
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Não foi possível concluir a autenticação.");
    } finally {
      setAuthBusy(false);
    }
  }

  async function finishOnboarding(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !session) return;
    setAppError("");
    setProfileLoading(true);
    try {
      const { error } = await supabase.rpc("complete_onboarding", {
        p_level_code: selectedLevel,
        p_learning_goal: goal,
        p_daily_goal_minutes: dailyMinutes,
      });
      if (error) throw new Error(error.message);
      const nextProfile = await loadProfile(session);
      await loadStudyData(nextProfile);
      setPage("home");
    } catch (error) {
      setAppError(error instanceof Error ? error.message : "Não foi possível salvar seu perfil.");
    } finally {
      setProfileLoading(false);
    }
  }

  function openLesson(lesson: Lesson) {
    const nextQuestionIndex = lesson.questions.findIndex(
      (question) => !profile?.completedQuestionIds.includes(question.id),
    );
    setActiveLesson(lesson);
    setQuestionIndex(nextQuestionIndex >= 0 ? nextQuestionIndex : 0);
    setSelectedAnswer("");
    setAnswerResult(null);
    setAnswerFeedback("");
    setAnswerHint("");
    setWrongAttempts(0);
    setLevelAdvanced(false);
  }

  async function submitAnswer() {
    if (!supabase || !profile || !session || !activeQuestion || !selectedAnswer.trim()) return;
    setAnswerSaving(true);
    setAppError("");
    try {
      const { data, error } = await supabase.rpc("submit_question_answer", {
        p_question_id: activeQuestion.id,
        p_submitted_answer: selectedAnswer.trim(),
      });
      if (error) throw new Error(error.message);
      const result = data[0];
      if (!result) throw new Error("O Supabase não retornou o resultado da correção.");

      setAnswerResult(result.is_correct ? "correct" : "incorrect");
      setAnswerFeedback(result.explanation || "");
      setAnswerHint(result.hint || "");
      setWrongAttempts(result.wrong_attempts);
      setLevelAdvanced(result.level_advanced);
      const updatedProfile = await loadProfile(session);
      await loadStudyData(updatedProfile);
    } catch (error) {
      setAppError(error instanceof Error ? error.message : "Não foi possível enviar sua resposta.");
    } finally {
      setAnswerSaving(false);
    }
  }

  async function saveProfileDetails(name: string, learningGoal: string, minutes: number) {
    if (!supabase || !profile) throw new Error("Não foi possível salvar seu perfil.");
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: name.trim(),
        learning_goal: learningGoal,
        daily_goal_minutes: minutes,
      })
      .eq("user_id", profile.userId);
    if (error) throw new Error(error.message);
    setProfile((current) =>
      current?.userId === profile.userId
        ? { ...current, name: name.trim(), goal: learningGoal, dailyMinutes: minutes }
        : current,
    );
  }

  async function applyPlacementLevel(level: LevelId) {
    if (!supabase || !session) throw new Error("Sua sessão expirou. Entre novamente para atualizar o nível.");
    const { error } = await supabase.rpc("apply_placement_level", { p_level_code: level });
    if (error) throw new Error(error.message);
    const updatedProfile = await loadProfile(session);
    await loadStudyData(updatedProfile);
  }

  async function signOut() {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) setAppError(`Não foi possível sair da conta: ${error.message}`);
  }

  function nextQuestion() {
    setQuestionIndex((index) => index + 1);
    setSelectedAnswer("");
    setAnswerResult(null);
    setAnswerFeedback("");
    setAnswerHint("");
    setWrongAttempts(0);
  }

  if (!ready || (session && profileLoading && !profile)) {
    return (
      <main className="loading-screen">
        <div className="brand-mark">f.</div>
        <span>Preparando seu espaço de estudos...</span>
      </main>
    );
  }

  if (!configured) {
    return (
      <main className="loading-screen setup-screen">
        <div className="brand-mark">f.</div>
        <h1>Conecte seu projeto Supabase</h1>
        <p>Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no arquivo .env.local e reinicie o servidor.</p>
      </main>
    );
  }

  if (session && appError && !profile) {
    return (
      <main className="loading-screen setup-screen">
        <div className="brand-mark">!</div>
        <h1>Não foi possível carregar sua conta</h1>
        <p>{appError}</p>
        <button className="button button-dark" onClick={signOut}>Sair e tentar novamente</button>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="auth-screen">
        <div className="auth-glow auth-glow-one" />
        <div className="auth-glow auth-glow-two" />
        <header className="auth-header">
          <a className="brand" href="#"><span className="brand-mark">f.</span> fluência<span className="brand-dot">.</span></a>
          <span className="auth-header-note">Seu próximo capítulo começa aqui</span>
        </header>
        <section className="auth-content">
          <div className="auth-copy">
            <span className="eyebrow"><span className="live-dot" /> SUA JORNADA, NO SEU RITMO</span>
            <h1>O inglês que você quer.<br /><span>Um passo de cada vez.</span></h1>
            <p>Um espaço de aprendizagem feito para você praticar, avançar de nível e perceber seu progresso de verdade.</p>
            <div className="auth-proof"><div className="avatar-stack"><span>J</span><span>M</span><span>A</span></div><div><strong>Aprenda fazendo</strong><small>Lições curtas. Progresso real.</small></div></div>
            <div className="auth-quote"><span>“</span><p>Você não precisa ser fluente para começar.<br />Só precisa começar.</p></div>
          </div>
          <form className="auth-card" onSubmit={handleAuth}>
            <div className="card-topline"><span>{authMode === "signup" ? "COMECE SUA JORNADA" : "BOM TER VOCÊ DE VOLTA"}</span><span className="step-count">SUPABASE</span></div>
            <h2>{authMode === "signup" ? "Crie sua conta" : "Entre na sua conta"}</h2>
            <p className="card-intro">{authMode === "signup" ? "Vamos preparar um plano de estudos com a sua cara." : "Continue de onde você parou."}</p>
            {authMode === "signup" && <><label htmlFor="name">Como podemos te chamar?</label><input id="name" autoComplete="name" value={nameInput} onChange={(event) => setNameInput(event.target.value)} placeholder="Seu primeiro nome" required minLength={2} /></>}
            <label htmlFor="email">Seu melhor e-mail</label>
            <input id="email" type="email" autoComplete="email" value={emailInput} onChange={(event) => setEmailInput(event.target.value)} placeholder="voce@exemplo.com" required />
            <label htmlFor="password">Senha</label>
            <input id="password" type="password" autoComplete={authMode === "signup" ? "new-password" : "current-password"} value={passwordInput} onChange={(event) => setPasswordInput(event.target.value)} placeholder="Pelo menos 8 caracteres" required minLength={8} />
            {authError && <p className="form-message form-error" role="alert">{authError}</p>}
            {authMessage && <p className="form-message form-success" role="status">{authMessage}</p>}
            <button className="button button-primary auth-submit" type="submit" disabled={authBusy}>{authBusy ? "Aguarde..." : authMode === "signup" ? "Criar minha conta" : "Entrar"} <span>↗</span></button>
            <div className="privacy-note"><span>◈</span> Sua conta e seu progresso ficam salvos com segurança.</div>
            <div className="auth-divider"><span /> <small>{authMode === "signup" ? "JÁ TEM UMA CONTA?" : "AINDA NÃO TEM CONTA?"} <button type="button" onClick={() => { setAuthMode(authMode === "signup" ? "signin" : "signup"); setAuthError(""); setAuthMessage(""); }}> {authMode === "signup" ? "ENTRAR" : "CADASTRE-SE"}</button></small> <span /></div>
            <div className="auth-perks"><span>✦ No seu ritmo</span><span>✦ Conteúdo por nível</span></div>
          </form>
        </section>
        <footer className="auth-footer"><span>© 2026 Fluência</span><span>Aprender um idioma é abrir novas portas.</span><span>Feito para quem está começando.</span></footer>
      </main>
    );
  }

  if (profile && !profile.onboardingComplete) {
    return (
      <main className="onboarding-screen">
        <header className="onboarding-header"><a className="brand" href="#"><span className="brand-mark">f.</span> fluência<span className="brand-dot">.</span></a><span className="onboarding-progress-label">PERFIL DE APRENDIZAGEM <strong>01 <i>/ 01</i></strong></span></header>
        <form className="onboarding-wrap" onSubmit={finishOnboarding}>
          <div className="onboarding-heading"><span className="eyebrow"><span className="live-dot" /> UM PLANO COM A SUA CARA</span><h1>Conhecendo <span>você.</span></h1><p>Não é uma prova. É só um ponto de partida para a gente acertar o ritmo.</p></div>
          <div className="onboarding-card">
            <div className="question-block"><div className="question-number">01 <span>—</span> 03</div><div><h2>Como está seu inglês hoje?</h2><p>Escolha a opção que mais combina com você. Você poderá mudar de nível depois.</p></div></div>
            <div className="level-options">
              {[
                { id: "A1" as LevelId, emoji: "🌱", label: "Estou começando", detail: "Quero aprender do zero." },
                { id: "A2" as LevelId, emoji: "🌿", label: "Sei um pouco", detail: "Entendo frases simples e familiares." },
                { id: "B1" as LevelId, emoji: "🌳", label: "Já me viro", detail: "Consigo conversar sobre assuntos do dia a dia." },
                { id: "B2" as LevelId, emoji: "🚀", label: "Tenho uma boa base", detail: "Me comunico bem, mas quero mais confiança." },
                { id: "C1" as LevelId, emoji: "✨", label: "Quero aperfeiçoar", detail: "Já tenho fluência e busco mais precisão." },
                { id: "C2" as LevelId, emoji: "👑", label: "Quero dominar os detalhes", detail: "Tenho domínio e quero refinar ainda mais." },
              ].map((option) => <button key={option.id} className={`level-option ${selectedLevel === option.id ? "selected" : ""}`} onClick={() => setSelectedLevel(option.id)} type="button"><span className="level-emoji">{option.emoji}</span><span className="level-option-text"><strong>{option.label}</strong><small>{option.detail}</small></span><span className="radio-mark">{selectedLevel === option.id ? "✓" : ""}</span></button>)}
            </div>
            <div className="onboarding-extras">
              <div><label htmlFor="goal">O que você quer conquistar?</label><select id="goal" value={goal} onChange={(event) => setGoal(event.target.value)}>{goals.map((option) => <option key={option}>{option}</option>)}</select></div>
              <div><label htmlFor="minutes">Quanto tempo por dia?</label><select id="minutes" value={dailyMinutes} onChange={(event) => setDailyMinutes(Number(event.target.value))}><option value={10}>10 minutos</option><option value={20}>20 minutos</option><option value={30}>30 minutos</option><option value={45}>45 minutos</option></select></div>
            </div>
            {appError && <p className="form-message form-error" role="alert">{appError}</p>}
            <div className="onboarding-bottom"><span>Você pode ajustar seu plano quando quiser.</span><button className="button button-primary" type="submit" disabled={profileLoading}>{profileLoading ? "Salvando..." : "Montar meu plano"} <span>↗</span></button></div>
          </div>
          <div className="onboarding-note"><span>✦</span> Sem testes longos. O melhor nível é aquele em que você se sente desafiado, mas confortável.</div>
        </form>
      </main>
    );
  }

  if (!profile) {
    return <main className="loading-screen"><span>Carregando seu perfil...</span></main>;
  }

  const navItems: { id: PageId; icon: string; label: string }[] = [
    { id: "home", icon: "⌂", label: "Visão geral" },
    { id: "lessons", icon: "▤", label: "Conteúdo" },
    { id: "cards", icon: "▧", label: "Cards" },
    { id: "progress", icon: "◷", label: "Meu progresso" },
    { id: "profile", icon: "◎", label: "Meu perfil" },
  ];

  return (
    <main className="app-shell">
      <aside className={`sidebar ${mobileMenuOpen ? "sidebar-open" : ""}`}>
        <a className="brand sidebar-brand" href="#" onClick={() => setPage("home")}><span className="brand-mark">f.</span> fluência<span className="brand-dot">.</span></a>
        <div className="sidebar-label">SEU ESPAÇO</div>
        <nav className="side-nav" aria-label="Menu principal">
          {navItems.map((item) => <button key={item.id} className={`nav-item ${page === item.id ? "active" : ""}`} onClick={() => { setPage(item.id); setMobileMenuOpen(false); }}><span className="nav-icon">{item.icon}</span>{item.label}{page === item.id && <span className="nav-active-dot" />}</button>)}
        </nav>
        <div className="sidebar-spacer" />
        <div className="sidebar-language"><div className="language-icon">🇬🇧</div><div><small>APRENDENDO</small><strong>Inglês <span>⌄</span></strong></div></div>
        <button className="profile-button" onClick={signOut} title="Sair da conta"><span className="profile-avatar">{profile.name.charAt(0).toUpperCase()}</span><span className="profile-details"><strong>{profile.name}</strong><small>{profile.levelTitle} · {profile.level}</small></span><span className="profile-menu">↗</span></button>
      </aside>
      {mobileMenuOpen && <button aria-label="Fechar menu" className="menu-backdrop" onClick={() => setMobileMenuOpen(false)} />}
      <div className="app-main">
        <header className="topbar"><button className="mobile-menu-button" onClick={() => setMobileMenuOpen(true)} aria-label="Abrir menu">☰</button><div className="breadcrumb">Meu espaço <span>/</span> <strong>{navItems.find((item) => item.id === page)?.label}</strong></div><div className="topbar-right"><span className="streak"><span>✦</span> {profile.completedLessons.length} lições</span><span className="topbar-divider" /><span className="topbar-date">{new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "numeric", month: "short" }).format(new Date())}</span></div></header>
        <div className="page-content">
          {appError && <div className="app-error" role="alert">{appError}<button onClick={() => setAppError("")} aria-label="Fechar aviso">×</button></div>}
          {page === "home" && <HomePage profile={profile} lessons={currentLessons} progressPercent={progressPercent} completedInLevel={completedInLevel} levelIndex={currentLevelIndex} nextLesson={nextLesson} onStudy={() => nextLesson && openLesson(nextLesson)} onPage={setPage} onSelectLesson={openLesson} />}
          {page === "lessons" && <LessonsPage profile={profile} lessons={lessons} onSelectLesson={openLesson} />}
          {page === "cards" && <CardsPage level={profile.level} card={activeCard} index={cardIndex} total={cards.length} flipped={cardFlipped} onFlip={() => setCardFlipped((value) => !value)} onNext={() => { setCardIndex((value) => (cards.length ? (value + 1) % cards.length : 0)); setCardFlipped(false); }} />}
          {page === "progress" && <ProgressPage profile={profile} levelIndex={currentLevelIndex} lessons={lessons} />}
          {page === "profile" && <ProfilePage profile={profile} levelIndex={currentLevelIndex} levelProgress={progressPercent} completedInLevel={completedInLevel} totalQuestions={profile.completedQuestionIds.length} onSave={saveProfileDetails} onApplyLevel={applyPlacementLevel} />}
          <footer className="app-footer"><span>Pequenos passos também levam longe. <span className="footer-heart">♥</span></span><span>Seu progresso fica sincronizado com sua conta.</span></footer>
        </div>
      </div>
      {activeLesson && activeQuestion && <LessonModal lesson={activeLesson} question={activeQuestion} questionIndex={questionIndex} selectedAnswer={selectedAnswer} result={answerResult} feedback={answerFeedback} hint={answerHint} wrongAttempts={wrongAttempts} levelAdvanced={levelAdvanced} saving={answerSaving} completed={profile.completedQuestionIds.includes(activeQuestion.id)} onSelect={(answer) => { setSelectedAnswer(answer); setAnswerResult(null); setAnswerFeedback(""); }} onSubmit={submitAnswer} onNext={nextQuestion} onClose={() => setActiveLesson(null)} />}
    </main>
  );
}

function HomePage({ profile, lessons: currentLessons, progressPercent, completedInLevel, levelIndex, nextLesson, onStudy, onPage, onSelectLesson }: {
  profile: Profile; lessons: Lesson[]; progressPercent: number; completedInLevel: number; levelIndex: number; nextLesson?: Lesson; onStudy: () => void; onPage: (page: PageId) => void; onSelectLesson: (lesson: Lesson) => void;
}) {
  const recommendations = currentLessons.slice(0, 3);
  const firstName = profile.name.split(" ")[0];
  return (
    <>
      <section className="welcome-row"><div><span className="eyebrow"><span className="live-dot" /> {new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(new Date()).toUpperCase()}</span><h1>Seu próximo passo, <span>{firstName}.</span></h1><p>Um pouco de inglês hoje já faz diferença amanhã.</p></div><div className="welcome-day"><span>☀️</span><div><strong>Seu momento de aprender</strong><small>Uma pausa de {profile.dailyMinutes} min para você</small></div></div></section>
      <section className="dashboard-grid">
        <div className="main-column">
          <article className="level-banner"><div className="banner-orbit orbit-one" /><div className="banner-orbit orbit-two" /><div className="level-banner-content"><div className="banner-top"><span className="banner-label"><span className="banner-spark">✦</span> SUA JORNADA ATUAL</span><span className="level-pill">{profile.level} <span>·</span> {profile.levelTitle}</span></div><h2>O começo de algo <em>grande.</em></h2><p>Você está construindo sua base no inglês. Cada pequena conquista conta — continue no seu ritmo.</p><div className="banner-progress"><div className="progress-meta"><span>Progresso neste nível</span><strong>{completedInLevel} <small>/ {currentLessons.length} lições</small></strong></div><div className="progress-track"><span style={{ width: `${progressPercent}%` }} /></div><div className="progress-caption"><span>{progressPercent}% concluído</span><span>Nível {levelIndex + 1} de 6</span></div></div></div><div className="banner-art"><div className="art-circle"><span>✦</span></div><span className="art-spark spark-one">✳</span><span className="art-spark spark-two">✧</span><span className="art-spark spark-three">·</span><div className="art-word">hello<span>.</span></div><div className="art-label">uma palavra<br />de cada vez</div></div></article>
          <section className="section-block"><div className="section-title-row"><div><span className="section-kicker">SUA TRILHA</span><h2>Continue aprendendo</h2></div><button className="text-link" onClick={() => onPage("lessons")}>Ver todas <span>↗</span></button></div>
            <div className="lesson-feature">{nextLesson ? <><div className="lesson-feature-icon">{nextLesson.category === "Conversação" ? "◉" : nextLesson.category === "Gramática" ? "⌘" : "✦"}</div><div className="lesson-feature-info"><span className="lesson-category">{nextLesson.category} <i /> {nextLesson.duration} min · {nextLesson.questions.length} questões</span><h3>{nextLesson.title}</h3><p>{nextLesson.description}</p><div className="lesson-feature-bottom"><span><span className="lesson-dot" /> PRÓXIMA NA SUA TRILHA</span><button className="button button-dark" onClick={onStudy}>Começar lição <span>→</span></button></div></div></> : currentLessons.length ? <div className="level-finished"><span>🎉</span><h3>Você concluiu este nível!</h3><p>Seu próximo nível já está liberado. Explore a nova trilha.</p><button className="button button-primary" onClick={() => onPage("lessons")}>Ver próxima trilha <span>→</span></button></div> : <div className="level-finished"><span>📚</span><h3>Estamos preparando sua trilha</h3><p>Ainda não há lições publicadas para este nível.</p></div>}</div>
          </section>
          <section className="section-block"><div className="section-title-row"><div><span className="section-kicker">PARA VOCÊ</span><h2>Na sua trilha de hoje</h2></div><span className="tiny-count">{profile.level} · {recommendations.length} lições</span></div><div className="lesson-list">{recommendations.length ? recommendations.map((lesson, index) => { const done = profile.completedLessons.includes(lesson.id); return <button key={lesson.id} className={`lesson-row ${done ? "lesson-done" : ""}`} onClick={() => onSelectLesson(lesson)}><span className={`lesson-index ${done ? "index-done" : ""}`}>{done ? "✓" : `0${index + 1}`}</span><span className="lesson-row-title"><strong>{lesson.title}</strong><small>{lesson.category} <i /> {lesson.duration} min · {lesson.questions.length} questões</small></span><span className="lesson-row-status">{done ? "Concluída" : "→"}</span></button>; }) : <div className="empty-state">As lições publicadas aparecerão aqui.</div>}</div></section>
        </div>
        <aside className="right-column">
          <article className="daily-card"><div className="daily-card-top"><span className="daily-icon">✧</span><span className="daily-label">FOCO DE HOJE</span><span className="daily-menu">···</span></div><h3>Um hábito de cada vez.</h3><p>Seu objetivo é <strong>{profile.goal.toLowerCase()}</strong>. Um pouquinho de prática diária aproxima você dele.</p><div className="daily-goal"><div className="goal-circle"><span>{profile.dailyMinutes}</span></div><div><strong>minutos por dia</strong><small>seu combinado com você</small></div></div><button className="daily-link" onClick={onStudy}>Fazer minha prática <span>↗</span></button></article>
          <article className="week-card"><div className="week-heading"><div><span className="section-kicker">SEU RITMO</span><h3>Questões certas</h3></div><span className="week-total">{profile.completedQuestionIds.length} <small>no total</small></span></div><div className="week-caption"><span className="week-caption-dot" /><span>Seu progresso é salvo na sua conta.</span></div></article>
          <article className="quote-card"><span className="quote-mark">“</span><p>Every expert was once a beginner.</p><span className="quote-source">— COMEÇAR É TUDO</span><span className="quote-decoration">✳</span></article>
          <button className="cards-promo" onClick={() => onPage("cards")}><span className="promo-icon">▧</span><span><strong>Um card por vez</strong><small>Revise palavras do seu nível.</small></span><span className="promo-arrow">↗</span></button>
        </aside>
      </section>
    </>
  );
}

function LessonsPage({ profile, lessons: allLessons, onSelectLesson }: { profile: Profile; lessons: Lesson[]; onSelectLesson: (lesson: Lesson) => void }) {
  const currentIndex = levels.findIndex((level) => level.id === profile.level);
  return <section className="inner-page"><div className="page-heading"><span className="eyebrow"><span className="live-dot" /> SUA TRILHA DE APRENDIZADO</span><h1>Conteúdo no <span>seu ritmo.</span></h1><p>Explore seu nível atual e veja o caminho que está construindo.</p></div><div className="level-roadmap">{levels.map((level, index) => { const unlocked = index <= currentIndex; const active = index === currentIndex; const levelLessons = allLessons.filter((lesson) => lesson.level === level.id); const done = levelLessons.filter((lesson) => profile.completedLessons.includes(lesson.id)).length; return <section className={`roadmap-level ${active ? "roadmap-active" : ""} ${!unlocked ? "roadmap-locked" : ""}`} key={level.id}><div className="roadmap-heading"><span className="roadmap-level-number">{unlocked ? level.id : "⌑"}</span><div><span className="section-kicker">{active ? "SEU NÍVEL ATUAL" : `NÍVEL ${index + 1}`}</span><h2>{level.name}</h2><p>{level.subtitle}</p></div><span className="roadmap-count">{unlocked ? `${done}/${levelLessons.length} lições` : "🔒 Bloqueado"}</span></div>{unlocked && <div className="roadmap-lessons">{levelLessons.length ? levelLessons.map((lesson, lessonIndex) => { const completed = profile.completedLessons.includes(lesson.id); return <button key={lesson.id} className="roadmap-lesson" onClick={() => onSelectLesson(lesson)}><span className={`roadmap-lesson-number ${completed ? "completed-number" : ""}`}>{completed ? "✓" : `0${lessonIndex + 1}`}</span><span className="roadmap-lesson-copy"><strong>{lesson.title}</strong><small>{lesson.category} <i /> {lesson.duration} min · {lesson.questions.length} questões</small></span><span className="roadmap-lesson-arrow">{completed ? "Concluída" : "→"}</span></button>; }) : <div className="empty-state">Ainda não há lições publicadas neste nível.</div>}</div>}</section>; })}</div></section>;
}

function CardsPage({ level, card, index, total, flipped, onFlip, onNext }: { level: LevelId; card: Flashcard | null; index: number; total: number; flipped: boolean; onFlip: () => void; onNext: () => void }) {
  return <section className="inner-page cards-page"><div className="page-heading"><span className="eyebrow"><span className="live-dot" /> REVISÃO INTELIGENTE · {level}</span><h1>Palavras que <span>ficam.</span></h1><p>Cards selecionados para o seu nível. Tente lembrar antes de virar.</p></div>{card ? <><div className="flashcard-wrap"><div className={`flashcard ${flipped ? "flashcard-flipped" : ""}`} role="button" tabIndex={0} onClick={onFlip} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onFlip(); }}><div className="flashcard-top"><span>{flipped ? "SIGNIFICADO" : "PALAVRA OU EXPRESSÃO"}</span><span>{String(index + 1).padStart(2, "0")} <i>/ {String(total).padStart(2, "0")}</i></span></div><div className="flashcard-content"><span className="flashcard-spark">✳</span><strong>{flipped ? card.back : card.front}</strong><small>{flipped ? card.front : card.pronunciation}</small></div><div className="flashcard-bottom"><span>✦ {flipped ? "Toque para ver a palavra" : "Toque para revelar o significado"}</span><span>↗</span></div></div><div className="cards-controls"><div className="cards-dots">{Array.from({ length: total }, (_, dot) => <span key={dot} className={dot === index ? "active-card-dot" : ""} />)}</div><button className="button button-primary" onClick={onNext}>Próximo card <span>→</span></button></div></div><div className="cards-tip"><span>✧</span><div><strong>Dica de estudo</strong><p>Fale a palavra em voz alta e tente montar uma frase antes de virar o card.</p></div></div></> : <div className="empty-state">Ainda não há cards publicados para este nível.</div>}</section>;
}

function ProfilePage({
  profile,
  levelIndex,
  levelProgress,
  completedInLevel,
  totalQuestions,
  onSave,
  onApplyLevel,
}: {
  profile: Profile;
  levelIndex: number;
  levelProgress: number;
  completedInLevel: number;
  totalQuestions: number;
  onSave: (name: string, goal: string, minutes: number) => Promise<void>;
  onApplyLevel: (level: LevelId) => Promise<void>;
}) {
  const [name, setName] = useState(profile.name);
  const [goal, setGoal] = useState(profile.goal);
  const [minutes, setMinutes] = useState(profile.dailyMinutes);
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [formError, setFormError] = useState("");
  const [testStarted, setTestStarted] = useState(false);
  const [testFinished, setTestFinished] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [placementResult, setPlacementResult] = useState<{
    recommended_level: string;
    a1_score: number;
    a2_score: number;
    b1_score: number;
    b2_score: number;
    c1_score: number;
    c2_score: number;
  } | null>(null);
  const [testBusy, setTestBusy] = useState(false);
  const [applyBusy, setApplyBusy] = useState(false);
  const [applyMessage, setApplyMessage] = useState("");
  const [testError, setTestError] = useState("");

  const scores = placementResult
    ? [
        placementResult.a1_score,
        placementResult.a2_score,
        placementResult.b1_score,
        placementResult.b2_score,
        placementResult.c1_score,
        placementResult.c2_score,
      ]
    : [];
  const recommendedLevel =
    levels.find((level) => level.id === placementResult?.recommended_level) ?? levels[0];
  const currentQuestion = placementQuestions[questionIndex];

  async function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveBusy(true);
    setFormError("");
    setSaveMessage("");
    try {
      await onSave(name, goal, minutes);
      setSaveMessage("Perfil atualizado com sucesso.");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Não foi possível atualizar seu perfil.");
    } finally {
      setSaveBusy(false);
    }
  }

  function startTest() {
    setAnswers([]);
    setQuestionIndex(0);
    setTestFinished(false);
    setTestStarted(true);
    setPlacementResult(null);
    setTestError("");
    setApplyMessage("");
  }

  function selectAnswer(optionIndex: number) {
    setAnswers((current) => {
      const next = [...current];
      next[questionIndex] = optionIndex;
      return next;
    });
  }

  async function continueTest() {
    if (answers[questionIndex] === undefined) return;
    if (questionIndex === placementQuestions.length - 1) {
      if (!supabase) {
        setTestError("O Supabase não está configurado.");
        return;
      }
      setTestBusy(true);
      setTestError("");
      try {
        const { data, error } = await supabase.rpc("submit_placement_test", {
          p_answers: answers,
        });
        if (error) throw new Error(error.message);
        const result = data[0];
        if (!result) throw new Error("O Supabase não retornou o resultado da avaliação.");
        setPlacementResult(result);
        setTestFinished(true);
      } catch (error) {
        setTestError(error instanceof Error ? error.message : "Não foi possível corrigir a avaliação.");
      } finally {
        setTestBusy(false);
      }
      return;
    }
    setQuestionIndex((current) => current + 1);
  }

  async function applyRecommendation() {
    setApplyBusy(true);
    setTestError("");
    setApplyMessage("");
    try {
      await onApplyLevel(recommendedLevel.id);
      setApplyMessage(`Seu nível foi atualizado para ${recommendedLevel.id}. Seu histórico de estudos foi preservado.`);
    } catch (error) {
      setTestError(error instanceof Error ? error.message : "Não foi possível atualizar seu nível.");
    } finally {
      setApplyBusy(false);
    }
  }

  return (
    <section className="inner-page profile-page">
      <div className="page-heading">
        <span className="eyebrow"><span className="live-dot" /> SEU ESPAÇO PESSOAL</span>
        <h1>Seu perfil, <span>sua jornada.</span></h1>
        <p>Cuide dos seus dados e acompanhe como seu inglês está evoluindo.</p>
      </div>

      <div className="profile-overview">
        <div className="profile-overview-avatar">{profile.name.charAt(0).toUpperCase()}</div>
        <div className="profile-overview-copy">
          <span className="section-kicker">NÍVEL ATUAL</span>
          <h2>{profile.level} <span>·</span> {profile.levelTitle}</h2>
          <p>{levels[levelIndex]?.subtitle} · {levelProgress}% do nível concluído</p>
        </div>
        <div className="profile-overview-progress"><div className="progress-track"><span style={{ width: `${levelProgress}%` }} /></div><small>{completedInLevel} lições concluídas neste nível</small></div>
      </div>

      <div className="profile-layout">
        <form className="profile-panel profile-form" onSubmit={submitProfile}>
          <div className="section-title-row"><div><span className="section-kicker">INFORMAÇÕES PESSOAIS</span><h2>Seus dados</h2></div></div>
          <label htmlFor="profile-name">Nome</label>
          <input id="profile-name" value={name} onChange={(event) => setName(event.target.value)} required minLength={2} maxLength={80} />
          <label htmlFor="profile-email">E-mail</label>
          <input id="profile-email" type="email" value={profile.email} readOnly />
          <small className="profile-field-note">O e-mail da conta é gerenciado pelas configurações de autenticação.</small>
          <label htmlFor="profile-goal">Seu objetivo</label>
          <select id="profile-goal" value={goal} onChange={(event) => setGoal(event.target.value)}>{goals.map((option) => <option key={option}>{option}</option>)}</select>
          <label htmlFor="profile-minutes">Tempo diário de estudo</label>
          <select id="profile-minutes" value={minutes} onChange={(event) => setMinutes(Number(event.target.value))}><option value={10}>10 minutos</option><option value={20}>20 minutos</option><option value={30}>30 minutos</option><option value={45}>45 minutos</option></select>
          {formError && <p className="form-message form-error" role="alert">{formError}</p>}
          {saveMessage && <p className="form-message form-success" role="status">{saveMessage}</p>}
          <button className="button button-primary" type="submit" disabled={saveBusy}>{saveBusy ? "Salvando..." : "Salvar alterações"} <span>↗</span></button>
        </form>

        <div className="profile-side-column">
          <section className="profile-panel profile-stats-panel">
            <div className="section-title-row"><div><span className="section-kicker">SEU PROGRESSO</span><h2>Conquistas até aqui</h2></div></div>
            <div className="profile-stat-row"><span className="stat-icon stat-mint">✦</span><div><strong>{profile.completedLessons.length}</strong><small>lições concluídas</small></div></div>
            <div className="profile-stat-row"><span className="stat-icon stat-violet">✓</span><div><strong>{totalQuestions}</strong><small>questões respondidas corretamente</small></div></div>
            <div className="profile-stat-row"><span className="stat-icon stat-pink">↗</span><div><strong>{levelIndex + 1} <small>/ 6</small></strong><small>nível atual na jornada</small></div></div>
          </section>

          <section className="profile-panel placement-panel">
            <div className="placement-heading"><span className="placement-icon">✧</span><div><span className="section-kicker">AVALIAÇÃO DE NÍVEL</span><h2>Descubra seu ponto de partida</h2></div></div>
            <p>Faça uma prova rápida de 18 questões. No final, você recebe uma recomendação de nível que pode aplicar quando quiser.</p>
            {!testStarted && <button className="button button-dark" onClick={startTest}>Começar prova <span>→</span></button>}
            {testStarted && !testFinished && currentQuestion && <div className="placement-test">
              <div className="placement-progress"><span>Questão {questionIndex + 1} de {placementQuestions.length}</span><strong>{currentQuestion.level}</strong></div>
              <div className="progress-track"><span style={{ width: `${((questionIndex + 1) / placementQuestions.length) * 100}%` }} /></div>
              <h3>{currentQuestion.prompt}</h3>
              <div className="placement-options">{currentQuestion.options.map((option, index) => <button key={option} type="button" className={`placement-option ${answers[questionIndex] === index ? "selected" : ""}`} onClick={() => selectAnswer(index)}><span>{String.fromCharCode(65 + index)}</span>{option}</button>)}</div>
              {testError && <p className="form-message form-error" role="alert">{testError}</p>}
              <button className="button button-primary" onClick={continueTest} disabled={answers[questionIndex] === undefined || testBusy}>{testBusy ? "Corrigindo..." : questionIndex === placementQuestions.length - 1 ? "Ver resultado" : "Próxima questão"} <span>→</span></button>
            </div>}
            {testFinished && <div className="placement-result">
              <span className="section-kicker">SUA RECOMENDAÇÃO</span>
              <div className="recommendation-level">{recommendedLevel.id}</div>
              <h3>{recommendedLevel.name}</h3>
              <p>Com base nas suas respostas, sugerimos começar no nível {recommendedLevel.id}. Esta avaliação é uma orientação de aprendizagem, não uma certificação oficial.</p>
              <div className="placement-scores">{levels.map((level, index) => <span key={level.id}>{level.id} <strong>{scores[index]}/3</strong></span>)}</div>
              {testError && <p className="form-message form-error" role="alert">{testError}</p>}
              {applyMessage && <p className="form-message form-success" role="status">{applyMessage}</p>}
              <div className="placement-actions"><button className="button button-primary" onClick={applyRecommendation} disabled={applyBusy || profile.level === recommendedLevel.id}>{applyBusy ? "Atualizando..." : profile.level === recommendedLevel.id ? "Você já está neste nível" : "Aplicar nível recomendado"} <span>↗</span></button><button className="text-link" onClick={startTest}>Fazer novamente</button></div>
              <small className="placement-preservation">Aplicar o nível não apaga suas lições concluídas nem suas tentativas.</small>
            </div>}
          </section>
        </div>
      </div>
    </section>
  );
}

function ProgressPage({ profile, levelIndex, lessons: allLessons }: { profile: Profile; levelIndex: number; lessons: Lesson[] }) {
  const totalCompleted = profile.completedQuestionIds.length;
  return <section className="inner-page"><div className="page-heading"><span className="eyebrow"><span className="live-dot" /> SUA EVOLUÇÃO</span><h1>Olha só até onde <span>você chegou.</span></h1><p>Progresso de verdade é feito de pequenas conquistas repetidas.</p></div><div className="progress-summary"><article className="progress-stat"><span className="stat-icon stat-mint">✦</span><strong>{profile.completedLessons.length}</strong><small>lições concluídas</small></article><article className="progress-stat"><span className="stat-icon stat-violet">↗</span><strong>{levelIndex + 1}<small> / 6</small></strong><small>nível atual: {profile.level}</small></article><article className="progress-stat"><span className="stat-icon stat-pink">◷</span><strong>{totalCompleted}<small> questões</small></strong><small>respondidas corretamente</small></article></div><div className="progress-map"><div className="section-title-row"><div><span className="section-kicker">SEU CAMINHO</span><h2>Do primeiro hello ao próximo nível</h2></div><span className="tiny-count">{Math.round((levelIndex / 5) * 100)}% da jornada</span></div><div className="map-levels">{levels.map((level, index) => { const reached = index <= levelIndex; const complete = index < levelIndex; const levelLessons = allLessons.filter((lesson) => lesson.level === level.id); const done = levelLessons.filter((lesson) => profile.completedLessons.includes(lesson.id)).length; return <div key={level.id} className={`map-level ${reached ? "map-reached" : ""} ${complete ? "map-complete" : ""}`}><span className="map-marker">{complete ? "✓" : reached ? "✦" : "·"}</span><div className="map-level-content"><div><strong>{level.id} <span>·</span> {level.name}</strong><small>{level.subtitle}</small></div><span className="map-level-status">{complete ? "Concluído" : reached ? `${done} / ${levelLessons.length} lições` : "A desbloquear"}</span></div></div>; })}</div></div><div className="progress-encouragement"><span>🌱</span><div><strong>Consistência acima de velocidade.</strong><p>Seu objetivo — {profile.goal.toLowerCase()} — começa com cada pequena sessão.</p></div></div></section>;
}

function LessonModal({ lesson, question, questionIndex, selectedAnswer, result, feedback, hint, wrongAttempts, levelAdvanced, saving, completed, onSelect, onSubmit, onNext, onClose }: {
  lesson: Lesson; question: LessonQuestion; questionIndex: number; selectedAnswer: string; result: "correct" | "incorrect" | null; feedback: string; hint: string; wrongAttempts: number; levelAdvanced: boolean; saving: boolean; completed: boolean; onSelect: (answer: string) => void; onSubmit: () => void; onNext: () => void; onClose: () => void;
}) {
  const isLastQuestion = questionIndex === lesson.questions.length - 1;
  const answeredCorrectly = result === "correct" || completed;
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="lesson-modal" role="dialog" aria-modal="true" aria-labelledby="lesson-title"><button className="modal-close" onClick={onClose} aria-label="Fechar lição">×</button><span className="eyebrow"><span className="live-dot" /> {lesson.category.toUpperCase()} · {lesson.duration} MIN</span><div className="modal-step"><span>QUESTÃO {String(questionIndex + 1).padStart(2, "0")} DE {String(lesson.questions.length).padStart(2, "0")}</span><span>✦ PRÁTICA</span></div><h2 id="lesson-title">{lesson.title}</h2><p className="modal-description">{lesson.description}</p><div className="exercise-box"><span className="exercise-label">{question.type === "listening" ? "OUÇA E ESCREVA" : question.type === "fill_blank" ? "COMPLETE A FRASE" : "HORA DE PRATICAR"}</span>{question.audioUrl && <audio className="audio-player" controls preload="none" src={question.audioUrl}>Seu navegador não suporta áudio.</audio>}<h3>{question.prompt}</h3><div className="answer-options">{question.type === "multiple_choice" ? question.options.map((option, index) => <button key={option} className={`answer-option ${selectedAnswer === option ? "answer-selected" : ""} ${result === "incorrect" && selectedAnswer === option ? "answer-incorrect" : ""}`} onClick={() => onSelect(option)} disabled={answeredCorrectly}><span>{String.fromCharCode(65 + index)}</span>{option}<i>{result === "correct" && selectedAnswer === option ? "✓" : ""}</i></button>) : <input className="answer-text-input" value={selectedAnswer} onChange={(event) => onSelect(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && selectedAnswer.trim()) onSubmit(); }} placeholder={question.type === "listening" ? "Digite o que você ouviu" : "Digite sua resposta"} disabled={answeredCorrectly} />}</div>{result === "incorrect" && <p className="answer-feedback feedback-error">{feedback || "Quase! Tente outra vez."} {wrongAttempts > 0 && !hint && `(${wrongAttempts} de 5 tentativas)`}</p>}{result === "incorrect" && hint && <p className="answer-hint"><strong>Dica após {wrongAttempts} tentativas:</strong> {hint}</p>}{answeredCorrectly && <p className="answer-feedback feedback-success">{feedback || "Muito bem! Resposta certa."} {levelAdvanced ? "Você avançou para o próximo nível! ✨" : "Seu progresso foi atualizado. ✨"}</p>}</div>{!answeredCorrectly ? <button className="button button-primary modal-submit" onClick={onSubmit} disabled={!selectedAnswer.trim() || saving}>{saving ? "Conferindo..." : "Conferir resposta"} <span>→</span></button> : <button className="button button-primary modal-submit" onClick={isLastQuestion ? onClose : onNext}>{isLastQuestion ? "Concluir lição" : "Próxima questão"} <span>→</span></button>}<div className="modal-footer-note"><span>◈</span> Errar faz parte. Você pode tentar quantas vezes quiser.</div></section></div>;
}
