import { createHash } from "node:crypto";
import { reserveAttribution } from "@/lib/learning/reserve";
import { NextRequest, NextResponse } from "next/server";
import { adminAuthClient, adminServiceClient, hasConfiguredAdmins, isConfiguredAdmin } from "@/lib/supabase/admin-server";
import { analyzeCefr } from "@/lib/cefr/analyze";
import { importTrivia, ReviewError } from "@/lib/cefr/trivia";

export const runtime = "nodejs";
const json = (body: unknown, status = 200, retryAfter = 0) => NextResponse.json(body, {
  status, headers: { "Cache-Control": "no-store", ...(retryAfter ? { "Retry-After": String(retryAfter) } : {}) },
});
export async function POST(request: NextRequest) {
  if (!adminAuthClient || !hasConfiguredAdmins) return json({ error: "Administração não configurada." }, 503);
  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) return json({ error: "Entre na sua conta para continuar." }, 401);
  const { data, error } = await adminAuthClient.auth.getUser(token);
  if (error || !data.user) return json({ error: "Sessão inválida. Entre novamente." }, 401);
  if (!isConfiguredAdmin(data.user.email)) return json({ error: "Acesso restrito à administração." }, 403);
  try {
    if (Number(request.headers.get("content-length")) > 20000) throw new ReviewError("Texto muito grande.", 413);
    const raw = await request.text();
    if (raw.length > 20000) throw new ReviewError("Texto muito grande.", 413);
    let body;
    try { body = JSON.parse(raw); } catch { throw new ReviewError("Envie um JSON válido."); }
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new ReviewError("Solicitação inválida.");
    if (body.action === "import") {
      if (!["opentdb", "trivia"].includes(body.provider) || ![1, 5].includes(body.amount)) throw new ReviewError("Escolha uma fonte e busque 1 ou 5 questões.");
      if (body.saveToReserve && !adminServiceClient) return json({ error: "Configure o serviço administrativo para salvar as importações." }, 503);
      const questions = await importTrivia(body.provider, body.amount);
      if (!body.saveToReserve) return json({ questions });
      const client = adminServiceClient!;
      const { data: language } = await client.from("languages").select("id").eq("code", "en").single();
      if (!language) return json({ error: "Idioma inglês não cadastrado." }, 503);
      const { data: levels, error: levelError } = await client.from("language_levels").select("id, code").eq("language_id", language.id);
      if (levelError) return json({ error: "Não foi possível carregar os níveis." }, 503);
      if (questions.some((q) => q.prompt.length > 1200)) return json({ error: "A fonte retornou um enunciado muito extenso para a reserva. Busque outra questão." }, 502);
      const rows = questions.map((q) => {
        const suggestion = analyzeCefr(q.prompt, q.choices).level;
        return { level_id: levels?.find((level) => level.code === suggestion)?.id ?? null,
          prompt: q.prompt, choices: q.choices, correct_answer: q.correctAnswer,
          explanation: "", hint: "", source: q.source, ...reserveAttribution(q.source),
          category: q.category, status: "pending" as const, created_by: data.user.id, updated_by: data.user.id };
      });
      // Reimporting never overwrites an editor's work or approval.
      const staged = await client.from("question_reserve").upsert(rows, { onConflict: "content_key", ignoreDuplicates: true });
      if (staged.error) return json({ error: "Não foi possível salvar a importação. Confira se a migration 20261020180000_question_reserve.sql foi aplicada." }, 503);
      const key = (prompt: string) => createHash("md5").update(prompt.trim().toLowerCase().replace(/\s+/g, " ")).digest("hex");
      const stored = await client.from("question_reserve").select("id, updated_at, content_key").in("content_key", questions.map((q) => key(q.prompt)));
      if (stored.error) return json({ error: "As questões foram salvas, mas a fila não carregou. Consulte o Banco de reservas." }, 503);
      return json({ questions: questions.map((q) => { const row = stored.data?.find((item) => item.content_key === key(q.prompt)); return { ...q, reserveId: row?.id, reserveUpdatedAt: row?.updated_at }; }) });
    }
    if (body.action !== "analyze") throw new ReviewError("Ação inválida.");
    if (typeof body.prompt !== "string" || !body.prompt.trim() || body.prompt.length > 1500) throw new ReviewError("Informe uma questão com até 1.500 caracteres.");
    if (!Array.isArray(body.choices) || body.choices.length > 6 || body.choices.some((choice: unknown) => typeof choice !== "string" || !choice.trim() || choice.length > 250)) throw new ReviewError("Use até 6 alternativas de até 250 caracteres.");
    return json({ analysis: analyzeCefr(body.prompt, body.choices) });
  } catch (error) {
    if (error instanceof ReviewError) return json({ error: error.message }, error.status, error.retryAfter);
    return json({ error: "Não foi possível analisar a questão. Tente novamente." }, 500);
  }
}
