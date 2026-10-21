export type LessonRunAnswer = {question_id:string;submitted_answer:string;is_correct:boolean;correct_answer:string;explanation:string|null};
export type LessonRun = {id:string;user_id:string;lesson_id:string;question_ids:string[];answers:LessonRunAnswer[];passed:boolean;finished_at:string|null};
export function lessonRunScore(run:LessonRun) {
  const correct=run.answers.filter(answer=>answer.is_correct).length;
  return {correct,incorrect:run.answers.length-correct,total:run.question_ids.length,required:Math.ceil(run.question_ids.length*0.6)};
}
export type LessonQuestion = {passage:string|null;id:string;type:"multiple_choice"|"fill_blank"|"listening"|"word_order";prompt:string;options:string[];audioUrl:string|null;sourceUrl?:string;sourceTitle?:string;sourceLicense?:string;replacementOrigin?:string;hint:string|null};
export type StudyLesson = {id:string;level:import("@/lib/cefr/types").CefrLevel;title:string;category:string;duration:number;description:string;sortOrder:number;questions:LessonQuestion[]};
