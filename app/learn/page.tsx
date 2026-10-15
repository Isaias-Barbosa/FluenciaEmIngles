"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import type { Database, Json } from "@/lib/supabase/database.types";

type LevelId = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
type PageId = "home" | "lessons" | "cards" | "progress" | "profile" | "exam";
type AuthMode = "signup" | "signin";
type ProficiencyExamQuestion = {
  id: string;
  level: LevelId;
  prompt: string;
  options: string[];
};
type ProficiencyExam = {
  id: string;
  type: "placement" | "promotion";
  questions: ProficiencyExamQuestion[];
};
type ProficiencyExamResult = {
  exam_type: string;
  score: number;
  passed: boolean;
  recommended_level: string | null;
  advanced_level: string | null;
  a1_score: number;
  a2_score: number;
  b1_score: number;
  b2_score: number;
  c1_score: number;
  c2_score: number;
};
type QuestionType = "multiple_choice" | "fill_blank" | "listening" | "word_order";
type LessonQuestion = {
  id: string;
  type: QuestionType;
  prompt: string;
  options: string[];
  audioUrl: string | null;
  hint: string | null;
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
type LearningVideo = {
  id: string;
  level: LevelId;
  title: string;
  durationSeconds: number;
  url: string;
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

function promotionProgress(lessons: Lesson[], completedIds: string[]) {
  const questions = new Set(lessons.flatMap((lesson) => lesson.questions.map((question) => question.id)));
  const completed = new Set(completedIds.filter((id) => questions.has(id))).size;
  const required = Math.ceil(questions.size / 2);
  return { completed, required, eligible: required > 0 && completed >= required };
}

function choicesFromJson(value: Json): string[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    throw new Error("Uma questão publicada contém alternativas inválidas.");
  }
  return value;
}

async function syncAdminSession(accessToken: string | null) {
  const response = await fetch("/api/admin/session", {
    method: accessToken ? "POST" : "DELETE",
    ...(accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {}),
  });
  if (!response.ok) {
    throw new Error(`Não foi possível sincronizar a sessão administrativa: ${response.status}`);
  }
}

async function fetchProficiencyExam(type: ProficiencyExam["type"]): Promise<ProficiencyExam> {
  if (!supabase) throw new Error("Supabase não está configurado.");
  const { data, error } = await supabase.rpc("get_proficiency_exam", {
    p_exam_type: type,
  });
  if (error) throw new Error(error.message);
  if (!data.length) throw new Error("O Supabase não retornou questões para a prova.");

  const examId = data[0].exam_id;
  const expectedCount = type === "placement" ? 18 : 10;
  if (data.length !== expectedCount || data.some((row) => row.exam_id !== examId)) {
    throw new Error("A prova retornada pelo Supabase está incompleta ou inconsistente.");
  }

  return {
    id: examId,
    type,
    questions: data.map((row) => {
      const level = levels.find((item) => item.id === row.level_code);
      if (!level) throw new Error(`O nível ${row.level_code} da prova é inválido.`);
      return {
        id: row.question_id,
        level: level.id,
        prompt: row.prompt,
        options: choicesFromJson(row.choices),
      };
    }),
  };
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
  const [videos, setVideos] = useState<LearningVideo[]>([]);
  const [page, setPage] = useState<PageId>("home");
  const [ready, setReady] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("signup");
  const [nameInput, setNameInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [goal, setGoal] = useState(goals[0]);
  const [dailyMinutes, setDailyMinutes] = useState(20);
  const [onboardingExam, setOnboardingExam] = useState<ProficiencyExam | null>(null);
  const [onboardingExamLoading, setOnboardingExamLoading] = useState(false);
  const [placementQuestionIndex, setPlacementQuestionIndex] = useState(0);
  const [placementAnswers, setPlacementAnswers] = useState<number[]>([]);
  const [placementResult, setPlacementResult] = useState<ProficiencyExamResult | null>(null);
  const [placementBusy, setPlacementBusy] = useState(false);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [activeVideo, setActiveVideo] = useState<LearningVideo | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [answerResult, setAnswerResult] = useState<"correct" | "incorrect" | null>(null);
  const [answerFeedback, setAnswerFeedback] = useState("");
  const [answerHint, setAnswerHint] = useState("");
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [levelCompleted, setLevelCompleted] = useState(false);
  const [answerSaving, setAnswerSaving] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const [authError, setAuthError] = useState("");
  const [appError, setAppError] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarHidden, setSidebarHidden] = useState(false);
  const [lightMode, setLightMode] = useState(false);

  const configured = supabase !== null;
  const onboardingQuestions = onboardingExam?.questions ?? [];
  const onboardingQuestion = onboardingQuestions[placementQuestionIndex];
  const recommendedOnboardingLevel =
    levels.find((level) => level.id === placementResult?.recommended_level) ?? levels[0];

  useEffect(() => {
    const mode = new URLSearchParams(window.location.search).get("mode");
    if (mode === "signup" || mode === "signin") setAuthMode(mode);
    setLightMode(window.localStorage.getItem("fluencia-theme") === "light");
  }, []);

  useEffect(() => {
    window.localStorage.setItem("fluencia-theme", lightMode ? "light" : "dark");
  }, [lightMode]);

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

    const [questionsResult, cardsResult, attemptsResult, videosResult, levelsResult, languageResult] = await Promise.all([
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
      supabase
        .from("learning_videos")
        .select("id, level_id, title, duration_seconds, video_url")
        .eq("is_published", true)
        .order("created_at", { ascending: false }),
      supabase.from("language_levels").select("id, code, language_id"),
      supabase.from("languages").select("id").eq("code", "en").maybeSingle(),
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
    if (videosResult.error) {
      throw new Error(`Não foi possível carregar os vídeos: ${videosResult.error.message}`);
    }
    if (levelsResult.error) {
      throw new Error(`Não foi possível carregar os níveis dos vídeos: ${levelsResult.error.message}`);
    }
    const englishLanguageId = languageResult.data?.id;
    if (languageResult.error || !englishLanguageId) {
      throw new Error(languageResult.error?.message ?? "O idioma inglês não foi encontrado.");
    }

    const videoLevelsById = new Map(
      levelsResult.data
        .filter((level) => level.language_id === englishLanguageId)
        .map((level) => [level.id, level.code]),
    );
    const nextVideos: LearningVideo[] = videosResult.data.flatMap((video) => {
      const levelCode = videoLevelsById.get(video.level_id);
      const matchingLevel = levels.find((level) => level.id === levelCode);
      return matchingLevel
        ? [{
            id: video.id,
            level: matchingLevel.id,
            title: video.title,
            durationSeconds: video.duration_seconds,
            url: video.video_url,
          }]
        : [];
    });

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
        hint: row.hint,
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
    setVideos(nextVideos);
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
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) return;
      void syncAdminSession(nextSession?.access_token ?? null).catch((error: unknown) => {
        console.error("Falha ao sincronizar a sessão administrativa.", error);
      });
      setSession(nextSession);
      setAuthMessage("");
      setAuthError("");
      setAppError("");
      if (event === "SIGNED_IN" || !nextSession) {
        setPlacementQuestionIndex(0);
        setPlacementAnswers([]);
        setPlacementResult(null);
        setOnboardingExam(null);
      }
      if (!nextSession) {
        setProfile(null);
        setLessons([]);
        setCards([]);
        setVideos([]);
        setActiveVideo(null);
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

  useEffect(() => {
    if (!profile || profile.onboardingComplete || !supabase) return;
    let active = true;
    setOnboardingExam(null);
    setOnboardingExamLoading(true);
    void fetchProficiencyExam("placement")
      .then((exam) => {
        if (active) setOnboardingExam(exam);
      })
      .catch((error: unknown) => {
        if (active) {
          setAppError(error instanceof Error ? error.message : "Não foi possível preparar a avaliação.");
        }
      })
      .finally(() => {
        if (active) setOnboardingExamLoading(false);
      });
    return () => {
      active = false;
    };
  }, [profile?.userId, profile?.onboardingComplete]);

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
  const canTakePromotionExam = profile?.level !== "C2" && promotionProgress(currentLessons, profile?.completedQuestionIds ?? []).eligible;
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
            emailRedirectTo: `${window.location.origin}/learn`,
          },
        });
        if (error) throw error;
        if (!data.session) {
          setAuthMessage("Conta criada. Confira seu e-mail para confirmar o cadastro e depois entre na plataforma.");
        } else {
          await syncAdminSession(data.session.access_token);
          setAuthMessage("Conta criada. Vamos preparar seu espaço de aprendizagem.");
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: emailInput.trim(),
          password: passwordInput,
        });
        if (error) throw error;
        await syncAdminSession(data.session.access_token);
      }
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Não foi possível concluir a autenticação.");
    } finally {
      setAuthBusy(false);
    }
  }

  async function submitPlacementTest() {
    if (!supabase || !onboardingExam || placementAnswers.length !== onboardingExam.questions.length) return;
    setPlacementBusy(true);
    setAppError("");
    try {
      const { data, error } = await supabase.rpc("submit_proficiency_exam", {
        p_exam_id: onboardingExam.id,
        p_answers: placementAnswers,
      });
      if (error) throw new Error(error.message);
      const result = data[0];
      if (!result) throw new Error("O Supabase não retornou o resultado da avaliação.");
      if (result.exam_type !== "placement" || !result.recommended_level) {
        throw new Error("O Supabase retornou um resultado de avaliação inválido.");
      }
      setPlacementResult(result);
    } catch (error) {
      setAppError(error instanceof Error ? error.message : "Não foi possível corrigir a avaliação.");
    } finally {
      setPlacementBusy(false);
    }
  }

  async function retryOnboardingExam() {
    setOnboardingExamLoading(true);
    setAppError("");
    try {
      setOnboardingExam(await fetchProficiencyExam("placement"));
      setPlacementQuestionIndex(0);
      setPlacementAnswers([]);
    } catch (error) {
      setAppError(error instanceof Error ? error.message : "Não foi possível preparar a avaliação.");
    } finally {
      setOnboardingExamLoading(false);
    }
  }

  async function finishOnboarding() {
    if (!supabase || !placementResult) return;
    if (!session) return;
    setAppError("");
    setProfileLoading(true);
    try {
      const { error } = await supabase.rpc("complete_onboarding", {
        p_level_code: recommendedOnboardingLevel.id,
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
    setLevelCompleted(false);
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
      setAnswerFeedback(result.is_correct ? `Muito bem!\nResposta: ${selectedAnswer}\n${result.explanation || "Use esta resposta para continuar praticando."}${activeQuestion.hint ? `\nEm outros contextos: ${activeQuestion.hint}` : ""}` : result.explanation || "");
      setAnswerHint(result.hint || "");
      setWrongAttempts(result.wrong_attempts);
      setLevelCompleted(result.level_completed);
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

  async function refreshProfileAfterPromotion() {
    if (!session) return;
    const updatedProfile = await loadProfile(session);
    await loadStudyData(updatedProfile);
    setPage("home");
  }

  async function signOut() {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) setAppError(`Não foi possível sair da conta: ${error.message}`);
    await syncAdminSession(null);
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
          <a className="brand" href="/"><span className="brand-mark">f.</span> fluência<span className="brand-dot">.</span></a>
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
        <div className="onboarding-wrap">
          <div className="onboarding-heading"><span className="eyebrow"><span className="live-dot" /> AVALIAÇÃO DE PROFICIÊNCIA</span><h1>Vamos descobrir <span>seu nível.</span></h1><p>Responda 18 questões sorteadas do nosso banco. Sua trilha começa no nível indicado pelas suas respostas.</p></div>
          <div className="onboarding-card">
            {!placementResult ? onboardingExamLoading ? <p className="onboarding-note">Preparando suas questões...</p> : !onboardingQuestion ? <div className="onboarding-note">Não foi possível carregar a avaliação. <button className="text-link" type="button" onClick={retryOnboardingExam}>Tentar novamente</button></div> : <>
              <div className="question-block"><div className="question-number">{String(placementQuestionIndex + 1).padStart(2, "0")} <span>—</span> {onboardingQuestions.length}</div><div><h2>{onboardingQuestion.prompt}</h2><p>Escolha a melhor resposta. Você precisa responder cada questão para continuar.</p></div></div>
              <div className="onboarding-placement-options" role="group" aria-label={`Questão ${placementQuestionIndex + 1}`}>
                {onboardingQuestion.options.map((option, index) => <button key={option} className={`placement-option ${placementAnswers[placementQuestionIndex] === index ? "selected" : ""}`} type="button" onClick={() => setPlacementAnswers((current) => { const next = [...current]; next[placementQuestionIndex] = index; return next; })}><span>{String.fromCharCode(65 + index)}</span>{option}</button>)}
              </div>
              <div className="placement-progress"><span>Questão {placementQuestionIndex + 1} de {onboardingQuestions.length}</span><strong>{onboardingQuestion.level}</strong></div>
              <div className="progress-track"><span style={{ width: `${((placementQuestionIndex + 1) / onboardingQuestions.length) * 100}%` }} /></div>
            </> : <div className="onboarding-result">
              <span className="section-kicker">AVALIAÇÃO CONCLUÍDA</span>
              <div className="recommendation-level">{recommendedOnboardingLevel.id}</div>
              <h2>Seu ponto de partida é {recommendedOnboardingLevel.name}.</h2>
              <p>Vamos usar esse resultado para preparar sua trilha. Você poderá acompanhar seu progresso e avançar de nível durante os estudos.</p>
              <div className="placement-scores">{levels.map((level, index) => <span key={level.id}>{level.id} <strong>{[placementResult.a1_score, placementResult.a2_score, placementResult.b1_score, placementResult.b2_score, placementResult.c1_score, placementResult.c2_score][index]}/3</strong></span>)}</div>
            </div>}
            <div className="onboarding-extras">
              <div><label htmlFor="goal">O que você quer conquistar?</label><select id="goal" value={goal} onChange={(event) => setGoal(event.target.value)}>{goals.map((option) => <option key={option}>{option}</option>)}</select></div>
              <div><label htmlFor="minutes">Quanto tempo por dia?</label><select id="minutes" value={dailyMinutes} onChange={(event) => setDailyMinutes(Number(event.target.value))}><option value={10}>10 minutos</option><option value={20}>20 minutos</option><option value={30}>30 minutos</option><option value={45}>45 minutos</option></select></div>
            </div>
            {appError && <p className="form-message form-error" role="alert">{appError}</p>}
            <div className="onboarding-bottom">
              <span>{placementResult ? "Seu nível será definido pela avaliação." : "Você pode voltar e revisar suas respostas."}</span>
              <div className="onboarding-actions">
                {placementQuestionIndex > 0 && !placementResult && <button className="button button-dark" type="button" onClick={() => setPlacementQuestionIndex((current) => current - 1)}>Voltar</button>}
                {!placementResult && placementQuestionIndex < onboardingQuestions.length - 1 && <button className="button button-primary" type="button" disabled={!onboardingQuestion || placementAnswers[placementQuestionIndex] === undefined} onClick={() => setPlacementQuestionIndex((current) => current + 1)}>Próxima questão <span>→</span></button>}
                {!placementResult && onboardingQuestions.length > 0 && placementQuestionIndex === onboardingQuestions.length - 1 && <button className="button button-primary" type="button" disabled={placementAnswers[placementQuestionIndex] === undefined || placementBusy} onClick={submitPlacementTest}>{placementBusy ? "Corrigindo..." : "Concluir avaliação"} <span>↗</span></button>}
                {placementResult && <button className="button button-primary" type="button" disabled={profileLoading} onClick={finishOnboarding}>{profileLoading ? "Preparando sua trilha..." : "Começar a aprender"} <span>↗</span></button>}
              </div>
            </div>
          </div>
          <div className="onboarding-note"><span>✦</span> Suas respostas definem o nível inicial; depois você poderá avançar com suas lições.</div>
        </div>
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
    <main className={`app-shell ${lightMode ? "theme-light" : ""} ${sidebarHidden ? "sidebar-hidden" : ""}`}>
      <aside id="learning-sidebar" className={`sidebar ${mobileMenuOpen ? "sidebar-open" : ""}`}>
        <a className="brand sidebar-brand" href="#" onClick={() => setPage("home")}><span className="brand-mark">f.</span> fluência<span className="brand-dot">.</span></a>
        <button type="button" className="sidebar-close" aria-label="Fechar menu lateral" onClick={() => { setSidebarHidden(true); setMobileMenuOpen(false); }}>×</button>
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
        <header className="topbar"><button className="mobile-menu-button" onClick={() => { setSidebarHidden(false); setMobileMenuOpen(true); }} aria-controls="learning-sidebar" aria-label="Abrir menu">☰</button><div className="breadcrumb">Meu espaço <span>/</span> <strong>{page === "exam" ? "Prova de avanço" : navItems.find((item) => item.id === page)?.label}</strong></div><div className="topbar-right"><span className="streak"><span>✦</span> {profile.completedLessons.length} lições</span><span className="topbar-divider" /><span className="topbar-date">{new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "numeric", month: "short" }).format(new Date())}</span></div></header>
        <button className="theme-toggle theme-toggle-floating" type="button" onClick={() => setLightMode((current) => !current)} aria-label={lightMode ? "Ativar modo escuro" : "Ativar modo claro"}><span>{lightMode ? "◐" : "☼"}</span>{lightMode ? "Modo escuro" : "Modo claro"}</button>
        <div className="page-content">
          {appError && <div className="app-error" role="alert">{appError}<button onClick={() => setAppError("")} aria-label="Fechar aviso">×</button></div>}
          {page === "home" && <div className="home-page"><HomePage profile={profile} lessons={currentLessons} progressPercent={progressPercent} completedInLevel={completedInLevel} levelIndex={currentLevelIndex} nextLesson={nextLesson} canTakePromotionExam={canTakePromotionExam} onPromotionExam={() => setPage("exam")} onStudy={() => nextLesson && openLesson(nextLesson)} onPage={setPage} onSelectLesson={openLesson} /></div>}
          {page === "lessons" && <LessonsPage onPromotionExam={() => setPage("exam")} profile={profile} lessons={lessons} videos={videos} onSelectLesson={openLesson} onSelectVideo={setActiveVideo} />}
          {page === "cards" && <CardsPage key={profile.level} level={profile.level} cards={cards} studentName={profile.name} />}
          {page === "progress" && <ProgressPage profile={profile} levelIndex={currentLevelIndex} lessons={lessons} />}
          {page === "profile" && <ProfilePage profile={profile} levelIndex={currentLevelIndex} levelProgress={progressPercent} completedInLevel={completedInLevel} totalQuestions={profile.completedQuestionIds.length} onSave={saveProfileDetails} onApplyLevel={applyPlacementLevel} />}
          {page === "exam" && canTakePromotionExam && <PromotionExamPage level={profile.level} onExit={() => setPage("home")} onPassed={refreshProfileAfterPromotion} />}
          <footer className="app-footer"><span>Pequenos passos também levam longe. <span className="footer-heart">♥</span></span><span>Seu progresso fica sincronizado com sua conta.</span></footer>
        </div>
      </div>
      {activeLesson && activeQuestion && <LessonModal lesson={activeLesson} question={activeQuestion} questionIndex={questionIndex} selectedAnswer={selectedAnswer} result={answerResult} feedback={answerFeedback} hint={answerHint} wrongAttempts={wrongAttempts} levelCompleted={canTakePromotionExam} saving={answerSaving} completed={profile.completedQuestionIds.includes(activeQuestion.id)} onSelect={(answer) => { setSelectedAnswer(answer); setAnswerResult(null); setAnswerFeedback(""); }} onSubmit={submitAnswer} onNext={nextQuestion} onClose={() => setActiveLesson(null)} onStartPromotionExam={() => { setActiveLesson(null); setPage("exam"); }} />}
      {activeVideo && <VideoPlayerModal video={activeVideo} onClose={() => setActiveVideo(null)} />}
    </main>
  );
}

