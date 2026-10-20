export type PracticeStatus = {
  completedIds: string[];
  soundsEnabled: boolean;
  onToggleSounds: () => void;
};

export function LessonProgress({ questions, questionIndex, status }: {
  questions: { id: string }[];
  questionIndex: number;
  status: PracticeStatus;
}) {
  const total = questions.length;
  const completed = new Set(status.completedIds);
  const completedCount = questions.filter((question) => completed.has(question.id)).length;
  const percentage = total ? Math.round(completedCount / total * 100) : 0;
  return <section className="lesson-practice-progress" aria-label="Progresso da lição">
    <div className="practice-heading">
      <span>Questão <strong>{questionIndex + 1}</strong> de {total}</span>
      <button type="button" className="practice-sound-toggle" aria-pressed={status.soundsEnabled}
        aria-label="Sons de acerto e erro" onClick={status.onToggleSounds}>
        <span aria-hidden="true">{status.soundsEnabled ? "♪" : "♩"}</span> {status.soundsEnabled ? "Sons ligados" : "Sons desligados"}
      </button>
    </div>
    <div className="practice-score" role="status" aria-live="polite" aria-atomic="true">
      <strong><span aria-hidden="true">✓ </span>{completedCount} {completedCount === 1 ? "acerto" : "acertos"}</strong>
      <span>de {total} questões nesta lição</span>
    </div>
    <div className="practice-progress-track" role="progressbar" aria-label="Questões acertadas"
      aria-valuemin={0} aria-valuemax={total} aria-valuenow={completedCount} aria-valuetext={`${completedCount} de ${total} questões acertadas`}>
      <span style={{ width: `${percentage}%` }} />
    </div>
    <ol className="practice-question-steps" aria-label="Situação das questões">{questions.map((question, index) => {
      const done = completed.has(question.id);
      const current = index === questionIndex;
      return <li key={question.id} className={`${done ? "is-correct" : ""} ${current ? "is-current" : ""}`}
        aria-current={current ? "step" : undefined} aria-label={`Questão ${index + 1}: ${done ? "acertada" : current ? "atual" : "pendente"}`}>
        <span aria-hidden="true">{done ? "✓" : index + 1}</span>
      </li>;
    })}</ol>
    <p className="practice-guide">{completedCount === total ? "Lição concluída. Muito bem!" : "Responda e confira. Se errar, você pode tentar novamente."}</p>
  </section>;
}
