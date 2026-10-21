"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import {supabase} from "@/lib/supabase/client";

type Help={state:"ready"|"busy"|"cooldown"|"cached";hint?:string;provider?:string;nextAvailableAt?:string|null;serverNow?:string;retryAfter?:number;error?:string};
export function AiHelpButton({runId,questionId,disabled=false}:{runId:string;questionId:string;disabled?:boolean}) {
 const [help,setHelp]=useState<Help|null>(null),[loading,setLoading]=useState(true),[generating,setGenerating]=useState(false),[error,setError]=useState("");
 const [until,setUntil]=useState(0),[now,setNow]=useState(Date.now());
 const mounted=useRef(true),pending=useRef(false),sequence=useRef(0);
 const apply=useCallback((data:Help)=>{
  setHelp(data);
  // Translate server time to a local duration; changing the computer clock cannot bypass the server limit.
  const wait=data.state==="busy"?(data.retryAfter??90)*1000:data.nextAvailableAt?Math.max(0,Date.parse(data.nextAvailableAt)-Date.parse(data.serverNow??"")):0;
  setUntil(Date.now()+(Number.isFinite(wait)?wait:0));setNow(Date.now());
 },[]);
 const request=useCallback(async(method:"GET"|"POST")=>{
  if(!supabase)throw new Error("Entre na sua conta para pedir uma dica.");
  const {data}=await supabase.auth.getSession();
  if(!data.session)throw new Error("Sua sessão expirou. Entre novamente.");
  const query=new URLSearchParams({runId,questionId});
  const response=await fetch(`/api/question-help${method==="GET"?`?${query}`:""}`,{method,headers:{Authorization:`Bearer ${data.session.access_token}`,...(method==="POST"?{"Content-Type":"application/json"}:{})},...(method==="POST"?{body:JSON.stringify({runId,questionId})}:{}),cache:"no-store"});
  const body=await response.json() as Help;
  if(!response.ok&&response.status!==429)throw new Error(body.error||"Não foi possível carregar a ajuda da IA.");
  return body;
 },[runId,questionId]);
 const refresh=useCallback(async()=>{
  if(pending.current)return;
  const turn=++sequence.current;
  try{const data=await request("GET");if(mounted.current&&turn===sequence.current){apply(data);setError("");}}
  catch(cause){if(mounted.current&&turn===sequence.current)setError(cause instanceof Error?cause.message:"A ajuda está indisponível.");}
  finally{if(mounted.current&&turn===sequence.current)setLoading(false);}
 },[request,apply]);
 useEffect(()=>{
  mounted.current=true;void refresh();
  const visible=()=>{if(document.visibilityState==="visible")void refresh();};
  window.addEventListener("focus",visible);document.addEventListener("visibilitychange",visible);
  return()=>{mounted.current=false;sequence.current++;window.removeEventListener("focus",visible);document.removeEventListener("visibilitychange",visible);};
 },[refresh]);
 useEffect(()=>{if(until<=Date.now())return;const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[until]);
 useEffect(()=>{if(help?.state!=="busy")return;const timer=setInterval(()=>void refresh(),10000);return()=>clearInterval(timer);},[help?.state,refresh]);
 async function generate(){
  if(pending.current||disabled)return;
  pending.current=true;sequence.current++;setGenerating(true);setError("");
  try{const data=await request("POST");if(mounted.current){apply(data);if(data.error)setError(data.error);}}
  catch(cause){if(mounted.current)setError(cause instanceof Error?cause.message:"Não foi possível gerar uma dica.");}
  finally{pending.current=false;if(mounted.current)setGenerating(false);}
 }
 const remaining=Math.max(0,Math.ceil((until-now)/1000)),clock=`${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,"0")}`;
 const hasHint=Boolean(help?.hint),busy=help?.state==="busy";
 return <div className="ai-help-panel" aria-busy={generating}>
  <button className="button ai-help-button" type="button" disabled={disabled||loading||generating||hasHint||remaining>0||busy} onClick={()=>void generate()} aria-describedby={`ai-help-note-${questionId}`}>
   <span aria-hidden="true">✦</span> {generating?"Preparando sua dica…":hasHint?"Dica recebida":"Pedir à IA"}
   <span className="ai-help-badge">{loading?"Consultando…":remaining>0?`Nova ajuda em ${clock}`:"1 ajuda a cada 40 min"}</span>
  </button>
  <p id={`ai-help-note-${questionId}`} className="ai-help-note">{generating?"Você pode continuar respondendo enquanto a dica é preparada.":busy?"Uma dica está sendo preparada para sua conta. Aguarde.":"Uma dica para orientar seu raciocínio. O limite vale para todas as suas questões."}</p>
  {error&&<p role="alert" className="form-message form-error">{error}</p>}
  {help?.hint&&<aside className="ai-help-result" role="status" aria-label="Dica da IA"><strong>✦ Uma pista para você</strong><p>{help.hint}</p><small>Gerada por IA · Confira o raciocínio antes de responder.</small></aside>}
 </div>;
}