function HomePage({ profile, lessons: currentLessons, progressPercent, completedInLevel, levelIndex, nextLesson, canTakePromotionExam, onPromotionExam, onStudy, onPage, onSelectLesson }: {
  profile: Profile; lessons: Lesson[]; progressPercent: number; completedInLevel: number; levelIndex: number; nextLesson?: Lesson; canTakePromotionExam: boolean; onPromotionExam: () => void; onStudy: () => void; onPage: (page: PageId) => void; onSelectLesson: (lesson: Lesson) => void;
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
            <div className="lesson-feature">{nextLesson ? <><div className="lesson-feature-icon">{nextLesson.category === "Conversação" ? "◉" : nextLesson.category === "Gramática" ? "⌘" : "✦"}</div><div className="lesson-feature-info"><span className="lesson-category">{nextLesson.category} <i /> {nextLesson.duration} min · {nextLesson.questions.length} questões</span><h3>{nextLesson.title}</h3><p>{nextLesson.description}</p><div className="lesson-feature-bottom"><span><span className="lesson-dot" /> PRÓXIMA NA SUA TRILHA</span><button className="button button-dark" onClick={onStudy}>Começar lição <span>→</span></button></div></div></> : currentLessons.length ? <div className="level-finished"><span>🎉</span><h3>{profile.level === "C2" ? "Você concluiu toda a trilha!" : "Você concluiu este nível!"}</h3><p>{canTakePromotionExam ? `Faça a prova de 10 questões para avançar do ${profile.level} ao próximo nível. É preciso acertar pelo menos 7.` : "Explore suas lições concluídas e acompanhe seu progresso."}</p>{canTakePromotionExam ? <button className="button button-primary" onClick={onPromotionExam}>Fazer prova de avanço <span>→</span></button> : <button className="button button-primary" onClick={() => onPage("progress")}>Ver meu progresso <span>→</span></button>}</div> : <div className="level-finished"><span>📚</span><h3>Estamos preparando sua trilha</h3><p>Ainda não há lições publicadas para este nível.</p></div>}</div>
          </section>
          {canTakePromotionExam && <div className="promotion-ready"><p>Você concluiu pelo menos 50% das questões. Sua prova de avanço está liberada!</p><button className="button button-primary" onClick={onPromotionExam}>Fazer prova de avanço →</button></div>}
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

function LessonsPage({ profile, lessons: allLessons, videos, onSelectLesson, onSelectVideo, onPromotionExam }: {
  profile: Profile;
  lessons: Lesson[];
  videos: LearningVideo[];
  onSelectLesson: (lesson: Lesson) => void;
  onSelectVideo: (video: LearningVideo) => void;
  onPromotionExam: () => void;
}) {
  const currentIndex = levels.findIndex((level) => level.id === profile.level);
  const [expandedLevel, setExpandedLevel] = useState<LevelId | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "completed">("all");
  const [videoLevel, setVideoLevel] = useState<LevelId>(profile.level);
  useEffect(() => setVideoLevel(profile.level), [profile.level]);
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const availableLessons = allLessons.filter((lesson) => {
    const completed = profile.completedLessons.includes(lesson.id);
    const matchesStatus = filter === "all" || (filter === "completed" ? completed : !completed);
    const matchesSearch = !normalizedSearch
      || `${lesson.title} ${lesson.description} ${lesson.category}`.toLocaleLowerCase().includes(normalizedSearch);
    return matchesStatus && matchesSearch;
  });
  const totalLessons = allLessons.length;
  const completedLessons = allLessons.filter((lesson) => profile.completedLessons.includes(lesson.id)).length;
  const unlockedVideoLevels = levels.slice(0, currentIndex + 1);
  const visibleVideos = videos.filter((video) => video.level === videoLevel);
  const selectedVideoLevel = levels.find((level) => level.id === videoLevel);

  return (
    <section className="inner-page lessons-page">
      <div className="page-heading">
        <span className="eyebrow"><span className="live-dot" /> SUA TRILHA DE APRENDIZADO</span>
        <h1>Conteúdo no <span>seu ritmo.</span></h1>
        <p>Encontre uma lição, acompanhe o que já concluiu e avance passo a passo.</p>
      </div>
      <section className="lessons-overview" aria-label="Resumo do conteúdo">
        <div><span className="lessons-overview-icon">▤</span><div><strong>{completedLessons} de {totalLessons}</strong><span>lições concluídas no seu nível</span></div></div>
        <div className="lessons-overview-track" role="progressbar" aria-valuenow={totalLessons ? Math.round(completedLessons / totalLessons * 100) : 0} aria-valuemin={0} aria-valuemax={100}>
          <span style={{ width: `${totalLessons ? completedLessons / totalLessons * 100 : 0}%` }} />
        </div>
      </section>
      <div className="lessons-toolbar">
        <label className="lessons-search">
          <span aria-hidden="true">⌕</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por lição ou assunto" aria-label="Buscar por lição ou assunto" />
          {search && <button type="button" onClick={() => setSearch("")} aria-label="Limpar busca">×</button>}
        </label>
        <div className="lessons-filters" role="group" aria-label="Filtrar lições">
          {([["all", "Todas"], ["pending", "A fazer"], ["completed", "Concluídas"]] as const).map(([id, label]) => (
            <button key={id} type="button" className={filter === id ? "active" : ""} aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}</button>
          ))}
        </div>
      </div>
      <div className="level-roadmap">
        {levels.map((level, index) => {
          const unlocked = index <= currentIndex;
          const active = index === currentIndex;
          const levelLessons = allLessons.filter((lesson) => lesson.level === level.id);
          const shownLessons = availableLessons.filter((lesson) => lesson.level === level.id);
          const examProgress = promotionProgress(levelLessons, profile.completedQuestionIds);
          const expanded = expandedLevel === level.id;
          const done = levelLessons.filter((lesson) => profile.completedLessons.includes(lesson.id)).length;
          return (
            <section className={`roadmap-level ${active ? "roadmap-active" : ""} ${!unlocked ? "roadmap-locked" : ""}`} key={level.id}>
              <button type="button" className="roadmap-heading roadmap-toggle" aria-expanded={expanded} aria-controls={`level-lessons-${level.id}`} onClick={() => setExpandedLevel(expanded ? null : level.id)}>
                <span className="roadmap-level-number">{unlocked ? level.id : "⌑"}</span>
                <div><span className="section-kicker">{active ? "SEU NÍVEL ATUAL" : `NÍVEL ${index + 1}`}</span><h2>{level.name}</h2><p>{level.subtitle}</p></div>
                <span className="roadmap-count">{unlocked ? `${done}/${levelLessons.length} lições` : "🔒 Bloqueado"}</span>
                <span className="roadmap-chevron" aria-hidden="true">{expanded ? "⌃" : "⌄"}</span>
              </button>
              <div id={`level-lessons-${level.id}`} hidden={!expanded}>
              {unlocked ? <div className="roadmap-lessons">
                {shownLessons.length ? shownLessons.map((lesson) => {
                  const completed = profile.completedLessons.includes(lesson.id);
                  return <button key={lesson.id} className={`roadmap-lesson ${completed ? "roadmap-lesson-done" : ""}`} onClick={() => onSelectLesson(lesson)}>
                    <span className={`roadmap-lesson-number ${completed ? "completed-number" : ""}`}>{completed ? "✓" : String(levelLessons.indexOf(lesson) + 1).padStart(2, "0")}</span>
                    <span className="roadmap-lesson-copy"><strong>{lesson.title}</strong><small>{lesson.category} <i /> {lesson.duration} min <i /> {lesson.questions.length} questões</small></span>
                    <span className="roadmap-lesson-arrow">{completed ? "Concluída" : "Começar"} <b aria-hidden="true">→</b></span>
                  </button>;
                }) : <div className="lessons-empty">{levelLessons.length ? "Nenhuma lição corresponde a essa busca ou filtro." : "As lições deste nível estarão disponíveis em breve."}</div>}
                {index < levels.length - 1 && <button type="button" className="roadmap-lesson promotion-lesson" disabled={!active || !examProgress.eligible} onClick={onPromotionExam}>
                  <span className="roadmap-lesson-number">{active && examProgress.eligible ? "✦" : "🔒"}</span>
                  <span className="roadmap-lesson-copy"><strong>Prova de proficiência · {level.id}</strong><small>{index < currentIndex ? "Próximo nível já liberado" : examProgress.completed + "/" + examProgress.required + " questões concluídas para liberar a prova (50%)"}</small></span>
                  <span className="roadmap-lesson-arrow">{active && examProgress.eligible ? "Fazer prova →" : "Bloqueada"}</span>
                </button>}
                {index === levels.length - 1 && <p className="lessons-empty">Último nível da trilha.</p>}
              </div> : <p className="lessons-empty">Passe na prova do nível anterior para liberar estas questões.</p>}
              </div>
            </section>
          );
        })}
      </div>
      <section className="learning-videos" aria-labelledby="learning-videos-title">
        <div className="learning-videos-heading">
          <div>
            <span className="section-kicker">PRÁTICA EXTRA</span>
            <h2 id="learning-videos-title">Vídeos curtos em inglês</h2>
            <p>Treine a compreensão auditiva com vídeos gratuitos de 1 a 3 minutos. O nível é aproximado.</p>
          </div>
          <label className="video-level-select">
            <span>NÍVEL</span>
            <select value={videoLevel} onChange={(event) => {
              const selectedLevel = unlockedVideoLevels.find((level) => level.id === event.target.value);
              if (selectedLevel) setVideoLevel(selectedLevel.id);
            }} aria-label="Selecionar nível dos vídeos">
              {unlockedVideoLevels.map((level) => <option key={level.id} value={level.id}>{level.id} · {level.name}</option>)}
            </select>
          </label>
        </div>
        {visibleVideos.length ? <div className="learning-video-grid">
          {visibleVideos.map((video) => (
            <article className="learning-video-card" key={video.id}>
              <div className="learning-video-icon" aria-hidden="true">▶</div>
              <div className="learning-video-meta"><span>{video.level} · nível aproximado</span><span>{Math.floor(video.durationSeconds / 60)}:{String(video.durationSeconds % 60).padStart(2, "0")}</span></div>
              <h3>{video.title}</h3>
              <button type="button" onClick={() => onSelectVideo(video)}>Assistir vídeo <span aria-hidden="true">▶</span></button>
            </article>
          ))}
        </div> : <div className="learning-videos-empty">
          <span aria-hidden="true">◷</span>
          <p>{selectedVideoLevel ? `Ainda não encontramos vídeos curtos verificados para ${selectedVideoLevel.id}.` : "Ainda não há vídeos curtos para este nível."}</p>
        </div>}
      </section>
    </section>
  );
}

function VideoPlayerModal({ video, onClose }: { video: LearningVideo; onClose: () => void }) {
  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <div className="modal-backdrop video-player-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="video-player-modal" role="dialog" aria-modal="true" aria-labelledby="video-player-title">
        <header className="video-player-header">
          <div><span className="eyebrow"><span className="live-dot" /> {video.level} · VÍDEO DE ESTUDO</span><h2 id="video-player-title">{video.title}</h2></div>
          <button type="button" onClick={onClose} aria-label="Fechar vídeo">×</button>
        </header>
        <div className="video-player-frame">
          <iframe
            src={video.url}
            title={`Player do VoiceTube: ${video.title}`}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
        <a className="video-player-fallback" href={video.url} target="_blank" rel="noreferrer">Se o player não carregar, assistir no VoiceTube ↗</a>
      </section>
    </div>
  );
}

