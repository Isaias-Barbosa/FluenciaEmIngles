import { cefrLevels, type CefrLevel } from "@/lib/cefr/types";
import type { QuizStats } from "./vocabulary";

export const quizHistoryEvent = "fluencia-quiz-history-changed";
export const quizHistoryKey = (userId: string) => `fluencia-vocabulary-quiz-v1:${userId}`;
export const quizRoundSize = 10;

export function summarizeQuizHistory(stats: QuizStats) {
  const practiced = cefrLevels.filter((level) => (stats[level]?.rounds ?? 0) > 0);
  const rounds = practiced.reduce((total, level) => total + stats[level]!.rounds, 0);
  return { rounds, questions: rounds * quizRoundSize, practicedLevels: practiced.length,
    best: practiced.length ? Math.max(...practiced.map((level) => stats[level]!.best)) : null };
}

type LearningLesson = { id: string; level: CefrLevel; questions: { id: string }[] };
export function summarizeLearning(lessons: LearningLesson[], completedIds: string[], completedLessonIds?: string[]) {
  const completed = new Set(completedIds);
  const passedLessons = completedLessonIds ? new Set(completedLessonIds) : null;
  return cefrLevels.map((code) => {
    const levelLessons = [...new Map(lessons.filter((lesson) => lesson.level === code).map((lesson) => [lesson.id, lesson])).values()];
    const questions = new Set(levelLessons.flatMap((lesson) => lesson.questions.map((question) => question.id)));
    const done = [...questions].filter((id) => completed.has(id)).length;
    return { code, totalQuestions: questions.size, completedQuestions: done,
      totalLessons: levelLessons.length,
      completedLessons: levelLessons.filter((lesson) => passedLessons ? passedLessons.has(lesson.id) : lesson.questions.length > 0 && lesson.questions.every((question) => completed.has(question.id))).length,
      percent: questions.size ? Math.round(done / questions.size * 100) : 0 };
  });
}
