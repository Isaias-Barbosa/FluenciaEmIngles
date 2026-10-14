import { NextRequest, NextResponse } from "next/server";
import type { Json } from "@/lib/supabase/database.types";
import type { Database } from "@/lib/supabase/database.types";
import {
  adminAuthClient,
  adminServiceClient,
  hasConfiguredAdmins,
  isConfiguredAdmin,
} from "@/lib/supabase/admin-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type QuestionPayload = {
  lessonId: string;
  type: "multiple_choice" | "fill_blank" | "listening";
  prompt: string;
  choices: string[];
  acceptedAnswers: string[];
  explanation: string;
  audioPath: string;
};

type LessonPayload = {
  levelId: string;
  title: string;
  description: string;
  category: string;
  duration: number;
};
type ProfileRow = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "user_id" | "display_name" | "current_level_id" | "onboarding_completed" | "created_at"
>;
type LevelRow = Pick<
  Database["public"]["Tables"]["language_levels"]["Row"],
  "id" | "code" | "title" | "sort_order" | "language_id"
>;
type LessonRow = Pick<
  Database["public"]["Tables"]["lessons"]["Row"],
  "id" | "level_id" | "title" | "category" | "is_published"
>;
type QuestionRow = Pick<
  Database["public"]["Tables"]["questions"]["Row"],
  "id" | "lesson_id" | "question_type" | "prompt" | "choices" | "audio_path" | "sort_order" | "is_published" | "created_at"
>;
type AnswerRow = Pick<
  Database["public"]["Tables"]["question_answers"]["Row"],
  "question_id" | "accepted_answers" | "explanation"
>;
type AttemptRow = Pick<
  Database["public"]["Tables"]["question_attempts"]["Row"],
  "user_id" | "created_at"
>;

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

async function authorize(request: NextRequest) {
  if (!adminAuthClient || !adminServiceClient || !hasConfiguredAdmins) {
    return { response: errorResponse("A configuração do painel admin está incompleta no servidor.", 503) };
  }
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return { response: errorResponse("Entre na sua conta para continuar.", 401) };

  const { data, error } = await adminAuthClient.auth.getUser(token);
  if (error || !data.user) return { response: errorResponse("Sua sessão expirou. Entre novamente.", 401) };
  if (!isConfiguredAdmin(data.user.email)) {
    return { response: errorResponse("Sua conta não tem acesso ao painel administrativo.", 403) };
  }
  return { client: adminServiceClient };
}