function CardsPage({ level, cards, studentName }: { level: LevelId; cards: Flashcard[]; studentName: string }) {
  const [deck, setDeck] = useState(cards);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [rememberedCount, setRememberedCount] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [markedCards, setMarkedCards] = useState<Record<number, "remembered" | "review">>({});

  useEffect(() => {
    setDeck(cards);
    setIndex(0);
    setFlipped(false);
    setRememberedCount(0);
    setReviewCount(0);
    setMarkedCards({});
  }, [cards]);

  const card = deck[index] ?? null;

  function moveTo(nextIndex: number) {
    setIndex(nextIndex);
    setFlipped(false);
  }

  function shuffleCards() {
    const shuffled = [...deck];
    for (let current = shuffled.length - 1; current > 0; current -= 1) {
      const randomIndex = Math.floor(Math.random() * (current + 1));
      [shuffled[current], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[current]];
    }
    setDeck(shuffled);
    setRememberedCount(0);
    setReviewCount(0);
    setMarkedCards({});
    moveTo(0);
  }

  function restartCards() {
    setDeck(cards);
    setRememberedCount(0);
    setReviewCount(0);
    setMarkedCards({});
    moveTo(0);
  }

  function markCard(mark: "remembered" | "review") {
    if (markedCards[index]) {
      moveTo(Math.min(index + 1, deck.length - 1));
      return;
    }
    setMarkedCards((current) => ({ ...current, [index]: mark }));
    if (mark === "remembered") setRememberedCount((current) => current + 1);
    else setReviewCount((current) => current + 1);
    moveTo(Math.min(index + 1, deck.length - 1));
  }

  return (
    <section className="inner-page cards-page">
      <div className="page-heading">
        <span className="eyebrow"><span className="live-dot" /> REVISÃO INTELIGENTE · {level}</span>
        <h1>Palavras que <span>ficam.</span></h1>
        <p>Cards selecionados para o seu nível. Tente lembrar antes de virar.</p>
      </div>
      {card ? (
        <div className="cards-layout">
          <div className="flashcard-wrap">
          <div className="cards-toolbar">
            <button className="button button-dark" type="button" onClick={shuffleCards}>Embaralhar <span>⤨</span></button>
            <button className="button button-dark" type="button" onClick={restartCards}>Reiniciar <span>↺</span></button>
          </div>
          <div
            className={`flashcard ${flipped ? "flashcard-flipped" : ""}`}
            role="button"
            tabIndex={0}
            aria-label={flipped ? "Card virado. Ative para ver a palavra em inglês." : "Ative para virar o card e ver o significado."}
            onClick={() => setFlipped((current) => !current)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setFlipped((current) => !current);
              }
            }}
          >
            <div className="flashcard-top">
              <span>{flipped ? "SIGNIFICADO" : "PALAVRA OU EXPRESSÃO"}</span>
              <span>{String(index + 1).padStart(2, "0")} <i>/ {String(deck.length).padStart(2, "0")}</i></span>
            </div>
            <div className="flashcard-content">
              <span className="flashcard-spark">✳</span>
              <strong>{flipped ? card.back : card.front}</strong>
              <small>{flipped ? card.front : card.pronunciation}</small>
            </div>
            <div className="flashcard-bottom"><span>✦ {flipped ? "Toque para ver a palavra" : "Toque para revelar o significado"}</span><span>↗</span></div>
          </div>
          <div className="cards-flip-control">
            <button className="button button-dark" type="button" aria-pressed={flipped} onClick={() => setFlipped((current) => !current)}>
              {flipped ? "Ver a palavra" : "Virar o card"} <span>↻</span>
            </button>
          </div>
          <div className="cards-controls">
            <button className="button button-dark" type="button" disabled={index === 0} onClick={() => moveTo(index - 1)}><span>←</span> Anterior</button>
            <span className="cards-progress">{index + 1} de {deck.length}</span>
            <button className="button button-primary" type="button" disabled={index === deck.length - 1} onClick={() => moveTo(index + 1)}>Próximo <span>→</span></button>
          </div>
          {flipped && <div className="cards-rating-actions"><span>Como foi?</span><button className="button button-success" type="button" onClick={() => markCard("remembered")}>Acertei <span>✓</span></button><button className="button button-review" type="button" onClick={() => markCard("review")}>Vou revisar <span>↻</span></button></div>}
          </div>
          <aside className="session-card">
            <div className="session-card-heading"><span className="section-kicker">SUA SESSÃO</span><span className="session-live-dot" /></div>
            <div className="session-avatar">{studentName.charAt(0).toUpperCase()}</div>
            <h2>{studentName}</h2>
            <p>Revisão de vocabulário · nível {level}</p>
            <div className="session-stat"><span>Cards vistos</span><strong>{rememberedCount + reviewCount} <small>/ {deck.length}</small></strong></div>
            <div className="session-track"><span style={{ width: `${((index + 1) / deck.length) * 100}%` }} /></div>
            <div className="session-results"><div><span className="result-icon result-success">✓</span><small>Acertei</small><strong>{rememberedCount}</strong></div><div><span className="result-icon result-review">↻</span><small>Para revisar</small><strong>{reviewCount}</strong></div></div>
            <p className="session-note">Continue no seu ritmo. Cada card ajuda uma palavra a ficar.</p>
          </aside>
        </div>
      ) : <div className="empty-state">Ainda não há cards publicados para este nível.</div>}
      <div className="cards-tip">
        <span>✧</span>
        <div><strong>Como estudar:</strong><p>escolha um nível, tente lembrar o significado antes de virar o card e marque mentalmente as palavras que precisa rever. A classificação CEFR é aproximada e serve como guia de estudo.</p></div>
      </div>
    </section>
  );
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
  const [placementResult, setPlacementResult] = useState<ProficiencyExamResult | null>(null);
  const [placementExam, setPlacementExam] = useState<ProficiencyExam | null>(null);
  const [placementLoading, setPlacementLoading] = useState(false);
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
  const recommendsHigherLevel =
    levels.findIndex((level) => level.id === recommendedLevel.id) > levelIndex;
  const placementQuestions = placementExam?.questions ?? [];
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

  async function startTest() {
    setPlacementLoading(true);
    setTestError("");
    setPlacementResult(null);
    setTestFinished(false);
    setTestStarted(false);
    setPlacementExam(null);
    try {
      setPlacementExam(await fetchProficiencyExam("placement"));
      setAnswers([]);
      setQuestionIndex(0);
      setTestStarted(true);
    } catch (error) {
      setTestError(error instanceof Error ? error.message : "Não foi possível preparar a avaliação.");
    } finally {
      setPlacementLoading(false);
    }
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
      if (!supabase || !placementExam) {
        setTestError("O Supabase não está configurado.");
        return;
      }
      setTestBusy(true);
      setTestError("");
      try {
        const { data, error } = await supabase.rpc("submit_proficiency_exam", {
          p_exam_id: placementExam.id,
          p_answers: answers,
        });
        if (error) throw new Error(error.message);
        const result = data[0];
        if (!result) throw new Error("O Supabase não retornou o resultado da avaliação.");
        if (result.exam_type !== "placement" || !result.recommended_level) {
          throw new Error("O Supabase retornou um resultado de avaliação inválido.");
        }
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
    if (recommendsHigherLevel) {
      setTestError("Para avançar, conclua todas as lições do seu nível e passe na prova de avanço.");
      return;
    }
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
            <p>Faça uma avaliação de 18 questões para revisar seu ponto de partida. Para avançar, conclua as lições do nível atual e passe na prova de avanço.</p>
            {!testStarted && <button className="button button-dark" disabled={placementLoading} onClick={() => void startTest()}>{placementLoading ? "Preparando prova..." : "Começar prova"} <span>→</span></button>}
            {!testStarted && testError && <p className="form-message form-error" role="alert">{testError}</p>}
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
              <div className="placement-actions"><button className="button button-primary" onClick={applyRecommendation} disabled={applyBusy || profile.level === recommendedLevel.id || recommendsHigherLevel}>{applyBusy ? "Atualizando..." : profile.level === recommendedLevel.id ? "Você já está neste nível" : recommendsHigherLevel ? "Avance pela prova de nível" : "Aplicar nível recomendado"} <span>↗</span></button><button className="text-link" onClick={() => void startTest()}>Fazer novamente</button></div>
              <small className="placement-preservation">A avaliação pode sugerir um nível anterior, mas as promoções exigem a prova específica após concluir as lições.</small>
            </div>}
          </section>
        </div>
      </div>
    </section>
  );
}

