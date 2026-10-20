import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import type { Database } from "@/lib/supabase/database.types";

export const runtime = "nodejs";
const failure = (error: string, status: number) => NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const token = request.headers.get("authorization");
  if (!token?.startsWith("Bearer ")) return failure("Entre na sua conta para substituir a questão.", 401);
  if (!url || !anon) return failure("O serviço de exercícios não está configurado.", 503);
  const client = createClient<Database>(url, anon, { global: { headers: { Authorization: token } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data: auth, error: authError } = await client.auth.getUser(token.slice(7));
  if (authError || !auth.user) return failure("Sua sessão expirou. Entre novamente.", 401);
  let questionId: unknown;
  try { ({ questionId } = await request.json()); } catch { return failure("Pedido inválido.", 400); }
  if (typeof questionId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(questionId)) return failure("Questão inválida.", 400);
  // The database derives the learner/level, chooses an approved unseen item and
  // saves a snapshot atomically. No OpenAI, external question API or paid fallback.
  const { data, error } = await client.rpc("assign_reserve_question", { p_question_id: questionId });
  if (error) return failure(error.code === "P0002"
    ? "Ainda não há outra questão de texto aprovada disponível para você neste nível. Tente novamente mais tarde."
    : error.code === "22023" ? "Esta questão precisa estar pendente, publicada e pertencer ao seu nível atual."
    : "O banco de reservas está temporariamente indisponível. Tente novamente mais tarde.", ["P0002", "22023"].includes(error.code) ? 409 : 503);
  if (!data?.[0]) return failure("Não foi possível carregar a questão de texto. Tente novamente.", 503);
  return NextResponse.json({ replacement: data[0] }, { headers: { "Cache-Control": "no-store" } });
}
