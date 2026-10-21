import {NextRequest,NextResponse} from "next/server";
import {adminAuthClient,adminServiceClient} from "@/lib/supabase/admin-server";
import {configuredFreeProviders} from "@/lib/admin/free-teaching-providers";
import {generateTeachingNotes} from "@/lib/admin/free-teaching-router";
import {validateTeachingNotes,type TeachingQuestion} from "@/lib/admin/teaching-notes";

export const runtime="nodejs";
export const maxDuration=60;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const json=(body:unknown,status=200,retry?:number)=>NextResponse.json(body,{status,headers:{"Cache-Control":"no-store",...(retry?{"Retry-After":String(retry)}:{})}});
type HelpState={state:"ready"|"busy"|"cooldown"|"cached"|"claimed";hint?:string;provider?:string;next_available_at?:string|null;server_now?:string;retry_after?:number;lease_id?:string;question?:TeachingQuestion;accepted_answers?:string[]};
// Explicit projection: never return the database's private answer/lease context.
function publicState(data:HelpState){return {state:data.state,hint:data.hint,provider:data.provider,nextAvailableAt:data.next_available_at??null,serverNow:data.server_now,retryAfter:data.retry_after};}
async function handle(request:NextRequest,claim:boolean){
 try{
  const token=request.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];
  if(!token)return json({error:"Entre na sua conta para pedir uma dica."},401);
  if(!adminAuthClient||!adminServiceClient)return json({error:"A ajuda da IA ainda não está configurada."},503);
  const {data:auth,error:authError}=await adminAuthClient.auth.getUser(token);
  if(authError||!auth.user)return json({error:"Sua sessão expirou. Entre novamente."},401);
  let input:Record<string,unknown>;
  if(claim){
   if(Number(request.headers.get("content-length"))>1000)return json({error:"Pedido inválido."},400);
   const text=await request.text();if(text.length>1000)return json({error:"Pedido inválido."},400);
   try{input=JSON.parse(text);}catch{return json({error:"Pedido inválido."},400);}
  }else input=Object.fromEntries(new URL(request.url).searchParams);
  if(!input||typeof input.runId!=="string"||!uuid.test(input.runId)||typeof input.questionId!=="string"||!uuid.test(input.questionId))return json({error:"Questão inválida."},400);
  if(!configuredFreeProviders().length)return json({error:"A ajuda da IA ainda não está configurada. Continue o exercício e tente mais tarde."},503);
  const prepared=await adminServiceClient.rpc("prepare_student_question_help",{p_user_id:auth.user.id,p_run_id:input.runId,p_question_id:input.questionId,p_claim:claim});
  if(prepared.error)return json({error:prepared.error.code==="22023"?"A ajuda está disponível apenas na questão atual de uma lição em andamento.":"Não foi possível consultar sua ajuda da IA. Tente novamente mais tarde."},prepared.error.code==="22023"?409:503);
  const data=prepared.data as HelpState|null;
  if(!data)return json({error:"A ajuda da IA está temporariamente indisponível."},503);
  if(data.state!=="claimed")return json({...publicState(data),...(claim&&data.state!=="cached"?{error:data.state==="busy"?"Já existe uma dica sendo preparada para sua conta. Aguarde.":"Você pode pedir uma nova dica a cada 40 minutos."}:{})},claim&&(data.state==="busy"||data.state==="cooldown")?429:200,data.retry_after);
  if(!claim||!data.lease_id||!data.question)return json({error:"A ajuda da IA está temporariamente indisponível."},503);
  let hint:string|undefined,provider:string|undefined;
  try{
   const notes=await generateTeachingNotes(data.question,adminServiceClient);
   // Check every accepted variant, not only the primary answer. Only the hint is exposed.
   for(const answer of data.accepted_answers??[])validateTeachingNotes({...notes,needsReview:false},{...data.question,correctAnswer:answer});
   hint=notes.hint;provider=notes.provider;
  }catch{/* Student responses must never expose a model's review note or answer key. */}
  const finished=await adminServiceClient.rpc("finish_student_question_help",{p_user_id:auth.user.id,p_lease_id:data.lease_id,p_hint:hint??null,p_provider:provider??null});
  if(finished.error||!finished.data)return json({error:"Não foi possível confirmar a dica. Aguarde um instante e tente novamente."},503);
  if(!hint)return json({error:"Não foi possível gerar uma dica agora. Seu uso de 40 minutos não foi consumido; tente novamente mais tarde."},503);
  const timing=finished.data as {next_available_at:string;server_now:string};
  return json({state:"cached",hint,provider,nextAvailableAt:timing.next_available_at,serverNow:timing.server_now});
 }catch{return json({error:"A ajuda da IA está temporariamente indisponível. Tente novamente mais tarde."},503);}
}
export async function GET(request:NextRequest){return handle(request,false);}
export async function POST(request:NextRequest){return handle(request,true);}
