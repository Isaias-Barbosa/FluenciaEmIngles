"use client";
import { useEffect,useState } from "react";
import type {FeedbackPage} from "@/lib/learning/student-feedback";
export default function Feedbacks({active,request}:{active:boolean;request:(page:number)=>Promise<unknown>}) {
  const [page,setPage] = useState(0);
  const [revision,setRevision] = useState(0);
  const [data,setData] = useState<FeedbackPage|null>(null);
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState("");
  useEffect(()=>{
    if (!active) return;
    let cancelled = false;
    setLoading(true);setError("");setData(null);
    request(page).then(result=>{if(!cancelled)setData(result as FeedbackPage);}).catch(error=>{if(!cancelled)setError(error instanceof Error?error.message:"Não foi possível carregar os feedbacks.");}).finally(()=>{if(!cancelled)setLoading(false);});
    return ()=>{cancelled=true;};
  },[active,page,revision,request]);
  return <section className="admin-panel feedback-admin"><div className="feedback-admin-heading"><div><span className="section-kicker">OUVINDO OS ESTUDANTES</span><h2>Feedbacks recebidos</h2><p>Sugestões e problemas enviados pelo Meu Perfil.</p></div><button className="button button-dark" disabled={loading} onClick={()=>setRevision(value=>value+1)}>Atualizar ↻</button></div>{loading && <p role="status">Carregando feedbacks…</p>}{error && <p role="alert" className="form-message form-error">{error}</p>}{data && <><p>{data.total} {data.total===1?"feedback recebido":"feedbacks recebidos"}</p><div className="feedback-table-scroll"><table className="feedback-table"><thead><tr><th scope="col">Estudante</th><th scope="col">Feedback</th><th scope="col">Enviado em</th></tr></thead><tbody>{data.feedbacks.map(item=><tr key={item.id}><td><strong>{item.user_name}</strong><small>{item.user_email ?? "E-mail indisponível"}</small></td><td className="feedback-message">{item.message}</td><td><time dateTime={item.created_at}>{new Date(item.created_at).toLocaleString("pt-BR")}</time></td></tr>)}</tbody></table></div>{!data.feedbacks.length && <p className="admin-empty">{data.total?"Não há feedbacks nesta página.":"Nenhum feedback recebido ainda."}</p>}</>}<div className="feedback-pagination"><button className="button button-dark" disabled={loading || page===0} onClick={()=>setPage(value=>value-1)}>← Anterior</button><span>Página {page+1}{data?` de ${Math.max(1,Math.ceil(data.total/data.pageSize))}`:""}</span><button className="button button-dark" disabled={loading || !data || (page+1)*data.pageSize>=data.total} onClick={()=>setPage(value=>value+1)}>Próxima →</button></div></section>;
}
