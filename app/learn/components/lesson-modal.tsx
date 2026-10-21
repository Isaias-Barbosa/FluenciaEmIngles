"use client";
import {useEffect,useRef,useState} from "react";
import {supabase} from "@/lib/supabase/client";
import {lessonRunScore,type LessonRun,type StudyLesson} from "@/lib/learning/lesson-run";
import {LessonProgress,type PracticeStatus} from "./lesson-progress";
import {LessonAudioPlayer} from "./lesson-audio-player";
import {AiHelpButton} from "./ai-help-button";
export default function LessonModal({lesson,run,loading,error,saving,replacingAudio,audioSessionNotice,practiceStatus,selectedAnswer,onSelect,onSubmit,onStudyWithoutAudio,onRetry,onClose,onStartPromotionExam,canTakePromotionExam}:{
  lesson:StudyLesson;run:LessonRun|null;loading:boolean;error:string;saving:boolean;replacingAudio:boolean;audioSessionNotice:string;practiceStatus:PracticeStatus;selectedAnswer:string;onSelect:(answer:string)=>void;onSubmit:()=>void;onStudyWithoutAudio:()=>void;onRetry:()=>void;onClose:()=>void;onStartPromotionExam:()=>void;canTakePromotionExam:boolean;
}) {
  const panel=useRef<HTMLElement>(null),heading=useRef<HTMLHeadingElement>(null);
  const [plays,setPlays]=useState(0),[transcript,setTranscript]=useState(""),[transcriptBusy,setTranscriptBusy]=useState(false),[transcriptError,setTranscriptError]=useState(""),[words,setWords]=useState<string[]>([]);
  const actions=useRef({onClose,saving,replacingAudio});
  actions.current={onClose,saving,replacingAudio};
  const index=run?.answers.length??0;
  const question=lesson.questions.find(question=>question.id===run?.question_ids[index]);
  const score=run?lessonRunScore(run):null;
  const last=run?.answers.at(-1);
  useEffect(()=>{setPlays(0);setTranscript("");setTranscriptError("");setWords([]);heading.current?.focus();},[question?.id,run?.finished_at]);
  useEffect(()=>{
    const previous=document.activeElement as HTMLElement|null,overflow=document.body.style.overflow;
    document.body.style.overflow="hidden";panel.current?.focus();
    function key(event:KeyboardEvent){
      if(event.key==="Escape"&&!actions.current.saving&&!actions.current.replacingAudio)actions.current.onClose();
      if(event.key!=="Tab")return;
      const nodes=Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),[tabindex="0"]')??[]),first=nodes[0],last=nodes.at(-1);
      if(!first){event.preventDefault();return;}
      if(!panel.current?.contains(document.activeElement)||document.activeElement===panel.current||event.shiftKey&&document.activeElement===first){event.preventDefault();(event.shiftKey?last:first)?.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    }
    document.addEventListener("keydown",key);
    return()=>{document.removeEventListener("keydown",key);document.body.style.overflow=overflow;previous?.focus();};
  },[]);
  async function loadTranscript(){
    if(!supabase||!question)return;
    const id=question.id;setTranscriptBusy(true);setTranscriptError("");
    try{const {data,error}=await supabase.rpc("get_listening_transcript",{p_question_id:id});if(error||!data)throw Error();setTranscript(data);}
    catch{setTranscriptError("Não foi possível carregar o texto. Tente novamente.");}finally{setTranscriptBusy(false);}
  }
  function changeWords(next:string[]){setWords(next);onSelect(next.join(" "));}
  const disabled=saving||replacingAudio||transcriptBusy;
  return <div className="modal-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget&&!disabled)onClose();}}><section className={`lesson-modal ${question?.type==="word_order"?"word-order-modal":""}`} ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="lesson-title"><button className="modal-close" onClick={onClose} disabled={disabled} aria-label="Fechar lição">×</button><span className="eyebrow"><span className="live-dot"/>{lesson.category.toUpperCase()} · {lesson.duration} MIN</span><h2 id="lesson-title" ref={heading} tabIndex={-1}>{run?.finished_at?"Resultado da lição":lesson.title}</h2>
    {loading?<p role="status">Preparando sua tentativa…</p>:!run?<><p role="alert" className="form-message form-error">{error||"Não foi possível abrir esta lição."}</p><button className="button button-primary" onClick={onRetry}>Tentar novamente</button></>:run.finished_at&&score?<>
      <div className={`lesson-round-result ${run.passed?"lesson-round-passed":""}`}><span className="section-kicker">{run.passed?"LIÇÃO CONCLUÍDA":"VAMOS TENTAR DE NOVO"}</span><h3>{run.passed?"Muito bem! Você passou.":"Mais uma rodada para aprender."}</h3><div className="lesson-round-totals"><div><strong>{score.correct}</strong><span>Acertos</span></div><div><strong>{score.incorrect}</strong><span>Erros</span></div></div><p>Você acertou {score.correct} de {score.total} questões. O mínimo para concluir é {score.required} acertos na mesma tentativa.</p>{!run.passed&&<p>Refaça as {score.total} questões. A nova tentativa começa com o placar zerado.</p>}</div>
      <details className="lesson-round-review"><summary>Revisar minhas respostas</summary>{run.answers.map((answer,index)=><article key={answer.question_id}><strong>{index+1}. {lesson.questions.find(question=>question.id===answer.question_id)?.prompt}</strong><p className={answer.is_correct?"feedback-success":"feedback-error"}>{answer.is_correct?"✓ Acertou":"✕ Errou"} · Sua resposta: {answer.submitted_answer}</p>{!answer.is_correct&&<p>Resposta correta: {answer.correct_answer}</p>}{answer.explanation&&<p>{answer.explanation}</p>}</article>)}</details>
      <div className="lesson-round-actions">{run.passed?<button className="button button-primary" onClick={onClose}>Voltar ao conteúdo →</button>:<button className="button button-primary" onClick={onRetry}>Refazer as {score.total} questões ↻</button>}{run.passed&&canTakePromotionExam&&<button className="button button-dark" onClick={onStartPromotionExam}>Fazer prova de avanço →</button>}</div>
    </>:question?<>
      <p className="modal-description">{lesson.description}</p><LessonProgress questions={run.question_ids.map(id=>({id}))} questionIndex={index} status={practiceStatus}/>
      {last&&<p className={`answer-feedback ${last.is_correct?"feedback-success":"feedback-error"}`} role="status">{last.is_correct?"✓ Você acertou a questão anterior.":"✕ Você errou a questão anterior. Continue; a revisão estará no resultado final."}</p>}
      {error&&<p role="alert" className="form-message form-error">{error}</p>}{audioSessionNotice&&<p className="audio-session-notice" role="status">{audioSessionNotice}</p>}
      <form onSubmit={event=>{event.preventDefault();onSubmit();}}><div className="exercise-box practice-exercise"><span className="exercise-label">{question.type==="listening"?"OUÇA E ESCREVA":question.type==="word_order"?"ORGANIZE AS PALAVRAS":question.type==="fill_blank"?"COMPLETE A FRASE":"HORA DE PRATICAR"}</span>
      {(question.type==="listening"||question.audioUrl)&&<><LessonAudioPlayer key={question.id} questionId={question.id} fallbackUrl={question.audioUrl} disabled={disabled} onEnded={()=>setPlays(value=>value+1)}/><button className="study-without-audio" type="button" disabled={disabled} onClick={onStudyWithoutAudio}>{replacingAudio?"Selecionando questão…":"Não posso ouvir áudio agora"}</button></>}
      {question.type==="listening"&&plays>=5&&!transcript&&<button type="button" className="listening-transcript-button" onClick={()=>void loadTranscript()} disabled={transcriptBusy}>{transcriptBusy?"Carregando texto…":"Mudar para texto"}</button>}{transcriptError&&<p role="alert">{transcriptError}</p>}{transcript&&<p className="listening-transcript"><strong>Texto em inglês:</strong> {transcript}</p>}
      {question.passage&&<section className="reading-passage" aria-label="Texto para leitura"><span className="section-kicker">LEIA O TEXTO</span><p lang="en">{question.passage}</p></section>}<h3>{question.prompt}</h3>
      {question.sourceUrl&&<p className="replacement-source">{question.replacementOrigin==="reserve"?"Questão do banco de reservas":"Questão adaptada com IA"} · <a href={question.sourceUrl} target="_blank" rel="noopener noreferrer">Fonte: {question.sourceTitle||"material de referência"} ↗</a>{question.sourceLicense&&<> · {question.sourceLicense}</>}</p>}
      {question.type==="word_order"?<><div className="word-order-answer" aria-label="Resposta montada">{words.length?words.map((word,index)=><button key={`${word}-${index}`} type="button" disabled={disabled} onClick={()=>changeWords(words.filter((_,i)=>i!==index))}>{word}</button>):<span>As palavras escolhidas aparecem aqui</span>}</div><div className="word-bank">{question.options.map((word,index)=><button key={`${word}-${index}`} type="button" disabled={disabled||words.filter(value=>value===word).length>=question.options.filter(value=>value===word).length} onClick={()=>changeWords([...words,word])}>{word}</button>)}</div><small className="word-order-note">Clique em uma palavra da frase para removê-la.</small></>:<div className="answer-options">{question.type==="multiple_choice"?question.options.map((option,index)=><button key={option} type="button" className={`answer-option ${selectedAnswer===option?"answer-selected":""}`} disabled={disabled} onClick={()=>onSelect(option)}><span>{String.fromCharCode(65+index)}</span>{option}</button>):<input className="answer-text-input" value={selectedAnswer} onChange={event=>onSelect(event.target.value)} placeholder={question.type==="listening"?"Digite o que você ouviu":"Digite sua resposta"} aria-label="Sua resposta" disabled={disabled}/>}</div>}</div>
      <AiHelpButton/><button className="button button-primary modal-submit" type="submit" disabled={!selectedAnswer.trim()||disabled}>{saving?"Conferindo…":index===run.question_ids.length-1?"Conferir e ver resultado":"Conferir e avançar"} →</button></form><p className="modal-footer-note">Uma resposta por questão. Acertando ou errando, você segue para a próxima.</p>
    </>:<><p role="alert">O conteúdo desta tentativa mudou. Reabra a lição para continuar.</p><button className="button button-primary" onClick={onRetry}>Reabrir lição</button></>}
  </section></div>;
}