function ProgressPage({ profile, levelIndex, lessons: allLessons }: { profile: Profile; levelIndex: number; lessons: Lesson[] }) {
  const totalCompleted = profile.completedQuestionIds.length;
  return <section className="inner-page progress-page"><div className="page-heading"><span className="eyebrow"><span className="live-dot" /> SUA EVOLUÇÃO</span><h1>Olha só até onde <span>você chegou.</span></h1><p>Progresso de verdade é feito de pequenas conquistas repetidas.</p></div><div className="progress-summary"><article className="progress-stat"><span className="stat-icon stat-mint">✦</span><strong>{profile.completedLessons.length}</strong><small>lições concluídas</small></article><article className="progress-stat"><span className="stat-icon stat-violet">↗</span><strong>{levelIndex + 1}<small> / 6</small></strong><small>nível atual: {profile.level}</small></article><article className="progress-stat"><span className="stat-icon stat-pink">◷</span><strong>{totalCompleted}<small> questões</small></strong><small>respondidas corretamente</small></article></div><div className="progress-map"><div className="section-title-row"><div><span className="section-kicker">SEU CAMINHO</span><h2>Do primeiro hello ao próximo nível</h2></div><span className="tiny-count">{Math.round((levelIndex / 5) * 100)}% da jornada</span></div><div className="map-levels">{levels.map((level, index) => { const reached = index <= levelIndex; const complete = index < levelIndex; const levelLessons = allLessons.filter((lesson) => lesson.level === level.id); const done = levelLessons.filter((lesson) => profile.completedLessons.includes(lesson.id)).length; return <div key={level.id} className={`map-level ${reached ? "map-reached" : ""} ${complete ? "map-complete" : ""}`}><span className="map-marker">{complete ? "✓" : reached ? "✦" : "·"}</span><div className="map-level-content"><div><strong>{level.id} <span>·</span> {level.name}</strong><small>{level.subtitle}</small></div><span className="map-level-status">{complete ? "Concluído" : reached ? `${done} / ${levelLessons.length} lições` : "A desbloquear"}</span></div></div>; })}</div></div><div className="progress-encouragement"><span>🌱</span><div><strong>Consistência acima de velocidade.</strong><p>Seu objetivo — {profile.goal.toLowerCase()} — começa com cada pequena sessão.</p></div></div></section>;
}

