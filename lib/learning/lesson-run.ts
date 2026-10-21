export type LessonQuestionAttempt={request_id:string;question_id:string;submitted_answer:string;is_correct:boolean;attempt_number:number;attempt_limit:number;hint:string|null;prompt:string};
export function questionAttemptLimit(type:string){return type==="multiple_choice"?2:type==="fill_blank"?3:1;}
export type LessonRunAnswer = {question_id:string;submitted_answer:string;is_correct:boolean;correct_answer:string;explanation:string|null;attempt_count?:number};
export type LessonRun = {id:string;user_id:string;lesson_id:string;question_ids:string[];answers:LessonRunAnswer[];attempts?:LessonQuestionAttempt[];passed:boolean;finished_at:string|null};
export function lessonRunScore(run:LessonRun) {
  const correct=run.answers.filter(answer=>answer.is_correct).length;
  return {correct,incorrect:run.answers.length-correct,total:run.question_ids.length,required:Math.ceil(run.question_ids.length*0.6)};
}
export type LessonQuestion = {passage:string|null;id:string;type:"multiple_choice"|"fill_blank"|"listening"|"word_order";prompt:string;options:string[];audioUrl:string|null;sourceUrl?:string;sourceTitle?:string;sourceLicense?:string;replacementOrigin?:string;hint:string|null};
export type StudyLesson = {id:string;level:import("@/lib/cefr/types").CefrLevel;title:string;category:string;duration:number;description:string;sortOrder:number;questions:LessonQuestion[]};

export type LessonResult = {correct:number;incorrect:number;total:number};
export type SavedLessonResult = {
  lesson_id:string;question_ids:string[];answers:unknown;finished_at:string|null;
};
// Rows are ordered newest first. Ignore unfinished/abandoned snapshots so they
// cannot replace the last result with a partial score or a fabricated perfect score.
export function latestLessonResults(rows:SavedLessonResult[]):Record<string,LessonResult> {
  const results:Record<string,LessonResult>={};
  for(const row of rows) {
    if(results[row.lesson_id] || !row.finished_at || !row.question_ids.length || !Array.isArray(row.answers))continue;
    const ids=new Set(row.question_ids);
    if(ids.size!==row.question_ids.length || row.answers.length!==ids.size)continue;
    const answered=new Set<string>();
    let correct=0,valid=true;
    for(const answer of row.answers) {
      if(!answer || typeof answer!=="object" || typeof answer.question_id!=="string" || !ids.has(answer.question_id) || answered.has(answer.question_id) || typeof answer.is_correct!=="boolean") {valid=false;break;}
      answered.add(answer.question_id);
      if(answer.is_correct)correct++;
    }
    if(valid)results[row.lesson_id]={correct,incorrect:ids.size-correct,total:ids.size};
  }
  return results;
}
export function lessonResultLabel(lesson:{questions:{id:string}[]},result?:LessonResult) {
  if(result)return `Última tentativa: ${result.correct}/${result.total} acertos · ${result.incorrect} ${result.incorrect===1?"erro":"erros"}`;
  const total=lesson.questions.length;
  return `${total} ${total===1?"questão":"questões"} · mínimo ${Math.ceil(total*0.6)} acertos`;
}
