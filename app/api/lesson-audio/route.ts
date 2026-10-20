import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import type { Database } from "@/lib/supabase/database.types";

export const runtime = "nodejs";
export const maxDuration = 60;
// Bounded instance cache and shared in-flight work prevent paying again on replay.
const cache = new Map<string, ArrayBuffer>();
const pending = new Map<string, Promise<ArrayBuffer>>();
const limits = new Map<string, { count: number; until: number }>();
const errorResponse = (error: string, status: number) => NextResponse.json({ error }, { status });

export async function POST(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return errorResponse("Áudio indisponível.", 503);
  const token = request.headers.get("authorization");
  if (!token?.startsWith("Bearer ")) return errorResponse("Entre na sua conta.", 401);
  const client = createClient<Database>(url, anonKey, {
    global: { headers: { Authorization: token } }, auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: auth, error: authError } = await client.auth.getUser(token.slice(7));
  if (authError || !auth.user) return errorResponse("Sessão inválida.", 401);
  let questionId: unknown;
  try { ({ questionId } = await request.json()); } catch { return errorResponse("Requisição inválida.", 400); }
  if (typeof questionId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(questionId)) {
    return errorResponse("Questão inválida.", 400);
  }
  if (!process.env.OPENAI_API_KEY) return errorResponse("Voz de IA indisponível. Use o áudio original.", 503);
  // Only published listening content can be spoken; never accept arbitrary client text.
  const { data: transcript, error } = await client.rpc("get_listening_transcript", { p_question_id: questionId });
  if (error || !transcript || transcript.length > 4096) return errorResponse("Áudio não encontrado.", 404);
  const key = createHash("sha256").update(transcript).digest("hex");
  const reply = (audio: ArrayBuffer) => new NextResponse(audio, {
    headers: { "Content-Type": "audio/mpeg", "Cache-Control": "private, no-store" },
  });
  const cached = cache.get(key);
  if (cached) return reply(cached);
  const now = Date.now();
  for (const [id, entry] of limits) if (entry.until <= now) limits.delete(id);
  const limit = limits.get(auth.user.id) ?? { count: 0, until: now + 60_000 };
  if (limit.count >= 10 || limits.size >= 2000 || pending.size >= 20) return errorResponse("Aguarde um momento e tente novamente.", 429);
  limits.set(auth.user.id, { ...limit, count: limit.count + 1 });
  try {
    let task = pending.get(key);
    if (!task) {
      task = (async () => {
        const response = await fetch("https://api.openai.com/v1/audio/speech", {
          method: "POST", signal: AbortSignal.timeout(45_000),
          headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: "gpt-4o-mini-tts", voice: "marin", input: transcript, response_format: "mp3",
            instructions: "Read the supplied English text exactly as written, in clear natural American English for a language learner. Do not add any words or explanations." }),
        });
        if (!response.ok) throw new Error("Speech provider unavailable");
        const audio = await response.arrayBuffer();
        if (audio.byteLength > 2_000_000) throw new Error("Audio too large");
        if (cache.size >= 50) cache.delete(cache.keys().next().value!);
        cache.set(key, audio);
        return audio;
      })();
      pending.set(key, task);
      void task.finally(() => pending.delete(key)).catch(() => {});
    }
    return reply(await task);
  } catch {
    return errorResponse("Voz de IA indisponível. Use o áudio original.", 502);
  }
}
