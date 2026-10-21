export type TeachingQuestion={level:string;prompt:string;choices:string[];correctAnswer:string};
export class TeachingNotesError extends Error {constructor(message:string,public status=400){super(message);}}
export function parseTeachingQuestion(value:unknown):TeachingQuestion {
 if(!value||typeof value!=="object")throw new TeachingNotesError("Revise a questão antes de gerar os campos.");
 const q=value as Record<string,unknown>;
 if(typeof q.level!=="string"||!['A1','A2','B1','B2','C1','C2'].includes(q.level))throw new TeachingNotesError("Defina o nível antes de gerar.");
 if(typeof q.prompt!=="string"||q.prompt.trim().length<10||q.prompt.length>1200)throw new TeachingNotesError("Informe um enunciado com 10 a 1200 caracteres.");
 if(!Array.isArray(q.choices)||q.choices.length!==4||q.choices.some(choice=>typeof choice!=="string"||!choice.trim()||choice.length>250))throw new TeachingNotesError("Informe exatamente quatro alternativas válidas.");
 const choices=q.choices.map(choice=>(choice as string).trim());
 if(new Set(choices.map(choice=>choice.toLowerCase())).size!==4||typeof q.correctAnswer!=="string"||!choices.includes(q.correctAnswer.trim()))throw new TeachingNotesError("As alternativas devem ser distintas e o gabarito deve coincidir com uma delas.");
 return {level:q.level,prompt:q.prompt.trim(),choices,correctAnswer:q.correctAnswer.trim()};
}
const normalize=(text:string)=>text.normalize("NFD").replace(/\p{M}/gu,"").toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").trim();
export function validateTeachingNotes(value:unknown,question:TeachingQuestion) {
 try {
  if(!value||typeof value!=="object")throw Error();
  const notes=value as Record<string,unknown>;
  if(notes.needsReview===true)throw new TeachingNotesError("Revise a questão ou o gabarito: "+(typeof notes.reviewNote==="string"?notes.reviewNote.slice(0,500):"a IA identificou uma inconsistência."),422);
  if(notes.needsReview!==false||typeof notes.explanation!=="string"||notes.explanation.trim().length<20||notes.explanation.length>1500||typeof notes.hint!=="string"||notes.hint.trim().length<10||notes.hint.length>500)throw Error();
  const answer=normalize(question.correctAnswer),hint=normalize(notes.hint);
  if(answer&&` ${hint} `.includes(` ${answer} `))throw new TeachingNotesError("A dica gerada revelou a resposta. Seus campos foram mantidos; tente gerar novamente.",422);
  return {explanation:notes.explanation.trim(),hint:notes.hint.trim()};
 }catch(error){if(error instanceof TeachingNotesError)throw error;throw new TeachingNotesError("A IA não retornou campos válidos. Seus campos foram mantidos; tente novamente.",502);}
}
