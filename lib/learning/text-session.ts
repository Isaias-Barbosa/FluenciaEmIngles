type Question = { id: string; type: string; audioUrl: string | null };
type Lesson<Q> = { level: string; questions: Q[] };

/** Keep completed/past questions and replace only pending audio, without duplicates. */
export function textSession<Q extends Question>(
  lesson: Lesson<Q>, lessons: Lesson<Q>[], index: number, completedIds: string[],
): Q[] | null {
  const completed = new Set(completedIds);
  const used = new Set(lesson.questions.map((question) => question.id));
  const candidates = lessons.filter((item) => item.level === lesson.level)
    .flatMap((item) => item.questions)
    .filter((question) => question.type !== "listening" && !question.audioUrl && !used.has(question.id) && !completed.has(question.id));
  const questions = [...lesson.questions];
  for (let slot = index; slot < questions.length; slot++) {
    const question = questions[slot];
    if (completed.has(question.id) || (question.type !== "listening" && !question.audioUrl)) continue;
    const replacement = candidates.find((candidate) => !used.has(candidate.id));
    if (!replacement) return null;
    questions[slot] = replacement;
    used.add(replacement.id);
  }
  return questions;
}
