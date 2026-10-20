import { NextRequest, NextResponse } from "next/server";
import { adminAuthClient, hasConfiguredAdmins, isConfiguredAdmin } from "@/lib/supabase/admin-server";
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
      return json({ questions: await importTrivia(body.provider, body.amount) });
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