async function readAll<T>(
  loadPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
) {
  const rows: T[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await loadPage(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    const page = data ?? [];
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseQuestion(value: unknown): QuestionPayload | null {
  if (!isRecord(value)) return null;
  const { lessonId, type, prompt, choices, acceptedAnswers, explanation, audioPath } = value;
  if (
    typeof lessonId !== "string" ||
    !["multiple_choice", "fill_blank", "listening"].includes(String(type)) ||
    typeof prompt !== "string" ||
    !Array.isArray(choices) ||
    !choices.every((choice) => typeof choice === "string") ||
    !Array.isArray(acceptedAnswers) ||
    !acceptedAnswers.every((answer) => typeof answer === "string") ||
    typeof explanation !== "string" ||
    typeof audioPath !== "string"
  ) return null;
  return {
    lessonId,
    type: type as QuestionPayload["type"],
    prompt: prompt.trim(),
    choices: choices.map((choice) => choice.trim()).filter(Boolean),
    acceptedAnswers: acceptedAnswers.map((answer) => answer.trim()).filter(Boolean),
    explanation: explanation.trim(),
    audioPath: audioPath.trim(),
  };
}

function parseLesson(value: unknown): LessonPayload | null {
  if (!isRecord(value)) return null;
  const { levelId, title, description, category, duration } = value;
  if (
    typeof levelId !== "string" ||
    typeof title !== "string" ||
    typeof description !== "string" ||
    typeof category !== "string" ||
    typeof duration !== "number" ||
    !Number.isInteger(duration) ||
    duration < 1 ||
    duration > 240
  ) return null;
  return {
    levelId,
    title: title.trim(),
    description: description.trim(),
    category: category.trim(),
    duration,
  };
}

export async function GET(request: NextRequest) {
  const auth = await authorize(request);
  if ("response" in auth) return auth.response;
  const client = auth.client;

  try {
    const [languages, profiles, levels, lessons, questions, answers, attempts] = await Promise.all([
      client.from("languages").select("id, code").eq("code", "en").limit(1),
      readAll<ProfileRow>((from, to) => client.from("profiles").select("user_id, display_name, current_level_id, onboarding_completed, created_at").order("created_at", { ascending: false }).range(from, to)),
      readAll<LevelRow>((from, to) => client.from("language_levels").select("id, code, title, sort_order, language_id").order("sort_order").range(from, to)),
      readAll<LessonRow>((from, to) => client.from("lessons").select("id, level_id, title, category, is_published").order("sort_order").range(from, to)),
      readAll<QuestionRow>((from, to) => client.from("questions").select("id, lesson_id, question_type, prompt, choices, audio_path, sort_order, is_published, created_at").order("created_at", { ascending: false }).range(from, to)),
      readAll<AnswerRow>((from, to) => client.from("question_answers").select("question_id, accepted_answers, explanation").range(from, to)),
      readAll<AttemptRow>((from, to) => client.from("question_attempts").select("user_id, created_at").gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()).range(from, to)),
    ]);
    if (languages.error) throw new Error(languages.error.message);
    const englishId = languages.data[0]?.id;
    if (!englishId) throw new Error("O idioma inglês não foi encontrado no banco.");
    const englishLevels = levels.filter((level) => level.language_id === englishId);
    const levelById = new Map(englishLevels.map((level) => [level.id, level]));
    const englishLessons = lessons.filter((lesson) => levelById.has(lesson.level_id));
    const lessonById = new Map(englishLessons.map((lesson) => [lesson.id, lesson]));
    const answerByQuestionId = new Map(answers.map((answer) => [answer.question_id, answer]));
    const activeUserIds = new Set(attempts.map((attempt) => attempt.user_id));

    return NextResponse.json({
      stats: {
        totalUsers: profiles.length,
        activeUsers: activeUserIds.size,
        totalQuestions: questions.filter((question) => lessonById.has(question.lesson_id)).length,
        publishedQuestions: questions.filter((question) => question.is_published && lessonById.has(question.lesson_id)).length,
      },
      levels: englishLevels.map(({ id, code, title }) => ({
        id,
        code,
        title,
        questionCount: questions.filter((question) => lessonById.get(question.lesson_id)?.level_id === id).length,
        publishedQuestionCount: questions.filter((question) => question.is_published && lessonById.get(question.lesson_id)?.level_id === id).length,
      })),
      users: profiles.map((profile) => ({
        id: profile.user_id,
        name: profile.display_name || "Estudante",
        level: levelById.get(profile.current_level_id ?? "")?.code ?? "—",
        onboardingComplete: profile.onboarding_completed,
        active: activeUserIds.has(profile.user_id),
        createdAt: profile.created_at,
      })),
      lessons: englishLessons.map((lesson) => ({
        id: lesson.id,
        levelId: lesson.level_id,
        title: lesson.title,
        category: lesson.category,
        published: lesson.is_published,
      })),
      questions: questions
        .filter((question) => lessonById.has(question.lesson_id))
        .map((question) => {
          const answer = answerByQuestionId.get(question.id);
          return {
            id: question.id,
            lessonId: question.lesson_id,
            levelId: lessonById.get(question.lesson_id)?.level_id,
            type: question.question_type,
            prompt: question.prompt,
            choices: question.choices,
            audioPath: question.audio_path,
            acceptedAnswers: answer?.accepted_answers ?? [],
            explanation: answer?.explanation ?? "",
            published: question.is_published,
            createdAt: question.created_at,
          };
        }),
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Não foi possível carregar os dados administrativos.", 500);
  }
}

export async function POST(request: NextRequest) {
  const auth = await authorize(request);
  if ("response" in auth) return auth.response;
  const client = auth.client;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("O corpo da requisição não contém JSON válido.", 400);
  }
  if (!isRecord(body) || typeof body.action !== "string") {
    return errorResponse("Ação administrativa inválida.", 400);
  }

  try {
    if (body.action === "createLesson") {
      const lesson = parseLesson(body.lesson);
      if (!lesson || !lesson.title || lesson.title.length > 100 || !lesson.description || lesson.description.length > 300 || !lesson.category || lesson.category.length > 40) {
        return errorResponse("Preencha todos os campos da lição corretamente.", 400);
      }
      const { data: level, error: levelError } = await client
        .from("language_levels")
        .select("id, code, language_id")
        .eq("id", lesson.levelId)
        .single();
      if (levelError || !level) return errorResponse("O nível selecionado não existe.", 400);
      const { data: language, error: languageError } = await client
        .from("languages")
        .select("code")
        .eq("id", level.language_id)
        .single();
      if (languageError || language?.code !== "en") return errorResponse("Apenas lições de inglês podem ser criadas por este painel.", 400);
      const { data: existing, error: lessonsError } = await client
        .from("lessons")
        .select("id, sort_order")
        .eq("level_id", lesson.levelId)
        .order("sort_order", { ascending: false })
        .limit(1);
      if (lessonsError) throw new Error(lessonsError.message);
      const slug = `${level.code.toLowerCase()}-${lesson.title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${crypto.randomUUID().slice(0, 8)}`;
      const { error } = await client.from("lessons").insert({
        level_id: lesson.levelId,
        slug,
        title: lesson.title,
        description: lesson.description,
        category: lesson.category,
        duration_minutes: lesson.duration,
        sort_order: (existing[0]?.sort_order ?? 0) + 1,
        is_published: false,
      });
      if (error) throw new Error(error.message);
      return NextResponse.json({ message: "Lição criada como rascunho." }, { status: 201 });
    }

    if (body.action === "setLessonPublished") {
      if (!isRecord(body.lesson) || typeof body.lesson.id !== "string" || typeof body.lesson.published !== "boolean") {
        return errorResponse("Dados de publicação da lição inválidos.", 400);
      }
      const { data: lesson, error: lessonError } = await client
        .from("lessons")
        .select("id, level_id")
        .eq("id", body.lesson.id)
        .single();
      if (lessonError || !lesson) return errorResponse("A lição selecionada não existe.", 404);
      const { data: level, error: levelError } = await client
        .from("language_levels")
        .select("id, language_id")
        .eq("id", lesson.level_id)
        .single();
      if (levelError || !level) return errorResponse("O nível da lição não foi encontrado.", 400);
      const { data: language, error: languageError } = await client
        .from("languages")
        .select("code")
        .eq("id", level.language_id)
        .single();
      if (languageError || language?.code !== "en") return errorResponse("Apenas lições de inglês podem ser alteradas por este painel.", 400);
      const { error } = await client
        .from("lessons")
        .update({ is_published: body.lesson.published })
        .eq("id", lesson.id);
      if (error) throw new Error(error.message);
      return NextResponse.json({ message: body.lesson.published ? "Lição publicada." : "Lição retirada do conteúdo publicado." });
    }

    if (body.action === "setQuestionPublished") {
      if (!isRecord(body.question) || typeof body.question.id !== "string" || typeof body.question.published !== "boolean") {
        return errorResponse("Dados de publicação da questão inválidos.", 400);
      }
      const { data: question, error: questionError } = await client
        .from("questions")
        .select("id, lesson_id, question_type, audio_path")
        .eq("id", body.question.id)
        .single();
      if (questionError || !question) return errorResponse("A questão selecionada não existe.", 404);
      const { data: lesson, error: lessonError } = await client
        .from("lessons")
        .select("id, level_id, is_published")
        .eq("id", question.lesson_id)
        .single();
      if (lessonError || !lesson) return errorResponse("A lição da questão não foi encontrada.", 400);
      const { data: level, error: levelError } = await client
        .from("language_levels")
        .select("id, language_id")
        .eq("id", lesson.level_id)
        .single();
      if (levelError || !level) return errorResponse("O nível da questão não foi encontrado.", 400);
      const { data: language, error: languageError } = await client
        .from("languages")
        .select("code")
        .eq("id", level.language_id)
        .single();
      if (languageError || language?.code !== "en") return errorResponse("Apenas questões de inglês podem ser alteradas por este painel.", 400);
      if (body.question.published) {
        const { data: answer, error: answerError } = await client
          .from("question_answers")
          .select("question_id")
          .eq("question_id", question.id)
          .maybeSingle();
        if (answerError) throw new Error(answerError.message);
        if (!answer) return errorResponse("Adicione um gabarito antes de publicar esta questão.", 400);
        if (question.question_type === "listening" && !question.audio_path) {
          return errorResponse("Adicione o caminho do áudio antes de publicar esta questão.", 400);
        }
        if (!lesson.is_published) {
          return errorResponse("Publique a lição antes de publicar suas questões.", 400);
        }
      }
      const { error } = await client
        .from("questions")
        .update({ is_published: body.question.published })
        .eq("id", question.id);
      if (error) throw new Error(error.message);
      return NextResponse.json({ message: body.question.published ? "Questão publicada." : "Questão retirada do conteúdo publicado." });
    }

    if (body.action === "createQuestion") {
      const question = parseQuestion(body.question);
      if (
        !question ||
        !question.prompt ||
        question.prompt.length > 2000 ||
        question.choices.length > 8 ||
        question.choices.some((choice) => choice.length > 250) ||
        question.acceptedAnswers.length === 0 ||
        question.acceptedAnswers.length > 10 ||
        question.acceptedAnswers.some((answer) => answer.length > 250) ||
        question.explanation.length > 1500 ||
        question.audioPath.length > 500 ||
        (question.type === "listening" && !question.audioPath) ||
        (question.type === "multiple_choice" &&
          (question.choices.length < 2 || !question.acceptedAnswers.every((answer) => question.choices.includes(answer))))
      ) {
        return errorResponse("Revise o enunciado, as alternativas, o gabarito e o áudio da questão.", 400);
      }
      const { data: lesson, error: lessonError } = await client
        .from("lessons")
        .select("id, level_id, sort_order")
        .eq("id", question.lessonId)
        .single();
      if (lessonError || !lesson) return errorResponse("A lição selecionada não existe.", 400);
      const { data: level, error: levelError } = await client
        .from("language_levels")
        .select("id, language_id")
        .eq("id", lesson.level_id)
        .single();
      if (levelError || !level) return errorResponse("O nível da lição não foi encontrado.", 400);
      const { data: language, error: languageError } = await client
        .from("languages")
        .select("code")
        .eq("id", level.language_id)
        .single();
      if (languageError || language?.code !== "en") return errorResponse("Apenas questões de inglês podem ser alteradas por este painel.", 400);

      const { data: existing, error: questionsError } = await client
        .from("questions")
        .select("id, sort_order")
        .eq("lesson_id", question.lessonId)
        .order("sort_order", { ascending: false })
        .limit(1);
      if (questionsError) throw new Error(questionsError.message);
      const { data: inserted, error: insertError } = await client
        .from("questions")
        .insert({
          lesson_id: question.lessonId,
          question_type: question.type,
          prompt: question.prompt,
          choices: question.choices as Json,
          audio_path: question.audioPath || null,
          sort_order: (existing[0]?.sort_order ?? 0) + 1,
          is_published: false,
        })
        .select("id")
        .single();
      if (insertError || !inserted) throw new Error(insertError?.message ?? "A questão não foi criada.");
      const { error: answerError } = await client.from("question_answers").insert({
        question_id: inserted.id,
        accepted_answers: question.acceptedAnswers,
        explanation: question.explanation,
      });
      if (answerError) {
        const { error: cleanupError } = await client.from("questions").delete().eq("id", inserted.id);
        if (cleanupError) {
          throw new Error(`A questão foi criada, mas o gabarito falhou e a limpeza também: ${answerError.message}; ${cleanupError.message}`);
        }
        throw new Error(`Não foi possível salvar o gabarito. A questão incompleta foi removida: ${answerError.message}`);
      }
      return NextResponse.json({ message: "Questão criada como rascunho." }, { status: 201 });
    }

    return errorResponse("Ação administrativa desconhecida.", 400);
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Não foi possível salvar as alterações administrativas.", 500);
  }
}
