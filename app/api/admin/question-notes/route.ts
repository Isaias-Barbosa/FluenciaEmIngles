import {NextRequest,NextResponse} from "next/server";
import {adminServiceClient,adminAuthClient,hasConfiguredAdmins,isConfiguredAdmin} from "@/lib/supabase/admin-server";
import {parseTeachingQuestion,TeachingNotesError} from "@/lib/admin/teaching-notes";
import {generateTeachingNotes} from "@/lib/admin/free-teaching-router";
export const maxDuration=60;
export const runtime="nodejs";
const json=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{"Cache-Control":"no-store"}});
export async function POST(request:NextRequest){
 try{
  if(!adminAuthClient||!hasConfiguredAdmins)return json({error:"Administração não configurada."},503);
  const token=request.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];
  if(!token)return json({error:"Entre na sua conta para continuar."},401);
  const {data,error}=await adminAuthClient.auth.getUser(token);
  if(error||!data.user)return json({error:"Sessão inválida."},401);
  if(!isConfiguredAdmin(data.user.email))return json({error:"Acesso restrito à administração."},403);
  if(Number(request.headers.get("content-length"))>5000)return json({error:"Solicitação muito grande."},413);
  const raw=await request.text();if(raw.length>5000)return json({error:"Solicitação muito grande."},413);
  let body;try{body=JSON.parse(raw);}catch{return json({error:"JSON inválido."},400);}
  const question=parseTeachingQuestion(body?.question);
  return json({notes:await generateTeachingNotes(question,adminServiceClient)});
 }catch(error){return json({error:error instanceof TeachingNotesError?error.message:"Não foi possível gerar os campos. Tente novamente."},error instanceof TeachingNotesError?error.status:503);}
}
