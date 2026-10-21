import {createHash} from "node:crypto";
import {generateTeachingNotes} from "./free-teaching-router";
import {TeachingNotesError,validateTeachingNotes,type TeachingQuestion} from "./teaching-notes";
import type {SupabaseClient} from "@supabase/supabase-js";
import type {Database} from "@/lib/supabase/database.types";

// Bump when changing the teaching prompt, response contract or validation rules.
const CACHE_VERSION="teaching-notes-v1";
export function teachingNotesCacheKey(question:TeachingQuestion){
 return createHash("sha256").update(JSON.stringify({version:CACHE_VERSION,level:question.level,prompt:question.prompt,choices:question.choices,correctAnswer:question.correctAnswer})).digest("hex");
}
export function teachingNotesCacheTtl(value=process.env.TEACHING_NOTES_CACHE_TTL_SECONDS){
 const ttl=Number(value);return Number.isInteger(ttl)&&ttl>=60&&ttl<=604800?ttl:86400;
}
const unavailable=()=>new TeachingNotesError("Não foi possível consultar ou salvar o cache do gerador. Confira a migração e tente novamente. Seus campos foram mantidos.",503);
type CacheClaim={state:"hit"|"busy"|"claimed";explanation?:string;hint?:string;provider?:string;generated_at?:string;expires_at?:string;lease_id?:string;retry_after?:number};
export async function generateCachedTeachingNotes(question:TeachingQuestion,client:SupabaseClient<Database>|null){
 if(!client)throw unavailable();
 const key=teachingNotesCacheKey(question),ttl=teachingNotesCacheTtl();
 const claimed=await client.rpc("claim_teaching_notes_cache",{p_cache_key:key,p_ttl_seconds:ttl});
 if(claimed.error||!claimed.data)throw unavailable();
 const claim=claimed.data as CacheClaim;
 if(claim.state==="hit"){
  const validated=validateTeachingNotes({...claim,needsReview:false},question);
  return {...validated,provider:claim.provider,cached:true,generatedAt:claim.generated_at,expiresAt:claim.expires_at};
 }
 if(claim.state==="busy")throw new TeachingNotesError("Esta mesma questão já está sendo gerada. Aguarde alguns instantes e clique novamente para reutilizar o resultado. Seus campos foram mantidos.",409);
 if(claim.state!=="claimed"||!claim.lease_id)throw unavailable();
 let notes:Awaited<ReturnType<typeof generateTeachingNotes>>;
 try{notes=await generateTeachingNotes(question,client);validateTeachingNotes({...notes,needsReview:false},question);}
 catch(error){
  const released=await client.rpc("finish_teaching_notes_cache",{p_cache_key:key,p_lease_id:claim.lease_id,p_explanation:null,p_hint:null,p_provider:null,p_ttl_seconds:ttl});
  if(released.error||!released.data)throw unavailable();
  throw error;
 }
 const saved=await client.rpc("finish_teaching_notes_cache",{p_cache_key:key,p_lease_id:claim.lease_id,p_explanation:notes.explanation,p_hint:notes.hint,p_provider:notes.provider,p_ttl_seconds:ttl});
 if(saved.error||!saved.data)throw unavailable();
 const timing=saved.data as {generated_at:string;expires_at:string};
 return {...notes,cached:false,generatedAt:timing.generated_at,expiresAt:timing.expires_at};
}
