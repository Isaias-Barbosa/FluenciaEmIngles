import type {Json} from "@/lib/supabase/database.types";
export type ManagedQuestion={id:string;lessonId:string;levelId?:string;type:"multiple_choice"|"fill_blank"|"listening"|"word_order";difficulty:string;prompt:string;readingPassage?:string|null;choices:Json;audioPath:string|null;acceptedAnswers:string[];explanation:string;published:boolean;createdAt:string};
export type ManagedLesson={id:string;title:string;category:string;published:boolean};
export function publicationIssue(question:ManagedQuestion,lesson?:ManagedLesson){
 if(!lesson?.published)return "Publique a lição primeiro";
 if(!question.prompt.trim()||!question.acceptedAnswers.length||question.acceptedAnswers.some(answer=>!answer.trim()))return "Revise o enunciado e o gabarito";
 if(question.type==="listening"&&!question.audioPath?.trim())return "Adicione o áudio";
 if(question.type==="multiple_choice"&&(!Array.isArray(question.choices)||question.choices.length<2||question.choices.length>8||question.acceptedAnswers.some(answer=>!(question.choices as Json[]).includes(answer))))return "Revise alternativas e gabarito";
 return "";
}
export function filterQuestions(questions:ManagedQuestion[],lessons:ManagedLesson[],search:string,lessonId:string,status:string,type:string){
 const term=search.trim().toLocaleLowerCase("pt-BR"),titles=new Map(lessons.map(lesson=>[lesson.id,lesson.title]));
 return questions.filter(question=>(!lessonId||question.lessonId===lessonId)&&(!status||(status==="published"?question.published:!question.published))&&(!type||question.type===type)&&(!term||`${question.prompt} ${titles.get(question.lessonId)??""}`.toLocaleLowerCase("pt-BR").includes(term)));
}
