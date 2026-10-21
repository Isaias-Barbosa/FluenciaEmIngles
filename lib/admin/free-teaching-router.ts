import {configuredFreeProviders,ProviderFailure,requestTeachingNotes} from "./free-teaching-providers";
import {TeachingNotesError,validateTeachingNotes,type TeachingQuestion} from "./teaching-notes";
import type {SupabaseClient} from "@supabase/supabase-js";
import type {Database} from "@/lib/supabase/database.types";

const unavailable=()=>new TeachingNotesError("Não foi possível consultar as cotas. Confira a configuração e a migração do gerador no servidor. Seus campos foram mantidos.",503);
function limit(value:string|undefined,fallback:number,max:number){const parsed=Number(value);return Number.isInteger(parsed)&&parsed>0&&parsed<=max?parsed:fallback;}
export async function generateTeachingNotes(question:TeachingQuestion,client:SupabaseClient<Database>|null){
 const providers=configuredFreeProviders();
 if(!providers.length)throw new TeachingNotesError("Configure pelo menos um provedor gratuito no servidor para habilitar Gerar campos.",503);
 if(!client)throw unavailable();
 const excluded:string[]=[],deadline=Date.now()+40000;
 let limited=false,failed=false;
 for(let attempt=0;attempt<providers.length&&Date.now()<deadline-500;attempt++){
  const claim=await client.rpc("claim_teaching_provider",{p_enabled:providers.map(provider=>provider.id),p_exclude:excluded,p_daily_limit:limit(process.env.TEACHING_PROVIDER_DAILY_LIMIT,100,10000),p_minute_limit:limit(process.env.TEACHING_PROVIDER_MINUTE_LIMIT,2,60)});
  if(claim.error)throw unavailable();
  if(!claim.data)break;
  const lease=claim.data as {provider:string;lease_id:string};
  const provider=providers.find(item=>item.id===lease.provider);
  if(!provider||typeof lease.lease_id!=="string")throw unavailable();
  excluded.push(provider.id);
  let cooldown=0,notes:ReturnType<typeof validateTeachingNotes>|undefined,stop:TeachingNotesError|undefined;
  try{
   const output=await requestTeachingNotes(provider,question,AbortSignal.timeout(Math.min(9500,deadline-Date.now())));
   notes=validateTeachingNotes(output,question);
  }catch(error){
   if(error instanceof TeachingNotesError&&error.status===422)stop=error;
   else{cooldown=error instanceof ProviderFailure?error.cooldownSeconds:60;limited ||=error instanceof ProviderFailure&&error.limited;failed=true;}
  }
  const finished=await client.rpc("finish_teaching_provider",{p_provider:provider.id,p_lease_id:lease.lease_id,p_cooldown_seconds:cooldown});
  if(finished.error||finished.data!==true)throw unavailable();
  if(stop)throw stop;
  if(notes)return {...notes,provider:provider.label};
 }
 if(limited||!failed)throw new TeachingNotesError("As cotas gratuitas configuradas estão em pausa ou em uso. Aguarde e tente novamente. Seus campos foram mantidos.",429);
 throw new TeachingNotesError("Os provedores gratuitos estão temporariamente indisponíveis. Seus campos foram mantidos; tente novamente em instantes.",503);
}
