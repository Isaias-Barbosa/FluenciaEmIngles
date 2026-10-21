"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
export type CardRating = "remembered" | "review";
export function useFlashcardProgress(userId: string, cardIds: string[]) {
  const scope = `${userId}:${cardIds.join(",")}`;
  const generation = useRef(0);
  const busy = useRef(false);
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{scope:string; ratings:Record<string,CardRating>; ready:boolean; error:string; saving:boolean}>({scope:"",ratings:{},ready:false,error:"",saving:false});
  useEffect(() => {
    const ticket = ++generation.current;
    busy.current = false;
    setState({scope,ratings:{},ready:false,error:"",saving:false});
    async function load() {
      try {
        if (!supabase) throw Error();
        const { data, error } = await supabase.from("flashcard_progress").select("card_id,rating").eq("user_id", userId).in("card_id", cardIds);
        if (error) throw error;
        if (generation.current !== ticket) return;
        setState({scope,ratings:Object.fromEntries((data ?? []).map(row => [row.card_id,row.rating])),ready:true,error:"",saving:false});
      } catch {
        if (generation.current === ticket) setState({scope,ratings:{},ready:false,error:"Não foi possível carregar seu progresso. Tente novamente.",saving:false});
      }
    }
    void load();
    return () => { generation.current++; };
  // cardIds are represented by the stable scope string.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, revision]);
  async function rate(cardId: string, rating: CardRating) {
    if (!supabase || busy.current || state.scope !== scope || !state.ready || !cardIds.includes(cardId)) return false;
    busy.current = true;
    const ticket = generation.current;
    setState(current => ({...current,saving:true,error:""}));
    try {
      const {error} = await supabase.from("flashcard_progress").upsert({user_id:userId,card_id:cardId,rating},{onConflict:"user_id,card_id"});
      if (error) throw error;
      if (generation.current !== ticket) return false;
      setState(current => ({...current,ratings:{...current.ratings,[cardId]:rating},saving:false}));
      return true;
    } catch {
      if (generation.current === ticket) setState(current => ({...current,saving:false,error:"Não foi possível salvar a marcação. Tente novamente."}));
      return false;
    } finally { if (generation.current === ticket) busy.current = false; }
  }
  const current = state.scope === scope;
  return {ratings:current ? state.ratings : {}, ready:current && state.ready,saving:current && state.saving,error:current ? state.error : "",rate,retry:()=>setRevision(value=>value+1)};
}
