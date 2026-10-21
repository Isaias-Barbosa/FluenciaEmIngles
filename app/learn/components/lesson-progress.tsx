export type PracticeStatus = {
  completedIds: string[];
  incorrectIds?: string[];
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
  const incorrect = new Set(status.incorrectIds ?? []);
  const incorrectCount = questions.filter(question=>incorrect.has(question.id)&&!completed.has(question.id)).length;
  const answeredCount = completedCount + incorrectCount;
  const required = Math.ceil(total * 0.6);
  const percentage = total ? Math.round(answeredCount / total * 100) : 0;
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
      <span>{incorrectCount} {incorrectCount===1?"erro":"erros"} · {answeredCount}/{total} respondidas</span>
    </div>
    <div className="practice-progress-track" role="progressbar" aria-label="Questões respondidas"
      aria-valuemin={0} aria-valuemax={total} aria-valuenow={answeredCount} aria-valuetext={`${answeredCount} de ${total} questões respondidas`}>
      <span style={{ width: `${percentage}%` }} />
    </div>
    <ol className="practice-question-steps" aria-label="Situação das questões">{questions.map((question, index) => {
      const done = completed.has(question.id);
      const wrong = incorrect.has(question.id) && !done;
      const current = index === questionIndex;
      return <li key={question.id} className={`${done ? "is-correct" : wrong ? "is-incorrect" : ""} ${current ? "is-current" : ""}`}
        aria-current={current ? "step" : undefined} aria-label={`Questão ${index + 1}: ${done ? "acertada" : wrong ? "errada" : current ? "atual" : "pendente"}`}>
        <span aria-hidden="true">{done ? "✓" : wrong ? "×" : index + 1}</span>
      </li>;
    })}</ol>
    <p className="practice-guide">{answeredCount === total ? completedCount >= required ? "Lição concluída. Muito bem!" : "Refaça a lição para atingir o mínimo de acertos." : `Acerte pelo menos ${required} de ${total} nesta tentativa. Se errar, você segue para a próxima questão.`}</p>
  </section>;
}
