"use client";
import {useEffect,useRef,useState} from "react";
import {supabase} from "@/lib/supabase/client";
import type {LessonRun} from "@/lib/learning/lesson-run";
export function useLessonRun(userId:string|null) {
  const revision=useRef(0),pending=useRef(false),identity=useRef(userId);
  identity.current=userId;
  const [run,setRun]=useState<LessonRun|null>(null),[loading,setLoading]=useState(false),[error,setError]=useState("");
  useEffect(()=>{revision.current++;pending.current=false;setRun(null);setLoading(false);setError("");return ()=>{revision.current++;};},[userId]);
  function cancel(){revision.current++;pending.current=false;setRun(null);setLoading(false);setError("");}
  async function start(lessonId:string) {
    const ticket=++revision.current,owner=userId;
    pending.current=false;setRun(null);setLoading(true);setError("");
    try {
      if(!supabase||!owner)throw Error();
      const {data,error}=await supabase.rpc("start_lesson_run",{p_lesson_id:lessonId});
      if(error)throw error;
      if(ticket!==revision.current||identity.current!==owner)return null;
      const next=data as unknown as LessonRun;
      if(!next?.id||next.user_id!==owner||next.lesson_id!==lessonId)throw Error();
      setRun(next);return next;
    }catch{if(ticket===revision.current)setError("Não foi possível preparar sua tentativa. Tente novamente.");return null;}
    finally{if(ticket===revision.current)setLoading(false);}
  }
  async function answer(questionId:string,text:string) {
    if(!supabase||!run||run.user_id!==userId||pending.current||run.finished_at||!text.trim())return null;
    const ticket=revision.current,owner=userId;
    pending.current=true;setError("");
    try{
      const {data,error}=await supabase.rpc("submit_lesson_run_answer",{p_run_id:run.id,p_question_id:questionId,p_submitted_answer:text.trim()});
      if(error)throw error;
      if(ticket!==revision.current||identity.current!==owner)return null;
      const next=data as unknown as LessonRun;
      if(next?.id!==run.id||next.user_id!==owner)throw Error();
      setRun(next);return next;
    }catch{if(ticket===revision.current)setError("Não foi possível salvar sua resposta. Tente novamente; a questão não foi pulada.");return null;}
    finally{if(ticket===revision.current)pending.current=false;}
  }
  return {run:run?.user_id===userId?run:null,loading,error,start,answer,cancel};
}
