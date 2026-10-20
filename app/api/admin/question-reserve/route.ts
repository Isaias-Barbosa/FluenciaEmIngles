import { NextRequest, NextResponse } from "next/server";
import { adminAuthClient, adminServiceClient, hasConfiguredAdmins, isConfiguredAdmin } from "@/lib/supabase/admin-server";
import { parseReserveInput, assertReserveApproval, reserveAttribution, reserveStatusLabels, type ReserveStatus } from "@/lib/learning/reserve";
export const runtime = "nodejs";
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
async function authorize(request: NextRequest) {
  if (!adminAuthClient || !adminServiceClient || !hasConfiguredAdmins) return { response: json({ error: "Administração não configurada." }, 503) };
  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) return { response: json({ error: "Entre na sua conta para continuar." }, 401) };
  const { data, error } = await adminAuthClient.auth.getUser(token);
  if (error || !data.user) return { response: json({ error: "Sessão inválida." }, 401) };
  if (!isConfiguredAdmin(data.user.email)) return { response: json({ error: "Acesso restrito à administração." }, 403) };
  return { client: adminServiceClient, userId: data.user.id };
}
async function readLevels(client: NonNullable<typeof adminServiceClient>) {
  const { data: language, error } = await client.from("languages").select("id").eq("code", "en").single();
  if (error || !language) throw new Error("Idioma inglês não encontrado.");
  const { data, error: levelsError } = await client.from("language_levels").select("id, code, title").eq("language_id", language.id).order("sort_order");
  if (levelsError) throw new Error("Não foi possível carregar os níveis.");
  return data ?? [];
}
export async function GET(request: NextRequest) {
  const auth = await authorize(request); if (auth.response) return auth.response;
  try {
    const params = new URL(request.url).searchParams;
    const level = params.get("level") || ""; const status = params.get("status") || "";
    const page = Number(params.get("page") || 0); const pageSize = 20;
    if (!Number.isSafeInteger(page) || page < 0 || page > 100000 || (status && !Object.hasOwn(reserveStatusLabels, status))) return json({ error: "Filtro inválido." }, 400);
    const levels = await readLevels(auth.client);
    if (level && !levels.some((item) => item.code === level)) return json({ error: "Nível inválido." }, 400);
    const counts = await auth.client.rpc("get_question_reserve_counts");
    let query = auth.client.from("question_reserve").select("*", { count: "exact" }).order("created_at", { ascending: false }).order("id");
    if (level) query = query.eq("level_id", levels.find((item) => item.code === level)!.id);
    if (status) query = query.eq("status", status as ReserveStatus);
    const result = await query.range(page * pageSize, page * pageSize + pageSize - 1);
    if (counts.error || result.error) return json({ error: "Banco de reservas indisponível. Confira se a migration 20261020180000_question_reserve.sql foi aplicada." }, 503);
    return json({ questions: result.data, total: result.count ?? 0, counts: counts.data, levels, page, pageSize });
  } catch { return json({ error: "Não foi possível carregar o banco de reservas." }, 503); }
}
export async function POST(request: NextRequest) {
  const auth = await authorize(request); if (auth.response) return auth.response;
  try {
    if (Number(request.headers.get("content-length")) > 16000) return json({ error: "Solicitação muito grande." }, 413);
    const raw = await request.text(); if (raw.length > 16000) return json({ error: "Solicitação muito grande." }, 413);
    let body;
    try { body = JSON.parse(raw); } catch { return json({ error: "JSON inválido." }, 400); }
    if (!body || body.action !== "save") return json({ error: "Ação inválida." }, 400);
    const id = body.id;
    if (id !== undefined && (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id))) return json({ error: "Questão inválida." }, 400);
    const status = id ? body.status : "pending";
    if (typeof status !== "string" || !Object.hasOwn(reserveStatusLabels, status)) return json({ error: "Estado inválido." }, 400);
    let input;
    try { input = parseReserveInput(body.question); if (status === "available") assertReserveApproval(input); }
    catch (error) { return json({ error: error instanceof Error ? error.message : "Revise a questão." }, 400); }
    const levels = await readLevels(auth.client);
    const level = levels.find((item) => item.code === input.level);
    if (input.level && !level) return json({ error: "Nível não cadastrado." }, 400);
    const fields = { level_id: level?.id ?? null, prompt: input.prompt, choices: input.choices,
      correct_answer: input.correctAnswer, ...(id && body.preserveTeachingNotes && status === "pending" ? {} : { explanation: input.explanation, hint: input.hint }),
      status: status as ReserveStatus, updated_by: auth.userId, updated_at: new Date().toISOString() };
    if (id && (typeof body.updatedAt !== "string" || !body.updatedAt)) return json({ error: "Reabra a questão para atualizar." }, 409);
    const result = id
      ? await auth.client.from("question_reserve").update(fields).eq("id", id).eq("updated_at", body.updatedAt).select("*").maybeSingle()
      : await auth.client.from("question_reserve").insert({ explanation: input.explanation, hint: input.hint, ...fields, source: input.source, category: input.category,
          ...reserveAttribution(input.source), created_by: auth.userId }).select("*").single();
    if (result.error) return json({ error: result.error.code === "23505" ? "Essa questão já está no banco de reservas. Revise o registro existente."
      : "Não foi possível salvar. Confira a migration do banco de reservas e os campos da questão." }, result.error.code === "23505" ? 409 : 503);
    if (!result.data) return json({ error: "A questão foi alterada em outra sessão. Atualize a lista e abra novamente." }, 409);
    return json({ question: result.data, message: id ? "Questão atualizada." : "Questão salva na reserva, aguardando revisão." }, id ? 200 : 201);
  } catch { return json({ error: "Não foi possível salvar a questão na reserva." }, 503); }
}