function PromotionExamPage({ level, onExit, onPassed }: {
  level: LevelId;
  onExit: () => void;
  onPassed: () => Promise<void>;
}) {
  const [exam, setExam] = useState<ProficiencyExam | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [result, setResult] = useState<ProficiencyExamResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const loadExam = useCallback(async () => {
    setLoading(true);
    setError("");
    setExam(null);
    setResult(null);
    setAnswers([]);
    setQuestionIndex(0);
    try {
      setExam(await fetchProficiencyExam("promotion"));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Não foi possível preparar a prova.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadExam();
  }, [loadExam]);

  const question = exam?.questions[questionIndex];

  async function submitExam() {
    if (!supabase || !exam || answers.length !== 10 || answers.some((answer) => answer === undefined)) return;
    setSubmitting(true);
    setError("");
    try {
      const { data, error: submitError } = await supabase.rpc("submit_proficiency_exam", {
        p_exam_id: exam.id,
        p_answers: answers,
      });
      if (submitError) throw new Error(submitError.message);
      const examResult = data[0];
      if (!examResult || examResult.exam_type !== "promotion") {
        throw new Error("O Supabase não retornou um resultado válido para a prova.");
      }
      setResult(examResult);
      if (examResult.passed) await onPassed();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Não foi possível corrigir a prova.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="inner-page promotion-exam-page">
      <div className="page-heading">
        <span className="eyebrow"><span className="live-dot" /> PROVA DE AVANÇO · {level}</span>
        <h1>Pronto para o <span>próximo nível?</span></h1>
        <p>Responda 10 questões sobre o conteúdo de {level}. Você precisa acertar pelo menos 7 para avançar.</p>
      </div>
      <div className="promotion-exam-card">
        {loading ? <p>Preparando uma nova prova...</p> : error && !exam ? <>
          <p className="form-message form-error" role="alert">{error}</p>
          <button className="button button-dark" type="button" onClick={() => void loadExam()}>Tentar novamente</button>
        </> : result ? <>
          <div className={`promotion-result ${result.passed ? "promotion-passed" : ""}`}>
            <span className="section-kicker">{result.passed ? "APROVADO" : "AINDA NÃO FOI DESTA VEZ"}</span>
            <strong>{result.score}/10</strong>
            <p>{result.passed
              ? `Parabéns! Você avançou para o nível ${result.advanced_level}.`
              : `Você precisa de 7 acertos. Revise o conteúdo de ${level} e tente uma nova prova.`}</p>
          </div>
          {error && <p className="form-message form-error" role="alert">{error}</p>}
          <div className="promotion-exam-actions">
            {!result.passed && <button className="button button-primary" type="button" onClick={() => void loadExam()}>Tentar outra prova <span>↗</span></button>}
            <button className="button button-dark" type="button" onClick={onExit}>Voltar à visão geral</button>
          </div>
        </> : question ? <>
          <div className="placement-progress"><span>Questão {questionIndex + 1} de 10</span><strong>{level}</strong></div>
          <div className="progress-track"><span style={{ width: `${((questionIndex + 1) / 10) * 100}%` }} /></div>
          <h2>{question.prompt}</h2>
          <div className="placement-options" role="group" aria-label={`Questão ${questionIndex + 1}`}>
            {question.options.map((option, index) => <button key={option} type="button" className={`placement-option ${answers[questionIndex] === index ? "selected" : ""}`} onClick={() => setAnswers((current) => {
              const next = [...current];
              next[questionIndex] = index;
              return next;
            })}><span>{String.fromCharCode(65 + index)}</span>{option}</button>)}
          </div>
          {error && <p className="form-message form-error" role="alert">{error}</p>}
          <div className="promotion-exam-actions">
            <button className="button button-dark" type="button" disabled={questionIndex === 0} onClick={() => setQuestionIndex((current) => current - 1)}>Anterior</button>
            {questionIndex < 9
              ? <button className="button button-primary" type="button" disabled={answers[questionIndex] === undefined} onClick={() => setQuestionIndex((current) => current + 1)}>Próxima questão <span>→</span></button>
              : <button className="button button-primary" type="button" disabled={answers.some((answer) => answer === undefined) || submitting} onClick={submitExam}>{submitting ? "Corrigindo..." : "Concluir prova"} <span>↗</span></button>}
          </div>
        </> : null}
      </div>
    </section>
  );
}

function LessonModal({ lesson, question, questionIndex, selectedAnswer, result, feedback, hint, wrongAttempts, levelCompleted, saving, completed, onSelect, onSubmit, onNext, onClose, onStartPromotionExam }: {
  lesson: Lesson;
  question: LessonQuestion;
  questionIndex: number;
  selectedAnswer: string;
  result: "correct" | "incorrect" | null;
  feedback: string;
  hint: string;
  wrongAttempts: number;
  levelCompleted: boolean;
  saving: boolean;
  completed: boolean;
  onSelect: (answer: string) => void;
  onSubmit: () => void;
  onNext: () => void;
  onClose: () => void;
  onStartPromotionExam: () => void;
}) {
  const [completedAudioPlays, setCompletedAudioPlays] = useState(0);
  const [listeningTranscript, setListeningTranscript] = useState("");
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const [transcriptError, setTranscriptError] = useState("");
  const [orderedWords, setOrderedWords] = useState<string[]>([]);
  const isLastQuestion = questionIndex === lesson.questions.length - 1;
  const answeredCorrectly = result === "correct" || completed;
  useEffect(() => {
    setCompletedAudioPlays(0);
    setListeningTranscript("");
    setTranscriptError("");
    setOrderedWords([]);
  }, [question.id]);

  function selectWord(word: string) {
    const nextWords = [...orderedWords, word];
    setOrderedWords(nextWords);
    onSelect(nextWords.join(" "));
  }

  function removeWord(index: number) {
    const nextWords = orderedWords.filter((_, wordIndex) => wordIndex !== index);
    setOrderedWords(nextWords);
    onSelect(nextWords.join(" "));
  }

  if (question.type === "word_order") {
    return <WordOrderModal lesson={lesson} question={question} questionIndex={questionIndex} selectedAnswer={selectedAnswer} result={result} feedback={feedback} hint={hint} levelCompleted={levelCompleted} saving={saving} completed={completed} onSelect={onSelect} onSubmit={onSubmit} onNext={onNext} onClose={onClose} onStartPromotionExam={onStartPromotionExam} />;
  }

  async function loadListeningTranscript() {
    if (!supabase) {
      setTranscriptError("Supabase não está configurado.");
      return;
    }

    setTranscriptLoading(true);
    setTranscriptError("");
    try {
      const { data, error } = await supabase.rpc("get_listening_transcript", {
        p_question_id: question.id,
      });
      if (error) throw new Error(error.message);
      if (!data) throw new Error("A transcrição desta questão não está disponível.");
      setListeningTranscript(data);
    } catch (error) {
      setTranscriptError(error instanceof Error ? error.message : "Não foi possível carregar a transcrição.");
    } finally {
      setTranscriptLoading(false);
    }
  }

  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="lesson-modal" role="dialog" aria-modal="true" aria-labelledby="lesson-title"><button className="modal-close" onClick={onClose} aria-label="Fechar lição">×</button><span className="eyebrow"><span className="live-dot" /> {lesson.category.toUpperCase()} · {lesson.duration} MIN</span><div className="modal-step"><span>QUESTÃO {String(questionIndex + 1).padStart(2, "0")} DE {String(lesson.questions.length).padStart(2, "0")}</span><span>✦ PRÁTICA</span></div><h2 id="lesson-title">{lesson.title}</h2><p className="modal-description">{lesson.description}</p><div className="exercise-box"><span className="exercise-label">{question.type === "listening" ? "OUÇA E ESCREVA" : question.type === "fill_blank" ? "COMPLETE A FRASE" : "HORA DE PRATICAR"}</span>{question.audioUrl && <audio className="audio-player" controls preload="none" src={question.audioUrl} onEnded={() => setCompletedAudioPlays((plays) => plays + 1)}>Seu navegador não suporta áudio.</audio>}{question.type === "listening" && completedAudioPlays >= 5 && !listeningTranscript && <button className="listening-transcript-button" type="button" onClick={() => void loadListeningTranscript()} disabled={transcriptLoading}>{transcriptLoading ? "Carregando texto..." : "Mudar para texto"}</button>}{transcriptError && <p className="form-message form-error" role="alert">{transcriptError}</p>}{listeningTranscript && <p className="listening-transcript"><strong>Texto em inglês:</strong> {listeningTranscript}</p>}<h3>{question.prompt}</h3><div className="answer-options">{question.type === "multiple_choice" ? question.options.map((option, index) => <button key={option} className={`answer-option ${selectedAnswer === option ? "answer-selected" : ""} ${result === "incorrect" && selectedAnswer === option ? "answer-incorrect" : ""}`} onClick={() => onSelect(option)} disabled={answeredCorrectly}><span>{String.fromCharCode(65 + index)}</span>{option}<i>{result === "correct" && selectedAnswer === option ? "✓" : ""}</i></button>) : <input className="answer-text-input" value={selectedAnswer} onChange={(event) => onSelect(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && selectedAnswer.trim()) onSubmit(); }} placeholder={question.type === "listening" ? "Digite o que você ouviu" : "Digite sua resposta"} disabled={answeredCorrectly} />}</div>{result === "incorrect" && <p className="answer-feedback feedback-error">{feedback || "Quase! Tente outra vez."} {wrongAttempts > 0 && !hint && `(${wrongAttempts} de 5 tentativas)`}</p>}{result === "incorrect" && hint && <p className="answer-hint"><strong>Dica após {wrongAttempts} tentativas:</strong> {hint}</p>}{answeredCorrectly && <p className="answer-feedback feedback-success">{feedback || "Muito bem! Resposta certa."} {levelCompleted ? "Você já concluiu pelo menos metade das questões do nível. A prova de avanço está liberada." : "Seu progresso foi atualizado. ✨"}</p>}</div>{!answeredCorrectly ? <button className="button button-primary modal-submit" onClick={onSubmit} disabled={!selectedAnswer.trim() || saving}>{saving ? "Conferindo..." : "Conferir resposta"} <span>→</span></button> : levelCompleted ? <button className="button button-primary modal-submit" onClick={onStartPromotionExam}>Fazer prova de avanço <span>→</span></button> : <button className="button button-primary modal-submit" onClick={isLastQuestion ? onClose : onNext}>{isLastQuestion ? "Concluir lição" : "Próxima questão"} <span>→</span></button>}<div className="modal-footer-note"><span>◈</span> Errar faz parte. Você pode tentar quantas vezes quiser.</div></section></div>;
}

function WordOrderModal({ lesson, question, questionIndex, selectedAnswer, result, feedback, hint, levelCompleted, saving, completed, onSelect, onSubmit, onNext, onClose, onStartPromotionExam }: {
  lesson: Lesson;
  question: LessonQuestion;
  questionIndex: number;
  selectedAnswer: string;
  result: "correct" | "incorrect" | null;
  feedback: string;
  hint: string;
  levelCompleted: boolean;
  saving: boolean;
  completed: boolean;
  onSelect: (answer: string) => void;
  onSubmit: () => void;
  onNext: () => void;
  onClose: () => void;
  onStartPromotionExam: () => void;
}) {
  const [words, setWords] = useState<string[]>([]);
  const answeredCorrectly = result === "correct" || completed;
  const isLastQuestion = questionIndex === lesson.questions.length - 1;

  useEffect(() => setWords([]), [question.id]);

  function addWord(word: string) {
    const next = [...words, word];
    setWords(next);
    onSelect(next.join(" "));
  }

  function removeWord(index: number) {
    const next = words.filter((_, wordIndex) => wordIndex !== index);
    setWords(next);
    onSelect(next.join(" "));
  }

  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="lesson-modal word-order-modal" role="dialog" aria-modal="true" aria-labelledby="word-order-title"><button className="modal-close" onClick={onClose} aria-label="Fechar lição">×</button><span className="eyebrow"><span className="live-dot" /> {lesson.category.toUpperCase()} · {lesson.duration} MIN</span><div className="modal-step"><span>QUESTÃO {String(questionIndex + 1).padStart(2, "0")} DE {String(lesson.questions.length).padStart(2, "0")}</span><span>✦ ORGANIZE</span></div><h2 id="word-order-title">{lesson.title}</h2><p className="modal-description">{lesson.description}</p><div className="exercise-box"><span className="exercise-label">ORGANIZE AS PALAVRAS</span><h3>{question.prompt}</h3><div className="word-order-answer" aria-label="Resposta montada">{words.length ? words.map((word, index) => <button key={`${word}-${index}`} type="button" onClick={() => removeWord(index)} disabled={answeredCorrectly}>{word}</button>) : <span>As palavras escolhidas aparecem aqui</span>}</div><div className="word-bank">{question.options.map((word, index) => <button key={`${word}-${index}`} type="button" onClick={() => addWord(word)} disabled={answeredCorrectly || words.filter((selectedWord) => selectedWord === word).length >= question.options.filter((optionWord) => optionWord === word).length}>{word}</button>)}</div><small className="word-order-note">Clique em uma palavra da frase para removê-la.</small>{result === "incorrect" && <p className="answer-feedback feedback-error">{feedback || "Quase! Tente outra vez."}</p>}{answeredCorrectly && <div className="answer-feedback feedback-success"><strong>Muito bem!</strong><span>Resposta: {selectedAnswer}</span>{feedback && <span>{feedback}</span>}{(question.hint || hint) && <span className="answer-context-tip"><b>Em outros contextos:</b> {question.hint || hint}</span>}</div>}</div>{!answeredCorrectly ? <button className="button button-primary modal-submit" onClick={onSubmit} disabled={!selectedAnswer.trim() || saving}>{saving ? "Conferindo..." : "Verificar resposta"} <span>→</span></button> : levelCompleted ? <button className="button button-primary modal-submit" onClick={onStartPromotionExam}>Fazer prova de avanço <span>→</span></button> : <button className="button button-primary modal-submit" onClick={isLastQuestion ? onClose : onNext}>{isLastQuestion ? "Concluir lição" : "Próxima questão"} <span>→</span></button>}<div className="modal-footer-note"><span>◈</span> Monte a frase e confira quando estiver pronto.</div></section></div>;
}
